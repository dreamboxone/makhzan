/* Copyright (C) 2026 dreamboxone; SPDX-License-Identifier: GPL-3.0-only */
'use strict';
'require baseclass';

function digits(value) {
	return String(value).replace(/[۰-۹]/g, function(c) { return String(c.charCodeAt(0) - 1776); })
		.replace(/[٠-٩]/g, function(c) { return String(c.charCodeAt(0) - 1632); });
}
function parts(epoch, zone) {
	var out = {};
	new Intl.DateTimeFormat('en-u-ca-persian', { timeZone: zone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' })
		.formatToParts(new Date(epoch * 1000)).forEach(function(p) { out[p.type] = p.value; });
	return [Number(out.year), Number(out.month), Number(out.day)];
}
// Use the browser's Persian-calendar implementation, round-trip the input, and never depend
// on its local timezone or clock. Modern Iran schedules use fixed UTC+03:30 (no summer time).
function toEpoch(date, time) {
	var d = digits(date).match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/), h = digits(time).match(/^(\d{1,2}):(\d{2})$/);
	if (!d || !h) throw new Error('Invalid Persian date or time');
	var y = Number(d[1]), m = Number(d[2]), day = Number(d[3]), hour = Number(h[1]), minute = Number(h[2]);
	if (y < 1390 || y > 1416 || m < 1 || m > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) throw new Error('Invalid Persian date or time');
	var target = y * 10000 + m * 100 + day, lo = Math.floor(Date.UTC(y + 621, 0, 1) / 86400000), hi = lo + 730;
	while (lo <= hi) {
		var mid = Math.floor((lo + hi) / 2), p = parts(mid * 86400), key = p[0] * 10000 + p[1] * 100 + p[2];
		if (key === target) return mid * 86400 + hour * 3600 + minute * 60 - 12600;
		if (key < target) lo = mid + 1; else hi = mid - 1;
	}
	throw new Error('Invalid Persian date or time');
}
function dateInput(epoch) { return parts(epoch, 'Asia/Tehran').map(function(n, i) { return i ? String(n).padStart(2, '0') : String(n); }).join('/'); }
function timeInput(epoch) { return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(epoch * 1000)); }
function display(epoch, fa) { return new Intl.DateTimeFormat(fa ? 'fa-IR-u-ca-persian' : 'en-u-ca-persian', { timeZone: 'Asia/Tehran', dateStyle: 'full', timeStyle: 'short' }).format(new Date(epoch * 1000)); }
return baseclass.extend({ digits: digits, toEpoch: toEpoch, dateInput: dateInput, timeInput: timeInput, display: display });
