<div dir="rtl">

## مخزن @TAG@ — فایل‌سرور خانگی برای OpenWrt

این نسخه ماندن دانلودهای جدید در صف هنگام توقف سرویس دانلود را برطرف می‌کند: افزودن لینک، ادامه دانلود و روشن‌کردن مدیر، سرویس را در صورت نیاز دوباره راه‌اندازی می‌کنند. راه‌اندازی سرویس پس از ارتقا و روشن‌شدن روتر نیز اصلاح شده و توقف سرویس در رابط نمایش داده می‌شود.

حذف یا توقف دانلود هنگام بررسی اولیه لینک، دیگر با خطای اتصال بازنویسی نمی‌شود. تست خودکار، دو نوبت ده‌فایلی همراه با دانلود واقعی HTTP، بررسی صحت فایل‌ها، حذف و افزودن دوباره، اطلاعات قدیمی پردازش و حذف حین خطا را پوشش می‌دهد.

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

Fixes new downloads waiting indefinitely when the scheduler service is stopped. Adding links, resuming downloads and enabling the manager now start the service when needed. Startup after upgrades and router boots is repaired, and the page reports a stopped scheduler.

Deletion or pause during the initial link probe can no longer be overwritten by a connection failure. Automated regression coverage includes two batches of ten real HTTP downloads, file hashes, deletion and subsequent downloads, stale process markers, and deletion during a failed probe.

> **To upgrade, install the new version over the existing one; do not uninstall first.**

One architecture-independent package (`@VERSION@`) for **ARMv7, ARMv8/ARMv9 (aarch64) and x86-64** (and other targets):

- `@APK@` — OpenWrt 25.12 and newer (apk)
- `@IPK@` — OpenWrt 24.10 and older (opkg)

Both were installed and exercised automatically on x86-64, ARMv8 and ARMv7 OpenWrt containers before publishing. Verify downloads with `SHA256SUMS`. Install instructions, removal and limitations: [README](https://github.com/@REPO@#readme).

Copyright © 2026 dreamboxone — GNU GPL v3, without warranty.
