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
| Storage | From the LuCI page: release disk, then erase-apply NAS-only plan as a detached job with progress | Pass |
| Storage | Stale swap signature auto-activated by hotplug on the new partition is released before formatting | Pass |
| Storage | After re-partitioning: empty private homes recreated (0700), shares restored, MiniDLNA restarted on the new disk | Pass |
| Storage | NAS space warning for extroot/swap only plans; no warning with NAS or ≥ 1 GiB left | Pass |
| Storage | Select existing mount; folder layout and permissions | Pass |
| Users | Create (password policy, reserved names, duplicates), delete (home to trash) | Pass |
| SMB | Share list per user hides other private shares | Pass |
| SMB | Write to own share, Shared and Media; access to other user's share denied | Pass |
| SMB | 4 wrong passwords → correct password refused (Windows error 1909) | Pass |
| SMB | Admin unlock; password change | Pass |
| Auth | Password handover under a restricted rpcd session: one-time 0600 file, deleted on use; forged token and writes outside the allowed path refused | Pass |
| Auth | Creating an existing username reports "already exists" | Pass |
| Auth | From the LuCI page: create user, change password, folders (Unicode create/rename/delete) | Pass |
| Boot | Reboot: NAS auto-mounted, Samba shares, lockout policy (re-applied from RAM) and MiniDLNA restored; files kept | Pass |
| Boot | After reboot: 4 wrong passwords lock the account (Windows "locked out"), page shows the lock, Unlock button restores access | Pass |
| Folders | Unicode names, rename, trash; `..`, `../../etc`, `a:b`, newline names rejected | Pass |
| Folders | Planted symlink not listed and not operable | Pass |
| DLNA | Enable → minidlnad listening on 8200 with ROOT/media | Pass |
| DLNA | Files copied into Media over SMB (Persian names) indexed automatically; video played in VLC on Windows via UPnP; server advertised as "Makhzan" | Pass |
| SMB | Windows opens a private share with a password prompt (unknown Windows accounts are rejected, not mapped to guest) | Pass |
| UI | LuCI menu no longer hidden behind the page; Vazirmatn on "فارسی" button | Pass |
| UI | Switches render correctly under the Bootstrap theme's checkbox styles | Pass |
| UI | Dialogs use Makhzan colors in light/dark, RTL title in Vazirmatn, LTR disk names | Pass |
| UI | Persian/English, light/dark, phone width without horizontal scroll | Pass |
| Extroot | Plan extroot 977 MiB + NAS from the page; overlay copied; after reboot "mount_root: switched to extroot" on a /rom/overlay target | Pass |
| Extroot | Page reports extroot active; extroot-off refused while active with the power-off/unplug steps | Pass |
| Hardware | Double restart after reboot traced to a hardware reset (no shutdown sequence in a persistent log, no kernel crash record) while powered by a 1 A adapter; Google WiFi requires 5 V / 3 A | Documented |
| Release | Router downloaded v1.1.0 from GitHub Releases, SHA256SUMS verified, upgraded r9 → r11; settings re-applied automatically | Pass |
| Extroot | "Configured but inactive" state shown; Turn off extroot button disables it (state becomes off) | Pass |
| SMB | VLC mDNS discovery lists only the user's own share plus Media and Shared | Pass |
| DLNA | VLC Universal Plug'n'Play shows the "Makhzan" server with Browse Folders/Music/Pictures/Video; video listed and playable | Pass |
| CI | GitHub Actions: apk and ipk installed and exercised on x86_64, aarch64 and armv7l OpenWrt containers | Pass |
