# Verification record

Copyright (C) 2026 dreamboxone. SPDX-License-Identifier: GPL-3.0-only.

Device: Google WiFi (ipq40xx/chromium), OpenWrt 25.12.5, samba4-server 4.22.7,
minidlna 1.3.3, 16 GB USB flash drive. Client: Windows 11. Date: 2026-09-26.

| Area | Test | Result |
|---|---|---|
| Package | Upgrade 1.0.0-r12 → 1.1.0 with apk; old native files removed; config kept | Pass |
| Package | Upgrade restores NAS mount, Samba settings, shares, lockout policy and DLNA automatically | Pass |
| Package | Remove: shares and share-visibility settings removed, tdbsam and passwords kept, DLNA disabled | Pass |
| Package | Reinstall: everything restored; both users log in over SMB with their passwords | Pass |
| Package | Build-stamped view file; no stale browser cache after upgrade | Pass |
| Package | ipk built with 24.10 SDK: `Architecture: all`, install/remove hooks present | Pass (not installed: no 24.10 device) |
| Storage | Plan and erase-apply swap 256 MiB + NAS 8000 MiB; fstab entries, mount, swap | Pass |
| Storage | Wrong erase token rejected | Pass |
| Storage | NAS space warning for extroot/swap only plans; no warning with NAS or ≥ 1 GiB left | Pass |
| Storage | Select existing mount; folder layout and permissions | Pass |
| Users | Create (password policy, reserved names, duplicates), delete (home to trash) | Pass |
| SMB | Share list per user hides other private shares | Pass |
| SMB | Write to own share, Shared and Media; access to other user's share denied | Pass |
| SMB | 4 wrong passwords → correct password refused (Windows error 1909) | Pass |
| SMB | Admin unlock; password change | Pass |
| Folders | Unicode names, rename, trash; `..`, `../../etc`, `a:b`, newline names rejected | Pass |
| Folders | Planted symlink not listed and not operable | Pass |
| DLNA | Enable → minidlnad listening on 8200 with ROOT/media | Pass |
| UI | LuCI menu no longer hidden behind the page; Vazirmatn on "فارسی" button | Pass |
| UI | Switches render correctly under the Bootstrap theme's checkbox styles | Pass |
| UI | Persian/English, light/dark, phone width without horizontal scroll | Pass |
