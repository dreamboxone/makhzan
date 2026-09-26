#!/usr/bin/env sh
# Makhzan - USB NAS manager for OpenWrt
# Copyright (C) 2026 dreamboxone
# SPDX-License-Identifier: GPL-3.0-only
#
# This program is free software: you can redistribute it and/or modify it under the terms
# of the GNU General Public License version 3 as published by the Free Software Foundation.
# It is distributed WITHOUT ANY WARRANTY; see the LICENSE file for details.
# Builds the architecture-independent package with one or more OpenWrt SDKs.
# An SDK for OpenWrt 25.12+ produces .apk; an SDK for 24.10 or older produces .ipk.
# Any target works: the package contains no compiled code (PKGARCH:=all).
set -eu
[ $# -ge 1 ] || { echo 'Usage: build-package.sh /path/to/openwrt-sdk [/path/to/another-sdk ...]' >&2; exit 2; }
SOURCE=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
OUT="$SOURCE/dist"
mkdir -p "$OUT"
for SDK in "$@"; do
	[ -f "$SDK/include/toplevel.mk" ] || { echo "Not an OpenWrt SDK: $SDK" >&2; exit 2; }
	DEST="$SDK/package/makhzan"
	if [ -e "$DEST" ]; then
		grep -q '^PKG_NAME:=luci-app-makhzan$' "$DEST/Makefile" 2>/dev/null || { echo "$DEST exists and is not Makhzan; refusing to overwrite" >&2; exit 2; }
		rm -rf "$DEST"
	fi
	mkdir -p "$DEST"
	cp -a "$SOURCE/Makefile" "$SOURCE/files" "$SOURCE/LICENSE" "$DEST/"
	find "$DEST/files" -type f \( -name '*.sh' -o -name '*.js' -o -name '*.css' -o -name '*.json' -o -path '*/init.d/*' -o -path '*/config/*' -o -path '*/sbin/*' -o -path '*/libexec/*' \) -exec sed -i 's/\r$//' {} +
	[ -f "$SDK/.config" ] || make -C "$SDK" defconfig >/dev/null
	make -C "$SDK" package/makhzan/clean >/dev/null
	make -C "$SDK" package/makhzan/compile CONFIG_PACKAGE_luci-app-makhzan=m NO_DEPS=1 V=s >"$OUT/build-$(basename "$SDK").log" 2>&1 || { echo "Build failed; see $OUT/build-$(basename "$SDK").log" >&2; exit 1; }
	find "$SDK/bin/packages" -type f \( -name 'luci-app-makhzan_*.ipk' -o -name 'luci-app-makhzan-*.apk' \) -newer "$DEST/Makefile" -exec cp -v {} "$OUT/" \;
done
