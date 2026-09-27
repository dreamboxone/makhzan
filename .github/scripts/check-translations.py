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
keys=set()
for line in block.splitlines():
    line=line.strip()
    if line.startswith("'") and "': '" in line:
        keys.add(line[1:line.index("': '")])
msgs=set()
for f in ['files/usr/sbin/makhzanctl','files/usr/libexec/makhzan-storage']:
    for m in re.finditer(r"(?:fail|error) '([^']+)'", open(f,encoding='utf-8').read()):
        msgs.add(m.group(1))
missing=sorted(m for m in msgs if m not in keys)
print(len(msgs),'backend messages;',len(missing),'without Persian:')
for m in missing: print(" -", m)
raise SystemExit(1 if missing else 0)
