#!/usr/bin/env python3
# Copyright (C) 2026 dreamboxone; SPDX-License-Identifier: GPL-3.0-only
"""Exercise the installed downloader with real HTTP transfers in a private /tmp store.

Only the USB mount, service manager and preferences are replaced in the fixture.
The installed program and the real NAS/configuration are never modified.
"""
import collections
import hashlib
import json
import os
from pathlib import Path
import shlex
import socketserver
import subprocess
import sys
import tempfile
import threading
import time


def main():
    source = Path(sys.argv[1] if len(sys.argv) > 1 else '/usr/libexec/makhzan-download').read_text()
    definitions, dispatch = source.rsplit('\ncase "$1" in\n', 1)
    counts = collections.Counter()
    probing = threading.Event()
    release = threading.Event()
    payload = bytes(range(256)) * 256

    class Handler(socketserver.StreamRequestHandler):
        def handle(self):
            method, path, _ = self.rfile.readline().decode().split()
            while self.rfile.readline() not in (b'\r\n', b'\n', b''):
                pass
            counts[method, path] += 1
            if path.startswith('/race') and counts['HEAD', path] > 1:
                probing.set()
                release.wait(15)
                return
            self.wfile.write(f'HTTP/1.0 200 OK\r\nContent-Length: {len(payload)}\r\n'
                             'ETag: "queue-fixture"\r\n\r\n'.encode())
            if method == 'GET':
                self.wfile.write(payload)

    server = socketserver.ThreadingTCPServer(('127.0.0.1', 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_address[1]}'
    with tempfile.TemporaryDirectory(prefix='makhzan-queue-') as folder:
        root = Path(folder)
        store = root / 'store'
        run = root / 'run'
        store.mkdir()
        run.mkdir()
        (store / 'jobs').mkdir()
        (store / 'completed').mkdir()
        helper = root / 'downloader'
        service = root / 'service'
        service.write_text('#!/bin/sh\ncase "$1" in\n'
                           f' running) test -f {shlex.quote(str(root / "running"))};;\n'
                           f' start) touch {shlex.quote(str(root / "running"))};;\nesac\n')
        service.chmod(0o700)
        fixture = definitions.replace('/usr/libexec/makhzan-download', str(helper))
        fixture = fixture.replace('/tmp/run/makhzan-download', str(run))
        fixture = fixture.replace('/var/lock/makhzan-download.lock', str(root / 'lock'))
        fixture = fixture.replace('/etc/init.d/makhzan-download', str(service))
        overrides = f'''
TEST_ROOT={shlex.quote(str(root))}
open_store() {{ NAS={shlex.quote(str(store))}; cd "$NAS"; }}
makhzan_usb_mount() {{ return 0; }}
storage_busy() {{ return 1; }}
enabled() {{ [ ! -f "$TEST_ROOT/disabled" ]; }}
parallel() {{ echo 1; }}
bandwidth() {{ echo 0; }}
segments_default() {{ echo 1; }}
retry_enabled() {{ return 0; }}
in_window() {{ return 0; }}
clock_synced() {{ return 0; }}
sync() {{ :; }}
chown() {{ :; }}
df() {{ command df "$@" | awk -v m="$NAS" 'NR==2 {{$6=m}} {{print}}'; }}
'''
        helper.write_text(fixture + overrides + '\ncase "$1" in\n' + dispatch)
        helper.chmod(0o700)

        def call(*args, check=True):
            result = subprocess.run([str(helper), *map(str, args)], capture_output=True,
                                    text=True, timeout=60)
            if check and result.returncode:
                raise AssertionError((args, result.stdout, result.stderr))
            return result

        def api(*args):
            result = json.loads(call(*args).stdout)
            assert result.get('ok'), result
            return result

        def metadata(id_):
            path = store / 'jobs' / id_ / 'meta.json'
            return json.loads(path.read_text()) if path.exists() else None

        def wait_for(predicate, timeout=120, tick=True):
            deadline = time.monotonic() + timeout
            while time.monotonic() < deadline:
                if predicate():
                    return
                if tick:
                    call('tick')
                time.sleep(0.2)
            raise AssertionError('Queue did not reach the expected state')

        def add(n, path=None):
            id_ = f'{n:032x}'
            api('add', id_, base + (path or f'/file-{n}'), f'file-{n}.bin', 0, 0, '', 1)
            return id_

        # Expose tick solely in the private fixture, preserving the production dispatcher.
        helper.write_text(helper.read_text().replace('\ncase "$1" in\n',
                          '\ncase "$1" in\n tick) tick; exit 0;;\n', 1))
        try:
            for cycle in range(2):
                batch = [add(cycle * 10 + n) for n in range(1, 11)]
                assert (root / 'running').exists(), 'Adding a link must restart a stopped scheduler'
                wait_for(lambda: all(metadata(i)['state'] == 'completed' for i in batch))
                wait_for(lambda: not list(run.glob('worker.*')), tick=False)
                for id_ in batch:
                    job = metadata(id_)
                    completed = store / 'completed' / f'{id_}-{job["name"]}'
                    assert hashlib.sha256(completed.read_bytes()).digest() == hashlib.sha256(payload).digest()
                    api('remove', id_)
                    assert not (store / 'jobs' / id_).exists()
                    assert not completed.exists()
                assert not list((store / 'jobs').iterdir())
                (root / 'running').unlink()
            assert all(counts['GET', f'/file-{n}'] == 1 for n in range(1, 21)), counts
            print('PASS two batches of ten downloads, hashes, complete deletion and scheduler recovery', flush=True)

            # Old PID files must not occupy a slot, even if that PID now belongs to another program.
            (run / ('worker.' + 'f' * 32)).write_text(str(os.getpid()))
            next_id = add(21)
            wait_for(lambda: metadata(next_id)['state'] == 'completed')
            before = dict(counts)
            (root / 'running').unlink()
            api('add', next_id, base + '/file-21', 'file-21.bin', 0, 0, '', 1)
            assert (root / 'running').exists()
            call('tick')
            assert dict(counts) == before, 'An idempotent request must not redownload a completed job'
            job = metadata(next_id)
            (store / 'completed' / f'{next_id}-{job["name"]}').unlink()
            call('tick')
            assert metadata(next_id)['state'] == 'completed'
            assert dict(counts) == before, 'Removing only the file must not requeue its history'
            api('remove', next_id)
            print('PASS stale PID, idempotent scheduler recovery and externally removed completed file', flush=True)

            for n, operation, expected in [(22, 'remove', 'deleting'), (23, 'pause', 'paused')]:
                probing.clear()
                release.clear()
                id_ = add(n, f'/race-{n}')
                worker = subprocess.Popen([str(helper), 'worker', id_], stdout=subprocess.DEVNULL,
                                          stderr=subprocess.DEVNULL)
                assert probing.wait(30), 'Worker did not enter its initial probe'
                api(operation, id_)
                release.set()
                worker.wait(timeout=30)
                assert metadata(id_)['state'] == expected, metadata(id_)
                if operation == 'pause':
                    (root / 'running').unlink()
                    api('resume', id_)
                    assert (root / 'running').exists()
                    api('remove', id_)
                call('tick')
                assert metadata(id_) is None
            print('PASS delete/pause during a failed probe cannot be overwritten by a worker', flush=True)
        finally:
            release.set()
            # Only processes whose marker and command identify this temporary fixture are stopped.
            for marker in run.glob('worker.*'):
                try:
                    pid = int(marker.read_text())
                    if str(helper).encode() in Path(f'/proc/{pid}/cmdline').read_bytes():
                        os.kill(pid, 15)
                except (OSError, ValueError):
                    pass
            server.shutdown()
            server.server_close()


if __name__ == '__main__':
    main()
