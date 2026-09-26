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
for f in /usr/sbin/makhzanctl /usr/libexec/makhzan-storage /usr/libexec/makhzan-usb.sh /etc/init.d/makhzan; do
	sh -n "$f"
done

echo "== LuCI files"
ls /www/luci-static/resources/view/makhzan/overview_*.js /www/luci-static/resources/view/makhzan/theme.css
grep -q '"path": "makhzan/overview_' /usr/share/luci/menu.d/luci-app-makhzan.json
grep -q '/tmp/run/makhzan/secret' /usr/share/rpcd/acl.d/luci-app-makhzan.json

echo "== backend"
status=$(/usr/sbin/makhzanctl status); echo "$status"
echo "$status" | grep -q '"version":"'
echo "$status" | grep -q '"ready":false'
/usr/sbin/makhzanctl storage-devices | grep -q '"ok":true'
/usr/sbin/makhzanctl storage-job | grep -q '"state":"idle"'
/usr/sbin/makhzanctl add-user Invalid-Name | grep -q '"ok":false'
/usr/sbin/makhzanctl mkdir nobody x | grep -q '"ok":false'
/usr/sbin/makhzanctl language en | grep -q '"ok":true'
[ "$(uci -q get makhzan.main.language)" = en ]

echo "OK: Makhzan works on $(uname -m) ($format)"
