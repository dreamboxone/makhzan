// Copyright (C) 2026 dreamboxone; SPDX-License-Identifier: GPL-3.0-only
const assert = require('node:assert/strict');
const fs = require('node:fs');
const calendar = new Function('baseclass', fs.readFileSync('files/www/luci-static/resources/view/makhzan/calendar.js', 'utf8'))({ extend: value => value });
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
console.log('Persian date validation, leap dates, digit conversion and timezone independence: passed');
