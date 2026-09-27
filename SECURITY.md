# Makhzan security model

Copyright (C) 2026 dreamboxone. SPDX-License-Identifier: GPL-3.0-only.
Distributed WITHOUT ANY WARRANTY; see LICENSE.

Scope: version 1.2.0, verified on OpenWrt 25.12.5 (ipq40xx) with samba4-server 4.22.
This document is not a certification.

## Trust boundaries

- The LuCI page and `/usr/sbin/makhzanctl` are for the router administrator only
  (rpcd ACL `luci-app-makhzan`). Never grant this ACL to end users.
- NAS users authenticate only over SMB. Their Unix accounts have GECOS `makhzan`,
  uid >= 1000, a locked password (`!`) and shell `/bin/false`; they cannot log in
  to SSH or LuCI.

## Controls

- **Input handling:** UI text is passed as separate argv elements through rpcd
  `file.exec`, never evaluated by a shell. Usernames match
  `^[a-z][a-z0-9_-]{0,30}$`; folder names reject `/ \ : * ? " < > |`, control
  bytes, `.`/`..`, trailing dots/spaces and names over 255 bytes. Existing system
  accounts are never adopted or modified.
- **Passwords** never appear in argv or logs. rpcd refuses exec environments
  for sessions, so the page writes a one-time file
  `/tmp/run/makhzan/secret.<32 random hex>` (mode 0600, directory 0700 root;
  the ACL allows writing only that pattern) and passes only the token. The
  backend checks owner and mode, reads the file, deletes it at once and pipes
  the password to `smbpasswd -s`. Unused files are purged after one minute.
  Root shell users may use `MAKHZAN_PASSWORD` instead.
- **Isolation:** each home is `ROOT/users/<name>`, owner the user, mode `0700`;
  `ROOT/users` is root `0711`. Each private SMB share has `valid users = <name>`
  and access-based share enumeration hides other users' shares. `Shared` is
  `2770 root:makhzan`, `Media` is `2775 root:makhzan`.
- **Read-only users** are listed in `makhzan.main.readonly` and added to the
  Samba `read list` of `Shared` and `Media`; their private share stays writable.
- **Media library:** an existing NTFS, exFAT, FAT or ext partition on a USB disk
  is mounted `ro` at `/mnt/makhzan-library` (FAT/NTFS/exFAT with owner root,
  group `makhzan`, files 0644, directories 0755) and shared as `Library` with
  `read only = yes` for `@makhzan`. It is never formatted or written.
- **Remote access (WireGuard):** interface `makhzan_wg` in its own firewall zone
  with input and forward `REJECT`; only TCP 445 (SMB) and ICMP echo are accepted
  from the tunnel, and only the chosen UDP port is opened on WAN. Each user gets
  a separate key pair and a /32 tunnel address; the client config routes only
  the router's LAN address (`AllowedIPs = <lan>/32`). SMB still requires the
  user's password and lockout applies. Revoking a user deletes their peer;
  turning the feature off deletes the interface, all peers and all rules.
  Keys live in `/etc/config/network` like any OpenWrt WireGuard setup; the
  client private key is kept so the administrator can show the QR code again.
- **Symlinks:** SMB1 unix extensions are disabled, Samba's default
  `wide links = no` applies, and every Makhzan folder operation refuses symlinks
  (`-L` checks, `mv -n -T`, `chown -h`, `mkdir -m` instead of chmod on
  user-writable paths). Only root can create symlinks on the NAS.
- **Lockout:** Samba `tdbsam` account policy: 4 bad passwords lock the account
  for 15 minutes (reset window 15 minutes). The policy is re-applied at boot
  because Samba stores it under `/var`.
- **Storage:** only physical USB block devices (sysfs ancestry under `usb*`,
  no loop, mmc, mtd, device-mapper) are partitioned or accepted as NAS roots.
  NAS roots must be canonical mount points below `/mnt` or `/srv` with a
  writable ext2/3/4, btrfs or xfs filesystem. Destructive plans require the
  typed token `ERASE:<disk>:<extroot>:<swap>:<nas>` and refuse mounted disks,
  active swap and device-mapper/RAID holders.
- **Concurrency:** mutating commands are serialized with a lock directory;
  disk preparation runs as a detached job with its own lock (rpcd kills
  commands after 30 s).

## Known limitations

- The router's root user can read and change everything.
- DLNA has no authentication; `Media` and the media library are readable by
  every LAN device.
- A WireGuard QR code or config file is a credential: anyone holding it can
  reach the SMB port until it is revoked (SMB passwords are still required).
- Lockout uses the wall clock and is not active during the first seconds of boot.
- Makhzan appends tdbsam, access-based share enumeration, unix extensions
  off and `map to guest = Never` to `/etc/samba/smb.conf.template`; this
  affects other Samba shares (guest shares stop working).
  Removal takes out the last two and keeps tdbsam, because accounts created
  under tdbsam cannot be exported back to smbpasswd without losing them.
- No quotas; no transactional rollback of service configuration.

## Reporting

Report security issues privately via https://t.me/routekernel1.
