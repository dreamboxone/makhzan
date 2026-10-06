<div dir="rtl">

## مخزن @TAG@ — فایل‌سرور خانگی برای OpenWrt

نسخه ۲ **مدیر دانلود** را به مخزن اضافه می‌کند: دانلود مستقیم روی دیسک USB با چند اتصال همزمان برای هر فایل، دکمه «دانلود» برای شروع فوری، صف تا ۶ فایل همزمان، زمان‌بندی با تقویم شمسی، دانلود در ساعت‌های دلخواه، سقف سرعت کلی و جداگانه، بررسی کد فایل (SHA-256 یا MD5)، ادامه بعد از قطعی و پشتیبانی از لینک‌های دارای رمز، Referer و Cookie.

همچنین بخش تقسیم دیسک حالا طرح فعلی دیسک را نشان می‌دهد و اجازه نمی‌دهد جمع سهم‌ها از حجم دیسک بیشتر شود؛ فایل‌سرور تمام فضای اختصاص‌یافته را بدون رزرو ۵٪ در اختیار می‌گذارد؛ و رابط کاربری در موبایل و در حالت روشن و تیره بهتر شده است.

> **برای ارتقا، نسخه جدید را روی قبلی نصب کنید و اول حذف نکنید**.

یک بسته برای **همه معماری‌ها**: مخزن کد کامپایل‌شده ندارد، پس همین فایل‌ها روی همه روترها نصب می‌شوند.

| پردازنده | OpenWrt 25.12 و جدیدتر | OpenWrt 24.10 و قدیمی‌تر |
|---|---|---|
| ARMv7 (مثل ipq40xx، mt7629، mvebu) | `@APK@` | `@IPK@` |
| ARMv8 / ARMv9 (aarch64، مثل filogic، ipq807x، Raspberry Pi) | `@APK@` | `@IPK@` |
| x86-64 | `@APK@` | `@IPK@` |

هر دو فایل پیش از انتشار به‌طور خودکار روی x86-64، ARMv8 و ARMv7 در محیط رسمی OpenWrt نصب و تست شده‌اند.

### نصب

<div dir="ltr">

```sh
# OpenWrt 25.12+
apk update && apk add kmod-usb-storage kmod-fs-ext4 samba4-server minidlna
apk add --allow-untrusted /tmp/@APK@

# OpenWrt 24.10 and older
opkg update && opkg install kmod-usb-storage kmod-fs-ext4 samba4-server minidlna
opkg install /tmp/@IPK@
```

</div>

بعد از نصب یک بار از LuCI خارج و دوباره وارد شوید، سپس به **Services ← Makhzan** بروید.
راهنمای کامل، حذف برنامه و محدودیت‌ها: [README](https://github.com/@REPO@#readme)

</div>

---

## Makhzan @TAG@ — home NAS for OpenWrt

Version 2 adds a **download manager**: downloads go straight to the USB disk with several connections per file, a Download button that starts at once, a queue of up to six files at a time, Persian-calendar scheduling, download hours, total and per-download speed limits, checksum verification (SHA-256 or MD5), resume after disconnects, and links that need a password, Referer or Cookie.

The disk planner now shows the disk's current layout and never lets the roles add up to more than the disk; the file server gets all of its space (no 5% root reserve); and the interface works better on phones and in light and dark mode.

> **To upgrade, install the new version over the existing one; do not uninstall first.**

One architecture-independent package (`@VERSION@`) for **ARMv7, ARMv8/ARMv9 (aarch64) and x86-64** (and other targets):

- `@APK@` — OpenWrt 25.12 and newer (apk)
- `@IPK@` — OpenWrt 24.10 and older (opkg)

Both were installed and exercised automatically on x86-64, ARMv8 and ARMv7 OpenWrt containers before publishing. Verify downloads with `SHA256SUMS`. Install instructions, removal and limitations: [README](https://github.com/@REPO@#readme).

Copyright © 2026 dreamboxone — GNU GPL v3, without warranty.
