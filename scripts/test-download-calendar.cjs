// Copyright (C) 2026 dreamboxone; SPDX-License-Identifier: GPL-3.0-only
const assert = require('node:assert/strict');
const fs = require('node:fs');
// Load the module the way LuCI does: 'require baseclass' becomes a parameter, the result must be a
// constructor, and the view receives one instance of it.
const baseclass = { extend: (methods) => { const C = function() {}; Object.assign(C.prototype, methods); return C; } };
const Calendar = new Function('baseclass', fs.readFileSync('files/www/luci-static/resources/view/makhzan/calendar.js', 'utf8'))(baseclass);
assert.equal(typeof Calendar, 'function', 'LuCI requires the module to yield a constructor');
const calendar = new Calendar();
assert.equal(new Date(calendar.toEpoch('1405/07/15', '23:30') * 1000).toISOString(), '2026-10-07T20:00:00.000Z');
assert.equal(calendar.toEpoch('۱۴۰۵/۰۷/۱۵', '۲۳:۳۰'), calendar.toEpoch('1405/07/15', '23:30'));
assert.equal(calendar.dateInput(calendar.toEpoch('1399/12/30', '12:00')), '1399/12/30');
assert.throws(() => calendar.toEpoch('1400/12/30', '12:00'));
assert.throws(() => calendar.toEpoch('1405/07/31', '12:00'));
assert.throws(() => calendar.toEpoch('1405/07/15', '24:00'));
for (const zone of ['UTC', 'America/New_York', 'Asia/Tokyo']) {
 process.env.TZ = zone;
 assert.equal(calendar.toEpoch('1405/01/01', '00:00'), Date.parse('2026-03-20T20:30:00Z') / 1000);
}
// Read from the right: weekday, day, month, year, then the time (Tehran time).
const shown = calendar.display(calendar.toEpoch('1405/07/15', '23:30'), true);
assert.equal(shown, 'چهارشنبه ۱۵ مهر ۱۴۰۵، ساعت ۲۳:۳۰');
assert.equal(calendar.display(calendar.toEpoch('1405/07/15', '09:05'), false), 'Wednesday, 15 Mehr 1405, 09:05');
console.log('Persian date validation, leap dates, digit conversion, timezone independence and date order: passed');
