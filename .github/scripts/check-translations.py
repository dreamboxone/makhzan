#!/usr/bin/env python3
# Makhzan - USB NAS manager for OpenWrt
# Copyright (C) 2026 dreamboxone
# SPDX-License-Identifier: GPL-3.0-only
#
# This program is free software: you can redistribute it and/or modify it under the terms
# of the GNU General Public License version 3 as published by the Free Software Foundation.
# It is distributed WITHOUT ANY WARRANTY; see the LICENSE file for details.
#
# Fails when a backend error message has no Persian translation in the LuCI page.
import re
js=open('files/www/luci-static/resources/view/makhzan/overview.js',encoding='utf-8').read()
start=js.index('var FA_ERRORS'); block=js[start:js.index('};',start)]
keys=set(); duplicates=set()
for line in block.splitlines():
    line=line.strip()
    if line.startswith("'") and "': '" in line:
        key=line[1:line.index("': '")]
        if key in keys: duplicates.add(key)
        keys.add(key)
msgs=set()
for f in ['files/usr/sbin/makhzanctl','files/usr/libexec/makhzan-storage','files/usr/libexec/makhzan-remote']:
    for m in re.finditer(r"(?:fail|error) '([^']+)'", open(f,encoding='utf-8').read()):
        msgs.add(m.group(1))
# The download manager reports with err '...' and stores job errors as error='...' or reason='...'.
for m in re.finditer(r"(?:\berr '|\berror='|\breason=')([^']+)'", open('files/usr/libexec/makhzan-download',encoding='utf-8').read()):
    if m.group(1) not in ('stopped','window'):
        msgs.add(m.group(1))
missing=sorted(m for m in msgs if m not in keys)
print(len(msgs),'backend messages;',len(missing),'without Persian;',len(duplicates),'duplicate keys:')
for m in missing: print(" -", m)
for m in sorted(duplicates): print(" = duplicate:", m)
raise SystemExit(1 if missing or duplicates else 0)
