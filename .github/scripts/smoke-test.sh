#!/bin/sh
# Makhzan - USB NAS manager for OpenWrt
# Copyright (C) 2026 dreamboxone
# SPDX-License-Identifier: GPL-3.0-only
#
# This program is free software: you can redistribute it and/or modify it under the terms
# of the GNU General Public License version 3 as published by the Free Software Foundation.
# It is distributed WITHOUT ANY WARRANTY; see the LICENSE file for details.
#
# Installs the built package inside an official OpenWrt rootfs container and exercises the backend.
# Usage (inside the container): smoke-test.sh apk|ipk
set -eu
format=$1
mkdir -p /var/lock /var/run /tmp/run

echo "== $(uname -m): installing the $format package with its dependencies"
case "$format" in
	apk) apk update >/dev/null; apk add --allow-untrusted /pkg/*.apk ;;
	ipk) opkg update >/dev/null; opkg install /pkg/*.ipk ;;
	*) echo "unknown format $format" >&2; exit 2 ;;
esac

echo "== shell syntax"
for f in /usr/sbin/makhzanctl /usr/libexec/makhzan-storage /usr/libexec/makhzan-usb.sh /usr/libexec/makhzan-remote /usr/libexec/makhzan-download /etc/init.d/makhzan /etc/init.d/makhzan-download; do
	sh -n "$f"
done

echo "== LuCI files"
ls /www/luci-static/resources/view/makhzan/overview_*.js /www/luci-static/resources/view/makhzan/theme.css
grep -q '"path": "makhzan/overview_' /usr/share/luci/menu.d/luci-app-makhzan.json
grep -q '/tmp/run/makhzan/secret' /usr/share/rpcd/acl.d/luci-app-makhzan.json
calendar=$(sed -n 's/.*require view.makhzan.\(calendar_[a-zA-Z0-9_]*\) as calendar.*/\1/p' /www/luci-static/resources/view/makhzan/overview_*.js | head -n 1)
[ -n "$calendar" ] && grep -q 'return baseclass.extend' "/www/luci-static/resources/view/makhzan/$calendar.js"

echo "== backend"
status=$(/usr/sbin/makhzanctl status); echo "$status"
echo "$status" | grep -q '"version":"'
echo "$status" | grep -q '"ready":false'
/usr/sbin/makhzanctl storage-devices | grep -q '"ok":true'
/usr/sbin/makhzanctl storage-ready | grep -q '"root":""'
/usr/sbin/makhzanctl storage-job | grep -q '"state":"idle"'
/usr/sbin/makhzanctl download-list | grep -q '"ready":0'
/usr/sbin/makhzanctl add-user Invalid-Name | grep -q '"ok":false'
/usr/sbin/makhzanctl mkdir nobody x | grep -q '"ok":false'
/usr/sbin/makhzanctl language en | grep -q '"ok":true'
[ "$(uci -q get makhzan.main.language)" = en ]
/usr/sbin/makhzanctl trash-list | grep -q '"ok":false'
/usr/sbin/makhzanctl trash-restore ali '../../etc' | grep -q '"ok":false'
/usr/sbin/makhzanctl library-list | grep -q '"ok":true'
/usr/sbin/makhzanctl library-set '../x' | grep -q '"ok":false'
/usr/sbin/makhzanctl remote-status | grep -q '"ok":true'
/usr/sbin/makhzanctl remote-add 'Bad User' | grep -q '"ok":false'
/usr/sbin/makhzanctl set spindown abc | grep -q '"ok":false'
/usr/sbin/makhzanctl set timemachine_gb 250 | grep -q '"ok":true'
/usr/sbin/makhzanctl access nobody ro | grep -q '"ok":false'
/usr/sbin/makhzanctl usage-scan
/usr/sbin/makhzanctl status | grep -q '"timemachine_gb":250'

echo "== removal and reinstall (isolated container only)"
# A folder's numeric group survives account deletion; reinstallation must reuse it if still free.
mkdir -p /tmp/makhzan-lifecycle/shared
chown 0:19042 /tmp/makhzan-lifecycle/shared
( set +u; . /usr/libexec/makhzan-usb.sh; makhzan_group /tmp/makhzan-lifecycle/shared )
[ "$(awk -F: '$1=="makhzan" {print $3}' /etc/group)" = 19042 ]
printf '%s\n' 'mklifecycle:x:19042:19042:makhzan:/var/empty:/bin/false' >> /etc/passwd
printf '%s\n' 'mklifecycle:!:0:0:99999:7:::' >> /etc/shadow
# A saved but unavailable disk must not cause formatting or loss of its mount configuration.
uci set fstab.makhzan_nas=mount
uci set fstab.makhzan_nas.uuid=makhzan-test-missing-disk
uci set fstab.makhzan_nas.target=/mnt/makhzan-lifecycle
uci set fstab.makhzan_nas.enabled=1
uci commit fstab
/usr/sbin/makhzanctl storage-ready | grep -q '"root":""'
mkdir -p /tmp/run/makhzan/usage.lock
touch /tmp/run/makhzan/secret.0123456789abcdef0123456789abcdef /tmp/run/makhzan/usage.json.tmp
case "$format" in
	apk) apk del luci-app-makhzan ;;
	ipk) opkg remove luci-app-makhzan ;;
esac
[ ! -e /tmp/run/makhzan ]
[ ! -e /etc/config/makhzan ]
! grep -q '^mklifecycle:' /etc/passwd
! grep -q '^mklifecycle:' /etc/shadow
! grep -q '^makhzan:' /etc/group
[ -d /tmp/makhzan-lifecycle/shared ]
[ "$(uci -q get fstab.makhzan_nas.uuid)" = makhzan-test-missing-disk ]
case "$format" in
	apk) apk add --allow-untrusted /pkg/*.apk ;;
	ipk) opkg install /pkg/*.ipk ;;
esac
[ "$(uci -q get makhzan.main.language)" = fa ]
/usr/sbin/makhzanctl storage-ready | grep -q '"root":""'
( set +u; . /usr/libexec/makhzan-usb.sh; makhzan_group /tmp/makhzan-lifecycle/shared )
[ "$(awk -F: '$1=="makhzan" {print $3}' /etc/group)" = 19042 ]

echo "OK: Makhzan works on $(uname -m) ($format)"
