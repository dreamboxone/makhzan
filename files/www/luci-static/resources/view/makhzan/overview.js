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
'require view.makhzan.calendar as calendar';

var VERSION = '2.0.1';
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
/* Makhzan wordmark («مخزن»): main letters and accents are separate paths, colored by theme.css
   (.mk-wm-a/.mk-wm-b gradient stops, .mk-wm-accent), so the hero, footer and dark mode can recolor it. */
var WM_MAIN = 'M951.2 430.9C939.9 429 923.4 421.9 915 415.2C912.5 413.2 908 409 905 405.8L899.5 400 L891.5 405C871.7 417.6 847.5 426.3 825 429C818.3 429.8 781.8 430 702.5 429.8L589.5 429.5 L586.2 427.2C581.2 423.6 579.5 419.6 579.6 411.5C579.8 402.1 582.3 393.3 587.6 382.9C598.2 362.5 613.6 350 637.1 342.9C644.5 340.6 644.7 340.6 735.5 340.1L826.5 339.5 L833 337.2C844 333.2 851.9 328.1 860.5 319.6C869.5 310.5 873.9 303.6 877.7 292.8C881.2 283.1 882 267.5 879.6 256.8C875.1 236.5 860.6 218.2 842.3 209.4C827.1 202.2 832.8 202.6 737.8 202L652.2 201.5 L647.8 198.5C645.5 196.8 642.4 193.5 641.1 191.1C638.7 186.8 638.7 186.3 638.7 160.1C638.7 130.2 639.1 127.9 646.3 120.8C653.4 113.6 649.6 113.9 746.6 114.3C830.4 114.6 833.8 114.7 842.5 116.7C881.2 125.6 913.9 147.1 935.9 178C944.6 190.1 946.8 194 952.4 207.2C961.9 229.6 965 245.4 965 271.5C965 295 962.4 309 954 330.2C951.8 335.7 950.2 340.5 950.4 340.8C951.6 341.9 965.2 338.5 971.6 335.5C983.9 329.6 993 317.6 996.5 302.8C997.5 298.3 998 290.6 998 276C998 253 998.9 243.3 1002.5 228.1C1008.7 202.2 1021.7 178.3 1039.4 160.2C1062.2 136.8 1086.4 123.3 1118.2 116.3C1124.2 115 1134.6 114.6 1178.7 114.3C1228.7 113.9 1232.6 114 1243.7 115.9C1274.2 121.1 1300.2 134.4 1321.6 155.5C1327.1 161 1334.4 169.3 1337.7 174C1349.5 190.6 1358.8 212.6 1362.8 233.3C1364.2 241.1 1364.5 248.8 1364.5 285C1364.5 332.6 1364.1 336.8 1357.3 355C1351.8 370 1345.9 379.5 1334.7 391.9C1319.5 408.7 1297 421.9 1274.5 427.3C1265.8 429.4 1263.7 429.5 1199.5 429.5C1148.6 429.5 1132.5 429.2 1129.3 428.2C1126.9 427.5 1122.2 424.8 1118.8 422.2C1113.8 418.5 1111.8 416.1 1109 410.6L1105.5 403.7 L1105.2 375.1C1105 357.4 1105.3 345.4 1105.9 343.8C1106.5 342.3 1108.1 340.3 1109.7 339.3C1112.2 337.6 1117.1 337.5 1181 337L1249.6 336.5 L1257.2 332.7C1269.6 326.6 1278.6 314.8 1281.1 301.4C1281.7 298.2 1282 286 1281.8 273.2C1281.5 251.7 1281.4 250.1 1278.9 243.4C1272.1 224.8 1258 211.3 1238.5 204.8C1231.6 202.5 1231 202.5 1184.5 202.5C1131.7 202.5 1133.3 202.3 1117.6 210.2C1106 216 1093.9 228.3 1088.2 240C1080.9 254.9 1080.8 256.1 1080 298C1079.3 338.1 1078.8 342.4 1073.4 358C1067.9 373.6 1059.4 386.8 1047 399C1030.3 415.4 1008.6 426.6 986.1 430.5C977.1 432.1 959.7 432.3 951.2 430.9ZM124.2 428.9C109.8 427.1 87.5 419.8 76.2 413.4C55 401.1 33.2 379.9 22.6 361.1C16.4 350.2 11 337.1 7.7 325.2L4.5 313.5 L4.2 254.7C3.9 197.6 4 195.7 6 188.3C12.6 164 32.5 143.7 55.6 137.5C59.5 136.4 67.9 135.7 80.6 135.3C101.3 134.7 106.3 135.4 107.7 139.3C108.1 140.5 108.5 174.1 108.5 214L108.5 286.5 L110.8 293.5C118.6 316.7 134.2 332.3 156 338.7C163.3 340.8 217.5 341.8 230.7 340C256.2 336.6 276.3 320.2 285 295.6L287.5 288.5 L288 213.8C288.5 143.7 288.6 139 290.3 137.3C291.9 135.7 294.2 135.5 311.8 135.5C333.9 135.6 339.8 136.5 350.7 141.5C369.6 150.2 382.3 164.2 388.8 183.5L391.5 191.5 L391.8 246C392 281.8 391.7 303.3 391 308.8C383 369.2 336.1 417.6 275.6 428C264.5 429.9 259.7 430 197.2 429.9C160.5 429.8 127.7 429.4 124.2 428.9Z';
var WM_ACCENT = 'M400.9 451.1C390.5 447.8 383.3 441.3 378.7 431.2C375.4 424 375.7 412.1 379.3 404.8C383.8 395.7 388.6 391.1 400.6 384.6C406.6 381.3 414 377 417.1 374.9C433.8 363.6 447.2 347.3 453.6 330.4C459.8 313.9 459.4 320.1 460 227.5L460.5 142.5 L463.2 137.8C465.3 134.3 467.3 132.5 471.3 130.5L476.7 127.9 L508.6 128.2C544.9 128.5 545.7 128.7 551.5 136.9L554.5 141.2 L554.8 226.8C555 299.1 554.8 314.4 553.5 324.5C548 368.3 524.6 405.4 487.3 429.7C460 447.5 420.4 457.3 400.9 451.1ZM1110.4 314.1C1105.2 310.9 1104.8 308.6 1105.2 282.8C1105.6 261.2 1105.7 259.1 1107.9 253.6C1111.9 243.4 1124 233.3 1134.7 231.1C1138.9 230.2 1153.8 230 1188.5 230.2L1236.5 230.5 L1241.7 233.2C1248.1 236.6 1254.2 242.8 1257.2 248.9C1259.3 253.1 1259.5 255.2 1259.8 273.7C1260.2 297.6 1259.4 301.7 1252.5 308.5C1244.9 316.2 1246.8 316 1176.1 316C1116.6 316 1113.3 315.9 1110.4 314.1ZM671.7 312.9C645.4 306.6 633 275.2 646.8 249.6C650.7 242.5 660.8 234.4 669 231.9C675.3 230 678.3 230 754 230.2L832.5 230.5 L838.3 232.8C846.9 236.3 855.8 245 860.1 254.2C863.2 261 863.4 262.2 863.5 272C863.5 281.8 863.3 283 860.3 289.3C856.1 298.2 848.8 305.8 840.3 310.1L833.5 313.5 L754.5 313.7C710.7 313.8 673.8 313.4 671.7 312.9ZM190.3 118.9C177.7 116.5 163 105.1 157.6 93.6C143.5 63.9 163.6 29.1 196.4 26.3C227.7 23.7 253.4 54.1 245.5 84.5C239.2 108.4 214.7 123.8 190.3 118.9ZM494.1 109.5C482.6 106.9 469.4 97 463.8 86.4C446.8 54.7 469.5 16 504.8 16C518.4 16 527 19.4 537 28.6C547.6 38.5 552.1 48.9 552.1 63.5C552.1 77.8 547.5 88.8 537.8 97.5C530.6 103.9 523.8 107.7 515.8 109.5C507.8 111.3 502.6 111.3 494.1 109.5ZM776.1 97.4C759.5 93 745.4 78.1 741.9 61.2C735.4 29.9 763.4 -0 794.6 4.8C810.8 7.3 823.2 16.6 830.7 31.6C834.5 39.3 834.5 39.5 834.5 51.4C834.5 63.3 834.4 63.6 830.8 71.3C820.7 92.5 798 103.3 776.1 97.4Z';
var wmCount = 0;
function logo(height) {
	var id = 'mk-wm-g' + (++wmCount), s = E('span', { 'class': 'mk-wordmark', 'role': 'img', 'aria-label': 'Makhzan' });
	s.innerHTML = '<svg viewBox="0 0 1369 457" height="' + height + '" width="' + Math.round(height * 1369 / 457) + '" aria-hidden="true">' +
		'<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2=".3"><stop offset="0" class="mk-wm-a"/><stop offset="1" class="mk-wm-b"/></linearGradient></defs>' +
		'<path class="mk-wm-main" fill="url(#' + id + ')" fill-rule="evenodd" d="' + WM_MAIN + '"/>' +
		'<path class="mk-wm-accent" fill-rule="evenodd" d="' + WM_ACCENT + '"/></svg>';
	return s;
}

