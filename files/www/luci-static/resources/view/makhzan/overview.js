/*
 * Makhzan - USB NAS manager for OpenWrt
 * Copyright (C) 2026 dreamboxone
 * SPDX-License-Identifier: GPL-3.0-only
 *
 * This program is free software: you can redistribute it and/or modify it under the terms
 * of the GNU General Public License version 3 as published by the Free Software Foundation.
 * It is distributed WITHOUT ANY WARRANTY; see the LICENSE file for details.
 */
'use strict';
'require view';
'require rpc';
'require fs';
'require ui';
'require poll';

var VERSION = '1.2.0';
/* Replaced with VERSION-RELEASE at package build time; busts the browser cache for theme.css. */
var BUILD = '@MAKHZAN_BUILD@';
var callExec = rpc.declare({ object: 'file', method: 'exec', params: [ 'command', 'params', 'env' ] });

function call(args) {
	return callExec('/usr/sbin/makhzanctl', args.map(String)).then(function(r) {
		var out;
		if (typeof r !== 'object' || r === null)
			throw new Error('Access denied or backend unavailable (' + r + ')');
		try { out = JSON.parse(r.stdout); }
		catch (e) { throw new Error(String(r.stderr || r.stdout || 'Invalid backend response').trim()); }
		if (out.ok === false)
			throw new Error(out.error);
		return out;
	});
}

/* Passwords never go into argv: write a one-time 0600 file in the root-only /tmp/run/makhzan (/var/run is a symlink; rpcd checks canonical paths) and pass
 * only its random token; the backend reads and deletes it at once. (rpcd refuses exec environments.) */
function sendPassword(password) {
	var bytes = new Uint8Array(16), token = '';
	window.crypto.getRandomValues(bytes);
	for (var i = 0; i < bytes.length; i++) token += ('0' + bytes[i].toString(16)).slice(-2);
	return fs.write('/tmp/run/makhzan/secret.' + token, password, 384).then(function() { return token; }, function() {
		/* rpcd grants ACLs at login: sessions opened before an install/upgrade lack the write permission. */
		throw new Error('Could not hand over the password securely. Log out of LuCI and log in again (needed once after installing or upgrading Makhzan), then retry.');
	});
}

/* Stroke icons (24x24, currentColor), drawn for Makhzan. Static strings only; never user data. */
var ICONS = {
	folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
	folderPlus: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 10.5v6M9 13.5h6"/>',
	key: '<circle cx="8" cy="15" r="4"/><path d="M10.8 12.2 20 3M17 6l3 3M15 8l2 2"/>',
	unlock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.6-1.8"/>',
	lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
	trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
	userPlus: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M19 8v6M16 11h6"/>',
	users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 4.2a4 4 0 0 1 0 7.6M22 21a7 7 0 0 0-4-6.3"/>',
	user: '<circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/>',
	drive: '<rect x="3" y="13" width="18" height="7" rx="2"/><path d="M5 13l3-8h8l3 8M7 16.5h.01M11 16.5h.01"/>',
	usb: '<path d="M12 3v13"/><circle cx="12" cy="19" r="2.5"/><path d="M12 14l-5-3V8M12 12l5-3V6"/><rect x="5.5" y="5" width="3" height="3"/><circle cx="17" cy="5" r="1.5"/>',
	server: '<rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6.5h.01M7 17.5h.01M11 6.5h6M11 17.5h6"/>',
	tv: '<rect x="2" y="5" width="20" height="13" rx="2"/><path d="M8 21h8M10 9l5 2.5-5 2.5z"/>',
	pie: '<path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
	pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
	refresh: '<path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4"/>',
	moon: '<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>',
	sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
	globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
	pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
	check: '<path d="M5 12l5 5 9-10"/>',
	x: '<path d="M6 6l12 12M18 6 6 18"/>',
	alert: '<path d="M12 3 2 21h20z"/><path d="M12 10v5M12 18h.01"/>',
	eject: '<path d="M5 14h14l-7-9z"/><path d="M5 19h14"/>',
	layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 12.5l9 5 9-5M3 16.5l9 5 9-5"/>',
	shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
	link: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
	send: '<path d="M21 3 3 10.5l7 2.5 2.5 7z"/><path d="M10 13 21 3"/>',
	sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
	maximize: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
	home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
	restore: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
	wrench: '<path d="M14.5 4.5a4.5 4.5 0 0 0 5 6.2L11 19.2a2.1 2.1 0 0 1-3-3l8.5-8.5a4.5 4.5 0 0 1-2-3.2z"/>',
	qr: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>',
	download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
	book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M9 7h6"/>',
	clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
	power: '<path d="M12 3v9"/><path d="M6.4 6.4a8 8 0 1 0 11.2 0"/>',
	eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'
};
function icon(name, cls) {
	var s = E('span', { 'class': 'mk-ico ' + (cls || ''), 'aria-hidden': 'true' });
	s.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>';
	return s;
}
/* Makhzan logo: a storage drum («مخزن» = reservoir) on a cyan-indigo-magenta tile. */
function logo(size) {
	var s = E('span', { 'class': 'mk-logo', 'aria-hidden': 'true' });
	s.innerHTML = '<svg viewBox="0 0 64 64" width="' + size + '" height="' + size + '"><defs><linearGradient id="mk-logo-g" x1="0" y1="0" x2="1" y2="1">' +
		'<stop offset="0" stop-color="#22d3ee"/><stop offset=".5" stop-color="#6366f1"/><stop offset="1" stop-color="#d946ef"/></linearGradient></defs>' +
		'<rect width="64" height="64" rx="18" fill="url(#mk-logo-g)"/>' +
		'<path d="M17 20v24c0 3.6 6.7 6.5 15 6.5s15-2.9 15-6.5V20" fill="#ffffff26" stroke="#fff" stroke-width="3.2" stroke-linejoin="round"/>' +
		'<path d="M17 28.5c0 3.6 6.7 6.5 15 6.5s15-2.9 15-6.5M17 36.5c0 3.6 6.7 6.5 15 6.5s15-2.9 15-6.5" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>' +
		'<ellipse cx="32" cy="20" rx="15" ry="6.5" fill="#fff"/><circle cx="41" cy="45.2" r="1.9" fill="#a7f3d0"/></svg>';
	return s;
}

