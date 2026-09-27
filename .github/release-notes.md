<div dir="rtl">

## مخزن @TAG@ — فایل‌سرور خانگی برای OpenWrt

در این نسخه حذف برنامه حساب‌ها، رمزها، تنظیمات و کل پوشهٔ موقت مخزن را پاک می‌کند و پوشه‌های خصوصی روی دیسک متصل را به سطل بازیابی می‌برد. نصب دوباره، دیسک NAS قبلی را از تنظیمات ذخیره‌شده وصل و کادر مسیر «حافظهٔ آماده» را پر می‌کند؛ شناسهٔ قبلی گروه در صورت آزادبودن بازیابی می‌شود.

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

Removal now clears managed accounts, passwords, settings and the entire temporary directory, moving private homes on an available disk to recovery trash. Reinstalling reconnects the saved NAS disk, fills its path in Existing storage and reuses the former group ID when available.

> **To upgrade, install the new version over the existing one; do not uninstall first.**

One architecture-independent package (`@VERSION@`) for **ARMv7, ARMv8/ARMv9 (aarch64) and x86-64** (and other targets):

- `@APK@` — OpenWrt 25.12 and newer (apk)
- `@IPK@` — OpenWrt 24.10 and older (opkg)

Both were installed and exercised automatically on x86-64, ARMv8 and ARMv7 OpenWrt containers before publishing. Verify downloads with `SHA256SUMS`. Install instructions, removal and limitations: [README](https://github.com/@REPO@#readme).

Copyright © 2026 dreamboxone — GNU GPL v3, without warranty.
