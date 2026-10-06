<div dir="rtl">

## مخزن @TAG@ — فایل‌سرور خانگی برای OpenWrt

این انتشار بر مبنای نسخهٔ محلی پروژه است و README فارسی و انگلیسی را با همان رابط هماهنگ می‌کند: مدیریت دانلود در برگهٔ مستقل، صف پشت‌سرهم یا تا ۳ فایل همزمان، زمان‌بندی شمسی، بررسی فضای USB، توقف و ادامه، حذف و تغییر نام، جستجو، سقف سرعت، اتصال مجدد و لینک‌های رمزدار. ماژول تقویم با قالب موردنیاز LuCI و نام وابسته به نسخه بسته‌بندی می‌شود.

این نسخه عین رابط 2.0.0 نیست؛ امکانات قابل استفاده از رابط را در README همین نسخه ببینید. سقف انتخاب دانلود همزمان در رابط این انتشار ۳ فایل است.

> **برای ارتقا، نسخهٔ جدید را روی قبلی نصب کنید و اول حذف نکنید**.

یک بسته برای **همهٔ معماری‌ها**: مخزن کد کامپایل‌شده ندارد، پس همین فایل‌ها روی همهٔ روترها نصب می‌شوند.

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

This release follows the local project revision and aligns the Persian and English README with its interface: a dedicated download manager, sequential or up to three concurrent files, Persian scheduling, USB space checks, pause/resume, delete/rename, search, bandwidth limits, retries and authenticated links. The calendar is packaged as a LuCI class under a versioned module name.

This is not the same interface as 2.0.0. Refer to this version's README for exposed controls; its UI supports up to three concurrent files.

> **To upgrade, install the new version over the existing one; do not uninstall first.**

One architecture-independent package (`@VERSION@`) for **ARMv7, ARMv8/ARMv9 (aarch64) and x86-64** (and other targets):

- `@APK@` — OpenWrt 25.12 and newer (apk)
- `@IPK@` — OpenWrt 24.10 and older (opkg)

Both were installed and exercised automatically on x86-64, ARMv8 and ARMv7 OpenWrt containers before publishing. Verify downloads with `SHA256SUMS`. Install instructions, removal and limitations: [README](https://github.com/@REPO@#readme).

Copyright © 2026 dreamboxone — GNU GPL v3, without warranty.
