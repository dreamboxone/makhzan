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
| SMB | Android (SMB file manager): lists only the user's share plus Media and Shared; upload to Media stored as ali:makhzan 0664 and indexed by DLNA automatically | Pass |

## Version 1.2.0 (2026-09-27)

Same device, plus a second USB disk formatted NTFS on Windows (media library test).

| Area | Test | Result |
|---|---|---|
| Usage | Space usage scanned in the background (per user, Shared, Media, trash); first status reports "calculating", later filled; cache refreshed every 5 minutes | Pass |
| Usage | Disk-full warning at 90% and error at 97% of the file server | Pass (UI preview) |
| Trash | Restore a Persian-named folder into the owner's private folder; name clash restored as "name (2)" | Pass |
| Trash | Home of a deleted user refused until the user is created again, then restored as "Recovered 2026-09-27"; `..` and path input rejected | Pass |
| DLNA | Rescan rebuilds the library database and re-indexes Media | Pass |
| Users | Read-only user from Windows: Shared readable, writing to Shared denied, own private folder writable | Pass |
| Time Machine | `fruit` settings and `timemachine` / `timemachine_maxsize = 200G` on private shares; removed again when turned off | Pass (configuration level; no Mac available) |
| Spin-down | 15 minutes → `hd-idle -a sda -i 900` running; 0 stops it | Pass (configuration level; flash drive) |
| Disk check | Check-and-repair job: shares stopped, `e2fsck` clean in about 7 s, shares and DLNA restarted | Pass |
| Library | NTFS disk mounted read-only with ntfs3; `Library` share and DLNA indexing; Windows opens a Persian folder name and plays a 21 MB video; writes denied; off/on; invalid input rejected | Pass |
| Remote | WireGuard end to end with the client in a network namespace: handshake; SMB (445) reachable; SSH (22), LuCI (80) and DLNA (8200) refused | Pass |
| Remote | Turning remote access off removes the interface, peers and firewall rules | Pass |
| UI | Tabs (Home, Users, Services, Disk, Remote access, Recovery trash), QR dialog, Light (sun) / Dark (moon) switch, Persian/English, phone width: no script errors, no horizontal scroll | Pass (UI preview) |
| UI | Card and plan accent bars follow the rounded corners (automated corner check on every tab, light and dark); tab bar has no scrollbar line on phones | Pass (UI preview) |
| UI | Tab order Home, Disk, Users, Services, Remote access, Recovery trash; first visit without ready storage opens Disk; Home and Users show "prepare the disk" with a button to the Disk tab | Pass (UI preview) |
| UI | With SMB off the Users tab offers "Turn on SMB" (creating a user with SMB off is refused by the backend) | Pass |
| UI | Traced wordmark logo in the hero (white/cyan) and footer (indigo-violet/cyan, light variant in dark mode); README logo with light/dark variants; phone width without horizontal scroll | Pass (UI preview) |

## Version 1.2.0-r5 (2026-09-27)

Same Google WiFi device on OpenWrt 25.12.5. The package had already been removed; the previous NAS entry remained in fstab and its disk was connected but unmounted. Earlier removal/reinstall results above describe the older releases, whose account-preservation behavior has changed in r5.

| Area | Test | Result |
|---|---|---|
| Build | APK and IPK rebuilt with local OpenWrt SDKs; shell/JavaScript syntax, all 115 backend translations and diff whitespace checked | Pass |
| Package | Install rebuilt r5 APK with missing dependencies; installed package checksum matches local artifact | Pass |
| Storage/UI | Open the actual LuCI page with NAS unmounted: old USB ext4 partition reconnects at `/mnt/makhzan`, status reports ready and Existing storage contains the same path | Pass |
| Trash | Previous private homes for `ali` and `kid` remain in recovery trash; managed account list is empty after reinstall | Pass |
| Group | Recreated `makhzan` group has GID `32769`, matching the numeric ownership retained on Shared, Media and the old homes | Pass |
| Removal | Isolated-container CI covers removal of all runtime files, config, managed account and group; saved fstab and disk-folder fixture retained; reinstall restores defaults and previous free GID | Automated regression in `.github/scripts/smoke-test.sh` |

