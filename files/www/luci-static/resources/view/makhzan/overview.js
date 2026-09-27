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

var VERSION = '1.1.0';
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
	maximize: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'
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
	'User removed, but Samba restart failed': 'کاربر حذف شد، ولی راه‌اندازی مجدد Samba ناموفق بود.'
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
		var theme = btn(t('روشن / تیره', 'Light / Dark'), function() {
			root.classList.toggle('mk-dark');
			try { localStorage.setItem('makhzan-theme', root.classList.contains('mk-dark') ? 'dark' : 'light'); } catch (e) {}
		}, 'glass', 'moon');
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
		var usersBox = E('div', { 'class': 'mk-users' }), trashBox = E('div'), serviceArea = E('div'), connectBox = E('div');
		root.appendChild(banner);
		root.appendChild(metrics);

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
			modal(t('کاربر جدید', 'New user'), [
				E('p', { 'class': 'mk-muted' }, t('یک پوشهٔ خصوصی و یک اشتراک SMB هم‌نام با کاربر ساخته می‌شود. کاربر به پوشه‌های Shared و Media هم دسترسی دارد.', 'Creates a private folder and an SMB share named after the user. The user can also use the Shared and Media folders.')),
				field(t('نام کاربری (حروف کوچک انگلیسی)', 'Username (lowercase)'), name) ].concat(p.fields, [ msg,
				actions([ btn(t('ساخت کاربر', 'Create user'), function() {
					if (!/^[a-z][a-z0-9_-]{0,30}$/.test(name.value)) { msg.textContent = t('نام کاربری باید با حرف کوچک انگلیسی شروع شود و فقط شامل حروف کوچک، عدد، _ یا - باشد.', 'Start with a lowercase letter; use only a-z, 0-9, _ or -.'); return; }
					if (data.users.some(function(u) { return u.name === name.value; })) { msg.textContent = t('کاربر «' + name.value + '» از قبل وجود دارد. نام دیگری انتخاب کنید.', 'User "' + name.value + '" already exists. Choose another name.'); return; }
					var err = p.check(); if (err) { msg.textContent = err; return; }
					msg.textContent = t('در حال ساخت…', 'Creating…');
					return sendPassword(p.a.value).then(function(token) { return call([ 'add-user', name.value, token ]); }).then(function() { ui.hideModal(); return refresh(); }).catch(function(e) { msg.textContent = msgOf(e); });
				}, 'success', 'userPlus'), btn(t('انصراف', 'Cancel'), ui.hideModal, 'soft-violet', 'x') ]) ]), 'userPlus');
			name.focus();
		}

		/* ---------- Status painting ---------- */
		var lastJob = null;
		function alertBox(kind, ico, text) { return E('p', { 'class': 'mk-alert ' + kind }, [ icon(ico), E('span', {}, text) ]); }
		function paintJob(job) {
			var box = E('div');
			if (job.state === 'running') {
				var steps = { checking: t('بررسی', 'checking'), partitioning: t('پارتیشن‌بندی', 'partitioning'), formatting: t('فرمت', 'formatting'), configuring: t('پیکربندی', 'configuring'), copying_overlay: t('کپی اطلاعات روتر روی USB (ممکن است چند دقیقه طول بکشد)', 'copying router data to USB (may take minutes)'), activating: t('فعال‌سازی', 'activating') };
				box.appendChild(alertBox('mk-busy', 'refresh', t('آماده‌سازی دیسک در حال انجام است: ', 'Preparing disk: ') + (steps[job.step] || '…') + t(' — روتر را خاموش نکنید و USB را جدا نکنید.', ' — do not power off or unplug the USB.')));
			}
			else if (job.state === 'failed')
				box.appendChild(alertBox('error', 'alert', t('آماده‌سازی دیسک ناموفق بود: ', 'Disk preparation failed: ') + msgOf(job.error)));
			else if (job.state === 'done' && lastJob === 'running')
				box.appendChild(alertBox('ok', 'check', t('دیسک با موفقیت آماده شد.', 'Disk prepared successfully.')));
			lastJob = job.state;
			return box;
		}
		/* The job banner is refreshed on its own (cheap storage-job call), so it never sticks when the
		 * heavier status call is slow during large USB copies. */
		var jobBox = E('div'), extrootBox = E('div');
		banner.replaceChildren(jobBox, extrootBox);
		function showJob(job) {
			jobBox.replaceChildren(paintJob(job));
			var running = job.state === 'running';
			prepare.dataset.locked = running ? '1' : '0';
			if (prepare.dataset.running !== '1') prepare.disabled = running;
			prepare.title = running ? t('آماده‌سازی دیسک در حال انجام است', 'A disk preparation is running') : '';
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
			function dot(on) { return E('b', { 'class': on ? 'mk-on' : 'mk-off' }, on ? '●' : '○'); }
			metrics.replaceChildren(
				metric(t('فضای آزاد NAS', 'NAS free space'), disk ? num(bytes(disk.available_kib)) : '—',
					disk ? num(bytes(disk.used_kib) + ' / ' + bytes(disk.total_kib) + ' · ' + disk.root) : t('حافظه آماده نیست', 'Storage is not ready'),
					'#3b82f6', 'pie', E('div', { 'class': 'mk-track' }, E('i', { 'style': 'width:' + pct + '%;background:linear-gradient(90deg,#22d3ee,#3b82f6)' }))),
				metric(t('کاربران', 'Users'), String(d.users.length), t('پوشهٔ خصوصی + اشتراک SMB', 'Private folder + SMB share'), '#8b5cf6', 'users'),
				metric(t('سرویس‌ها', 'Services'), E('span', { 'class': 'mk-svc' }, [ 'SMB ', dot(s.samba_running), '  DLNA ', dot(s.dlna_running) ]),
					d.extroot_active ? t('extroot فعال است', 'extroot is active') : t('وضعیت اجرای سرویس‌ها', 'Service runtime state'), '#10b981', 'pulse'),
				metric(t('فلش / هارد USB', 'USB flash / hard drive'), String(devices.length), t('دیسک متصل', 'Connected disks'), '#f59e0b', 'usb')
			);
			showJob(d.job || { state: 'idle' });
			paintExtroot(d.extroot_state || 'off');

			usersBox.replaceChildren();
			d.users.forEach(function(u) {
				var badges = [ E('span', { 'class': 'mk-chip' }, [ icon('drive'), num(bytes(u.used_kib)) ]) ];
				if (!u.home) badges.push(E('span', { 'class': 'mk-chip warn' }, [ icon('alert'), t('پوشه در دسترس نیست', 'Folder unavailable') ]));
				if (!u.smb) badges.push(E('span', { 'class': 'mk-chip warn' }, [ icon('alert'), t('بدون رمز SMB', 'No SMB password') ]));
				if (u.locked) badges.push(E('span', { 'class': 'mk-chip error' }, [ icon('lock'), t('قفل‌شده (۴ ورود ناموفق)', 'Locked (4 failed logins)') ]));
				if (u.smb && !u.locked && u.home) badges.push(E('span', { 'class': 'mk-chip ok' }, [ icon('check'), t('فعال', 'Active') ]));
				var acts = [ btn(t('پوشه‌ها', 'Folders'), function() { return folders(u.name); }, 'soft-blue', 'folder'), btn(t('تغییر رمز', 'Password'), function() { changePassword(u.name); }, 'soft-amber', 'key') ];
				if (u.locked) acts.push(btn(t('رفع قفل', 'Unlock'), function() { return call([ 'unlock', u.name ]).then(refresh); }, 'soft-green', 'unlock'));
				acts.push(btn(t('حذف کاربر', 'Delete user'), function() { deleteUser(u.name); }, 'soft-red', 'trash'));
				usersBox.appendChild(E('div', { 'class': 'mk-user' }, [
					E('div', { 'class': 'mk-user-head' }, [ E('span', { 'class': 'mk-avatar' }, u.name.charAt(0).toUpperCase()), E('strong', { 'dir': 'ltr' }, u.name), E('span', { 'class': 'mk-chips' }, badges) ]),
					E('div', { 'class': 'mk-row' }, acts)
				]));
			});
			if (!d.users.length) usersBox.appendChild(E('p', { 'class': 'mk-empty' }, [ icon('users'), t('هنوز کاربری ساخته نشده است.', 'No users yet.') ]));

			trashBox.replaceChildren(E('div', { 'class': 'mk-stat' }, [ icon('trash'), E('span', {}, t('حجم سطل بازیابی: ', 'Recovery trash size: ')), E('strong', {}, num(bytes(d.trash_kib))) ]));

			var host = location.hostname;
			connectBox.replaceChildren(E('div', { 'class': 'mk-connect', 'dir': 'ltr' }, [
				E('code', {}, [ icon('link'), '\\\\' + host + '\\Shared' ]), E('code', {}, [ icon('link'), '\\\\' + host + '\\Media' ]),
				E('code', {}, [ icon('link'), '\\\\' + host + '\\' + t('نام‌کاربری', 'username') ]), E('code', {}, [ icon('link'), 'smb://' + host + '/Shared' ])
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
		  [ t('حافظهٔ مجازی', 'Virtual RAM'), 'swap', 256, '#f59e0b', 'sparkle', t('برای روترهای کم‌RAM؛ ۲۵۶ تا ۱۰۲۴ مگابایت کافی است.', 'For low-RAM routers; 256-1024 MB is enough.') ],
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
		var services = card(t('سرویس‌های شبکه', 'Network services'), [ serviceArea,
			E('p', { 'class': 'mk-muted' }, t('آدرس‌های اتصال (فقط از شبکهٔ داخلی LAN):', 'Connection addresses (LAN only):')), connectBox,
			alertBox('ok', 'shield', t('هر کاربر فقط پوشهٔ خصوصی خودش را می‌بیند. بعد از ۴ رمز اشتباه، حساب ۱۵ دقیقه قفل می‌شود.', 'Each user sees only their own private share. After 4 wrong passwords the account is locked for 15 minutes.')),
			btn(t('اعمال مجدد تنظیمات', 'Re-apply settings'), function() { return call([ 'apply' ]).then(refresh); }, 'soft-green', 'refresh')
		], '#10b981', 'pulse');

		/* ---------- Users and trash ---------- */
		var users = card(t('کاربران و پوشه‌ها', 'Users and folders'), [ btn(t('افزودن کاربر', 'Add user'), addUser, 'success', 'userPlus'), usersBox ], '#f59e0b', 'users');
		var trash = card(t('سطل بازیابی', 'Recovery trash'), [
			E('p', { 'class': 'mk-muted' }, t('پوشه‌های حذف‌شده و پوشهٔ کاربران حذف‌شده اینجا نگه‌داری می‌شوند (فقط برای مدیر).', 'Deleted folders and homes of deleted users are kept here (administrator only).')),
			trashBox,
			btn(t('خالی‌کردن سطل', 'Empty trash'), function() {
				if (!confirm(t('همهٔ محتوای سطل بازیابی برای همیشه پاک شود؟', 'Permanently delete everything in the recovery trash?'))) return;
				return call([ 'trash-empty' ]).then(refresh);
			}, 'danger', 'trash')
		], '#ef4444', 'trash');

		paint(data);
		root.appendChild(E('div', { 'class': 'mk-columns' }, [ services, users ]));
		root.appendChild(planner);
		root.appendChild(E('div', { 'class': 'mk-columns' }, [ storageCard, trash ]));
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
			if (ticks % 5 === 0) return refresh().catch(function() {});
		};
		poll.add(tick, 3);
		return root;
	},

	handleSaveApply: null, handleSave: null, handleReset: null
});