/* Persian translations of backend errors; unknown messages are shown as-is. */
var FA_ERRORS = {
	'Another operation is running; wait until it completes': 'عملیات دیگری در حال اجراست؛ کمی صبر کنید.',
	'Another storage operation is running': 'عملیات دیگری روی حافظه در حال اجراست.',
	'USB storage is not ready: select a mounted USB ext4 disk': 'حافظهٔ USB آماده نیست؛ یک دیسک USB با فایل‌سیستم ext4 انتخاب کنید.',
	'USB storage is not ready': 'حافظهٔ USB آماده نیست.',
	'Unsafe storage layout': 'ساختار پوشه‌های حافظه ناامن است.',
	'Storage root must be below /mnt or /srv': 'مسیر حافظه باید زیر /mnt یا /srv باشد.',
	'Selected path is not an existing canonical mount point': 'این مسیر یک نقطهٔ mount معتبر نیست.',
	'Only a mounted USB flash drive or USB hard disk with ext2/3/4, btrfs or xfs is allowed': 'فقط فلش یا هارد USB با فایل‌سیستم ext2/3/4، btrfs یا xfs مجاز است.',
	'Username must be 1-31 lowercase letters, numbers, _ or -, and not a reserved share name': 'نام کاربری باید ۱ تا ۳۱ حرف کوچک انگلیسی، عدد، _ یا - باشد و نام رزرو‌شده نباشد.',
	'This username already exists on the router': 'این نام کاربری از قبل وجود دارد (روی روتر یا در مخزن). نام دیگری انتخاب کنید.',
	'Password transfer failed; try again': 'انتقال امن رمز ناموفق بود؛ دوباره تلاش کنید.',
	'Could not hand over the password securely. Log out of LuCI and log in again (needed once after installing or upgrading Makhzan), then retry.': 'رمز به‌صورت امن ارسال نشد. یک بار از LuCI خارج شوید (Log out) و دوباره وارد شوید، سپس دوباره امتحان کنید. این کار فقط یک بار بعد از نصب یا ارتقای مخزن لازم است.',
	'Password must be 8-64 characters without control characters': 'رمز باید ۸ تا ۶۴ نویسه باشد.',
	'samba4-server is not installed': 'بستهٔ samba4-server نصب نیست.',
	'minidlna is not installed': 'بستهٔ minidlna نصب نیست.',
	'Enable SMB and apply service settings first': 'ابتدا SMB را روشن کنید.',
	'Unknown Makhzan user': 'کاربر یافت نشد.',
	'Invalid folder name': 'نام پوشه نامعتبر است (کاراکترهای / \\ : * ? " < > | مجاز نیستند).',
	'A file or folder with this name already exists': 'فایل یا پوشه‌ای با این نام وجود دارد.',
	'A file or folder with the new name already exists': 'فایل یا پوشه‌ای با نام جدید وجود دارد.',
	'Folder not found': 'پوشه پیدا نشد.',
	'Private folder is missing or unsafe': 'پوشهٔ خصوصی کاربر وجود ندارد یا ناامن است.',
	'Select a whole USB disk': 'یک دیسک کامل USB انتخاب کنید.',
	'Selected sizes exceed usable capacity': 'مجموع اندازه‌ها از ظرفیت دیسک بیشتر است.',
	'Extroot is too small for existing overlay plus reserve': 'اندازهٔ extroot برای اطلاعات فعلی روتر کافی نیست.',
	'Disk is mounted; release it first. Active extroot requires internal-storage reboot': 'دیسک در حال استفاده است؛ ابتدا «آزادسازی دیسک» را بزنید.',
	'Disk contains active swap; release it first': 'swap این دیسک فعال است؛ ابتدا «آزادسازی دیسک» را بزنید.',
	'NAS target is already mounted; release it first': 'حافظهٔ NAS فعلی در حال استفاده است؛ ابتدا آن را آزاد کنید.',
	'This disk holds the active extroot; disable extroot and reboot first': 'extroot فعال روی این دیسک است و قابل آزادسازی نیست.',
	'Explicit erase confirmation is missing': 'تأیید پاک‌کردن دیسک انجام نشده است.',
	'Samba configuration or restart failed': 'تنظیم یا راه‌اندازی مجدد Samba ناموفق بود.',
	'Unsupported overlay layout; extroot is not available on this router': 'extroot روی این روتر پشتیبانی نمی‌شود.',
	'Disk preparation was interrupted': 'آماده‌سازی دیسک نیمه‌کاره متوقف شد (مثلاً با قطع برق). طرح را دوباره اجرا کنید.',
	'Extroot is active: power off, unplug the USB disk, power on, then turn extroot off': 'extroot فعال است: روتر را خاموش کنید، USB را جدا کنید، روشن کنید و سپس extroot را خاموش کنید.',
	'A new partition was auto-mounted and could not be released': 'پارتیشن تازه خودکار mount شد و آزاد نشد؛ دیسک را جدا و دوباره وصل کنید و دوباره امتحان کنید.',
	'A partition is still in use; close open files and retry': 'یکی از پارتیشن‌ها هنوز در حال استفاده است؛ فایل‌های باز را ببندید و دوباره امتحان کنید.',
	'A required storage tool is missing': 'یکی از ابزارهای لازم دیسک نصب نیست (parted، e2fsprogs، swap-utils یا block-mount).',
	'Account could not be removed': 'حساب کاربر حذف نشد.',
	'Account could not be unlocked': 'قفل حساب باز نشد.',
	'Cannot mount extroot staging': 'پارتیشن extroot برای کپی اطلاعات mount نشد.',
	'Configuration save failed': 'ذخیرهٔ تنظیمات ناموفق بود.',
	'Disable the existing Afzoon extroot configuration before creating another': 'ابتدا extroot ساخته‌شده با برنامهٔ افزون را غیرفعال کنید.',
	'Disk has active device-mapper or RAID holders': 'دیسک در RAID یا رمزنگاری (device-mapper) در حال استفاده است و پاک نمی‌شود.',
	'Extroot UUID missing': 'شناسهٔ (UUID) پارتیشن extroot پیدا نشد.',
	'Extroot activation configuration failed': 'تنظیم فعال‌سازی extroot ذخیره نشد.',
	'Extroot formatting failed': 'فرمت پارتیشن extroot ناموفق بود.',
	'Extroot minimum is 128 MiB': 'حداقل اندازهٔ extroot حدود ۱۳۴ مگابایت است.',
	'Folder could not be created': 'پوشه ساخته نشد.',
	'Folder could not be moved to trash': 'پوشه به سطل بازیابی منتقل نشد.',
	'Folder could not be renamed': 'نام پوشه تغییر نکرد.',
	'Invalid language': 'زبان نامعتبر است.',
	'Invalid option': 'گزینهٔ نامعتبر.',
	'Job state could not be written': 'وضعیت عملیات دیسک ذخیره نشد.',
	'Kernel partition refresh failed': 'سیستم جدول پارتیشن تازه را نخواند؛ دیسک را جدا و وصل کنید و دوباره امتحان کنید.',
	'MiniDLNA configuration or restart failed': 'تنظیم یا راه‌اندازی مجدد DLNA ناموفق بود.',
	'Mount configuration save failed': 'ذخیرهٔ تنظیمات mount ناموفق بود.',
	'NAS USB mount verification failed': 'بررسی mount شدن دیسک NAS ناموفق بود.',
	'NAS UUID missing': 'شناسهٔ (UUID) پارتیشن NAS پیدا نشد.',
	'NAS folder layout failed': 'ساخت پوشه‌های NAS ناموفق بود.',
	'NAS formatting failed': 'فرمت پارتیشن NAS ناموفق بود.',
	'NAS minimum is 32 MiB': 'حداقل اندازهٔ فایل‌سرور حدود ۳۴ مگابایت است.',
	'NAS mount failed': 'mount کردن پارتیشن NAS ناموفق بود.',
	'Overlay copy failed; extroot remains disabled': 'کپی اطلاعات روتر روی USB ناموفق بود؛ extroot غیرفعال ماند.',
	'Partition creation failed; disk may be partially partitioned': 'ساخت پارتیشن ناموفق بود؛ ممکن است دیسک نیمه‌کاره پارتیشن‌بندی شده باشد. طرح را دوباره اجرا کنید.',
	'Partition device did not appear': 'پارتیشن جدید در سیستم ظاهر نشد؛ دیسک را جدا و وصل کنید و دوباره امتحان کنید.',
	'Partition is not on a physical USB disk': 'پارتیشن روی یک دیسک فیزیکی USB نیست.',
	'Partition table creation failed': 'ساخت جدول پارتیشن ناموفق بود.',
	'Private folder could not be moved to recovery trash': 'پوشهٔ خصوصی به سطل بازیابی منتقل نشد.',
	'Private folder is not a regular NAS folder': 'پوشهٔ خصوصی یک پوشهٔ عادی روی NAS نیست.',
	'Recovery trash is unavailable': 'سطل بازیابی در دسترس نیست.',
	'Samba password could not be changed': 'رمز Samba تغییر نکرد.',
	'Samba password could not be set': 'رمز Samba تنظیم نشد.',
	'Samba template could not be prepared': 'آماده‌سازی تنظیمات Samba ناموفق بود.',
	'Select at least one role': 'حداقل یکی از سه گزینه (افزایش فضای روتر، حافظهٔ مجازی یا فایل‌سرور) را روشن کنید.',
	'Sizes must be nonnegative integer MiB': 'اندازه‌ها باید عدد صحیح و مثبت باشند.',
	'Staged mount configuration failed': 'کپی تنظیمات mount روی extroot ناموفق بود.',
	'Staging directory failed': 'پوشهٔ موقت برای کپی ساخته نشد.',
	'Staging unmount failed': 'جدا کردن پارتیشن موقت ناموفق بود.',
	'Storage job started without its lock': 'عملیات دیسک درست شروع نشد؛ دوباره امتحان کنید.',
	'Swap UUID missing': 'شناسهٔ (UUID) پارتیشن swap پیدا نشد.',
	'Swap activation failed': 'فعال‌سازی swap ناموفق بود.',
	'Swap could not be disabled': 'swap غیرفعال نشد.',
	'Swap formatting failed': 'ساخت swap ناموفق بود.',
	'Swap minimum is 16 MiB': 'حداقل اندازهٔ حافظهٔ مجازی حدود ۱۷ مگابایت است.',
	'Trash could not be emptied': 'سطل بازیابی خالی نشد.',
	'USB identity changed; refusing to write': 'دیسک USB عوض شده است؛ برای جلوگیری از پاک‌شدن دیسک اشتباه، کاری انجام نشد.',
	'Unable to create local account': 'حساب کاربر ساخته نشد.',
	'Unable to create the private folder (a folder with this name may already exist)': 'پوشهٔ خصوصی ساخته نشد (شاید پوشه‌ای با همین نام روی دیسک وجود دارد).',
	'Unknown command': 'دستور ناشناخته.',
	'Unknown storage action': 'عملیات دیسک ناشناخته.',
	'Unsupported MiniDLNA configuration': 'تنظیمات DLNA پشتیبانی نمی‌شود (فایل /etc/config/minidlna ناقص است).',
	'Unsupported overlay layout': 'ساختار حافظهٔ روتر برای extroot پشتیبانی نمی‌شود.',
	'User created, but Samba restart failed': 'کاربر ساخته شد، ولی راه‌اندازی مجدد Samba ناموفق بود.',
	'User removed, but Samba restart failed': 'کاربر حذف شد، ولی راه‌اندازی مجدد Samba ناموفق بود.',
	'Cannot create group': 'گروه makhzan ساخته نشد.',
	'Enable DLNA first': 'ابتدا DLNA را روشن کنید.',
	'Enter the public IP address or DDNS name of the router': 'آدرس IP عمومی یا نام DDNS روتر را وارد کنید (فقط حروف انگلیسی، عدد، نقطه و خط تیره).',
	'No free address range for remote access': 'محدودهٔ آدرس آزادی برای دسترسی از بیرون پیدا نشد.',
	'Only ext2, ext3 and ext4 disks can be checked': 'فقط دیسک‌های ext2، ext3 و ext4 را می‌توان بررسی کرد.',
	'Partition not found': 'پارتیشن پیدا نشد.',
	'Port must be between 1024 and 65535': 'شمارهٔ پورت باید بین ۱۰۲۴ و ۶۵۵۳۵ باشد.',
	'Remote access configuration is incomplete': 'تنظیمات دسترسی از بیرون ناقص است؛ آن را خاموش و دوباره روشن کنید.',
	'The disk could not be mounted again; reconnect it': 'دیسک دوباره وصل نشد؛ فلش یا هارد را جدا و دوباره وصل کنید.',
	'The disk is busy; close open files and try again': 'دیسک در حال استفاده است؛ فایل‌های باز را ببندید و دوباره امتحان کنید.',
	'The disk operation was interrupted': 'عملیات دیسک نیمه‌کاره متوقف شد (مثلاً با قطع برق). دوباره اجرا کنید.',
	'The item could not be restored': 'بازیابی انجام نشد.',
	'The kernel driver for this filesystem is not installed': 'درایور این نوع فایل‌سیستم نصب نیست؛ بستهٔ گفته‌شده را از System ← Software نصب کنید.',
	'The media library disk could not be mounted': 'دیسک کتابخانهٔ رسانه وصل نشد.',
	'The owner of this item no longer exists; create a user with the same name first': 'صاحب این مورد دیگر وجود ندارد؛ ابتدا کاربری با همان نام بسازید.',
	'This partition is already used by Makhzan': 'این پارتیشن را خود مخزن استفاده می‌کند (فایل‌سرور، extroot یا swap).',
	'This user has no remote access yet': 'برای این کاربر هنوز دسترسی از بیرون ساخته نشده است.',
	'Time Machine needs the Samba fruit module': 'Time Machine به ماژول fruit در Samba نیاز دارد که روی این روتر نیست.',
	'Trash item not found': 'این مورد در سطل بازیابی پیدا نشد.',
	'Turn on remote access first': 'ابتدا دسترسی از بیرون را روشن کنید.',
	'Unsupported filesystem for the media library': 'این نوع فایل‌سیستم برای کتابخانهٔ رسانه پشتیبانی نمی‌شود.',
	'WireGuard is not installed': 'WireGuard نصب نیست (بسته‌های kmod-wireguard و wireguard-tools).',
	'WireGuard key could not be created': 'کلید WireGuard ساخته نشد.',
	'hd-idle is not installed': 'بستهٔ hd-idle نصب نیست.'
};

function bytes(kib) {
	var mb = Number(kib || 0) * 1024 / 1e6;
	return mb >= 1000 ? (mb / 1000).toFixed(1) + ' GB' : mb.toFixed(0) + ' MB';
}
/* Isolated left-to-right number with unit, so RTL text never shows "GB 5.5". */
function num(text) { return E('bdi', { 'dir': 'ltr' }, text); }
function mibToMB(mib) { return Math.floor(Number(mib || 0) * 1.048576); }
function mbToMiB(mb) { return Math.ceil(Number(mb || 0) / 1.048576); }

