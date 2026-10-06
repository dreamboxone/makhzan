#!/usr/bin/env python3
# Copyright (C) 2026 dreamboxone; SPDX-License-Identifier: GPL-3.0-only
"""Exercise an installed Makhzan against a private HTTP fixture over an SSH tunnel.

Usage: MAKHZAN_TEST_PASSWORD=... python test-download-router.py ROUTER
Uses only test IDs, restores downloader preferences, never formats or powers off.
"""
import base64
import hashlib
import http.server
import json
import os
import select
import shlex
import socket
import sys
import threading
import time
import uuid

import paramiko

BLOCK = bytes(range(256)) * 256


def pattern(offset, count):
    """Content depends only on the absolute offset, so every range is consistent."""
    start = offset % len(BLOCK)
    data = (BLOCK + BLOCK)[start:start + count]
    return data if len(data) == count else (BLOCK * 2)[start:start + count]
requests = []
seen_headers = []
dropped = set()


class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_HEAD(self):
        self.serve(False)

    def do_GET(self):
        self.serve(True)

    def serve(self, body):
        if self.path.startswith('/auth') and self.headers.get('Authorization') != 'Basic ' + base64.b64encode(b'tester:fixture-password').decode():
            self.send_response(401)
            self.send_header('WWW-Authenticate', 'Basic realm="download-test"')
            self.send_header('Content-Length', '0')
            self.end_headers()
            return
        size = 2 * 1024 * 1024 if self.path.startswith(('/large', '/drop')) else 65536
        if self.path.startswith('/seg'):
            size = 8 * 1024 * 1024
        if self.path.startswith('/huge'):
            size = 10**14
        first, last = 0, size - 1
        spec = self.headers.get('Range')
        if spec:
            low, _, high = spec.split('=')[1].partition('-')
            first = int(low)
            if high:
                last = min(last, int(high))
        offset = first
        requests.append((self.command, self.path, offset))
        seen_headers.append((self.path, dict(self.headers)))
        self.send_response(206 if spec else 200)
        if not self.path.startswith('/unknown'):
            self.send_header('Content-Length', str(last - first + 1))
        self.send_header('Accept-Ranges', 'bytes')
        if spec:
            total = '*' if self.path.startswith('/unknown') else size
            self.send_header('Content-Range', f'bytes {first}-{last}/{total}')
        self.send_header('ETag', '"fixture-v1"')
        self.send_header('Last-Modified', 'Mon, 05 Oct 2026 00:00:00 GMT')
        self.end_headers()
        if body and not self.path.startswith('/huge'):
            stop = last + 1
            if self.path.startswith('/drop') and self.path not in dropped:
                dropped.add(self.path)
                stop = min(stop, offset + 131072)
            try:
                while offset < stop:
                    chunk = pattern(offset, min(65536, stop - offset))
                    self.wfile.write(chunk)
                    self.wfile.flush()
                    offset += len(chunk)
            except (ConnectionError, OSError):
                pass
            self.close_connection = True


