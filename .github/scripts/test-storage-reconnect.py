#!/usr/bin/env python3
# Copyright (C) 2026 dreamboxone; SPDX-License-Identifier: GPL-3.0-only
"""Check saved-disk recovery with isolated UCI files and a simulated USB mount."""
import json
from pathlib import Path
import shlex
import subprocess
import sys
import tempfile


def main():
    source = Path(sys.argv[1] if len(sys.argv) > 1 else '/usr/sbin/makhzanctl').read_text()
    definitions = source.rsplit('\nsecret_dir\n', 1)[0]
    with tempfile.TemporaryDirectory(prefix='makhzan-reconnect-') as folder:
        root = Path(folder)
        # set_root intentionally accepts only canonical paths below /mnt or /srv.
        Path('/mnt').mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='makhzan-reconnect-', dir='/mnt') as mount_folder:
            mount = Path(mount_folder)
            config = root / 'config'
            config.mkdir()
            (config / 'makhzan').write_text("config main 'main'\n")
            (config / 'fstab').touch()
            (root / 'mounted').touch()
            mounts = root / 'mounts'
            mounts.write_text(f'/dev/sdz1 {mount} ext4 rw,noatime 0 0\n')
            fixture = definitions.replace('/proc/mounts', str(mounts))
            overrides = f'''
TEST_ROOT={shlex.quote(str(root))}
TEST_MOUNT={shlex.quote(str(mount))}
uci() {{ command uci -c {shlex.quote(str(config))} "$@"; }}
makhzan_mounted() {{ [ "$1" = "$TEST_MOUNT" ] && [ -f "$TEST_ROOT/mounted" ]; }}
makhzan_usb_mount() {{ makhzan_mounted "$1"; }}
makhzan_usb_device() {{ [ "$1" = /dev/sdz1 ]; }}
makhzan_layout() {{ makhzan_mounted "$1"; }}
smb_sync() {{ return 0; }}
block() {{
 case "$1" in
  info) [ -f "$TEST_ROOT/missing" ] || printf '%s\\n' '/dev/sdz1: UUID="reconnect-fixture" TYPE="ext4"';;
  mount) [ -f "$TEST_ROOT/missing" ] || touch "$TEST_ROOT/mounted";;
 esac
}}
case "$1" in
 root) set_root "$2";;
 ready) storage_ready;;
esac
'''
            helper = root / 'control'
            helper.write_text(fixture + overrides)
            helper.chmod(0o700)

            def api(*args):
                result = subprocess.run([str(helper), *map(str, args)], text=True,
                                        capture_output=True, timeout=15)
                assert result.returncode == 0, result.stderr
                value = json.loads(result.stdout)
                assert value['ok'], value
                return value

            def preference(key):
                return subprocess.check_output(['uci', '-c', str(config), '-q', 'get', key],
                                               text=True).strip()

            api('root', mount)
            assert preference('fstab.makhzan_nas.uuid') == 'reconnect-fixture'
            assert preference('fstab.makhzan_nas.target') == str(mount)
            assert preference('fstab.makhzan_nas.fstype') == 'ext4'
            assert preference('fstab.makhzan_nas.options') == 'rw,noatime'
            assert preference('fstab.makhzan_nas.enabled') == '1'
            sentinel = mount / 'kept-file'
            sentinel.write_text('existing disk data')

            # Complete removal clears package preferences while retaining fstab and disk contents.
            (config / 'makhzan').write_text("config main 'main'\n")
            (root / 'mounted').unlink()
            (root / 'missing').touch()
            assert api('ready')['root'] == ''
            (root / 'missing').unlink()
            assert api('ready')['root'] == str(mount)
            assert preference('makhzan.main.root') == str(mount)
            assert sentinel.read_text() == 'existing disk data'
            print('PASS selected existing disk reconnects by saved UUID after reinstall and delayed attachment', flush=True)

            subprocess.run(['uci', '-c', str(config), 'set', 'fstab.makhzan_nas.enabled=0'], check=True)
            subprocess.run(['uci', '-c', str(config), 'commit', 'fstab'], check=True)
            (root / 'mounted').unlink()
            assert api('ready')['root'] == ''
            assert not (root / 'mounted').exists(), 'An explicitly released disk must stay released'
            print('PASS released disk is not automatically mounted', flush=True)


if __name__ == '__main__':
    main()