The live router was not repartitioned, and its recovery trash was not restored or emptied during this verification. SMB/DLNA settings remain off after the fresh installation, as expected after complete removal.

## Version 2.0.0 (2026-10-06)

Same Google WiFi device on OpenWrt 25.12.5, curl 8.22.0, 16 GB USB flash drive as NAS. Download tests use
`scripts/test-download-router.py`, which serves a private HTTP fixture to the router over an SSH tunnel,
uses only its own test jobs and restores the downloader settings afterwards.

| Area | Test | Result |
|---|---|---|
| Downloads | Space check refuses a 100 TB file and a link without a size; repeated add with the same request token queues once; real transfer, SHA-256 of the saved file, rename, deletion | Pass |
| Downloads | Pause mid-transfer, resume by byte range, elapsed time kept | Pass |
| Downloads | Two concurrent files, speed and ETA, pause all / resume all, deletion during transfer | Pass |
| Downloads | Connection dropped mid-file: automatic retry after the configured interval completes the file | Pass |
| Downloads | HTTP Basic credentials passed through a one-time root-only token | Pass |
| Downloads | Future Persian-date schedule survives a service restart; queued deletion | Pass |
| Downloads | Total bandwidth limit removed (unlimited) | Pass |
| Downloads | "Download" starts at once with the manager off, past a busy queue slot and outside download hours; 1-6 simultaneous files accepted, 7 refused | Pass |
| Downloads | 8 MiB file in 4 range segments, paused and resumed; joined file hash matches the source; category detected | Pass |
| Downloads | SHA-256 and MD5 verification; mismatch fails the job; invalid checksum refused | Pass |
| Downloads | Duplicate link refused; reorder top/up/down/bottom; clear cancelled items | Pass |
| Downloads | Custom Referer, User-Agent and Cookie sent; per-job config file is mode 0600 | Pass |
| Downloads | Per-download speed limit (64 KB/s), new link for a paused job resumes by range, download again | Pass |
| Downloads | Download hours: outside the window the job waits with 0 bytes, inside it runs; start now over a future schedule | Pass |
| Downloads | Real 2 GiB file from a public mirror with "Download": 8 parallel range connections, about 2 MB/s, validator recorded for resume | Pass |
| Disk planner | Current layout reported per disk (labels `makhzan-nas/swap/extroot`, size, in use); NAS tile on with its size after allocation | Pass |
| Disk planner | Switch refuses a role when no space is left; typed sizes clamp to the remaining space; "Use all remaining" fills it exactly | Pass (UI with recorded router data) |
| Storage | NAS recreated with `mkfs.ext4 -m 0`: free space 15.4 GB of 15.4 GB (14.6 GB with the default 5% reserve) | Pass |
| UI | `calendar.js` loads as a LuCI class under a build-stamped name; every module the view requires is installed (smoke test) | Pass |
| UI | All seven tabs at 375 px: no horizontal scroll, nothing outside the viewport, no clipped text, no small tap targets | Pass (UI with recorded router data) |
| UI | Light theme gives native controls (number spinners, time pickers) light colors under a dark LuCI theme; dark theme dark | Pass (UI with recorded router data) |
| UI | Disk job result shown once with a close button; gone after reload; results older than ten minutes not shown | Pass (UI with recorded router data) |
| UI | "No disk detected" when no USB disk is plugged in, "Storage is not ready" when a disk is present but not prepared | Pass (UI with recorded router data) |

"UI with recorded router data" means the real view rendered in a browser with its backend calls answered from
JSON captured on the router, because the test browser was not signed in to LuCI.

## Version 2.0.2 (2026-10-06)

Builds on 2.0.0 (2.0.1 was published from an older local revision and is superseded).

| Area | Test | Result |
|---|---|---|
| Downloads | Search button and Enter filter the queue by filename or link; no match shows "Nothing matches these filters"; button stays on the search line at 375 px | Pass (UI with recorded router data) |
| Downloads | Queue refresh no longer depends on LuCI's poller: when it is stopped the queue reloads every 3 seconds on its own timer | Installed on the router; to be confirmed in a signed-in browser |