return view.extend({
	load: function() {
		return Promise.all([ call([ 'status' ]), call([ 'storage-devices' ]).catch(function() { return { devices: [] }; }) ]);
	},

	render: function(initial) {
		var data = initial[0], devices = initial[1].devices || [], fa = data.language === 'fa';
		function t(p, e) { return fa ? p : e; }
		function msgOf(e) { var m = String(e && e.message || e); return fa && FA_ERRORS[m] ? FA_ERRORS[m] : m; }
		function notify(e) { ui.addNotification(null, E('p', {}, msgOf(e)), 'error'); }
		/* Colored action button: tone is one of primary, success, warn, danger, glass, or soft-{blue,violet,amber,green,red}. */
		/* Errors are shown right next to the button that caused them (not in LuCI's top banner). */
		function inlineError(b, e) {
			var old = b.nextElementSibling;
			if (old && old.classList.contains('mk-inline-error')) old.remove();
			var note = E('span', { 'class': 'mk-inline-error', 'role': 'alert' }, [ icon('alert'), E('span', {}, msgOf(e)) ]);
			b.insertAdjacentElement('afterend', note);
			window.setTimeout(function() { if (note.isConnected) note.remove(); }, 8000);
		}
		function btn(text, fn, tone, ico) {
			var b = E('button', { 'type': 'button', 'class': 'mk-btn ' + (tone || 'primary'), 'click': function() {
				if (b.dataset.running === '1') return;
				var old = b.nextElementSibling;
				if (old && old.classList.contains('mk-inline-error')) old.remove();
				b.dataset.running = '1'; b.disabled = true; b.classList.add('mk-running');
				Promise.resolve().then(fn).catch(function(e) { b.isConnected ? inlineError(b, e) : notify(e); })
					.finally(function() { b.dataset.running = '0'; b.disabled = b.dataset.locked === '1'; b.classList.remove('mk-running'); });
			} }, [ ico ? icon(ico) : '', E('span', {}, text) ]);
			return b;
		}
		function card(title, body, color, ico, extraClass) {
			return E('section', { 'class': 'mk-card ' + (extraClass || ''), 'style': '--accent:' + color }, [
				E('h3', { 'class': 'mk-card-title' }, [ ico ? E('span', { 'class': 'mk-badge-ico' }, icon(ico)) : '', E('span', {}, title) ])
			].concat(body));
		}
		/* Makhzan-styled dialog: our own title (RTL-aware, Vazirmatn) and colors that follow the page theme. */
		function modal(title, body, ico) {
			var dark = root.classList.contains('mk-dark');
			ui.showModal('', [ E('div', { 'class': 'mk mk-modal' + (dark ? ' mk-dark' : ''), 'dir': fa ? 'rtl' : 'ltr' }, [
				E('div', { 'class': 'mk-dialog-head' }, [ E('span', { 'class': 'mk-badge-ico' }, icon(ico || 'sparkle')), E('h3', {}, title) ])
			].concat(body)) ], 'mk-dialog', dark ? 'mk-dark' : 'mk-light');
		}
		function field(label, input) { return E('label', { 'class': 'mk-field' }, [ E('span', {}, label), input ]); }
		function actions(list) { return E('div', { 'class': 'mk-row mk-end' }, list); }

		var root = E('div', { 'class': 'mk', 'dir': fa ? 'rtl' : 'ltr' });
		root.appendChild(E('link', { 'rel': 'stylesheet', 'href': L.resource('view/makhzan/theme.css') + '?v=' + BUILD }));
		/* Theme: the viewer's saved choice, otherwise follow the LuCI theme (dark page background => dark). */
		var savedTheme = null;
		try { savedTheme = localStorage.getItem('makhzan-theme'); } catch (e) {}
		if (savedTheme ? savedTheme === 'dark' : (function() {
			var m = getComputedStyle(document.body).backgroundColor.match(/\d+/g);
			return m ? (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) < 128 : false;
		})()) root.classList.add('mk-dark');

		/* ---------- Hero (a div, not <header>: the LuCI theme styles every <header> as its sticky menu bar) ---------- */
		/* Light (sun) and Dark (moon) as a two-button switch; the active mode is highlighted. */
		function themeBtn(dark, text, ico) {
			return E('button', { 'type': 'button', 'class': 'mk-btn glass', 'click': function() {
				root.classList.toggle('mk-dark', dark); paintTheme();
				try { localStorage.setItem('makhzan-theme', dark ? 'dark' : 'light'); } catch (e) {}
			} }, [ icon(ico), E('span', {}, text) ]);
		}
		var lightBtn = themeBtn(false, t('روشن', 'Light'), 'sun'), darkBtn = themeBtn(true, t('تیره', 'Dark'), 'moon');
		function paintTheme() {
			var dark = root.classList.contains('mk-dark');
			lightBtn.classList.toggle('mk-seg-on', !dark); lightBtn.setAttribute('aria-pressed', String(!dark));
			darkBtn.classList.toggle('mk-seg-on', dark); darkBtn.setAttribute('aria-pressed', String(dark));
		}
		paintTheme();
		var theme = E('div', { 'class': 'mk-seg', 'role': 'group', 'aria-label': t('حالت نمایش', 'Display mode') }, [ lightBtn, darkBtn ]);
		/* The Persian label always renders in Vazirmatn, also on the English page. */
		var langBtn = btn(fa ? 'English' : 'فارسی', function() {
			return call([ 'language', fa ? 'en' : 'fa' ]).then(function() { location.reload(); });
		}, 'glass', 'globe');
		langBtn.setAttribute('lang', fa ? 'en' : 'fa');
		root.appendChild(E('div', { 'class': 'mk-hero' }, [
			E('div', { 'class': 'mk-brand' }, [ logo(64), E('div', {}, [
				E('h2', {}, [ t('مخزن', 'Makhzan'), E('span', { 'class': 'mk-version' }, 'v' + VERSION) ]),
				E('p', {}, t('فایل‌سرور خانگی روی روتر شما — امن، ساده، همیشه در دسترس', 'Home file server on your router — private, simple, always on'))
			]) ]),
			E('div', { 'class': 'mk-row' }, [ theme, langBtn ])
		]));

		var banner = E('div', { 'role': 'status', 'aria-live': 'polite' }), metrics = E('div', { 'class': 'mk-grid mk-metrics' });
		var usersBox = E('div', { 'class': 'mk-users' }), serviceArea = E('div'), connectBox = E('div');
		root.appendChild(banner);

		function refresh() {
			return Promise.all([ call([ 'status' ]), call([ 'storage-devices' ]).catch(function() { return { devices: devices }; }) ])
				.then(function(r) { devices = r[1].devices || []; fillDevices(); paint(r[0]); });
		}

		/* ---------- Folder manager ---------- */
		function folders(user) {
			var list = E('div', { 'class': 'mk-list' }), msg = E('p', { 'role': 'status', 'class': 'mk-msg' });
			var name = E('input', { 'aria-label': t('نام پوشهٔ جدید', 'New folder name'), 'placeholder': t('نام پوشهٔ جدید', 'New folder name'), 'maxlength': '120' });
			function load() {
				return call([ 'list', user ]).then(function(r) {
					list.replaceChildren();
					if (!r.folders.length) list.appendChild(E('p', { 'class': 'mk-empty' }, [ icon('folder'), t('هنوز پوشه‌ای ساخته نشده است.', 'No folders yet.') ]));
					r.folders.forEach(function(f) {
						var input = E('input', { 'value': f, 'aria-label': t('نام پوشه', 'Folder name'), 'maxlength': '120' });
						list.appendChild(E('div', { 'class': 'mk-folder' }, [ icon('folder', 'mk-folder-ico'), input,
							btn(t('تغییر نام', 'Rename'), function() {
								var v = input.value.trim(); if (!v || v === f) return;
								return call([ 'rename', user, f, v ]).then(function() { msg.textContent = ''; return load(); }).catch(function(e) { msg.textContent = msgOf(e); });
							}, 'soft-blue', 'pencil'),
							btn(t('حذف', 'Delete'), function() {
								if (!confirm(t('پوشهٔ «' + f + '» حذف شود؟\nپوشه به سطل بازیابی منتقل می‌شود و تا خالی‌کردن سطل توسط مدیر قابل بازیابی است.', 'Delete "' + f + '"?\nIt is moved to the recovery trash and can be recovered by the administrator until the trash is emptied.'))) return;
								return call([ 'trash', user, f ]).then(function() { msg.textContent = ''; return load().then(refresh); }).catch(function(e) { msg.textContent = msgOf(e); });
							}, 'soft-red', 'trash')
						]));
					});
				}).catch(function(e) { msg.textContent = msgOf(e); });
			}
			modal(t('پوشه‌های ', 'Folders of ') + user, [
				E('p', { 'class': 'mk-muted' }, t('پوشه‌های سطح اول کاربر. برای کار با فایل‌ها از اتصال SMB استفاده کنید.', 'Top-level folders of this user. Use the SMB connection to work with files.')),
				list,
				E('div', { 'class': 'mk-row mk-add' }, [ name, btn(t('ساخت پوشه', 'Create folder'), function() {
					var v = name.value.trim(); if (!v) { msg.textContent = t('نام را وارد کنید.', 'Enter a name.'); return; }
					return call([ 'mkdir', user, v ]).then(function() { name.value = ''; msg.textContent = ''; return load(); }).catch(function(e) { msg.textContent = msgOf(e); });
				}, 'success', 'folderPlus') ]),
				msg,
				actions([ btn(t('بستن', 'Close'), function() { ui.hideModal(); return refresh(); }, 'soft-violet', 'x') ])
			], 'folder');
			return load();
		}

		function passwordInputs() {
			var a = E('input', { 'type': 'password', 'autocomplete': 'new-password', 'maxlength': '64', 'dir': 'ltr' });
			var b = E('input', { 'type': 'password', 'autocomplete': 'new-password', 'maxlength': '64', 'dir': 'ltr' });
			return { a: a, b: b, fields: [ field(t('رمز عبور (حداقل ۸ نویسه)', 'Password (at least 8 characters)'), a), field(t('تکرار رمز عبور', 'Repeat password'), b) ],
				check: function() {
					if (a.value.length < 8 || a.value.length > 64) return t('رمز باید ۸ تا ۶۴ نویسه باشد.', 'Password must be 8-64 characters.');
					if (a.value !== b.value) return t('دو رمز یکسان نیستند.', 'Passwords do not match.');
					return null;
				} };
		}
		function changePassword(user) {
			var p = passwordInputs(), msg = E('p', { 'class': 'mk-msg' });
			modal(t('تغییر رمز ', 'Change password: ') + user, p.fields.concat([ msg, actions([
				btn(t('ذخیرهٔ رمز', 'Save password'), function() {
					var err = p.check(); if (err) { msg.textContent = err; return; }
					return sendPassword(p.a.value).then(function(token) { return call([ 'passwd', user, token ]); }).then(function() { ui.hideModal(); ui.addNotification(null, E('p', {}, t('رمز تغییر کرد.', 'Password changed.')), 'info'); return refresh(); }).catch(function(e) { msg.textContent = msgOf(e); });
				}, 'warn', 'key'), btn(t('انصراف', 'Cancel'), ui.hideModal, 'soft-violet', 'x') ]) ]), 'key');
			p.a.focus();
		}
		function deleteUser(user) {
			var typed = E('input', { 'dir': 'ltr', 'autocomplete': 'off', 'spellcheck': 'false' }), msg = E('p', { 'class': 'mk-msg' });
			modal(t('حذف کاربر ', 'Delete user ') + user, [
				E('p', { 'class': 'mk-alert error' }, [ icon('alert'), E('span', {}, t('حساب و اشتراک SMB این کاربر حذف می‌شود. پوشهٔ خصوصی او به سطل بازیابی منتقل می‌شود و تا خالی‌کردن سطل قابل بازیابی دستی است.', 'The account and its SMB share are removed. The private folder is moved to the recovery trash and can be recovered manually until the trash is emptied.')) ]),
				field([ t('برای تأیید، دقیقاً این را تایپ کنید: ', 'To confirm, type exactly: '), E('code', { 'class': 'mk-type-this' }, user) ], typed), msg,
				actions([ btn(t('حذف کاربر', 'Delete user'), function() {
					if (typed.value.trim() !== user) { msg.textContent = t('نام یکسان نیست.', 'Name does not match.'); return; }
					return call([ 'del-user', user ]).then(function() { ui.hideModal(); return refresh(); }).catch(function(e) { msg.textContent = msgOf(e); });
				}, 'danger', 'trash'), btn(t('انصراف', 'Cancel'), ui.hideModal, 'soft-violet', 'x') ])
			], 'trash');
		}
		function addUser() {
			var name = E('input', { 'placeholder': 'ali', 'maxlength': '31', 'dir': 'ltr', 'autocomplete': 'off' }), p = passwordInputs(), msg = E('p', { 'class': 'mk-msg' });
			var ro = E('input', { 'type': 'checkbox', 'class': 'mk-switch', 'aria-label': t('فقط خواندنی', 'Read-only') });
			modal(t('کاربر جدید', 'New user'), [
				E('p', { 'class': 'mk-muted' }, t('یک پوشهٔ خصوصی و یک اشتراک SMB هم‌نام با کاربر ساخته می‌شود. کاربر به پوشه‌های Shared و Media هم دسترسی دارد.', 'Creates a private folder and an SMB share named after the user. The user can also use the Shared and Media folders.')),
				field(t('نام کاربری (حروف کوچک انگلیسی)', 'Username (lowercase)'), name) ].concat(p.fields, [
				E('label', { 'class': 'mk-switch-row mk-option' }, [ ro, E('span', {}, t('فقط خواندنی: Shared و Media را فقط می‌بیند و نمی‌تواند چیزی را تغییر دهد (مثلاً برای بچه‌ها). پوشهٔ خصوصی خودش عادی است.', 'Read-only: can only view Shared and Media, not change them (e.g. for children). Their own private folder works normally.')) ]),
				msg,
				actions([ btn(t('ساخت کاربر', 'Create user'), function() {
					if (!/^[a-z][a-z0-9_-]{0,30}$/.test(name.value)) { msg.textContent = t('نام کاربری باید با حرف کوچک انگلیسی شروع شود و فقط شامل حروف کوچک، عدد، _ یا - باشد.', 'Start with a lowercase letter; use only a-z, 0-9, _ or -.'); return; }
					if (data.users.some(function(u) { return u.name === name.value; })) { msg.textContent = t('کاربر «' + name.value + '» از قبل وجود دارد. نام دیگری انتخاب کنید.', 'User "' + name.value + '" already exists. Choose another name.'); return; }
					var err = p.check(); if (err) { msg.textContent = err; return; }
					msg.textContent = t('در حال ساخت…', 'Creating…');
					return sendPassword(p.a.value).then(function(token) { return call([ 'add-user', name.value, token ].concat(ro.checked ? [ 'ro' ] : [])); }).then(function() { ui.hideModal(); return refresh(); }).catch(function(e) { msg.textContent = msgOf(e); });
				}, 'success', 'userPlus'), btn(t('انصراف', 'Cancel'), ui.hideModal, 'soft-violet', 'x') ]) ]), 'userPlus');
			name.focus();
		}

		/* ---------- Status painting ---------- */
		var lastJob = null;
		function alertBox(kind, ico, text) { return E('p', { 'class': 'mk-alert ' + kind }, [ icon(ico), E('span', {}, text) ]); }
		function paintJob(job) {
			var box = E('div'), check = job.kind === 'check';
			if (job.state === 'running') {
				var steps = { checking: check ? t('بررسی فایل‌سیستم (ممکن است چند دقیقه طول بکشد)', 'checking the filesystem (may take minutes)') : t('بررسی', 'checking'),
					partitioning: t('پارتیشن‌بندی', 'partitioning'), formatting: t('فرمت', 'formatting'), configuring: t('پیکربندی', 'configuring'),
					copying_overlay: t('کپی اطلاعات روتر روی USB (ممکن است چند دقیقه طول بکشد)', 'copying router data to USB (may take minutes)'), activating: t('فعال‌سازی', 'activating'),
					unmounting: t('قطع موقت اشتراک‌ها و جدا کردن دیسک', 'pausing shares and unmounting the disk'), mounting: t('اتصال دوبارهٔ دیسک', 'mounting the disk again') };
				box.appendChild(alertBox('mk-busy', 'refresh', (check ? t('بررسی دیسک در حال انجام است: ', 'Checking disk: ') : t('آماده‌سازی دیسک در حال انجام است: ', 'Preparing disk: ')) + (steps[job.step] || '…') + t(' — روتر را خاموش نکنید و USB را جدا نکنید.', ' — do not power off or unplug the USB.')));
			}
			else if (job.state === 'failed')
				box.appendChild(alertBox('error', 'alert', (check ? t('بررسی دیسک ناموفق بود: ', 'Disk check failed: ') : t('آماده‌سازی دیسک ناموفق بود: ', 'Disk preparation failed: ')) + msgOf(job.error)));
			else if (job.state === 'done' && lastJob === 'running') {
				if (!check) box.appendChild(alertBox('ok', 'check', t('دیسک با موفقیت آماده شد.', 'Disk prepared successfully.')));
				else if (job.result === 'clean') box.appendChild(alertBox('ok', 'check', t('بررسی تمام شد: دیسک سالم است و خطایی پیدا نشد.', 'Check finished: the disk is healthy, no errors found.')));
				else if (job.result === 'repaired') box.appendChild(alertBox('ok', 'wrench', t('بررسی تمام شد: خطاهای فایل‌سیستم پیدا و تعمیر شد.', 'Check finished: filesystem errors were found and repaired.')));
				else if (job.result === 'errors') box.appendChild(alertBox('warn', 'alert', t('بعضی خطاها تعمیر نشد. از فایل‌های مهم نسخهٔ پشتیبان بگیرید و دیسک را عوض کنید.', 'Some errors could not be repaired. Back up important files and replace the disk.')));
				else box.appendChild(alertBox('error', 'alert', t('بررسی دیسک اجرا نشد (کد ' + job.code + ').', 'The disk check could not run (code ' + job.code + ').')));
			}
			lastJob = job.state;
			return box;
		}
		/* The job banner is refreshed on its own (cheap storage-job call), so it never sticks when the
		 * heavier status call is slow during large USB copies. */
		var fullBox = E('div'), jobBox = E('div'), extrootBox = E('div');
		banner.replaceChildren(fullBox, jobBox, extrootBox);
		function showJob(job) {
			jobBox.replaceChildren(paintJob(job));
			var running = job.state === 'running';
			[ prepare, checkBtn ].forEach(function(b) {
				b.dataset.locked = running ? '1' : '0';
				if (b.dataset.running !== '1') b.disabled = running;
				b.title = running ? t('یک عملیات دیسک در حال انجام است', 'A disk operation is running') : '';
			});
		}
		function extrootOffDialog() {
			modal(t('خاموش‌کردن extroot', 'Turn off extroot'), [
				E('p', {}, t('روتر الان از روی USB اجرا می‌شود. برای برگشت به حافظهٔ داخلی:', 'The router is currently running from the USB disk. To return to internal storage:')),
				E('ol', { 'class': 'mk-steps' }, [
					E('li', {}, t('روتر را خاموش کنید و دیسک USB را جدا کنید.', 'Power off the router and unplug the USB disk.')),
					E('li', {}, t('روتر را روشن کنید؛ با حافظهٔ داخلی بالا می‌آید.', 'Power it on; it starts from internal storage.')),
					E('li', {}, t('همین صفحه را باز کنید و «خاموش‌کردن extroot» را بزنید.', 'Open this page and press "Turn off extroot".')),
					E('li', {}, t('دیسک USB را دوباره وصل کنید؛ فایل‌سرور خودکار mount می‌شود.', 'Plug the USB disk back in; the file server mounts automatically.'))
				]),
				alertBox('', 'alert', t('تنظیماتی که بعد از فعال‌شدن extroot تغییر داده‌اید (مثل کاربر جدید یا رمز) روی USB مانده‌اند و به حافظهٔ داخلی برنمی‌گردند.', 'Settings changed while extroot was active (such as new users or passwords) stay on the USB disk and do not return to internal storage.')),
				actions([ btn(t('متوجه شدم', 'Got it'), ui.hideModal, 'soft-violet', 'check') ])
			], 'layers');
		}
		function paintExtroot(state) {
			extrootBox.replaceChildren();
			if (state === 'pending')
				extrootBox.appendChild(alertBox('', 'refresh', t('برای فعال‌شدن extroot روتر را ریبوت کنید. تنظیماتی که قبل از ریبوت تغییر دهید به extroot منتقل نمی‌شوند.', 'Reboot the router to activate extroot. Settings changed before the reboot are not carried over to extroot.')));
			else if (state === 'active')
				extrootBox.appendChild(E('div', { 'class': 'mk-alert ok' }, [ icon('layers'), E('span', {}, t('روتر از روی USB اجرا می‌شود (extroot فعال است).', 'The router is running from USB (extroot is active).')),
					btn(t('خاموش‌کردن extroot', 'Turn off extroot'), extrootOffDialog, 'soft-violet mk-small', 'x') ]));
			else if (state === 'inactive')
				extrootBox.appendChild(E('div', { 'class': 'mk-alert warn' }, [ icon('alert'), E('span', {}, t('extroot تنظیم شده ولی فعال نیست (دیسک USB وصل نیست یا راه‌اندازی آن ناموفق بود).', 'extroot is configured but not active (the USB disk is missing or activation failed).')),
					btn(t('خاموش‌کردن extroot', 'Turn off extroot'), function() { return call([ 'extroot-off' ]).then(refresh); }, 'warn mk-small', 'x') ]));
		}
		function metric(title, value, sub, color, ico, extra) {
			return E('div', { 'class': 'mk-metric', 'style': '--accent:' + color }, [
				E('span', { 'class': 'mk-metric-ico' }, icon(ico)),
				E('div', { 'class': 'mk-metric-title' }, title), E('div', { 'class': 'mk-big' }, value), extra || '', E('small', {}, sub)
			]);
		}
		function paint(d) {
			data = d;
			var disk = d.disk, pct = disk && disk.total_kib ? Math.min(100, disk.used_kib * 100 / disk.total_kib) : 0, s = d.services;
			fullBox.replaceChildren();
			if (disk && pct >= 97) fullBox.appendChild(alertBox('error', 'alert', [ t('فضای فایل‌سرور تقریباً پر است (', 'The file server is almost full ('), num(Math.round(pct) + '%'), t('). فایل‌های اضافی یا سطل بازیابی را پاک کنید؛ در غیر این صورت ذخیرهٔ فایل ناموفق می‌شود.', '). Delete unneeded files or empty the recovery trash, otherwise saving files will fail.') ]));
			else if (disk && pct >= 90) fullBox.appendChild(alertBox('warn', 'alert', [ t('بیش از ۹۰٪ فضای فایل‌سرور پر شده است (', 'More than 90% of the file server is used ('), num(Math.round(pct) + '%'), t('). نمودار «مصرف فضا» در زبانهٔ خانه نشان می‌دهد چه چیزی بیشترین جا را گرفته.', '). The space usage chart on the Home tab shows what takes the most room.') ]));
			paintUsage(d);
			function dot(on) { return E('b', { 'class': on ? 'mk-on' : 'mk-off' }, on ? '●' : '○'); }
			metrics.replaceChildren(
				metric(t('فضای آزاد NAS', 'NAS free space'), disk ? num(bytes(disk.available_kib)) : '—',
					disk ? num(bytes(disk.used_kib) + ' / ' + bytes(disk.total_kib) + ' · ' + disk.root) : t('حافظه آماده نیست', 'Storage is not ready'),
					pct >= 97 ? '#ef4444' : pct >= 90 ? '#f59e0b' : '#3b82f6', 'pie',
					E('div', { 'class': 'mk-track' }, E('i', { 'style': 'width:' + pct + '%;background:' + (pct >= 97 ? '#ef4444' : pct >= 90 ? 'linear-gradient(90deg,#f59e0b,#ea580c)' : 'linear-gradient(90deg,#22d3ee,#3b82f6)') }))),
				metric(t('کاربران', 'Users'), String(d.users.length), t('پوشهٔ خصوصی + اشتراک SMB', 'Private folder + SMB share'), '#8b5cf6', 'users'),
				metric(t('سرویس‌ها', 'Services'), E('span', { 'class': 'mk-svc' }, [ 'SMB ', dot(s.samba_running), '  DLNA ', dot(s.dlna_running) ]),
					d.extroot_active ? t('extroot فعال است', 'extroot is active') : t('وضعیت اجرای سرویس‌ها', 'Service runtime state'), '#10b981', 'pulse'),
				metric(t('فلش / هارد USB', 'USB flash / hard drive'), String(devices.length), t('دیسک متصل', 'Connected disks'), '#f59e0b', 'usb')
			);
			showJob(d.job || { state: 'idle' });
			paintExtroot(d.extroot_state || 'off');

			usersBox.replaceChildren();
			d.users.forEach(function(u) {
				var badges = [ E('span', { 'class': 'mk-chip' }, [ icon('drive'), u.used_kib >= 0 ? num(bytes(u.used_kib)) : '…' ]) ];
				if (u.readonly) badges.push(E('span', { 'class': 'mk-chip info' }, [ icon('eye'), t('فقط خواندنی', 'Read-only') ]));
				if (!u.home) badges.push(E('span', { 'class': 'mk-chip warn' }, [ icon('alert'), t('پوشه در دسترس نیست', 'Folder unavailable') ]));
				if (!u.smb) badges.push(E('span', { 'class': 'mk-chip warn' }, [ icon('alert'), t('بدون رمز SMB', 'No SMB password') ]));
				if (u.locked) badges.push(E('span', { 'class': 'mk-chip error' }, [ icon('lock'), t('قفل‌شده (۴ ورود ناموفق)', 'Locked (4 failed logins)') ]));
				if (u.smb && !u.locked && u.home) badges.push(E('span', { 'class': 'mk-chip ok' }, [ icon('check'), t('فعال', 'Active') ]));
				var acts = [ btn(t('پوشه‌ها', 'Folders'), function() { return folders(u.name); }, 'soft-blue', 'folder'), btn(t('تغییر رمز', 'Password'), function() { changePassword(u.name); }, 'soft-amber', 'key') ];
				if (u.locked) acts.push(btn(t('رفع قفل', 'Unlock'), function() { return call([ 'unlock', u.name ]).then(refresh); }, 'soft-green', 'unlock'));
				acts.push(btn(u.readonly ? t('دسترسی کامل', 'Full access') : t('فقط خواندنی', 'Read-only'), function() {
					return call([ 'access', u.name, u.readonly ? 'rw' : 'ro' ]).then(refresh);
				}, 'soft-violet', 'eye'));
				acts.push(btn(t('حذف کاربر', 'Delete user'), function() { deleteUser(u.name); }, 'soft-red', 'trash'));
				usersBox.appendChild(E('div', { 'class': 'mk-user' }, [
					E('div', { 'class': 'mk-user-head' }, [ E('span', { 'class': 'mk-avatar' }, u.name.charAt(0).toUpperCase()), E('strong', { 'dir': 'ltr' }, u.name), E('span', { 'class': 'mk-chips' }, badges) ]),
					E('div', { 'class': 'mk-row' }, acts)
				]));
			});
			if (!d.users.length) usersBox.appendChild(E('p', { 'class': 'mk-empty' }, [ icon('users'), t('هنوز کاربری ساخته نشده است.', 'No users yet.') ]));

			/* Setup order: disk, then SMB, then users. Guide the next step right here instead of failing on "Add user". */
			usersNote.replaceChildren();
			if (!d.ready)
				usersNote.appendChild(E('div', { 'class': 'mk-alert warn' }, [ icon('drive'), E('span', {}, t('قدم اول: دیسک USB را آماده کنید؛ بدون آن کاربر ساخته نمی‌شود.', 'First step: prepare the USB disk; users cannot be created without it.')),
					btn(t('رفتن به زبانهٔ دیسک', 'Go to the Disk tab'), function() { showTab('disk'); }, 'warn mk-small', 'drive') ]));
			else if (!s.samba_installed)
				usersNote.appendChild(alertBox('warn', 'alert', t('برای ساخت کاربر بستهٔ samba4-server را از System ← Software نصب کنید.', 'Install samba4-server from System → Software to create users.')));
			else if (!s.samba_enabled)
				usersNote.appendChild(E('div', { 'class': 'mk-alert warn' }, [ icon('server'), E('span', {}, t('SMB خاموش است؛ برای ساخت کاربر و اتصال به فایل‌ها آن را روشن کنید.', 'SMB is off; turn it on to create users and reach the files.')),
					btn(t('روشن کردن SMB', 'Turn on SMB'), function() { return call([ 'option', 'samba', '1' ]).then(function() { return call([ 'apply' ]); }).then(refresh); }, 'warn mk-small', 'check') ]));

			tmCheck.checked = !!s.timemachine_enabled; tmCheck.disabled = !s.timemachine_supported || !s.samba_installed;
			if (document.activeElement !== tmSize) tmSize.value = String(s.timemachine_gb || 0);
			spinSelect.disabled = !s.spindown_supported;
			if (document.activeElement !== spinSelect) spinSelect.value = String([ 0, 10, 20, 30, 60, 120 ].indexOf(s.spindown_minutes) >= 0 ? s.spindown_minutes : 0);
			spinNote.textContent = s.spindown_supported ? '' : t('برای این قابلیت بستهٔ hd-idle را از System ← Software نصب کنید.', 'Install the hd-idle package from System → Software for this feature.');

			var host = location.hostname;
			connectBox.replaceChildren(E('div', { 'class': 'mk-connect', 'dir': 'ltr' }, [
				E('code', {}, [ icon('link'), '\\\\' + host + '\\Shared' ]), E('code', {}, [ icon('link'), '\\\\' + host + '\\Media' ]),
				E('code', {}, [ icon('link'), '\\\\' + host + '\\' + t('نام‌کاربری', 'username') ]), E('code', {}, [ icon('link'), 'smb://' + host + '/Shared' ]),
				d.library ? E('code', {}, [ icon('book'), '\\\\' + host + '\\Library' ]) : ''
			]));
		}

		/* ---------- Existing storage ---------- */
		var path = E('input', { 'placeholder': '/mnt/your-disk', 'dir': 'ltr', 'aria-label': t('مسیر حافظه', 'Storage path') });
		var storageCard = card(t('حافظهٔ آماده (بدون پاک‌کردن)', 'Existing storage (no erase)'), [
			E('p', { 'class': 'mk-muted' }, t('اگر دیسک USB از قبل با ext4 فرمت و mount شده، مسیر آن را وارد کنید؛ فایل‌های موجود حفظ می‌شوند.', 'If a USB disk is already formatted as ext4 and mounted, enter its mount path; existing files are kept.')),
			E('div', { 'class': 'mk-row mk-add' }, [ path, btn(t('انتخاب حافظه', 'Select storage'), function() { return call([ 'root', path.value.trim() ]).then(refresh); }, 'primary', 'check') ])
		], '#3b82f6', 'drive');

		/* ---------- Disk planner ---------- */
		var select = E('select', { 'dir': 'ltr', 'aria-label': t('انتخاب فلش مموری / هارد USB', 'USB flash / hard drive') });
		var devInfo = E('div'), roles = [], roleGrid = E('div', { 'class': 'mk-grid mk-roles' }), bar = E('div', { 'class': 'mk-track mk-track-lg' });
		var summary = E('p', { 'role': 'status', 'aria-live': 'polite', 'class': 'mk-summary' }), nasWarn = E('div', { 'role': 'alert' });
		function fillDevices() {
			var keep = select.value;
			select.replaceChildren();
			devices.forEach(function(d) { select.appendChild(E('option', { 'value': d.path }, d.path + ' · ' + (d.model || 'USB') + ' · ' + bytes(d.size_mib * 1024))); });
			if (!devices.length) select.appendChild(E('option', { 'value': '' }, t('حافظهٔ USB متصل نیست', 'No USB storage connected')));
			if (keep && devices.some(function(d) { return d.path === keep; })) select.value = keep;
			plot();
		}
		function current() { return devices.filter(function(d) { return d.path === select.value; })[0]; }
		[ [ t('افزایش فضای روتر', 'Router expansion'), 'extroot', 134, '#8b5cf6', 'layers', t('فضای نصب بسته‌های روتر را روی USB منتقل می‌کند (نیاز به ریبوت).', 'Moves package storage to USB (reboot required).') ],
		  [ t('حافظهٔ مجازی', 'Virtual RAM'), 'swap', 256, '#f59e0b', 'sparkle', t('برای روترهای با رم پایین: ۲۵۶ تا ۱۰۲۴ مگابایت کافی است.', 'For routers with little RAM: 256-1024 MB is enough.') ],
		  [ t('فایل‌سرور', 'File server'), 'NAS', 1024, '#10b981', 'server', t('محل پوشه‌های کاربران، Shared و Media.', 'Holds user, Shared and Media folders.') ] ].forEach(function(role, idx) {
			var check = E('input', { 'type': 'checkbox', 'class': 'mk-switch', 'aria-label': role[0] });
			var input = E('input', { 'type': 'number', 'min': String(idx === 0 ? 134 : idx === 1 ? 17 : 34), 'step': '1', 'value': String(role[2]), 'disabled': 'disabled', 'aria-label': role[0] + ' MB', 'dir': 'ltr' });
			var r = { check: check, input: input, color: role[3] };
			roles.push(r);
			var tile;
			check.addEventListener('change', function() { input.disabled = !check.checked; tile.classList.toggle('mk-role-on', check.checked); plot(); });
			input.addEventListener('input', plot);
			var body = [ E('label', { 'class': 'mk-switch-row' }, [ check, E('span', {}, t('فعال باشد', 'Include')) ]), E('div', { 'class': 'mk-unit' }, [ input, E('span', {}, 'MB') ]), E('small', {}, role[5]) ];
			if (idx === 2) body.push(btn(t('همهٔ فضای باقی‌مانده', 'Use all remaining'), function() {
				var disk = current(); if (!disk) return;
				check.checked = true; input.disabled = false; tile.classList.add('mk-role-on');
				var other = roles.slice(0, 2).reduce(function(s, x) { return s + (x.check.checked ? mbToMiB(x.input.value) : 0); }, 0);
				input.value = String(Math.max(0, mibToMB(disk.size_mib - 16 - other) - 1)); plot();
			}, 'soft-green mk-small', 'maximize'));
			tile = card(role[0] + ' · ' + role[1], body, role[3], role[4], 'mk-role');
			roleGrid.appendChild(tile);
		});
		function values() { return roles.map(function(r) { return r.check.checked ? String(mbToMiB(r.input.value)) : '0'; }); }
		/* Mirrors the backend rule: warn (never block) when extroot and/or swap leave < 1 GiB and no NAS is planned. */
		function nasWarning(v, total) {
			var ext = +v[0], swap = +v[1], nas = +v[2], free = total - 16 - ext - swap - nas, who = [];
			if (nas > 0 || free >= 1024) return null;
			if (ext) who.push('extroot'); if (swap) who.push('swap');
			return who.length ? { who: who, free: Math.max(0, free) } : null;
		}
		function warningNode(w) {
			if (!w) return E('span');
			var names = w.who.join(t(' و ', ' and '));
			return alertBox('warn', 'alert', t('هشدار: ' + names + ' تقریباً کل فضای دیسک را می‌گیرد و فقط ' + mibToMB(w.free) + ' مگابایت می‌ماند؛ فضایی برای فایل‌سرور (NAS) باقی نمی‌ماند. اگر از فایل‌سرور استفاده نمی‌کنید می‌توانید ادامه دهید.',
				'Warning: ' + names + ' take almost the whole disk, leaving only ' + mibToMB(w.free) + ' MB; no room remains for the file server (NAS). You may continue if you do not need the file server.'));
		}
		/* Informational: a plan without NAS leaves the rest unused until the disk is erased again. */
		function noNasNote(v, total) {
			var free = total - 16 - (+v[0]) - (+v[1]) - (+v[2]);
			if (+v[2] > 0 || nasWarning(v, total)) return E('span');
			return alertBox('', 'server', [ t('فایل‌سرور (NAS) در این طرح نیست؛ ', 'This plan has no file server (NAS); '), num(mibToMB(Math.max(0, free)) + ' MB'),
				t(' بدون استفاده می‌ماند و بعداً فقط با پاک‌کردن دوبارهٔ دیسک قابل استفاده است. تا دیسک NAS نداشته باشید، پوشه‌ها و اشتراک‌های کاربران در دسترس نیستند.',
				  ' stays unused and can only be used later by erasing the disk again. User folders and shares are unavailable until a NAS disk exists.') ]);
		}
		function plot() {
			var disk = current(), total = disk ? disk.size_mib : 0, v = values(), used = v.reduce(function(s, x) { return s + (+x); }, 0);
			bar.replaceChildren();
			roles.forEach(function(r, i) { bar.appendChild(E('i', { 'style': 'width:' + (total ? Math.max(0, Math.min(100, v[i] * 100 / total)) : 0) + '%;background:' + r.color })); });
			var remaining = total - used - 16;
			summary.replaceChildren(t('انتخاب‌شده: ', 'Allocated: '), num(mibToMB(used) + ' MB'), ' · ', t('باقی‌مانده (بدون استفاده): ', 'Remaining (unused): '), num(mibToMB(Math.max(0, remaining)) + ' MB'));
			summary.className = 'mk-summary' + (total && remaining < 0 ? ' mk-alert error' : '');
			nasWarn.replaceChildren(total && remaining >= 0 && used > 0 ? warningNode(nasWarning(v, total)) : E('span'), total && remaining >= 0 && used > 0 ? noNasNote(v, total) : E('span'));
			devInfo.replaceChildren();
			if (disk && (disk.mounts.length || disk.swap_active)) {
				devInfo.appendChild(E('div', { 'class': 'mk-alert' }, [ icon('alert'), E('span', {}, t('این دیسک در حال استفاده است', 'This disk is in use') + (disk.mounts.length ? ' (' + disk.mounts.join(', ') + ')' : '') + (disk.swap_active ? ' · swap' : '') + '. '),
					disk.system ? E('span', {}, t('extroot فعال روی این دیسک است و قابل آزادسازی نیست.', 'It holds the active extroot and cannot be released.')) :
					btn(t('آزادسازی دیسک (جداکردن امن)', 'Release disk (safe removal)'), function() {
						if (!confirm(t('اشتراک‌ها موقتاً قطع و دیسک آزاد می‌شود. ادامه می‌دهید؟', 'Shares will stop briefly and the disk will be released. Continue?'))) return;
						return call([ 'storage-release', disk.path ]).then(function() { ui.addNotification(null, E('p', {}, t('دیسک آزاد شد؛ اکنون می‌توانید آن را جدا یا دوباره تقسیم کنید.', 'Disk released; you can unplug or re-partition it now.')), 'info'); return refresh(); });
					}, 'warn', 'eject') ]));
			}
		}
		select.addEventListener('change', plot);
		fillDevices();

		var prepare = btn(t('بررسی طرح و ادامه', 'Review plan'), function() {
			if (data.job && data.job.state === 'running') throw new Error(t('عملیات دیگری در حال اجراست.', 'Another operation is running.'));
			var disk = select.value, v = values();
			if (!disk) throw new Error(t('دیسک USB انتخاب نشده است.', 'Select a USB disk.'));
			if (roles.some(function(r) { return r.check.checked && (!/^\d+$/.test(r.input.value) || Number(r.input.value) < Number(r.input.min)); }))
				throw new Error(t('حجم معتبر وارد کنید (extroot حداقل ۱۳۴، swap حداقل ۱۷ و NAS حداقل ۳۴ مگابایت).', 'Enter valid sizes (extroot ≥ 134, swap ≥ 17, NAS ≥ 34 MB).'));
			return call([ 'storage-plan', disk ].concat(v)).then(function(plan) {
				var typed = E('input', { 'dir': 'ltr', 'autocomplete': 'off', 'spellcheck': 'false', 'aria-label': t('تأیید نام دیسک', 'Confirm disk name') }), msg = E('p', { 'class': 'mk-msg' });
				var w = plan.nas_space_warning ? { who: plan.nas_space_consumers, free: plan.unallocated_mib } : null;
				modal(t('تأیید نهایی تقسیم حافظه', 'Confirm disk allocation'), [
					alertBox('error', 'alert', [ t('تمام اطلاعات این دیسک پاک می‌شود: ', 'All data on this disk will be erased: '), num(disk) ]),
					E('div', { 'class': 'mk-plan', 'dir': 'ltr' }, roles.map(function(r, i) {
						return E('div', { 'style': '--accent:' + r.color }, [ E('b', {}, [ 'extroot', 'swap', 'NAS' ][i]), E('span', {}, (r.check.checked ? r.input.value : '0') + ' MB') ]);
					})),
					E('p', {}, [ t('بدون تخصیص: ', 'Unallocated: '), num(mibToMB(plan.unallocated_mib) + ' MB') ]),
					warningNode(w),
					noNasNote(v, (current() || { size_mib: 0 }).size_mib),
					+v[0] ? alertBox('', 'refresh', t('بعد از آماده‌شدن extroot باید روتر را ریبوت کنید.', 'After extroot is prepared the router must be rebooted.')) : E('span'),
					field([ t('برای تأیید، دقیقاً این را تایپ کنید: ', 'To confirm, type exactly: '), E('code', { 'class': 'mk-type-this' }, disk) ], typed), msg,
					actions([ btn(t('پاک‌کردن و ساخت', 'Erase and create'), function() {
						if (typed.value.trim() !== disk) { msg.textContent = t('متن تایپ‌شده با ' + disk + ' یکسان نیست.', 'The typed text does not match ' + disk + '.'); typed.focus(); return; }
						return call([ 'storage-apply', disk ].concat(v, [ 'ERASE:' + disk + ':' + v.join(':') ])).then(function() {
							ui.hideModal(); lastJob = 'running'; return refresh();
						}).catch(function(e) { msg.textContent = msgOf(e); });
					}, 'danger', 'layers'), btn(t('انصراف', 'Cancel'), ui.hideModal, 'soft-violet', 'x') ])
				], 'layers');
			});
		}, 'primary', 'layers');
		var planner = card(t('تقسیم فضای دیسک USB', 'USB disk allocation'), [
			E('p', { 'class': 'mk-muted' }, t('هر گزینه مستقل است؛ یک، دو یا هر سه را انتخاب کنید.', 'Each role is optional; choose one, two or all three.')),
			E('div', { 'class': 'mk-select' }, [ icon('usb'), select ]), devInfo, roleGrid, bar, summary, nasWarn,
			alertBox('', 'alert', t('این عملیات کل دیسک را پاک می‌کند. دیسک در حال استفاده ابتدا باید آزاد شود.', 'This erases the whole disk. A disk in use must be released first.')),
			prepare
		], '#8b5cf6', 'layers');

		/* ---------- Services ---------- */
		[ [ 'SMB', 'samba',  'samba_installed', 'samba_enabled', t('اشتراک فایل برای ویندوز، اندروید، iOS، مک و لینوکس', 'File sharing for Windows, Android, iOS, macOS and Linux'), 'samba4-server', 'server', '#3b82f6' ],
		  [ 'DLNA', 'dlna', 'minidlna_installed', 'dlna_enabled', t('پخش فیلم و موسیقی پوشهٔ Media روی تلویزیون', 'Streams the Media folder to TVs'), 'minidlna', 'tv', '#ec4899' ] ].forEach(function(s) {
			var installed = data.services[s[2]];
			var check = E('input', { 'type': 'checkbox', 'class': 'mk-switch', 'aria-label': s[0], 'checked': data.services[s[3]] ? 'checked' : null, 'disabled': installed ? null : 'disabled' });
			check.addEventListener('change', function() {
				check.disabled = true;
				call([ 'option', s[1], check.checked ? '1' : '0' ]).then(function() { return call([ 'apply' ]); }).then(refresh)
					.catch(function(e) { check.checked = !check.checked; call([ 'option', s[1], check.checked ? '1' : '0' ]).catch(function() {}); notify(e); })
					.finally(function() { check.disabled = !installed; });
			});
			serviceArea.appendChild(E('div', { 'class': 'mk-service', 'style': '--accent:' + s[7] }, [
				E('span', { 'class': 'mk-service-ico' }, icon(s[6])),
				E('div', { 'class': 'mk-service-text' }, [ E('strong', {}, [ s[0], E('span', { 'class': 'mk-engine' }, s[1] === 'samba' ? 'Samba' : 'MiniDLNA') ]), E('small', {}, installed ? s[4] : t('نصب نیست — بستهٔ ', 'Not installed — install package ') + s[5]) ]),
				check ]));
		});
		var tmCheck = E('input', { 'type': 'checkbox', 'class': 'mk-switch', 'aria-label': 'Time Machine' });
		var tmSize = E('input', { 'type': 'number', 'min': '0', 'step': '1', 'dir': 'ltr', 'class': 'mk-narrow', 'aria-label': 'GB' });
		function tmApply() {
			var gb = /^\d{1,6}$/.test(tmSize.value) ? tmSize.value : '0';
			return call([ 'set', 'timemachine_gb', gb ]).then(function() { return call([ 'option', 'timemachine', tmCheck.checked ? '1' : '0' ]); })
				.then(function() { return call([ 'apply' ]); }).then(refresh);
		}
		tmCheck.addEventListener('change', function() {
			tmCheck.disabled = true;
			tmApply().catch(function(e) { tmCheck.checked = !tmCheck.checked; notify(e); }).finally(function() { tmCheck.disabled = !data.services.timemachine_supported; });
		});
		serviceArea.appendChild(E('div', { 'class': 'mk-service', 'style': '--accent:#64748b' }, [
			E('span', { 'class': 'mk-service-ico' }, icon('clock')),
			E('div', { 'class': 'mk-service-text' }, [ E('strong', {}, [ 'Time Machine', E('span', { 'class': 'mk-engine' }, 'macOS') ]),
				E('small', {}, t('پشتیبان‌گیری خودکار مک روی پوشهٔ خصوصی هر کاربر. در مک: System Settings ← Time Machine ← Add Backup Disk و پوشهٔ خودتان را انتخاب کنید.', 'Automatic Mac backups into each user\'s private folder. On the Mac: System Settings → Time Machine → Add Backup Disk, then pick your own folder.')),
				E('div', { 'class': 'mk-row mk-inline' }, [ E('span', {}, t('سقف حجم هر کاربر (GB، صفر = بدون سقف):', 'Size limit per user (GB, 0 = none):')), tmSize,
					btn(t('ذخیره', 'Save'), function() { return tmApply(); }, 'soft-blue mk-small', 'check') ]) ]),
			tmCheck ]));
		var services = card(t('سرویس‌های شبکه', 'Network services'), [ serviceArea,
			E('div', { 'class': 'mk-row' }, [ btn(t('اسکن دوبارهٔ کتابخانهٔ DLNA', 'Rescan DLNA library'), function() {
				return call([ 'dlna-rescan' ]).then(function() { ui.addNotification(null, E('p', {}, t('کتابخانهٔ DLNA از نو ساخته می‌شود؛ چند دقیقه بعد همهٔ فایل‌ها روی تلویزیون دیده می‌شوند.', 'The DLNA library is being rebuilt; all files appear on TVs within a few minutes.')), 'info'); });
			}, 'soft-blue', 'refresh'), E('small', {}, t('اگر فیلمی را کپی کرده‌اید و روی تلویزیون دیده نمی‌شود.', 'If a copied video does not show up on the TV.')) ]),
			E('p', { 'class': 'mk-muted' }, t('آدرس‌های اتصال (فقط از شبکهٔ داخلی LAN):', 'Connection addresses (LAN only):')), connectBox,
			alertBox('ok', 'shield', t('هر کاربر فقط پوشهٔ خصوصی خودش را می‌بیند. بعد از ۴ رمز اشتباه، حساب ۱۵ دقیقه قفل می‌شود.', 'Each user sees only their own private share. After 4 wrong passwords the account is locked for 15 minutes.')),
			btn(t('اعمال مجدد تنظیمات', 'Re-apply settings'), function() { return call([ 'apply' ]).then(refresh); }, 'soft-green', 'refresh')
		], '#10b981', 'pulse');

		/* ---------- Users and trash ---------- */
		var usersNote = E('div');
		var users = card(t('کاربران و پوشه‌ها', 'Users and folders'), [ usersNote, btn(t('افزودن کاربر', 'Add user'), addUser, 'success', 'userPlus'), usersBox ], '#f59e0b', 'users');
		var trashList = E('div', { 'class': 'mk-list mk-list-tall' });
		function loadTrash() {
			return call([ 'trash-list' ]).then(paintTrash).catch(function(e) { trashList.replaceChildren(alertBox('error', 'alert', msgOf(e))); });
		}
		function paintTrash(r) {
			trashList.replaceChildren();
			if (!r.items.length) { trashList.appendChild(E('p', { 'class': 'mk-empty' }, [ icon('trash'), t('سطل بازیابی خالی است.', 'The recovery trash is empty.') ])); return; }
			r.items.sort(function(a, b) { return a.deleted < b.deleted ? 1 : -1; }).forEach(function(it) {
				var home = it.kind === 'home';
				trashList.appendChild(E('div', { 'class': 'mk-folder' }, [ icon(home ? 'user' : 'folder', 'mk-folder-ico'),
					E('div', { 'class': 'mk-grow' }, [ E('strong', {}, home ? [ t('پوشهٔ کامل کاربر حذف‌شده: ', 'Home of deleted user: '), E('bdi', { 'dir': 'ltr' }, it.user) ] : it.name),
						E('small', {}, [ t('صاحب: ', 'Owner: '), E('bdi', { 'dir': 'ltr' }, it.user), ' · ', t('حذف: ', 'Deleted: '), num(it.deleted), ' · ', it.size_kib >= 0 ? num(bytes(it.size_kib)) : '…' ]) ]),
					btn(t('بازیابی', 'Restore'), function() {
						return call([ 'trash-restore', it.user, it.entry ]).then(function(res) {
							ui.addNotification(null, E('p', {}, [ t('بازیابی شد در پوشهٔ خصوصی ', 'Restored into the private folder of '), E('bdi', { 'dir': 'ltr' }, it.user), ': ', res.restored ]), 'info');
							return loadTrash().then(refresh);
						});
					}, 'soft-green', 'restore'),
					btn(t('حذف همیشگی', 'Delete forever'), function() {
						if (!confirm(t('این مورد برای همیشه پاک شود؟ دیگر قابل بازیابی نیست.', 'Delete this item permanently? It cannot be recovered afterwards.'))) return;
						return call([ 'trash-delete', it.user, it.entry ]).then(loadTrash);
					}, 'soft-red', 'trash') ]));
			});
		}
		var trash = card(t('سطل بازیابی', 'Recovery trash'), [
			E('p', { 'class': 'mk-muted' }, t('پوشه‌هایی که از صفحهٔ مخزن حذف شده‌اند و پوشهٔ کاربران حذف‌شده. «بازیابی» مورد را به پوشهٔ خصوصی صاحبش برمی‌گرداند. فایل‌هایی که کاربر مستقیماً از راه SMB پاک کند به سطل نمی‌آیند.', 'Folders deleted from the Makhzan page and homes of deleted users. Restore returns an item to its owner\'s private folder. Files a user deletes directly over SMB do not come here.')),
			trashList,
			btn(t('خالی‌کردن کامل سطل', 'Empty the whole trash'), function() {
				if (!confirm(t('همهٔ محتوای سطل بازیابی برای همیشه پاک شود؟', 'Permanently delete everything in the recovery trash?'))) return;
				return call([ 'trash-empty' ]).then(loadTrash).then(refresh);
			}, 'danger', 'trash')
		], '#ef4444', 'trash');

		/* ---------- Disk maintenance: filesystem check and spin-down ---------- */
		var checkBtn = btn(t('بررسی و تعمیر دیسک', 'Check and repair disk'), function() {
			if (!confirm(t('اشتراک‌ها و DLNA چند دقیقه قطع می‌شوند و فایل‌سیستم دیسک بررسی و در صورت نیاز تعمیر می‌شود. ادامه می‌دهید؟', 'Shares and DLNA stop for a few minutes while the filesystem is checked and repaired if needed. Continue?'))) return;
			return call([ 'storage-check' ]).then(function() { lastJob = 'running'; return refresh(); });
		}, 'warn', 'wrench');
		var spinSelect = E('select', { 'dir': fa ? 'rtl' : 'ltr', 'class': 'mk-narrow-select', 'aria-label': t('خاموش شدن خودکار هارد', 'Hard-disk spin-down') },
			[ 0, 10, 20, 30, 60, 120 ].map(function(m) { return E('option', { 'value': String(m) }, m ? m + ' ' + t('دقیقه', 'min') : t('خاموش', 'Off')); }));
		var spinNote = E('small', { 'class': 'mk-msg' });
		spinSelect.addEventListener('change', function() {
			spinSelect.disabled = true;
			call([ 'set', 'spindown', spinSelect.value ]).then(function() { return call([ 'apply' ]); }).then(refresh).catch(notify).finally(function() { spinSelect.disabled = !data.services.spindown_supported; });
		});
		var maintenance = card(t('نگه‌داری دیسک', 'Disk maintenance'), [
			E('div', { 'class': 'mk-mrow' }, [ E('div', { 'class': 'mk-grow' }, [ E('strong', {}, t('بررسی و تعمیر فایل‌سیستم', 'Check and repair the filesystem')),
				E('small', {}, t('بعد از قطع ناگهانی برق یا جدا شدن USB بدون «آزادسازی»، یک بار دیسک را بررسی کنید.', 'Run once after a power cut or after the USB disk was unplugged without releasing it.')) ]), checkBtn ]),
			E('div', { 'class': 'mk-mrow' }, [ E('div', { 'class': 'mk-grow' }, [ E('strong', {}, t('خاموش شدن خودکار هارد', 'Hard-disk spin-down')),
				E('small', {}, t('هارد مکانیکی بعد از این مدت بیکاری خاموش می‌شود تا صدا، مصرف برق و فرسودگی کم شود (برای فلش لازم نیست).', 'A mechanical hard disk stops after this idle time to cut noise, power and wear (not needed for flash drives).')), spinNote ]), spinSelect ])
		], '#f59e0b', 'wrench');

		/* ---------- Media library: an existing NTFS/exFAT/FAT/ext disk, read-only ---------- */
		var libBox = E('div');
		function loadLibrary() {
			return call([ 'library-list' ]).then(paintLibrary).catch(function(e) { libBox.replaceChildren(alertBox('error', 'alert', msgOf(e))); });
		}
		function paintLibrary(r) {
			libBox.replaceChildren();
			if (r.current) libBox.appendChild(E('div', { 'class': 'mk-alert ok' }, [ icon('book'),
				E('span', {}, [ t('کتابخانهٔ فعال: ', 'Active library: '), E('strong', { 'dir': 'ltr' }, r.current.label || r.current.uuid), ' · ', (r.current.type || '').toUpperCase(),
					r.current.mounted ? t(' — در اشتراک Library و DLNA', ' — shared as Library and in DLNA') : t(' — دیسک وصل نیست', ' — disk not connected') ]),
				btn(t('قطع کتابخانه', 'Stop using'), function() { return call([ 'library-off' ]).then(function() { return refresh(); }).then(loadLibrary); }, 'soft-red mk-small', 'x') ]));
			if (!r.candidates.length) {
				libBox.appendChild(E('p', { 'class': 'mk-empty' }, [ icon('usb'), t('هارد یا پارتیشن دیگری با NTFS، exFAT، FAT یا ext روی USB پیدا نشد.', 'No other USB disk or partition with NTFS, exFAT, FAT or ext was found.') ]));
				return;
			}
			r.candidates.forEach(function(c) {
				libBox.appendChild(E('div', { 'class': 'mk-folder' }, [ icon('drive', 'mk-folder-ico'),
					E('div', { 'class': 'mk-grow' }, [ E('strong', { 'dir': 'ltr' }, c.label || c.dev), E('small', { 'dir': 'ltr' }, c.dev + ' · ' + c.type.toUpperCase() + ' · ' + bytes(c.size_mib * 1024) + (c.mounted_at ? ' · ' + c.mounted_at : '')) ]),
					c.driver ? btn(t('استفاده به‌عنوان کتابخانه', 'Use as library'), function() {
						if (!confirm(t('این دیسک فقط‌خواندنی وصل می‌شود و محتوایش در اشتراک Library و روی تلویزیون دیده می‌شود. فایل‌های روی آن تغییر نمی‌کنند. ادامه می‌دهید؟', 'The disk is mounted read-only and shown as the Library share and on TVs. Its files are not changed. Continue?'))) return;
						return call([ 'library-set', c.uuid ]).then(function() { return refresh(); }).then(loadLibrary);
					}, 'primary mk-small', 'book') : E('span', { 'class': 'mk-chip warn' }, [ icon('alert'), t('درایور نصب نیست: ', 'Driver missing: '), E('code', { 'dir': 'ltr' }, c.package) ]) ]));
			});
		}
		var libraryCard = card(t('کتابخانهٔ رسانه (هارد موجود، بدون پاک‌کردن)', 'Media library (existing disk, no erase)'), [
			E('p', { 'class': 'mk-muted' }, t('هارد یا فلشی که از قبل فیلم و موسیقی دارد (NTFS، exFAT، FAT یا ext) را بدون پاک‌کردن وصل کنید. محتوایش فقط‌خواندنی در اشتراک Library و در DLNA تلویزیون دیده می‌شود. پوشهٔ خصوصی روی آن ساخته نمی‌شود.', 'Connect a disk that already holds movies and music (NTFS, exFAT, FAT or ext) without erasing it. Its content appears read-only as the Library share and in DLNA on TVs. No private folders are created on it.')),
			libBox
		], '#0ea5e9', 'book');

		/* ---------- Remote access (WireGuard) ---------- */
		var remoteBox = E('div'), remoteState = null;
		function loadRemote() {
			return call([ 'remote-status' ]).then(function(r) { remoteState = r; paintRemote(r); }).catch(function(e) { remoteBox.replaceChildren(alertBox('error', 'alert', msgOf(e))); });
		}
		function ago(epoch) {
			if (!epoch) return t('هنوز وصل نشده', 'never connected');
			var m = Math.max(0, Math.round((Date.now() / 1000 - epoch) / 60));
			if (m < 2) return t('همین حالا', 'just now');
			if (m < 60) return t(m + ' دقیقه پیش', m + ' min ago');
			if (m < 2880) return t(Math.round(m / 60) + ' ساعت پیش', Math.round(m / 60) + ' h ago');
			return t(Math.round(m / 1440) + ' روز پیش', Math.round(m / 1440) + ' days ago');
		}
		function showRemoteConfig(user, create) {
			return call([ create ? 'remote-add' : 'remote-config', user ]).then(function(r) {
				return L.require('uqr').catch(function() { return null; }).then(function(uqr) {
					var qr = E('div', { 'class': 'mk-qr', 'dir': 'ltr' });
					if (uqr) qr.innerHTML = uqr.renderSVG(r.config, { pixelSize: 5, whiteColor: '#ffffff', blackColor: '#000000' });
					var download = btn(t('دانلود فایل تنظیمات', 'Download config file'), function() {
						var a = E('a', { 'href': URL.createObjectURL(new Blob([ r.config + '\n' ], { type: 'text/plain' })), 'download': 'makhzan-' + user + '.conf' });
						document.body.appendChild(a); a.click(); a.remove();
					}, 'soft-blue', 'download');
					modal(t('دسترسی از بیرون برای ', 'Remote access for ') + user, [
						E('ol', { 'class': 'mk-steps' }, [
							E('li', {}, t('برنامهٔ WireGuard را نصب کنید (اندروید: Google Play، آیفون: App Store، ویندوز و مک: wireguard.com).', 'Install the WireGuard app (Android: Google Play, iPhone: App Store, Windows and Mac: wireguard.com).')),
							E('li', {}, t('در برنامه دکمهٔ + و سپس «Scan from QR code» را بزنید و این کد را اسکن کنید (یا فایل تنظیمات را وارد کنید).', 'In the app tap + then "Scan from QR code" and scan this code (or import the config file).')),
							E('li', {}, t('تونل را روشن کنید.', 'Switch the tunnel on.')),
							E('li', {}, [ t('فایل‌ها را مثل خانه باز کنید: در CX File Explorer یا Files به ', 'Open your files as at home: in CX File Explorer or Files connect to '), E('code', { 'dir': 'ltr' }, 'smb://' + r.lan_ip), t(' و در ویندوز به ', ', on Windows to '), E('code', { 'dir': 'ltr' }, '\\\\' + r.lan_ip + '\\' + user), '.' ])
						]),
						qr,
						alertBox('warn', 'shield', t('این QR و فایل مثل رمز عبور است؛ آن را برای کس دیگری نفرستید. اگر گوشی گم شد، دسترسی را «لغو» کنید.', 'This QR code and file work like a password; never send them to anyone else. If the phone is lost, revoke the access.')),
						E('details', {}, [ E('summary', {}, t('نمایش متن تنظیمات', 'Show configuration text')), E('pre', { 'class': 'mk-conf', 'dir': 'ltr' }, r.config) ]),
						actions([ download, btn(t('بستن', 'Close'), ui.hideModal, 'soft-violet', 'x') ])
					], 'qr');
					return loadRemote();
				});
			});
		}
		function paintRemote(r) {
			remoteBox.replaceChildren();
			if (!r.installed) { remoteBox.appendChild(alertBox('warn', 'alert', t('WireGuard نصب نیست. بسته‌های kmod-wireguard و wireguard-tools را از System ← Software نصب کنید.', 'WireGuard is not installed. Install kmod-wireguard and wireguard-tools from System → Software.'))); return; }
			if (r.wan_private) remoteBox.appendChild(alertBox('warn', 'alert', [
				t('آدرس اینترنت این روتر خصوصی است (', 'This router\'s internet address is private ('), num(r.wan_ip || '—'),
				t('): روتر پشت مودم دیگری است. در مودم اصلی پورت UDP ', '): it sits behind another modem. On that modem forward UDP port '), num(String(r.port)),
				t(' را به ', ' to '), num(r.wan_ip || '—'),
				t(' فوروارد کنید و در کادر زیر IP عمومی یا نام DDNS را بنویسید. اگر اینترنت شما IP عمومی ندارد (CGNAT)، این قابلیت کار نمی‌کند.', ' and enter the public IP or DDNS name below. Without a public IP (CGNAT) this feature cannot work.') ]));
			if (!r.enabled) {
				var ep = E('input', { 'dir': 'ltr', 'value': r.endpoint || '', 'placeholder': 'myhome.ddns.net', 'autocomplete': 'off' });
				var port = E('input', { 'type': 'number', 'dir': 'ltr', 'min': '1024', 'max': '65535', 'value': String(r.port || 51820), 'class': 'mk-narrow' });
				remoteBox.appendChild(field(t('آدرس عمومی روتر (IP عمومی یا نام DDNS)', 'Public address of the router (public IP or DDNS name)'), ep));
				remoteBox.appendChild(field(t('پورت UDP', 'UDP port'), port));
				remoteBox.appendChild(btn(t('روشن کردن دسترسی از بیرون', 'Turn on remote access'), function() {
					return call([ 'remote-enable', ep.value.trim(), port.value ]).then(loadRemote);
				}, 'primary', 'globe'));
				return;
			}
			remoteBox.appendChild(E('div', { 'class': 'mk-alert ok' }, [ icon('shield'), E('span', {}, [ t('دسترسی از بیرون روشن است: ', 'Remote access is on: '), num(r.endpoint + ':' + r.port),
				t(' — از راه تونل فقط فایل‌سرور در دسترس است.', ' — only the file server is reachable through the tunnel.') ]),
				btn(t('خاموش کردن', 'Turn off'), function() {
					if (!confirm(t('دسترسی از بیرون برای همهٔ کاربران قطع و همهٔ QR کدها باطل می‌شود. ادامه می‌دهید؟', 'Remote access stops for everyone and all QR codes become invalid. Continue?'))) return;
					return call([ 'remote-disable' ]).then(loadRemote);
				}, 'soft-red mk-small', 'x') ]));
			if (!data.users.length) { remoteBox.appendChild(E('p', { 'class': 'mk-empty' }, [ icon('users'), t('اول در زبانهٔ کاربران یک کاربر بسازید.', 'Create a user on the Users tab first.') ])); return; }
			data.users.forEach(function(u) {
				var peer = (r.peers || []).filter(function(x) { return x.user === u.name; })[0];
				remoteBox.appendChild(E('div', { 'class': 'mk-user' }, [
					E('div', { 'class': 'mk-user-head' }, [ E('span', { 'class': 'mk-avatar' }, u.name.charAt(0).toUpperCase()), E('strong', { 'dir': 'ltr' }, u.name),
						E('span', { 'class': 'mk-chips' }, peer ? [ E('span', { 'class': 'mk-chip ok' }, [ icon('check'), t('دارای دسترسی', 'Has access') ]), E('span', { 'class': 'mk-chip' }, [ icon('clock'), t('آخرین اتصال: ', 'Last connected: '), ago(peer.handshake) ]) ]
							: [ E('span', { 'class': 'mk-chip' }, t('بدون دسترسی از بیرون', 'No remote access')) ]) ]),
					E('div', { 'class': 'mk-row' }, peer ? [
						btn(t('نمایش QR', 'Show QR'), function() { return showRemoteConfig(u.name, false); }, 'soft-blue', 'qr'),
						btn(t('لغو دسترسی', 'Revoke'), function() {
							if (!confirm(t('دسترسی از بیرون این کاربر لغو و QR قبلی باطل شود؟', 'Revoke this user\'s remote access and invalidate the old QR code?'))) return;
							return call([ 'remote-remove', u.name ]).then(loadRemote);
						}, 'soft-red', 'x') ] : [ btn(t('ساخت دسترسی و QR', 'Create access and QR'), function() { return showRemoteConfig(u.name, true); }, 'success', 'qr') ])
				]));
			});
		}
		var remoteCard = card(t('دسترسی از بیرون خانه (WireGuard)', 'Remote access from outside (WireGuard)'), [
			E('p', { 'class': 'mk-muted' }, t('با WireGuard از هر جای دنیا به‌صورت رمزنگاری‌شده به فایل‌هایتان دسترسی دارید. هر کاربر QR مخصوص خودش را می‌گیرد. از راه تونل فقط فایل‌سرور (SMB) در دسترس است و بقیهٔ شبکه و تنظیمات روتر بسته می‌مانند.', 'With WireGuard you reach your files from anywhere, encrypted. Every user gets their own QR code. Only the file server (SMB) is reachable through the tunnel; the rest of the network and the router settings stay closed.')),
			remoteBox
		], '#6366f1', 'globe');

		/* ---------- Space usage (Home tab) ---------- */
		var usageBox = E('div');
		var usageCard = card(t('مصرف فضای فایل‌سرور', 'File server space usage'), [ usageBox ], '#3b82f6', 'pie');
		function paintUsage(d) {
			usageBox.replaceChildren();
			if (!d.disk) {
				usageBox.append(E('p', { 'class': 'mk-empty' }, [ icon('drive'), t('حافظه آماده نیست. قدم اول: دیسک USB را در زبانهٔ «دیسک» آماده کنید.', 'Storage is not ready. First step: prepare the USB disk on the Disk tab.') ]),
					btn(t('رفتن به زبانهٔ دیسک', 'Go to the Disk tab'), function() { showTab('disk'); }, 'primary', 'drive'));
				return;
			}
			var u = d.usage, total = d.disk.total_kib || 1;
			if (!u) { usageBox.appendChild(E('p', { 'class': 'mk-muted' }, t('در حال محاسبهٔ مصرف فضا…', 'Calculating space usage…'))); return; }
			var rows = [];
			Object.keys(u.users || {}).forEach(function(n) { rows.push([ E('span', {}, [ t('کاربر ', 'User '), E('bdi', { 'dir': 'ltr' }, n) ]), u.users[n], '#8b5cf6', 'user' ]); });
			rows.push([ 'Shared', u.shared_kib, '#10b981', 'users' ], [ 'Media', u.media_kib, '#ec4899', 'tv' ], [ t('سطل بازیابی', 'Recovery trash'), u.trash_kib, '#ef4444', 'trash' ]);
			var known = rows.reduce(function(sum, r) { return sum + r[1]; }, 0);
			rows.push([ t('سیستم و سایر', 'System and other'), Math.max(0, d.disk.used_kib - known), '#94a3b8', 'layers' ]);
			rows.sort(function(a, b) { return b[1] - a[1]; }).forEach(function(r) {
				usageBox.appendChild(E('div', { 'class': 'mk-urow' }, [
					E('span', { 'class': 'mk-urow-name' }, [ icon(r[3]), r[0] ]),
					E('div', { 'class': 'mk-track' }, E('i', { 'style': 'width:' + Math.min(100, r[1] * 100 / total) + '%;background:' + r[2] })),
					E('strong', {}, num(bytes(r[1]))) ]));
			});
			usageBox.appendChild(E('small', {}, [ t('فضای آزاد: ', 'Free: '), num(bytes(d.disk.available_kib)), ' · ', t('هر ۵ دقیقه به‌روز می‌شود.', 'Updated every 5 minutes.') ]));
		}

		/* ---------- Tabs ---------- */
		var tabBar = E('div', { 'class': 'mk-tabs', 'role': 'tablist' }), panels = {}, tabButtons = {}, loaders = {}, activeTab = 'home';
		/* Setup order is disk first: without a saved tab and without ready storage, open the Disk tab. */
		if (!data.ready) activeTab = 'disk';
		try { activeTab = localStorage.getItem('makhzan-tab') || activeTab; } catch (e) {}
		function showTab(id) {
			if (!panels[id]) id = 'home';
			activeTab = id;
			Object.keys(panels).forEach(function(k) {
				panels[k].hidden = k !== id;
				tabButtons[k].classList.toggle('mk-tab-on', k === id);
				tabButtons[k].setAttribute('aria-selected', k === id ? 'true' : 'false');
			});
			try { localStorage.setItem('makhzan-tab', id); } catch (e) {}
			if (loaders[id]) loaders[id]();
		}
		function addTab(id, label, ico, content, loader) {
			tabButtons[id] = E('button', { 'type': 'button', 'class': 'mk-tab', 'role': 'tab', 'click': function() { showTab(id); } }, [ icon(ico), E('span', {}, label) ]);
			tabBar.appendChild(tabButtons[id]);
			panels[id] = E('div', { 'class': 'mk-panel', 'role': 'tabpanel' }, content);
			if (loader) loaders[id] = loader;
		}
		addTab('home', t('خانه', 'Home'), 'home', [ metrics, usageCard ]);
		addTab('disk', t('دیسک', 'Disk'), 'drive', [ planner, libraryCard, E('div', { 'class': 'mk-columns' }, [ maintenance, storageCard ]) ], loadLibrary);
		addTab('users', t('کاربران', 'Users'), 'users', [ users ]);
		addTab('services', t('سرویس‌ها', 'Services'), 'pulse', [ services ]);
		addTab('remote', t('دسترسی از بیرون', 'Remote access'), 'globe', [ remoteCard ], loadRemote);
		addTab('trash', t('سطل بازیابی', 'Recovery trash'), 'trash', [ trash ], loadTrash);

		paint(data);
		root.appendChild(tabBar);
		Object.keys(panels).forEach(function(k) { root.appendChild(panels[k]); });
		showTab(activeTab);
		root.appendChild(E('div', { 'class': 'mk-footer' }, [
			logo(28),
			E('div', {}, 'Makhzan ' + VERSION + ' · Copyright © 2026 dreamboxone · GNU GPLv3 · ' + t('بدون ضمانت', 'No warranty')),
			E('a', { 'href': 'https://t.me/routekernel1', 'target': '_blank', 'rel': 'noopener noreferrer', 'class': 'mk-link' }, [ icon('send'), 'Telegram · t.me/routekernel1' ])
		]));

		var ticks = 0;
		var tick = function() {
			if (!root.isConnected) { poll.remove(tick); return; }
			ticks++;
			if (data.job && data.job.state === 'running') {
				/* Light job check every 3 s; full refresh once the job has finished. */
				return call([ 'storage-job' ]).then(function(job) {
					data.job = job;
					if (job.state === 'running') showJob(job);
					else return refresh();
				}).catch(function() {});
			}
			if (ticks % 5 === 0) return refresh().then(function() {
				if (activeTab === 'trash' || activeTab === 'disk' || (activeTab === 'remote' && remoteState && remoteState.enabled)) return loaders[activeTab]();
			}).catch(function() {});
		};
		poll.add(tick, 3);
		return root;
	},

	handleSaveApply: null, handleSave: null, handleReset: null
});