/* Persian translations of backend errors; unknown messages are shown as-is. */
var FA_ERRORS = {
	'Could not lock downloader': 'قفل مدیریت دانلود در دسترس نیست؛ دوباره تلاش کنید.',
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
	'The kernel driver for this filesystem is not installed': 'درایور این نوع فایل‌سیستم نصب نیست؛ بستهٔ گفته‌شده را از \u2066System → Software\u2069 نصب کنید.',
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
	'hd-idle is not installed': 'بستهٔ hd-idle نصب نیست.',
	'Not enough free USB space for this download and the queued files': 'فضای خالی کافی برای دانلود وجود ندارد. فضای موردنیاز فایل‌های صف نیز محاسبه شده است.',
	'Not enough free USB space (64 MB reserve required)': 'فضای خالی USB کافی نیست؛ حداقل ۶۴ مگابایت باید آزاد بماند.',
	'The server did not report the file size; free space cannot be verified': 'سرور حجم فایل را اعلام نکرد یا پاسخ نداد؛ امکان بررسی فضای کافی نیست. لینک مستقیم معتبر وارد کنید و دوباره تلاش کنید.',
	'USB storage is not ready or its download directory is unsafe': 'حافظهٔ USB آماده نیست یا دسترسی پوشهٔ دانلود ایمن نیست.',
	'Invalid Persian date or time': 'تاریخ یا ساعت شمسی معتبر نیست؛ نمونه: ۱۴۰۵/۰۷/۱۵ و ۲۳:۳۰.',
	'Choose a future date and time': 'روز و ساعت آینده را انتخاب کنید؛ مبنا ساعت روتر به وقت تهران است.',
	'Use a direct HTTP or HTTPS link without embedded credentials': 'لینک مستقیم HTTP یا HTTPS وارد کنید؛ نام کاربری و رمز در لینک مجاز نیست.',
	'Invalid download filename': 'نام فایل معتبر نیست؛ از / و \\ و نام خالی استفاده نکنید.',
	'The curl package is not installed': 'بستهٔ curl نصب نیست؛ آن را از \u2066System → Software\u2069 نصب کنید.',
	'Pause the active download before changing the disk': 'قبل از تغییر یا آزادسازی دیسک، دانلودهای فعال را متوقف کنید.',
	'USB storage disconnected': 'ارتباط حافظهٔ USB قطع شد.',
	'Wait for the transfer to stop': 'چند لحظه صبر کنید تا انتقال متوقف شود.',
	'Download history is full (100 items); remove old entries': 'صف و تاریخچه به سقف ۱۰۰ مورد رسیده؛ موارد قدیمی را حذف کنید.',
	'Only a completed file can be renamed; choose a valid filename': 'فقط فایل کامل قابل تغییر نام است؛ یک نام معتبر وارد کنید.',
	'Could not rename downloaded file': 'تغییر نام فایل دانلودشده انجام نشد.',
	'Invalid download credentials': 'نام کاربری یا رمز واردشده معتبر نیست.',
	'Bandwidth must be between 1 and 65536 KB/s': 'پهنای باند باید بین ۱ تا ۶۵۵۳۶ کیلوبایت بر ثانیه باشد.',
	'Retry interval must be between 1 and 3600 seconds': 'فاصلهٔ تلاش مجدد باید بین ۱ تا ۳۶۰۰ ثانیه باشد.'
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
		return call([ 'storage-ready' ]).catch(function() {}).then(function() {
			return Promise.all([ call([ 'status' ]), call([ 'storage-devices' ]).catch(function() { return { devices: [] }; }) ]);
		});
	},

	render: function(initial) {
		var data = initial[0], devices = initial[1].devices || [], fa = data.language === 'fa';
		function t(p, e) { return fa ? p : e; }
		function msgOf(e) {
			var m = String(e && e.message || e), curl = m.match(/^Download failed \(curl code (\d+)\)$/);
			if (fa && curl) return 'ارتباط دانلود ناموفق بود (کد ' + curl[1] + '). لینک، اینترنت و اطلاعات ورود را بررسی کنید.';
			return fa && FA_ERRORS[m] ? FA_ERRORS[m] : m;
		}
		function notify(e, anchor) {
			if (anchor && anchor.isConnected) { inlineError(anchor, e); return; }
			var panel = panels && panels[activeTab];
			if (panel) panel.appendChild(alertBox('error', 'alert', msgOf(e)));
		}
		function feedback(anchor, text) {
			var old = anchor.nextElementSibling;
			if (old && old.classList.contains('mk-feedback')) old.remove();
			anchor.insertAdjacentElement('afterend', E('span', { 'class': 'mk-feedback', 'role': 'status' }, text));
		}
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
				Promise.resolve().then(function() { return fn(b); }).catch(function(e) { b.isConnected ? inlineError(b, e) : notify(e); })
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
			E('div', { 'class': 'mk-brand' }, [ E('div', {}, [
				E('h2', { 'aria-label': t('مخزن', 'Makhzan') }, [ logo(60), E('span', { 'class': 'mk-version' }, (fa ? '' : 'Makhzan ') + 'v' + VERSION) ]),
				E('p', {}, t('فایل‌سرور خانگی روی روتر شما — امن، ساده، همیشه در دسترس', 'Home file server on your router — private, simple, always on'))
			]) ]),
			E('div', { 'class': 'mk-row' }, [ theme, langBtn ])
		]));

		var metrics = E('div', { 'class': 'mk-grid mk-metrics' });
		var usersBox = E('div', { 'class': 'mk-users' }), serviceArea = E('div'), connectBox = E('div');

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
					return sendPassword(p.a.value).then(function(token) { return call([ 'passwd', user, token ]); }).then(function() { msg.textContent = t('رمز تغییر کرد.', 'Password changed.'); return refresh(); }).catch(function(e) { msg.textContent = msgOf(e); });
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
			else if (job.state === 'done') {
				if (!check) box.appendChild(alertBox('ok', 'check', t('دیسک با موفقیت آماده شد.', 'Disk prepared successfully.')));
				else if (job.result === 'clean') box.appendChild(alertBox('ok', 'check', t('بررسی تمام شد: دیسک سالم است و خطایی پیدا نشد.', 'Check finished: the disk is healthy, no errors found.')));
				else if (job.result === 'repaired') box.appendChild(alertBox('ok', 'wrench', t('بررسی تمام شد: خطاهای فایل‌سیستم پیدا و تعمیر شد.', 'Check finished: filesystem errors were found and repaired.')));
				else if (job.result === 'errors') box.appendChild(alertBox('warn', 'alert', t('بعضی خطاها تعمیر نشد. از فایل‌های مهم نسخهٔ پشتیبان بگیرید و دیسک را عوض کنید.', 'Some errors could not be repaired. Back up important files and replace the disk.')));
				else box.appendChild(alertBox('error', 'alert', t('بررسی دیسک اجرا نشد (کد ' + job.code + ').', 'The disk check could not run (code ' + job.code + ').')));
			}
			return box;
		}
		/* The job banner is refreshed on its own (cheap storage-job call), so it never sticks when the
		 * heavier status call is slow during large USB copies. */
		var fullBox = E('div'), jobBox = E('div'), extrootBox = E('div');
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
			if (!pathEdited && document.activeElement !== path) path.value = disk ? disk.root : '';
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
			paintExistingNas(d);
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
				usersNote.appendChild(alertBox('warn', 'alert', t('برای ساخت کاربر بستهٔ samba4-server را از \u2066System → Software\u2069 نصب کنید.', 'Install samba4-server from System → Software to create users.')));
			else if (!s.samba_enabled)
				usersNote.appendChild(E('div', { 'class': 'mk-alert warn' }, [ icon('server'), E('span', {}, t('SMB خاموش است؛ برای ساخت کاربر و اتصال به فایل‌ها آن را روشن کنید.', 'SMB is off; turn it on to create users and reach the files.')),
					btn(t('روشن کردن SMB', 'Turn on SMB'), function() { return call([ 'option', 'samba', '1' ]).then(function() { return call([ 'apply' ]); }).then(refresh); }, 'warn mk-small', 'check') ]));

			tmCheck.checked = !!s.timemachine_enabled; tmCheck.disabled = !s.timemachine_supported || !s.samba_installed;
			if (document.activeElement !== tmSize) tmSize.value = String(s.timemachine_gb || 0);
			spinSelect.disabled = !s.spindown_supported;
			if (document.activeElement !== spinSelect) spinSelect.value = String([ 0, 10, 20, 30, 60, 120 ].indexOf(s.spindown_minutes) >= 0 ? s.spindown_minutes : 0);
			spinNote.textContent = s.spindown_supported ? '' : t('برای این قابلیت بستهٔ hd-idle را از \u2066System → Software\u2069 نصب کنید.', 'Install the hd-idle package from System → Software for this feature.');

			var host = location.hostname;
			connectBox.replaceChildren(E('div', { 'class': 'mk-connect', 'dir': 'ltr' }, [
				E('code', {}, [ icon('link'), '\\\\' + host + '\\Shared' ]), E('code', {}, [ icon('link'), '\\\\' + host + '\\Media' ]),
				E('code', {}, [ icon('link'), '\\\\' + host + '\\' + t('نام‌کاربری', 'username') ]), E('code', {}, [ icon('link'), 'smb://' + host + '/Shared' ]),
				d.library ? E('code', {}, [ icon('book'), '\\\\' + host + '\\Library' ]) : ''
			]));
		}

		/* ---------- Existing storage ---------- */
		var pathEdited = false;
		var path = E('input', { 'placeholder': '/mnt/your-disk', 'dir': 'ltr', 'aria-label': t('مسیر حافظه', 'Storage path'), 'input': function() { pathEdited = true; } });
		var storageCard = card(t('حافظهٔ آماده (بدون پاک‌کردن)', 'Existing storage (no erase)'), [
			E('p', { 'class': 'mk-muted' }, t('دیسک قبلی مخزن هنگام بازکردن صفحه خودکار mount می‌شود و مسیرش در این کادر قرار می‌گیرد. برای دیسک دیگری که از قبل فرمت و mount شده، مسیر آن را وارد کنید؛ فایل‌های موجود حفظ می‌شوند.', 'Opening this page mounts the previously configured NAS disk and fills in its path. For another already formatted and mounted USB disk, enter its mount path; existing files are kept.')),
			E('div', { 'class': 'mk-row mk-add' }, [ path, btn(t('انتخاب حافظه', 'Select storage'), function() { return call([ 'root', path.value.trim() ]).then(function() { pathEdited = false; return refresh(); }); }, 'primary', 'check'),
				btn(t('اتصال دوبارهٔ دیسک قبلی', 'Reconnect previous disk'), function() { return call([ 'storage-ready' ]).then(function() { pathEdited = false; return refresh(); }); }, 'soft-blue', 'drive') ])
		], '#3b82f6', 'drive');

		/* ---------- Disk planner ---------- */
		var select = E('select', { 'dir': 'ltr', 'aria-label': t('انتخاب فلش مموری / هارد USB', 'USB flash / hard drive') });
		var devInfo = E('div'), roles = [], roleGrid = E('div', { 'class': 'mk-grid mk-roles' }), bar = E('div', { 'class': 'mk-track mk-track-lg' });
		var summary = E('p', { 'role': 'status', 'aria-live': 'polite', 'class': 'mk-summary' }), nasWarn = E('div', { 'role': 'alert' });
		var existingNas = E('div', { 'role': 'status', 'aria-live': 'polite' });
		function paintExistingNas(d) {
			existingNas.replaceChildren(d.disk ? alertBox('ok', 'check', [
				t('فایل‌سرور NAS ساخته و متصل شده است: ', 'NAS storage is created and mounted: '),
				num(d.disk.root), ' · ', num(bytes(d.disk.total_kib))
			]) : alertBox('', 'server', t('هنوز فایل‌سرور NAS آماده نیست.', 'NAS storage is not ready yet.')));
		}
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
			var body = [ E('label', { 'class': 'mk-switch-row' }, [ check, E('span', {}, t('در طرح جدید باشد', 'Include in new plan')) ]), E('div', { 'class': 'mk-unit' }, [ input, E('span', {}, 'MB') ]), E('small', {}, role[5]) ];
			if (idx === 2) body.push(btn(t('همهٔ فضای باقی‌مانده', 'Use all remaining'), function() {
				var disk = current(); if (!disk) return;
				check.checked = true; input.disabled = false; tile.classList.add('mk-role-on');
				var other = roles.slice(0, 2).reduce(function(s, x) { return s + (x.check.checked ? mbToMiB(x.input.value) : 0); }, 0);
				input.value = String(Math.max(0, mibToMB(disk.size_mib - 16 - other) - 1)); plot();
			}, 'soft-green mk-small', 'maximize'));
			tile = card(role[0] + ' · ' + role[1], body, role[3], role[4], 'mk-role');
			if (idx === 0) tile.appendChild(extrootBox);
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
						return call([ 'storage-release', disk.path ]).then(function() { return refresh(); }).then(function() { devInfo.appendChild(alertBox('ok', 'check', t('دیسک آزاد شد؛ اکنون می‌توانید آن را جدا یا دوباره تقسیم کنید.', 'Disk released; you can unplug or re-partition it now.'))); });
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
							ui.hideModal(); return refresh();
						}).catch(function(e) { msg.textContent = msgOf(e); });
					}, 'danger', 'layers'), btn(t('انصراف', 'Cancel'), ui.hideModal, 'soft-violet', 'x') ])
				], 'layers');
			});
		}, 'primary', 'layers');
		var planner = card(t('تقسیم فضای دیسک USB', 'USB disk allocation'), [
			existingNas,
			E('p', { 'class': 'mk-muted' }, t('هر گزینه مستقل است؛ یک، دو یا هر سه را انتخاب کنید.', 'Each role is optional; choose one, two or all three.')),
			E('div', { 'class': 'mk-select' }, [ icon('usb'), select ]), devInfo, roleGrid, bar, summary, nasWarn,
			alertBox('', 'alert', t('این عملیات کل دیسک را پاک می‌کند. دیسک در حال استفاده ابتدا باید آزاد شود.', 'This erases the whole disk. A disk in use must be released first.')),
			prepare, jobBox
		], '#8b5cf6', 'layers');

		/* ---------- Services ---------- */
		[ [ 'SMB', 'samba',  'samba_installed', 'samba_enabled', t('اشتراک فایل برای ویندوز، اندروید، iOS، مک و لینوکس', 'File sharing for Windows, Android, iOS, macOS and Linux'), 'samba4-server', 'server', '#3b82f6' ],
		  [ 'DLNA', 'dlna', 'minidlna_installed', 'dlna_enabled', t('پخش فیلم و موسیقی پوشهٔ Media روی تلویزیون', 'Streams the Media folder to TVs'), 'minidlna', 'tv', '#ec4899' ] ].forEach(function(s) {
			var installed = data.services[s[2]];
			var check = E('input', { 'type': 'checkbox', 'class': 'mk-switch', 'aria-label': s[0], 'checked': data.services[s[3]] ? 'checked' : null, 'disabled': installed ? null : 'disabled' });
			check.addEventListener('change', function() {
				check.disabled = true;
				call([ 'option', s[1], check.checked ? '1' : '0' ]).then(function() { return call([ 'apply' ]); }).then(refresh)
					.catch(function(e) { check.checked = !check.checked; call([ 'option', s[1], check.checked ? '1' : '0' ]).catch(function() {}); notify(e, check); })
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
			tmApply().catch(function(e) { tmCheck.checked = !tmCheck.checked; notify(e, tmCheck); }).finally(function() { tmCheck.disabled = !data.services.timemachine_supported; });
		});
		serviceArea.appendChild(E('div', { 'class': 'mk-service', 'style': '--accent:#64748b' }, [
			E('span', { 'class': 'mk-service-ico' }, icon('clock')),
			E('div', { 'class': 'mk-service-text' }, [ E('strong', {}, [ 'Time Machine', E('span', { 'class': 'mk-engine' }, 'macOS') ]),
				E('small', {}, t('پشتیبان‌گیری خودکار مک روی پوشهٔ خصوصی هر کاربر. در مک: \u2066System Settings → Time Machine → Add Backup Disk\u2069 و پوشهٔ خودتان را انتخاب کنید.', 'Automatic Mac backups into each user\'s private folder. On the Mac: System Settings → Time Machine → Add Backup Disk, then pick your own folder.')),
				E('div', { 'class': 'mk-row mk-inline' }, [ E('span', {}, t('سقف حجم هر کاربر (GB، صفر = بدون سقف):', 'Size limit per user (GB, 0 = none):')), tmSize,
					btn(t('ذخیره', 'Save'), function() { return tmApply(); }, 'soft-blue mk-small', 'check') ]) ]),
			tmCheck ]));
		var services = card(t('سرویس‌های شبکه', 'Network services'), [ serviceArea,
			E('div', { 'class': 'mk-row' }, [ btn(t('اسکن دوبارهٔ کتابخانهٔ DLNA', 'Rescan DLNA library'), function(b) {
				return call([ 'dlna-rescan' ]).then(function() { feedback(b, t('کتابخانهٔ DLNA از نو ساخته می‌شود؛ چند دقیقه بعد همهٔ فایل‌ها روی تلویزیون دیده می‌شوند.', 'The DLNA library is being rebuilt; all files appear on TVs within a few minutes.')); });
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
							return loadTrash().then(refresh).then(function() { trashList.appendChild(alertBox('ok', 'check', t('بازیابی شد در پوشهٔ خصوصی ', 'Restored into the private folder of ') + it.user + ': ' + res.restored)); });
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
			return call([ 'storage-check' ]).then(refresh);
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
			if (!r.installed) { remoteBox.appendChild(alertBox('warn', 'alert', t('WireGuard نصب نیست. بسته‌های kmod-wireguard و wireguard-tools را از \u2066System → Software\u2069 نصب کنید.', 'WireGuard is not installed. Install kmod-wireguard and wireguard-tools from System → Software.'))); return; }
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

		/* ---------- Scheduled downloads ---------- */
		var downloadState = null, downloadLoading = null, dateEdited = false;
		var downloadEnabled = E('input', { 'type': 'checkbox', 'class': 'mk-switch' });
		downloadEnabled.addEventListener('change', function() {
			downloadEnabled.disabled = true;
			call([ 'download-enabled', downloadEnabled.checked ? '1' : '0' ]).then(loadDownloads)
				.catch(function(e) { downloadEnabled.checked = !downloadEnabled.checked; notify(e, downloadEnabled); })
				.finally(function() { downloadEnabled.disabled = false; });
		});
		var limitInput = E('input', { 'type': 'number', 'min': '1', 'max': '65536', 'step': '1', 'dir': 'ltr' });
		var redialCheck = E('input', { 'type': 'checkbox', 'class': 'mk-switch' });
		var redialInterval = E('input', { 'type': 'number', 'min': '1', 'max': '3600', 'step': '1', 'dir': 'ltr' });
		var downloadSettings = card(t('مدیریت دانلود', 'Download manager'), [
			E('label', { 'class': 'mk-switch-row mk-option' }, [ downloadEnabled, E('span', {}, t('روشن؛ اجرای خودکار و ادامهٔ صف پس از روشن‌شدن روتر', 'Enabled; automatically continue the queue after router startup')) ]),
			E('small', {}, t('خاموش‌کردن این بخش انتقال‌ها را متوقف می‌کند و صف را نگه می‌دارد. با روشن‌کردن دوباره ادامه می‌یابند؛ فایل‌هایی که دستی متوقف کرده‌اید منتظر «ادامه» می‌مانند.', 'Disabling stops transfers but keeps the queue. Enabling resumes them; manually paused jobs wait for Resume.')),
			field(t('سقف مجموع پهنای باند دانلودها (KB/s)', 'Total download bandwidth limit (KB/s)'), limitInput),
			btn(t('ذخیرهٔ محدودیت', 'Save limit'), function(b) {
				return call([ 'download-limit', calendar.digits(limitInput.value) ]).then(function() { feedback(b, t('ذخیره شد؛ روی انتقال‌های تازه یا ادامه‌داده‌شده اعمال می‌شود.', 'Saved; applies to new or resumed transfers.')); });
			}, 'soft-blue', 'check'),
			E('small', {}, t('سقف بین تعداد دانلود همزمان انتخاب‌شده تقسیم می‌شود. برای اعمال تغییر روی انتقال‌های فعال، «توقف همه» و سپس «ادامهٔ همه» را بزنید.', 'The limit is divided by the selected concurrency. To apply a change to active transfers, use Pause all, then Resume all.')),
			E('label', { 'class': 'mk-switch-row mk-option' }, [ redialCheck, E('span', {}, t('تلاش مجدد اتصال پس از قطعی (Redial)', 'Reconnect after a disconnection (Redial)')) ]),
			field(t('فاصلهٔ تلاش مجدد (ثانیه)', 'Retry interval (seconds)'), redialInterval),
			btn(t('ذخیرهٔ اتصال مجدد', 'Save retry settings'), function(b) {
				return call([ 'download-redial', redialCheck.checked ? '1' : '0', calendar.digits(redialInterval.value) ]).then(function() { feedback(b, t('تنظیمات تلاش مجدد ذخیره شد.', 'Retry settings saved.')); });
			}, 'soft-blue', 'refresh'),
			E('small', {}, t('حداکثر ۵ تلاش برای هر دانلود؛ پس از آن امکان «تلاش دوباره» وجود دارد. خطای رمز، نبود فایل و کمبود فضا خودکار تکرار نمی‌شوند.', 'Up to 5 attempts per download, then Retry is available. Authentication errors, missing files and insufficient space are not retried automatically.'))
		], '#3b82f6', 'download');
		var clockText = E('p', { 'class': 'mk-clock', 'role': 'status' }), clockNote = E('small');
		var zoneBtn = btn(t('تنظیم ساعت روتر روی تهران', 'Set router timezone to Tehran'), function(b) {
			return call([ 'download-tehran' ]).then(function() {
				feedback(b, t('ساعت روتر روی تهران تنظیم شد.', 'Router timezone set to Tehran.')); return loadDownloads();
			});
		}, 'soft-blue', 'clock');
		var clockCard = card(t('ساعت و تقویم روتر', 'Router clock and calendar'), [ clockText,
			E('div', { 'class': 'mk-row' }, [ zoneBtn, clockNote,
				btn(t('همگام‌سازی ساعت اینترنتی', 'Sync with internet time'), function(b) {
					return call([ 'download-sync-clock' ]).then(function() { feedback(b, t('درخواست همگام‌سازی ارسال شد؛ نتیجه در همین بخش نشان داده می‌شود.', 'Time sync requested; its result appears here.')); });
				}, 'soft-violet', 'refresh') ])
		], '#6366f1', 'clock');
		var urlInput = E('input', { 'type': 'url', 'dir': 'ltr', 'placeholder': 'https://example.com/file.zip', 'autocomplete': 'off', 'maxlength': '4096' });
		var nameInput = E('input', { 'placeholder': 'file.zip', 'maxlength': '120', 'autocomplete': 'off' });
		var authCheck = E('input', { 'type': 'checkbox', 'class': 'mk-switch' });
		var authUser = E('input', { 'dir': 'ltr', 'autocomplete': 'off', 'maxlength': '128' });
		var authPass = E('input', { 'type': 'password', 'dir': 'ltr', 'autocomplete': 'new-password', 'maxlength': '512' });
		var authFields = E('div', { 'hidden': true }, [ field(t('نام کاربری دانلود', 'Download username'), authUser), field(t('رمز دانلود', 'Download password'), authPass),
			E('small', {}, t('برای لینک‌های HTTP Basic یا Digest. ورود فرم وب‌سایت پشتیبانی نمی‌شود. برای حفاظت از رمز از HTTPS استفاده کنید. اطلاعات ورود فقط در پوشهٔ خصوصی مدیر روی USB ذخیره می‌شود.', 'For HTTP Basic or Digest links; website login forms are not supported. Use HTTPS to protect credentials. Credentials are stored in a private administrator directory on USB.')) ]);
		authCheck.addEventListener('change', function() { authFields.hidden = !authCheck.checked; });
		var scheduled = E('input', { 'type': 'checkbox', 'class': 'mk-switch' });
		var dateInput = E('input', { 'dir': 'ltr', 'placeholder': '1405/07/15', 'inputmode': 'numeric', 'aria-label': t('تاریخ شمسی', 'Persian date') });
		var timeInput = E('input', { 'type': 'time', 'dir': 'ltr', 'aria-label': t('ساعت تهران', 'Tehran time') });
		var datePreview = E('p', { 'class': 'mk-muted', 'role': 'status' });
		var scheduleFields = E('div', { 'hidden': true }, [
			E('div', { 'class': 'mk-grid mk-download-fields' }, [ field(t('تاریخ شمسی (سال/ماه/روز)', 'Persian date (year/month/day)'), dateInput), field(t('ساعت تهران', 'Tehran time'), timeInput) ]), datePreview ]);
		function previewDate() {
			dateEdited = true;
			try { datePreview.textContent = calendar.display(calendar.toEpoch(dateInput.value, timeInput.value), fa); }
			catch (e) { datePreview.textContent = msgOf(e); }
		}
		dateInput.addEventListener('input', previewDate); timeInput.addEventListener('input', previewDate);
		scheduled.addEventListener('change', function() { scheduleFields.hidden = !scheduled.checked; });
		urlInput.addEventListener('change', function() {
			if (!nameInput.value) try { nameInput.value = decodeURIComponent(new URL(urlInput.value).pathname.split('/').pop() || 'download.bin'); } catch (e) {}
		});
		var powerCheck = E('input', { 'type': 'checkbox', 'class': 'mk-switch' });
		var formMsg = E('div', { 'role': 'status', 'aria-live': 'polite' });
		var requestToken = null, requestKey = '';
		function newToken() { var a = new Uint8Array(16); window.crypto.getRandomValues(a); return Array.from(a, function(n) { return n.toString(16).padStart(2, '0'); }).join(''); }
		var downloadAdd = btn(t('بررسی فضا و افزودن به صف', 'Check space and add to queue'), function() {
			formMsg.textContent = '';
			var start = scheduled.checked ? calendar.toEpoch(dateInput.value, timeInput.value) : 0;
			var args = [ urlInput.value.trim(), nameInput.value.trim(), String(start), powerCheck.checked ? '1' : '0' ];
			var key = args.join('\n');
			if (key !== requestKey || !requestToken) { requestKey = key; requestToken = newToken(); }
			formMsg.textContent = t('در حال بررسی حجم لینک و فضای USB…', 'Checking link size and USB free space…');
			return (authCheck.checked ? sendPassword(JSON.stringify({ username: authUser.value, password: authPass.value })) : Promise.resolve(''))
				.then(function(secret) { return call([ 'download-add', requestToken ].concat(args, [ secret ])); }).then(function() {
				requestToken = null; urlInput.value = ''; nameInput.value = ''; powerCheck.checked = false;
				authPass.value = '';
				formMsg.replaceChildren(alertBox('ok', 'check', t('دانلود در صف ثبت شد. با بستن مرورگر یا ریبوت از بین نمی‌رود.', 'Download queued. It survives closing the browser or rebooting.')));
				return loadDownloads();
			}).catch(function(e) { formMsg.replaceChildren(alertBox('error', 'alert', msgOf(e))); });
		}, 'success', 'download');
		var newDownload = card(t('دانلود جدید', 'New download'), [
			field(t('لینک مستقیم فایل', 'Direct file link'), urlInput), field(t('نام فایل', 'Filename'), nameInput),
			E('label', { 'class': 'mk-switch-row mk-option' }, [ authCheck, E('span', {}, t('این لینک به نام کاربری و رمز نیاز دارد', 'This link requires a username and password')) ]), authFields,
			E('label', { 'class': 'mk-switch-row mk-option' }, [ scheduled, E('span', {}, t('شروع در روز و ساعت دلخواه (شمسی)', 'Start on a chosen Persian date and time')) ]), scheduleFields,
			E('label', { 'class': 'mk-switch-row mk-option' }, [ powerCheck, E('span', {}, t('پس از پایان موفق دانلودها، سیستم روتر خاموش شود', 'Shut down the router after downloads finish successfully')) ]),
			E('small', {}, t('خاموشی فقط وقتی صف تمام شده و کار آینده، متوقف یا خطادار نمانده انجام می‌شود؛ ۶۰ ثانیه فرصت لغو دارید. اینترنت و Wi-Fi قطع می‌شوند. قطع برق کامل به سخت‌افزار بستگی دارد؛ برای روشن‌کردن دوباره معمولاً باید برق را قطع و وصل کنید.', 'Shutdown waits until the whole queue is finished, with no future, paused or failed jobs. A 60-second countdown can be cancelled. Internet and Wi-Fi stop. Full power removal depends on the hardware; restarting usually requires a power cycle.')),
			downloadAdd, formMsg,
			E('small', {}, t('فقط روی USB ذخیره می‌شود. حجم تمام فایل‌های صف پیشاپیش محاسبه می‌شود. لینک‌های ناشناخته از نظر حجم پذیرفته نمی‌شوند. فایل نهایی در اشتراک فقط‌خواندنی Downloads قرار می‌گیرد؛ برای دسترسی شبکه SMB را فعال کنید.', 'Stored on USB only. Space for all queued files is reserved in advance. Links of unknown size are rejected. Finished files appear in the read-only Downloads share; enable SMB for network access.'))
		], '#10b981', 'download');
		var queueMode = E('select', { 'aria-label': t('نحوهٔ اجرای صف', 'Queue mode') }, [
			E('option', { 'value': '1' }, t('پشت‌سرهم (یک فایل)', 'Sequential (one file)')),
			E('option', { 'value': '2' }, t('همزمان: ۲ فایل', 'Concurrent: 2 files')),
			E('option', { 'value': '3' }, t('همزمان: ۳ فایل', 'Concurrent: 3 files')) ]);
		queueMode.addEventListener('change', function() {
			queueMode.disabled = true;
			call([ 'download-parallel', queueMode.value ]).then(function() { feedback(queueMode, t('روش اجرای صف ذخیره شد؛ دانلودهای فعال ادامه پیدا می‌کنند.', 'Queue mode saved; active transfers continue.')); return loadDownloads(); })
				.catch(function(e) { notify(e, queueMode); }).finally(function() { queueMode.disabled = false; });
		});
		var downloadList = E('div'), shutdownBox = E('div'), queueNote = E('div');
		var downloadSearch = E('input', { 'type': 'search', 'placeholder': t('جستجوی نام فایل…', 'Search filename…'), 'aria-label': t('جستجوی دانلودها', 'Search downloads') });
		var downloadFilter = E('select', { 'aria-label': t('فیلتر فایل‌ها', 'Filter files') }, [ E('option', { 'value': 'all' }, t('همه', 'All')), E('option', { 'value': 'completed' }, t('دانلودشده‌ها', 'Completed')), E('option', { 'value': 'pending' }, t('فعال و در صف', 'Active and queued')) ]);
		downloadSearch.addEventListener('input', function() { if (downloadState) paintDownloads(downloadState); });
		downloadFilter.addEventListener('change', function() { if (downloadState) paintDownloads(downloadState); });
		function duration(seconds) { var s = Math.max(0, Math.floor(seconds || 0)); return [ Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60 ].map(function(v) { return String(v).padStart(2, '0'); }).join(':'); }
		function speedText(value) { var kb = Number(value || 0) / 1024; return kb >= 1024 ? (kb / 1024).toFixed(2) + ' MB/s' : kb.toFixed(1) + ' KB/s'; }
		function paintDownloads(r) {
			downloadState = r;
			if (!downloadEnabled.disabled) downloadEnabled.checked = !!r.enabled;
			if (document.activeElement !== limitInput) limitInput.value = String(r.limit);
			if (document.activeElement !== redialInterval) redialInterval.value = String(r.retry_interval);
			if (document.activeElement !== redialCheck) redialCheck.checked = !!r.redial;
			clockText.textContent = calendar.display(r.clock.now, fa);
			zoneBtn.disabled = !!r.clock.tehran;
			clockNote.textContent = r.clock.tehran ? t('ساعت از قبل روی تهران تنظیم شده است.', 'The timezone is already set to Tehran.') : t('منطقهٔ زمانی فعلی: ', 'Current timezone: ') + r.clock.zone;
			if (!dateEdited) { dateInput.value = calendar.dateInput(r.clock.now + 600); timeInput.value = calendar.timeInput(r.clock.now + 600); }
			queueMode.value = String(r.parallel);
			downloadAdd.disabled = !r.ready || !r.installed;
			downloadAdd.dataset.locked = downloadAdd.disabled ? '1' : '0';
			queueNote.replaceChildren();
			if (!r.enabled) queueNote.appendChild(alertBox('', 'download', t('مدیر دانلود خاموش است؛ فایل‌ها در صف می‌مانند تا آن را روشن کنید.', 'Download manager is disabled; queued files wait until you enable it.')));
			if (!r.clock.synced) queueNote.appendChild(alertBox('warn', 'clock', t('ساعت هنوز در این روشن‌شدن با اینترنت همگام نشده؛ دانلودهای زمان‌دار منتظر می‌مانند. دانلود فوری می‌تواند اجرا شود.', 'Time has not synchronized during this boot. Scheduled jobs wait; immediate jobs can run.')));
			if (!r.ready) queueNote.appendChild(alertBox('warn', 'usb', t('ابتدا حافظهٔ USB را در زبانهٔ دیسک آماده کنید.', 'Prepare USB storage on the Disk tab first.')));
			if (!r.installed) queueNote.appendChild(alertBox('warn', 'download', msgOf('The curl package is not installed')));
			shutdownBox.replaceChildren();
			if (r.shutdown_seconds > 0) shutdownBox.appendChild(E('div', { 'class': 'mk-alert warn' }, [
				E('span', {}, t('خاموشی روتر تا ', 'Router shutdown in ') + r.shutdown_seconds + t(' ثانیه', ' seconds')),
				btn(t('لغو خاموشی', 'Cancel shutdown'), function() { return call([ 'download-shutdown-cancel' ]).then(loadDownloads); }, 'warn', 'x') ]));
			downloadList.replaceChildren();
			var labels = { queued: t('در صف', 'Queued'), downloading: t('در حال دانلود', 'Downloading'), paused: t('متوقف', 'Paused'), failed: t('خطا', 'Failed'), completed: t('تمام‌شده', 'Completed'), cancelled: t('لغوشده', 'Cancelled'), finalizing: t('ذخیرهٔ نهایی', 'Finalizing'), deleting: t('در حال حذف', 'Deleting'), renaming: t('در حال تغییر نام', 'Renaming') };
			if (!r.jobs.length) downloadList.appendChild(E('p', { 'class': 'mk-muted' }, t('صف دانلود خالی است.', 'The download queue is empty.')));
			r.jobs.sort(function(a, b) { return a.order - b.order; }).forEach(function(j) {
				if (j.name.toLocaleLowerCase().indexOf(downloadSearch.value.toLocaleLowerCase()) < 0) return;
				if (downloadFilter.value === 'completed' && j.state !== 'completed') return;
				if (downloadFilter.value === 'pending' && [ 'queued', 'downloading', 'paused' ].indexOf(j.state) < 0) return;
				var pct = j.expected ? Math.min(100, j.bytes * 100 / j.expected) : (j.state === 'completed' ? 100 : 0);
				var row = E('div', { 'class': 'mk-download-item' }, [
					E('div', { 'class': 'mk-row' }, [ E('strong', { 'class': 'mk-grow' }, j.name), E('span', { 'class': 'mk-chip' }, labels[j.state] || j.state) ]),
					E('small', {}, j.start ? calendar.display(j.start, fa) : t('شروع فوری به ترتیب صف', 'Start as soon as a queue slot is available')),
					E('div', { 'class': 'mk-track' }, E('i', { 'style': 'width:' + pct + '%;background:linear-gradient(90deg,#06b6d4,#10b981)' })),
					E('small', {}, [ num(bytes(j.bytes / 1024) + ' / ' + bytes(j.expected / 1024)), ' · ', num(Math.floor(pct) + '%'), ' · ', num(speedText(j.speed)) ]),
					E('small', {}, [ t('زمان سپری‌شده: ', 'Elapsed: '), num(duration(j.elapsed)), ' · ', t('باقی‌مانده: ', 'Remaining: '), j.speed > 0 ? num(duration(j.eta)) : j.state === 'completed' ? num('00:00:00') : '—' ]) ]);
				if (j.error) row.appendChild(alertBox(j.state === 'queued' ? 'warn' : 'error', 'alert', msgOf(j.error)));
				if (j.state === 'queued' && j.retry_at > r.clock.now) row.appendChild(E('small', {}, t('تلاش مجدد تا ', 'Retry in ') + (j.retry_at - r.clock.now) + t(' ثانیه', ' seconds')));
				if (j.file) row.appendChild(E('code', { 'dir': 'ltr' }, j.file));
				var controls = [];
				function actionButton(label, action, ico) { return btn(label, function() { return call([ 'download-' + action, j.id ]).then(loadDownloads); }, 'soft-blue mk-small', ico); }
				if (j.state === 'queued' || j.state === 'downloading') controls.push(actionButton(t('توقف', 'Pause'), 'pause', 'x'));
				if (j.state === 'paused' || j.state === 'failed') controls.push(actionButton(t('ادامه / تلاش دوباره', 'Resume / retry'), 'resume', 'refresh'));
				if (j.state !== 'deleting' && j.state !== 'renaming') controls.push(btn(t('حذف فایل', 'Delete file'), function() {
					if (!confirm(t('این دانلود و فایل کامل یا نیمه‌کارهٔ آن برای همیشه حذف شود؟', 'Permanently delete this download and its completed or partial file?'))) return;
					return call([ 'download-remove', j.id ]).then(loadDownloads);
				}, 'soft-red mk-small', 'trash'));
				if (j.state === 'completed') controls.push(btn(t('تغییر نام', 'Rename'), function() {
					var newName = E('input', { 'value': j.name, 'maxlength': '120' }), msg = E('p');
					modal(t('تغییر نام فایل', 'Rename file'), [ field(t('نام جدید', 'New name'), newName), msg, actions([
						btn(t('ذخیره', 'Save'), function() { return call([ 'download-rename', j.id, newName.value.trim() ]).then(function() { ui.hideModal(); return loadDownloads(); }).catch(function(e) { msg.textContent = msgOf(e); }); }, 'success', 'check'),
						btn(t('انصراف', 'Cancel'), ui.hideModal, 'soft-violet', 'x') ]) ], 'folder');
				}, 'soft-blue mk-small', 'folder'));
				if (j.power) row.appendChild(E('small', {}, t('خاموشی پس از اتمام موفق صف درخواست شده است.', 'Shutdown requested after the queue completes successfully.')));
				row.appendChild(E('div', { 'class': 'mk-row' }, controls)); downloadList.appendChild(row);
			});
		}
		function loadDownloads() {
			if (downloadLoading) return downloadLoading;
			downloadLoading = call([ 'download-list' ]).then(paintDownloads).catch(function(e) { queueNote.replaceChildren(alertBox('error', 'alert', msgOf(e))); }).finally(function() { downloadLoading = null; });
			return downloadLoading;
		}
		var downloadQueue = card(t('صف دانلودها', 'Download queue'), [ field(t('نحوهٔ اجرا', 'Execution mode'), queueMode), queueNote, shutdownBox,
			E('div', { 'class': 'mk-row' }, [ btn(t('توقف همه', 'Pause all'), function() { return call([ 'download-pause-all' ]).then(loadDownloads); }, 'warn', 'x'), btn(t('ادامهٔ همه', 'Resume all'), function() { return call([ 'download-resume-all' ]).then(loadDownloads); }, 'success', 'refresh') ]),
			E('div', { 'class': 'mk-grid mk-download-fields' }, [ downloadSearch, downloadFilter ]), downloadList,
			E('small', {}, t('حذف فایل دائمی است. حداکثر ۱۰۰ مورد. زمان سپری‌شده فقط زمان انتقال را می‌شمارد؛ انتظار و توقف در آن نیست. زمان باقی‌مانده تخمینی است. ادامهٔ دانلود به پشتیبانی سرور از Range و شناسهٔ فایل بستگی دارد.', 'Deletion is permanent. Maximum 100 items. Elapsed time counts transfer time, excluding queue waits and pauses. Remaining time is an estimate. Resume requires server support for ranges and file validators.'))
		], '#06b6d4', 'download');

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
		addTab('home', t('خانه', 'Home'), 'home', [ metrics, fullBox, usageCard ]);
		addTab('disk', t('دیسک', 'Disk'), 'drive', [ planner, libraryCard, E('div', { 'class': 'mk-columns' }, [ maintenance, storageCard ]) ], loadLibrary);
		addTab('users', t('کاربران', 'Users'), 'users', [ users ]);
		addTab('services', t('سرویس‌ها', 'Services'), 'pulse', [ services ]);
		addTab('downloads', t('مدیریت دانلود', 'Download manager'), 'download', [ downloadSettings, clockCard, newDownload, downloadQueue ], loadDownloads);
		addTab('remote', t('دسترسی از بیرون', 'Remote access'), 'globe', [ remoteCard ], loadRemote);
		addTab('trash', t('سطل بازیابی', 'Recovery trash'), 'trash', [ trash ], loadTrash);

		paint(data);
		root.appendChild(tabBar);
		Object.keys(panels).forEach(function(k) { root.appendChild(panels[k]); });
		showTab(activeTab);
		root.appendChild(E('div', { 'class': 'mk-footer' }, [
			logo(26),
			E('div', {}, 'Makhzan ' + VERSION + ' · Copyright © 2026 dreamboxone · GNU GPLv3 · ' + t('بدون ضمانت', 'No warranty')),
			E('a', { 'href': 'https://t.me/routekernel1', 'target': '_blank', 'rel': 'noopener noreferrer', 'class': 'mk-link' }, [ icon('send'), 'Telegram · t.me/routekernel1' ])
		]));

		var ticks = 0;
		var tick = function() {
			if (!root.isConnected) { poll.remove(tick); return; }
			ticks++;
			if (activeTab === 'downloads') return loadDownloads();
			if (data.job && data.job.state === 'running') {
				/* Light job check every 3 s; full refresh once the job has finished. */
				return call([ 'storage-job' ]).then(function(job) {
					data.job = job;
					showJob(job);
					if (job.state !== 'running') return refresh();
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