def main():
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    client = paramiko.SSHClient()
    client.load_system_host_keys()
    client.connect(sys.argv[1], username='root', password=os.environ['MAKHZAN_TEST_PASSWORD'], look_for_keys=False, allow_agent=False)
    transport = client.get_transport()

    def forward(channel, origin, target):
        def relay():
            local = socket.create_connection(server.server_address)
            try:
                while not channel.closed:
                    readable, _, _ = select.select([local, channel], [], [], 10)
                    if local in readable:
                        b = local.recv(65536)
                        if not b:
                            break
                        channel.sendall(b)
                    if channel in readable:
                        b = channel.recv(65536)
                        if not b:
                            break
                        local.sendall(b)
            except (OSError, EOFError, paramiko.SSHException):
                pass  # curl on the router hung up (pause, cancel, dropped-connection tests)
            finally:
                # Dropbear ends the whole SSH session on an EOF for a channel it has already
                # released ("EOF for unknown channel"). Once the router closed its side, reply
                # with CLOSE only.
                if channel.eof_received or channel.closed:
                    channel.eof_sent = True
                channel.close()
                local.close()
        threading.Thread(target=relay, daemon=True).start()

    port = transport.request_port_forward('127.0.0.1', 0, forward)
    base = f'http://127.0.0.1:{port}'
    ids = []

    def shell(command):
        _, out, err = client.exec_command(command, timeout=40)
        value = out.read().decode()
        errors = err.read().decode()
        rc = out.channel.recv_exit_status()
        if rc:
            raise RuntimeError(f'{command.split()[0]} failed: {value} {errors}')
        return value.strip()

    def api(*args, fail=False):
        # Someone using the LuCI page at the same time briefly holds the control lock; wait for it.
        for _ in range(20):
            _, out, err = client.exec_command(shlex.join(['/usr/sbin/makhzanctl', *map(str, args)]), timeout=40)
            value = out.read().decode()
            errors = err.read().decode()
            rc = out.channel.recv_exit_status()
            if not value:
                raise RuntimeError(f'{args[0]} returned no JSON ({rc}): {errors}')
            result = json.loads(value)
            if result.get('error') != 'Another operation is running; wait until it completes':
                break
            time.sleep(1)
        if not fail and result.get('ok') is False:
            raise RuntimeError(f'{args[0]}: {result}')
        return result

    def add(path, size_name='fixture.bin', start=0, auth='', segments=1, rate=0, checksum=''):
        id_ = uuid.uuid4().hex
        ids.append(id_)
        result = api('download-add', id_, base + path, size_name, start, 0, auth, segments, rate, checksum, fail=True)
        return id_, result

    def job(id_):
        return next(j for j in api('download-list')['jobs'] if j['id'] == id_)

    def secret(**fields):
        token = uuid.uuid4().hex
        payload = {'path': '/tmp/run/makhzan/secret.' + token, 'data': json.dumps(fields), 'mode': 384}
        shell(shlex.join(['ubus', 'call', 'file', 'write', json.dumps(payload)]))
        return token

    def sha_of(size):
        digest = hashlib.sha256()
        for off in range(0, size, 65536):
            digest.update(pattern(off, min(65536, size - off)))
        return digest.hexdigest()

    def minutes_now():
        h, m = shell("date +%H:%M").split(':')
        return int(h) * 60 + int(m)

    def wait(id_, states, timeout=45):
        end = time.monotonic() + timeout
        last = None
        while time.monotonic() < end:
            last = next((j for j in api('download-list')['jobs'] if j['id'] == id_), None)
            if (last and last['state'] in states) or (last is None and 'absent' in states):
                return last
            if last and last['state'] == 'failed' and 'failed' not in states:
                raise AssertionError(last)
            time.sleep(1)
        raise AssertionError(f'timed out: {last}')

    before = api('download-list')
    assert not before['jobs'], 'Use an empty test queue; existing downloads will not be touched'
    try:
        api('download-enabled', 0)
        api('download-limit', 1024)
        api('download-redial', 1, 2)
        huge, result = add('/huge')
        assert result['ok'] is False and 'Not enough free' in result['error'], result
        unknown, result = add('/unknown')
        assert result['ok'] is False, result
        first, result = add('/small')
        assert result['ok'], result
        api('download-add', first, base + '/small', 'fixture.bin', 0, 0, '')
        assert len(api('download-list')['jobs']) == 1, 'idempotency'
        api('download-enabled', 1)
        done = wait(first, {'completed'})
        assert done['bytes'] == done['expected'] == 65536
        root = json.loads(shell('/usr/sbin/makhzanctl status'))['disk']['root']
        actual = shell(shlex.join(['sha256sum', root + '/.makhzan-downloads/completed/' + first + '-fixture.bin'])).split()[0]
        assert actual == hashlib.sha256(BLOCK).hexdigest()
        api('download-rename', first, 'renamed.bin')
        assert wait(first, {'completed'})['name'] == 'renamed.bin'
        api('download-remove', first)
        wait(first, {'absent'})
        print('PASS space check, unknown length, idempotency, real transfer/hash, rename, completed deletion', flush=True)

        api('download-limit', 256)
        large, result = add('/large')
        wait(large, {'downloading'})
        time.sleep(2)
        api('download-pause', large)
        paused = wait(large, {'paused'})
        assert paused['bytes'] > 0
        time.sleep(2)
        api('download-resume', large)
        done = wait(large, {'completed'}, timeout=60)
        assert any(method == 'GET' and path == '/large' and offset > 0 for method, path, offset in requests), requests
        assert done['elapsed'] > 0
        api('download-remove', large)
        print('PASS partial transfer, pause, byte-range resume and elapsed time', flush=True)

        api('download-parallel', 2)
        a, _ = add('/large?a')
        b, _ = add('/large?b')
        wait(a, {'downloading'}); wait(b, {'downloading'})
        time.sleep(3)
        live = api('download-list')['jobs']
        assert sum(j['state'] == 'downloading' for j in live) == 2
        assert any(j['speed'] > 0 and j['eta'] > 0 for j in live)
        api('download-pause-all')
        wait(a, {'paused'}); wait(b, {'paused'})
        time.sleep(2)
        api('download-resume-all')
        wait(a, {'downloading'})
        api('download-remove', a); wait(a, {'absent'})
        api('download-remove', b); wait(b, {'absent'})
        print('PASS parallel queue, speed/ETA, pause/resume all and deletion during transfer', flush=True)

        api('download-parallel', 1)
        api('download-limit', 1024)
        broken, _ = add('/drop')
        done = wait(broken, {'completed'}, timeout=60)
        assert done['attempts'] > 0
        api('download-remove', broken)
        print('PASS reconnect after connection loss with configured retry interval', flush=True)

        token = uuid.uuid4().hex
        payload = {'path': '/tmp/run/makhzan/secret.' + token, 'data': json.dumps({'username': 'tester', 'password': 'fixture-password'}), 'mode': 384}
        shell(shlex.join(['ubus', 'call', 'file', 'write', json.dumps(payload)]))
        auth, result = add('/auth', auth=token)
        assert result['ok'], result
        wait(auth, {'completed'})
        api('download-remove', auth)
        print('PASS authenticated HTTP download with private credentials', flush=True)

        now = api('download-clock')['now']
        scheduled, _ = add('/small?scheduled', start=now + 3600)
        time.sleep(4)
        assert wait(scheduled, {'queued'})['bytes'] == 0
        shell('/etc/init.d/makhzan-download restart')
        assert wait(scheduled, {'queued'})['start'] == now + 3600
        api('download-remove', scheduled)
        print('PASS future scheduling, service restart persistence and queued deletion', flush=True)

        # ---- version 2.0.0 features
        api('download-limit', 0)
        assert api('download-list')['limit'] == 0
        assert api('download-limit', -1, fail=True)['ok'] is False
        unlimited, _ = add('/large?unlimited')
        assert wait(unlimited, {'completed'})['bytes'] == 2 * 1024 * 1024
        api('download-remove', unlimited)
        print('PASS removing the total bandwidth limit (unlimited transfers)', flush=True)

        # "Download now": runs with the manager off, past a busy queue slot and outside download hours.
        api('download-limit', 256)
        api('download-parallel', 1)
        api('download-enabled', 1)
        busy, _ = add('/large?busy')
        wait(busy, {'downloading'})
        api('download-enabled', 0)
        minutes = minutes_now()
        api('download-window', 1, (minutes + 120) % 1440, (minutes + 180) % 1440)
        now_id = uuid.uuid4().hex
        ids.append(now_id)
        assert api('download-add', now_id, base + '/small?now', 'now.bin', 0, 0, '', 1, 0, '', 1)['ok']
        done = wait(now_id, {'completed'})
        assert done['immediate'] is False and done['bytes'] == 65536, done
        assert api('download-add', uuid.uuid4().hex, base + '/small?x', 'x.bin', 0, 0, '', 1, 0, '', 2, fail=True)['ok'] is False
        api('download-window', 0)
        for id_ in (busy, now_id):
            api('download-remove', id_)
        for n in (4, 6):
            api('download-parallel', n)
            assert api('download-list')['parallel'] == n
        assert api('download-parallel', 7, fail=True)['ok'] is False
        api('download-parallel', 1)
        api('download-limit', 8192)
        api('download-enabled', 1)
        print('PASS download now (manager off, queue busy, outside hours) and up to 6 simultaneous files', flush=True)

        api('download-segments', 4)
        api('download-limit', 1024)
        api('download-parallel', 1)
        seg, result = add('/seg', segments=4)
        assert result['ok'], result
        assert job(seg)['segments'] == 4
        wait(seg, {'downloading'})
        time.sleep(3)
        api('download-pause', seg)
        paused = wait(seg, {'paused'})
        assert paused['bytes'] > 0
        time.sleep(1)
        api('download-resume', seg)
        done = wait(seg, {'completed'}, timeout=120)
        assert done['bytes'] == done['expected'] == 8 * 1024 * 1024
        root = json.loads(shell('/usr/sbin/makhzanctl status'))['disk']['root']
        actual = shell(shlex.join(['sha256sum', root + '/.makhzan-downloads/completed/' + seg + '-fixture.bin'])).split()[0]
        assert actual == sha_of(8 * 1024 * 1024), 'segmented file differs from the source'
        offsets = {o for m, p, o in requests if p == '/seg' and m == 'GET'}
        assert len({o // (2 * 1024 * 1024) for o in offsets}) == 4, offsets
        assert done['category'] == 'program'
        api('download-remove', seg)
        wait(seg, {'absent'})
        print('PASS segmented download (4 connections), pause/resume, joined file hash and category', flush=True)

        api('download-limit', 4096)
        good, result = add('/small?sum', checksum=sha_of(65536))
        assert result['ok'], result
        wait(good, {'completed'})
        md5, result = add('/small?md5', checksum=hashlib.md5(pattern(0, 65536)).hexdigest())
        assert result['ok'], result
        wait(md5, {'completed'})
        bad, result = add('/small?bad', checksum='0' * 64)
        assert result['ok'], result
        failed = wait(bad, {'failed'})
        assert failed['error'] == 'Checksum mismatch', failed
        refused = api('download-add', uuid.uuid4().hex, base + '/small?x', 'x.bin', 0, 0, '', 1, 0, 'not-a-hash', fail=True)
        assert refused['ok'] is False
        for id_ in (good, md5, bad):
            api('download-remove', id_)
        print('PASS SHA-256 and MD5 verification, mismatch handling and invalid checksum refusal', flush=True)

        api('download-enabled', 0)
        first_, _ = add('/small?o1')
        second_, _ = add('/small?o2')
        third_, _ = add('/small?o3')
        duplicate = api('download-add', uuid.uuid4().hex, base + '/small?o1', 'dup.bin', 0, 0, '', 1, 0, '', fail=True)
        assert duplicate['ok'] is False and 'already' in duplicate['error'], duplicate

        def order():
            return [j['id'] for j in sorted(api('download-list')['jobs'], key=lambda j: j['order']) if j['id'] in (first_, second_, third_)]
        assert order() == [first_, second_, third_]
        api('download-move', third_, 'top')
        assert order() == [third_, first_, second_], order()
        api('download-move', third_, 'down')
        assert order() == [first_, third_, second_], order()
        api('download-move', first_, 'bottom')
        assert order() == [third_, second_, first_], order()
        api('download-move', first_, 'up')
        assert order() == [third_, first_, second_], order()
        api('download-cancel', second_)
        assert job(second_)['state'] == 'cancelled'
        api('download-clear-finished')
        wait(second_, {'absent'})
        for id_ in (first_, third_):
            api('download-remove', id_)
        print('PASS duplicate-link refusal, queue reordering (top/up/down/bottom) and clearing cancelled items', flush=True)

        api('download-enabled', 1)
        token = secret(referer='http://example.org/ref', agent='MakhzanTest/2.0', cookie='sid=abc123')
        hdr, result = add('/hdr', auth=token)
        assert result['ok'], result
        wait(hdr, {'completed'})
        headers = [h for path, h in seen_headers if path == '/hdr' and 'Cookie' in h]
        assert headers and headers[-1]['Referer'] == 'http://example.org/ref' and headers[-1]['User-Agent'] == 'MakhzanTest/2.0' and headers[-1]['Cookie'] == 'sid=abc123', seen_headers[-3:]
        mode = shell('ls -l ' + shlex.join([root + '/.makhzan-downloads/jobs/' + hdr + '/auth.conf']))
        assert mode.startswith('-rw-------'), mode
        api('download-remove', hdr)
        print('PASS custom Referer, User-Agent and Cookie sent over private per-job configuration', flush=True)

        api('download-limit', 8192)
        slow, _ = add('/large?slow', rate=64)
        wait(slow, {'downloading'})
        time.sleep(4)
        live = job(slow)
        assert 0 < live['speed'] <= 120 * 1024, live
        assert live['rate'] == 64
        api('download-pause', slow)
        wait(slow, {'paused'})
        api('download-relink', slow, base + '/large?moved')
        api('download-rate', slow, 0)
        api('download-resume', slow)
        done = wait(slow, {'completed'}, timeout=60)
        assert done['bytes'] == done['expected']
        assert any(p == '/large?moved' and o > 0 for m, p, o in requests), 'relinked download did not resume by byte range'
        before_requests = len(requests)
        api('download-redownload', slow)
        wait(slow, {'completed'}, timeout=60)
        assert len(requests) > before_requests
        api('download-remove', slow)
        print('PASS per-download speed limit, link refresh with resume, and re-download', flush=True)

        minutes = minutes_now()
        api('download-window', 1, (minutes + 120) % 1440, (minutes + 180) % 1440)
        assert not api('download-list')['in_window']
        outside, _ = add('/small?window')
        time.sleep(6)
        assert wait(outside, {'queued'})['bytes'] == 0
        api('download-window', 1, (minutes - 5) % 1440, (minutes + 120) % 1440)
        assert api('download-list')['in_window']
        wait(outside, {'completed'})
        api('download-window', 0)
        api('download-remove', outside)
        later, _ = add('/small?startnow', start=api('download-clock')['now'] + 7200)
        time.sleep(4)
        assert wait(later, {'queued'})['bytes'] == 0
        api('download-start-now', later)
        wait(later, {'completed'})
        api('download-remove', later)
        print('PASS download time window (outside blocks, inside runs) and start-now over a schedule', flush=True)
    finally:
        for id_ in ids:
            api('download-remove', id_, fail=True)
        time.sleep(3)
        # Restore the saved hours too, not only the on/off switch.
        api('download-window', 1, before['window_start'], before['window_end'])
        if not before['window']:
            api('download-window', 0)
        api('download-segments', before['segments'])
        api('download-enabled', before['enabled'])
        api('download-parallel', before['parallel'])
        api('download-limit', before['limit'])
        api('download-redial', before['redial'], before['retry_interval'])
        transport.cancel_port_forward('127.0.0.1', port)
        client.close()
        server.shutdown()


if __name__ == '__main__':
    main()
