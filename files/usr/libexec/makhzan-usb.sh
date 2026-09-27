#!/bin/sh
# Makhzan - USB NAS manager for OpenWrt
# Copyright (C) 2026 dreamboxone
# SPDX-License-Identifier: GPL-3.0-only
#
# This program is free software: you can redistribute it and/or modify it under the terms
# of the GNU General Public License version 3 as published by the Free Software Foundation.
# It is distributed WITHOUT ANY WARRANTY; see the LICENSE file for details.
# Shared helpers. Only physical USB SCSI disks/partitions are accepted; internal and virtual devices are rejected.
makhzan_usb_device() {
 usb_path=$1
 case "$usb_path" in /dev/sd[a-z]|/dev/sd[a-z][a-z]|/dev/sd[a-z][0-9]*|/dev/sd[a-z][a-z][0-9]*) ;; *) return 1;; esac
 [ -b "$usb_path" ] && [ ! -L "$usb_path" ] || return 1
 usb_name=${usb_path#/dev/}
 usb_sys=$(readlink -f "/sys/class/block/$usb_name") || return 1
 [ -n "$usb_sys" ] || return 1
 if [ -f "$usb_sys/partition" ]; then usb_parent=$(dirname "$usb_sys"); else usb_parent=$usb_sys; fi
 usb_disk=${usb_parent##*/}
 [ -b "/dev/$usb_disk" ] || return 1
 usb_hardware=$(readlink -f "$usb_parent/device") || return 1
 case "$usb_hardware" in /sys/devices/*/usb[0-9]*/*) ;; *) return 1;; esac
 [ ! -e "$usb_parent/dm" ] || return 1
 return 0
}
# Runs a command fully detached (own session, no terminal signals): rpcd kills commands after 30 s
# and package scripts may exit before background work finishes.
makhzan_spawn() {
 if command -v setsid >/dev/null; then
  setsid "$@" </dev/null >/dev/null 2>&1 &
 else
  ( trap '' HUP INT TERM; exec "$@" ) </dev/null >/dev/null 2>&1 &
 fi
}
# BusyBox on OpenWrt has no mountpoint(1); /proc/mounts is authoritative.
makhzan_mounted() {
 awk -v m="$1" '$2==m {found=1} END {exit !found}' /proc/mounts
}
# Internal overlay directory: /overlay on most targets, /rom/overlay on loop-backed eMMC targets.
makhzan_overlay_dir() {
 for usb_ov in /overlay /rom/overlay; do
  [ -d "$usb_ov/upper" ] && [ ! -L "$usb_ov" ] && { echo "$usb_ov"; return 0; }
 done
 return 1
}
makhzan_usb_mount() {
 usb_mount=$1
 [ "$(readlink -f "$usb_mount")" = "$usb_mount" ] || return 1
 case "$usb_mount" in /mnt/*|/srv/*) ;; *) return 1;; esac
 usb_source=$(awk -v m="$usb_mount" '$2==m && $3 ~ /^(ext[234]|btrfs|xfs)$/ && $4 ~ /(^|,)rw(,|$)/ {print $1; exit}' /proc/mounts)
 [ -n "$usb_source" ] && makhzan_usb_device "$usb_source"
}
# After a complete removal and reinstall, the group takes back the id that still owns the NAS folders ($1),
# so files left in Shared and Media stay readable; otherwise the next free system group id is used.
makhzan_group() {
 grep -q '^makhzan:' /etc/group && return 0
 . /lib/functions.sh
 grp_old=$([ -n "$1" ] && ls -ldn "$1" 2>/dev/null | awk '{print $4}')
 case "$grp_old" in ''|*[!0-9]*) grp_old='';; esac
 if [ -n "$grp_old" ] && [ "$grp_old" -ge 1000 ] && ! cut -d: -f3 /etc/group | grep -qx "$grp_old"; then
  group_add makhzan "$grp_old"
 else
  group_add_next makhzan >/dev/null
 fi
 grep -q '^makhzan:' /etc/group
}
# NAS layout: users/ (0711 root), shared/ (2770 root:makhzan), media/ (2775 root:makhzan, DLNA readable), trash (0700 root).
makhzan_layout() {
 lay_root=$1
 makhzan_usb_mount "$lay_root" || return 1
 for lay_dir in users shared media .makhzan-trash; do
  [ ! -L "$lay_root/$lay_dir" ] || return 1
  [ -e "$lay_root/$lay_dir" ] || mkdir "$lay_root/$lay_dir" || return 1
  makhzan_same_fs "$lay_root" "$lay_root/$lay_dir" || return 1
 done
 makhzan_group "$lay_root/shared" || return 1
 chmod a+x "$lay_root" &&
 chown root:root "$lay_root/users" "$lay_root/.makhzan-trash" && chmod 0711 "$lay_root/users" && chmod 0700 "$lay_root/.makhzan-trash" &&
 chown root:makhzan "$lay_root/shared" "$lay_root/media" && chmod 2770 "$lay_root/shared" && chmod 2775 "$lay_root/media" || return 1
 # Recreate missing private folders (e.g. after a new or re-partitioned disk) for Makhzan-managed accounts.
 for lay_user in $(awk -F: '$3>=1000 && $5=="makhzan" && $7=="/bin/false" {print $1}' /etc/passwd); do
  lay_home="$lay_root/users/$lay_user"
  [ -e "$lay_home" ] || [ -L "$lay_home" ] || { mkdir -m 0700 "$lay_home" && chown -h "$lay_user:makhzan" "$lay_home"; }
 done
 return 0
}
# A directory must be a real directory (not a symlink) on the filesystem mounted at the NAS root.
# stat(1) is not part of stock OpenWrt, so df -P reports the owning mount point.
makhzan_same_fs() {
 [ -d "$2" ] && [ ! -L "$2" ] || return 1
 [ "$(df -P "$2" 2>/dev/null | awk 'NR==2 {print $6}')" = "$1" ]
}
# Prints "MODE UID" of a path without following a final symlink.
makhzan_owner_mode() {
 ls -ldn "$1" 2>/dev/null | awk '{print $1, $3}'
}
