<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/logo-dark.svg">
    <img src="docs/logo.svg" alt="مخزن — Makhzan" width="300">
  </picture>
</p>

<div dir="rtl">

# مخزن (Makhzan)

**فایل‌سرور خانگی (NAS) روی روتر OpenWrt** — یک فلش مموری یا هارد USB را به روتر وصل کنید و از ویندوز، اندروید، آیفون، مک، لینوکس و تلویزیون به فایل‌هایتان دسترسی داشته باشید.

Copyright © 2026 dreamboxone — منتشرشده با مجوز **GNU GPL نسخه ۳** — بدون هیچ ضمانتی. ([English version below](#makhzan-english))

---

## فهرست

1. [قابلیت‌ها](#قابلیتها)
2. [سازگاری و پیش‌نیازها](#سازگاری-و-پیشنیازها)
3. [نصب](#نصب)
4. [حذف برنامه](#حذف-برنامه)
5. [راه‌اندازی قدم‌به‌قدم](#راهاندازی-قدمبهقدم)
6. [پوشه‌ها: خصوصی، Shared و Media](#پوشهها-خصوصی-shared-و-media)
7. [اتصال از دستگاه‌ها](#اتصال-از-دستگاهها) (ویندوز، اندروید با CX File Explorer، آیفون، تلویزیون)
8. [دسترسی از بیرون خانه (WireGuard)](#دسترسی-از-بیرون-خانه-wireguard)
9. [کتابخانه رسانه (هارد NTFS یا exFAT موجود)](#کتابخانه-رسانه-هارد-ntfs-یا-exfat-موجود)
10. [مدیر دانلود](#مدیر-دانلود)
11. [Time Machine، کاربر فقط‌خواندنی و نگه‌داری دیسک](#time-machine-کاربر-فقطخواندنی-و-نگهداری-دیسک)
12. [امنیت](#امنیت)
13. [محدودیت‌ها](#محدودیتها)
14. [ساخت بسته از سورس](#ساخت-بسته-از-سورس)
15. [مجوز](#مجوز)

---

## قابلیت‌ها

- **تقسیم دیسک USB** به سه بخش مستقل: فایل‌سرور (NAS)، حافظه مجازی (swap) و افزایش فضای روتر (extroot). هر کدام اختیاری است.
- **هشدار هوشمند:** اگر extroot و/یا swap تقریبا تمام دیسک را بگیرند و جایی برای فایل‌سرور نماند، برنامه هشدار می‌دهد (فقط هشدار؛ جلوی کار را نمی‌گیرد).
- **کاربران با پوشه خصوصی:** هر کاربر یک پوشه و یک اشتراک SMB هم‌نام خودش دارد که **فقط خودش** آن را می‌بیند و باز می‌کند.
- **پوشه‌های مشترک:** `Shared` برای همه کاربران و `Media` برای فیلم و موسیقی (قابل پخش روی تلویزیون با DLNA).
- **قفل ورود:** بعد از **۴ رمز اشتباه**، حساب کاربر **۱۵ دقیقه** قفل می‌شود. مدیر می‌تواند قفل را زودتر باز کند.
- **مدیریت کاربران:** افزودن، تغییر رمز، رفع قفل و حذف کاربر.
- **مدیریت پوشه‌ها:** ساخت، تغییر نام و حذف پوشه‌های سطح اول هر کاربر (نام فارسی پشتیبانی می‌شود).
- **سطل بازیابی:** پوشه‌های حذف‌شده و پوشه کاربران حذف‌شده به سطل منتقل می‌شوند و با یک کلیک **بازیابی** یا برای همیشه حذف می‌شوند.
- **آزادسازی امن دیسک** (جداکردن امن) قبل از کشیدن USB یا تقسیم دوباره آن.
- **پخش رسانه (DLNA)** برای پوشه Media، با دکمه «اسکن دوباره کتابخانه DLNA».
- **دسترسی از بیرون خانه با WireGuard:** هر کاربر یک QR کد می‌گیرد و از هر جای دنیا به‌صورت رمزنگاری‌شده به فایل‌هایش دسترسی دارد. از راه تونل فقط فایل‌سرور در دسترس است.
- **کتابخانه رسانه:** هارد یا فلش NTFS، exFAT یا FAT که از قبل فیلم و موسیقی دارد، **بدون پاک‌کردن** و فقط‌خواندنی در اشتراک Library و روی تلویزیون دیده می‌شود.
- **مدیر دانلود:** دانلود مستقیم روی دیسک USB با چند اتصال همزمان، صف، زمان‌بندی شمسی، دانلود در ساعت‌های دلخواه، سقف سرعت، بررسی کد فایل و ادامه بعد از قطعی؛ بدون اینکه کامپیوتر روشن بماند.
- **Time Machine** برای پشتیبان‌گیری خودکار مک در پوشه خصوصی هر کاربر.
- **کاربر فقط‌خواندنی** (مثلا برای بچه‌ها): Shared و Media را می‌بیند ولی تغییر نمی‌دهد.
- **نگه‌داری دیسک:** بررسی و تعمیر فایل‌سیستم از داخل صفحه، و خاموش شدن خودکار هارد مکانیکی در بیکاری.
- **نمودار مصرف فضا** (هر کاربر، Shared، Media، سطل) و **هشدار پر شدن دیسک** در ۹۰٪ و ۹۷٪.
- رابط کاربری **فارسی و انگلیسی** با فونت وزیرمتن، **حالت روشن و تیره** و سازگار با موبایل.

## سازگاری و پیش‌نیازها

| مورد | توضیح |
|---|---|
| پردازنده | **همه معماری‌ها**: ARMv7، ARMv8 (aarch64)، ARMv9، x86-64 و حتی MIPS. بسته از نوع `all` است و کد کامپایل‌شده ندارد. |
| OpenWrt 25.12 و جدیدتر | فایل `.apk` |
| OpenWrt 24.10 و قدیمی‌تر (با opkg) | فایل `.ipk` |
| رابط وب | LuCI (نصب پیش‌فرض OpenWrt) |
| درگاه USB | روتر باید پورت USB و درایور `kmod-usb-storage` داشته باشد. |
| فایل‌سیستم | `kmod-fs-ext4` (برای دیسکی که مخزن آماده می‌کند لازم است). |

بسته‌های زیر **خودکار** همراه مخزن نصب می‌شوند: `luci-base`, `rpcd`, `rpcd-mod-file`, `block-mount`, `e2fsprogs`, `parted`, `swap-utils`, `curl`, `ca-bundle`, `jshn`. نصب خودکار وابستگی‌ها به دسترسی روتر به مخزن بسته‌های سازگار با همان نسخه OpenWrt نیاز دارد.

بسته‌های **اختیاری** (برای قابلیت کامل):

- `samba4-server` — برای اشتراک فایل SMB (**برای فایل‌سرور لازم است**)
- `minidlna` — برای پخش روی تلویزیون
- `kmod-wireguard` و `wireguard-tools` — برای دسترسی از بیرون خانه
- `kmod-fs-ntfs3`، `kmod-fs-exfat` یا `kmod-fs-vfat` — برای کتابخانه رسانه روی هارد NTFS، exFAT یا FAT
- `hd-idle` — برای خاموش شدن خودکار هارد مکانیکی

## نصب

### ۱. کپی فایل روی روتر

فایل مناسب را از [آخرین نسخه در بخش Releases](https://github.com/dreamboxone/makhzan/releases/latest) دانلود کنید و با برنامه WinSCP یا دستور زیر به پوشه `/tmp` روتر بفرستید (آدرس روتر خودتان را بگذارید):

<div dir="ltr">

```sh
scp -O luci-app-makhzan-*.apk root@192.168.1.1:/tmp/
```

</div>

### ۲. نصب با SSH

**OpenWrt 25.12 و جدیدتر (apk):**

<div dir="ltr">

```sh
apk update
apk add kmod-usb-storage kmod-fs-ext4 samba4-server minidlna
apk add --allow-untrusted /tmp/luci-app-makhzan-*.apk
```

</div>

**OpenWrt 24.10 و قدیمی‌تر (opkg):**

<div dir="ltr">

```sh
opkg update
opkg install kmod-usb-storage kmod-fs-ext4 samba4-server minidlna
opkg install /tmp/luci-app-makhzan_*_all.ipk
```

</div>

### ۲ (روش دیگر). نصب از داخل LuCI

منوی **System ← Software** را باز کنید، روی **Upload Package** بزنید، فایل را انتخاب و نصب کنید. قبل از آن بسته‌های `samba4-server` و `kmod-usb-storage` را از همان صفحه نصب کنید.

### ۳. باز کردن برنامه

صفحه LuCI را یک بار تازه کنید و به منوی **Services ← Makhzan** بروید.

> **بعد از نصب یا ارتقا:** یک بار از LuCI خارج شوید (Log out) و دوباره وارد شوید تا مجوزهای جدید اعمال شود. هنگام ارتقا از نسخه 1.0.0 صفحه را یک بار هم با `Ctrl+F5` تازه کنید.

> **برای ارتقا، نسخه جدید را روی قبلی نصب کنید و اول حذف نکنید**. حذف از r5 به بعد حساب‌ها، رمزهای کاربران و تنظیمات مخزن را پاک می‌کند؛ نصب مستقیم نسخه جدید آن‌ها را نگه می‌دارد.

## حذف برنامه

<div dir="ltr">

```sh
apk del luci-app-makhzan        # OpenWrt 25.12+
opkg remove luci-app-makhzan    # OpenWrt 24.10 and older
```

</div>

یا از **System ← Software** روی **Remove** بزنید.

از نسخه **1.2.0-r5**، هنگام حذف مخزن به‌طور خودکار:

- حساب‌های ساخته‌شده توسط مخزن، رمزهای Samba آن‌ها و گروه `makhzan` را حذف می‌کند.
- اگر دیسک NAS متصل و قابل دسترس باشد، پوشه خصوصی هر کاربر را به `.makhzan-trash/<username>/home:…` روی همان دیسک منتقل می‌کند. اگر دیسک در دسترس نباشد، فایل‌ها در محل قبلی باقی می‌مانند؛ انتقال به سطل انجام نمی‌شود.
- اشتراک‌های SMB و تنظیمات اضافه‌شده به قالب Samba را برمی‌دارد؛ `tdbsam` فقط وقتی باقی می‌ماند که حساب دیگری خارج از مخزن هنوز در آن وجود داشته باشد.
- سرویس DLNA مدیریت‌شده، تنظیمات خواب دیسک و دسترسی WireGuard مخزن را غیرفعال/پاک می‌کند و دیسک کتابخانه فقط‌خواندنی را آزاد می‌کند.
- تنظیمات `/etc/config/makhzan` و **کل پوشه `/tmp/run/makhzan`**، شامل رمزهای یک‌بارمصرف باقی‌مانده، کش مصرف فضا و فایل‌های موقت را پاک می‌کند.

**این‌ها باقی می‌مانند:** فایل‌های روی دیسک USB، پوشه‌های Shared و Media، سطل بازیابی، پارتیشن‌های NAS/swap/extroot و تنظیمات mount آن‌ها در `/etc/config/fstab`. حذف برنامه دیسک را فرمت نمی‌کند و extroot فعال را از کار نمی‌اندازد.

> **برای ارتقا، نسخه جدید را روی قبلی نصب کنید و اول حذف نکنید**.

**بعد از نصب دوباره:** صفحه مخزن را باز کنید. اگر دیسک قبلی وصل باشد و تنظیم NAS آن در `fstab` فعال باشد، خودکار mount می‌شود و مسیرش در بخش **حافظه آماده (بدون پاک‌کردن)** پر می‌شود؛ برای تلاش دوباره پس از وصل‌کردن دیسک، دکمه **اتصال دوباره دیسک قبلی** را بزنید. شناسه قبلی گروه از مالکیت پوشه Shared بازیابی می‌شود، به شرط آن‌که گروه دیگری آن شناسه را نگرفته باشد. سرویس‌ها و کاربران را دوباره بسازید؛ برای بازیابی پوشه خصوصی قبلی، کاربری با همان نام بسازید و از **سطل بازیابی** استفاده کنید. حساب‌ها و رمزهای حذف‌شده خودکار برنمی‌گردند.

> **نکته درباره apk:** دستور `apk del` بسته‌هایی را که همراه مخزن نصب شده بودند (مثل `block-mount` و `parted`) هم حذف می‌کند و در نتیجه دیسک USB به‌طور امن unmount می‌شود (اطلاعات سالم می‌ماند). اگر می‌خواهید بعد از حذف مخزن، دیسک همچنان mount بماند، قبل از حذف این دستور را بزنید: `apk add block-mount e2fsprogs`

## راه‌اندازی قدم‌به‌قدم

1. **وصل کردن USB:** فلش یا هارد را به روتر وصل کنید. در کارت «فلش / هارد USB» باید عدد ۱ ببینید.
2. **آماده‌سازی دیسک** (زبانه **دیسک** ← بخش «تقسیم فضای دیسک USB»):
   - دیسک را از فهرست انتخاب کنید. اگر پیام «این دیسک در حال استفاده است» دیدید، دکمه **آزادسازی دیسک** را بزنید.
   - گزینه **فایل‌سرور · NAS** را روشن کنید و روی **همه فضای باقی‌مانده** بزنید. اگر لازم دارید swap (مثلا ۵۱۲ مگابایت) هم اضافه کنید.
   - **مرحله بعد** ← نام دیسک (مثلا `/dev/sda`) را تایپ کنید ← **پاک‌کردن و ساخت**.
   - ⚠️ **تمام اطلاعات آن دیسک پاک می‌شود.** اگر دیسک از قبل ext4 است و نمی‌خواهید پاک شود، به‌جای این مرحله از بخش «حافظه آماده» استفاده کنید.
3. **روشن کردن SMB:** در زبانه **سرویس‌ها** کلید **SMB** را روشن کنید.
4. **ساخت کاربر:** زبانه **کاربران** ← **افزودن کاربر** ← نام انگلیسی کوچک (مثلا `ali`) و رمز حداقل ۸ نویسه.
5. **اتصال** از دستگاه‌ها (بخش بعد).
6. (اختیاری) کلید **DLNA** را روشن کنید تا فیلم‌های پوشه Media روی تلویزیون دیده شوند.

## پوشه‌ها: خصوصی، Shared و Media

مخزن سه نوع پوشه دارد. هر سه روی همان دیسک USB هستند، ولی **دسترسی به آن‌ها فرق دارد**:

| پوشه | چه کسی می‌بیند | مناسب برای |
|---|---|---|
| **پوشه خصوصی** (هم‌نام کاربر، مثلا `ali`) | **فقط خود کاربر** با رمز خودش. کاربران دیگر حتی نام آن را نمی‌بینند. | فایل‌های شخصی، مدارک، پشتیبان گوشی |
| **Shared** | **همه کاربران مخزن** با رمز خودشان (خواندن و نوشتن) | فایل‌های مشترک خانواده: اسناد، عکس‌های خانوادگی، فایل نصب برنامه‌ها |
| **Media** | **همه کاربران مخزن** (خواندن و نوشتن) **و هر تلویزیون، VLC یا دستگاه دیگری در شبکه خانه از راه DLNA، بدون رمز** (فقط تماشا و شنیدن) | فیلم، سریال، موسیقی و عکس برای پخش روی تلویزیون |

به زبان ساده: **پوشه خصوصی** کمد شخصی شماست، **Shared** کمد مشترک اعضای خانه و **Media** کتابخانه فیلم و موسیقی که هر تلویزیونی در خانه می‌تواند از آن پخش کند.

> ⚠️ **مهم:** DLNA رمز ندارد. هر دستگاهی که به وای‌فای شما وصل است (حتی گوشی مهمان) محتوای **Media** را می‌بیند. عکس مدارک، کارت ملی و فایل‌های شخصی را **هرگز در Media نگذارید**؛ جای آن‌ها پوشه خصوصی است (یا Shared اگر همه اعضای خانه باید ببینند).

- پوشه Media را **داخل** پوشه خصوصی نسازید. Media یک اشتراک جداست که کنار پوشه خصوصی دیده می‌شود؛ با باز کردن `\\192.168.1.1` در ویندوز (یا اتصال در گوشی) هر سه پوشه را می‌بینید. پوشه‌ای که داخل پوشه خصوصی بسازید خصوصی می‌ماند و روی تلویزیون دیده نمی‌شود.
- فیلم‌ها، آهنگ‌ها و عکس‌هایی که در Media کپی می‌کنید چند ثانیه بعد خودکار در فهرست DLNA ظاهر می‌شوند.

## اتصال از دستگاه‌ها

به‌جای `192.168.1.1` آدرس روتر خودتان را بگذارید. نام کاربری و رمز همان است که در مخزن ساختید.

| دستگاه | روش |
|---|---|
| **ویندوز** | در File Explorer بنویسید `\\192.168.1.1\ali` (پوشه خصوصی)، `\\192.168.1.1\Shared` یا `\\192.168.1.1\Media`. برای ماندگاری: راست‌کلیک روی This PC ← **Map network drive**. |
| **اندروید** | برنامه **CX File Explorer** — راهنمای قدم‌به‌قدم پایین همین جدول |
| **آیفون / آیپد** | برنامه **Files** ← سه‌نقطه ← **Connect to Server** ← `smb://192.168.1.1` |
| **مک** | Finder ← **Go ← Connect to Server** ← `smb://192.168.1.1` |
| **لینوکس** | مدیر فایل ← `smb://192.168.1.1/ali` |
| **تلویزیون** | اگر MiniDLNA روشن باشد، در بخش Media/DLNA تلویزیون دستگاهی با نام **Makhzan** می‌بینید. |

> **نکته ویندوز:** ویندوز به هر سرور در هر لحظه فقط با **یک کاربر** وصل می‌شود. اگر یک بار با کاربری (مثلا `ali2`) وارد شده باشید، برای پوشه کاربر دیگر رمز نمی‌خواهد و پوشه باز نمی‌شود. راه‌حل: پنجره‌های File Explorer را ببندید و در CMD دستور `net use * /delete /y` را بزنید (یا یک بار از ویندوز خارج و دوباره وارد شوید). برای استفاده هم‌زمان از دو کاربر، یکی را با آدرس IP (`\\192.168.1.1\ali`) و دیگری را با نام روتر (`\\OpenWrt.lan\ali2`) باز کنید.

### اندروید با CX File Explorer

برای اندروید برنامه **CX File Explorer** را پیشنهاد می‌کنیم (رایگان، از Google Play):

1. برنامه **CX File Explorer** را نصب و باز کنید.
2. زبانه **NETWORK** را بزنید.
3. گزینه **New location** را بزنید.
4. **Remote** و سپس **SAMBA** را انتخاب کنید (SAMBA همان SMB است؛ پروتکل اشتراک فایل ویندوز).
5. در قسمت **Host** آدرس IP روتر را بدهید (مثلا `192.168.1.1`؛ آدرس روتر خودتان را بگذارید).
6. تیک **Anonymous** را بردارید و در **Username** و **Password** همان نام کاربری و رمزی را که در مخزن ساخته‌اید وارد کنید.
7. **OK** را بزنید تا وصل شوید. پوشه خصوصی شما، **Media** و **Shared** نمایش داده می‌شوند.

برای فرستادن عکس یا فیلم از گوشی: فایل را در حافظه گوشی لمس طولانی کنید ← **Copy** ← به همین مکان شبکه بروید ← پوشه مقصد را باز کنید ← **Paste**. اتصال ذخیره می‌شود و دفعه بعد فقط کافی است از زبانه NETWORK آن را باز کنید.

## دسترسی از بیرون خانه (WireGuard)

با این قابلیت، کاربران از بیرون خانه (اینترنت همراه، محل کار، سفر) به‌صورت **رمزنگاری‌شده** به فایل‌هایشان وصل می‌شوند. هر کاربر یک **QR کد** مخصوص خودش می‌گیرد.

**پیش‌نیازها:**
- بسته‌های `kmod-wireguard` و `wireguard-tools` (از **System ← Software**).
- روتر باید از اینترنت قابل دسترس باشد: **IP عمومی** یا یک نام **DDNS**. اگر روتر پشت مودم دیگری است (آدرس WAN آن مثل `192.168.x.x` است)، در مودم اصلی پورت **UDP 51820** را به آدرس WAN روتر **فوروارد** کنید.
- اگر اینترنت شما IP عمومی ندارد (**CGNAT**)، این قابلیت کار نمی‌کند.

**راه‌اندازی:**
1. زبانه **دسترسی از بیرون** ← آدرس عمومی روتر (IP یا DDNS) و پورت را وارد کنید ← **روشن کردن دسترسی از بیرون**.
2. کنار هر کاربر **ساخت دسترسی و QR** را بزنید.
3. روی گوشی برنامه **WireGuard** را نصب کنید (Google Play یا App Store؛ برای ویندوز و مک از wireguard.com).
4. در برنامه **+** ← **Scan from QR code** را بزنید و QR را اسکن کنید (یا فایل تنظیمات را وارد کنید)، سپس تونل را روشن کنید.
5. حالا مثل خانه وصل شوید: در CX File Explorer یا Files به `smb://192.168.1.1` (آدرس LAN روتر شما) و در ویندوز به `\\192.168.1.1\ali`.

**امنیت:** از راه تونل **فقط فایل‌سرور (SMB)** در دسترس است؛ صفحه مدیریت روتر، SSH و بقیه شبکه خانه بسته می‌مانند. QR کد مثل رمز است؛ اگر گوشی گم شد، کنار آن کاربر **لغو دسترسی** را بزنید. **خاموش کردن** دسترسی از بیرون همه QR ها را باطل و پورت را می‌بندد.

## کتابخانه رسانه (هارد NTFS یا exFAT موجود)

اگر یک هارد یا فلش پر از فیلم و موسیقی دارید (معمولا NTFS یا exFAT از ویندوز)، لازم نیست آن را پاک کنید:

1. درایور فایل‌سیستم را نصب کنید: `kmod-fs-ntfs3` برای NTFS، `kmod-fs-exfat` برای exFAT یا `kmod-fs-vfat` برای FAT32.
2. هارد را به روتر وصل کنید (از طریق هاب USB اگر فلش فایل‌سرور هم وصل است).
3. زبانه **دیسک** ← **کتابخانه رسانه** ← کنار هارد **استفاده به‌عنوان کتابخانه** را بزنید.

محتوای آن **فقط‌خواندنی** در اشتراک **Library** (برای همه کاربران مخزن) و در **DLNA** تلویزیون دیده می‌شود و فایل‌های روی آن تغییر نمی‌کنند. پوشه خصوصی روی این دیسک ساخته نمی‌شود.

## مدیر دانلود

زبانه **مدیریت دانلود** فایل‌ها را مستقیم روی دیسک USB دانلود می‌کند؛ لازم نیست کامپیوتر روشن بماند. فایل‌های تمام‌شده در اشتراک فقط‌خواندنی **Downloads** دیده می‌شوند (SMB باید روشن باشد).

- **دانلود چندتکه‌ای:** هر فایل با چند اتصال همزمان دانلود می‌شود (پیش‌فرض ۸). اگر سرور از Range پشتیبانی نکند، با یک اتصال دانلود می‌شود.
- دکمه **دانلود** فایل را همان لحظه شروع می‌کند و منتظر صف، زمان‌بندی و ساعت‌های مجاز نمی‌ماند؛ حتی وقتی مدیر دانلود خاموش است. **افزودن به صف** آن را به نوبت صف می‌سپارد.
- **چند لینک با هم:** هر لینک در یک خط، یا خواندن لینک‌ها از فایل متنی. فهرست لینک‌های صف هم قابل ذخیره است.
- **صف:** ۱ تا ۶ فایل همزمان، جابه‌جایی در صف، توقف و ادامه از همان جای قبلی، شروع همین حالا، دانلود دوباره، لینک تازه برای لینک منقضی‌شده، جستجو و فیلتر بر اساس وضعیت و نوع فایل.
- **سرعت:** سقف کل برای همه دانلودها و سقف جداگانه برای هر دانلود.
- **زمان‌بندی:** شروع در تاریخ و ساعت دلخواه با تقویم شمسی، **دانلود در زمان دلخواه** (مثلا فقط از ۰۱:۰۰ تا ۰۷:۰۰) و خاموش‌کردن روتر بعد از تمام‌شدن صف.
- **تلاش مجدد خودکار** بعد از قطع اتصال، با فاصله قابل تنظیم.
- **کد بررسی فایل (SHA-256 یا MD5):** اگر سایت آن را داده، فایل بعد از دانلود بررسی می‌شود و فایل خراب پذیرفته نمی‌شود.
- **لینک‌های محافظت‌شده:** نام کاربری و رمز (HTTP Basic یا Digest)، Referer، User-Agent و Cookie. این اطلاعات فقط در پوشه خصوصی مدیر روی USB نگه داشته می‌شود.
- پیش از شروع، حجم فایل و فضای آزاد USB (با حساب فایل‌های صف) بررسی می‌شود. صف با ریبوت و بستن مرورگر از بین نمی‌رود.

تنظیمات «سقف پهنای باند»، «تلاش مجدد» و «دانلود در زمان دلخواه» با دکمه **ذخیره** پایین کارت **تنظیمات دانلود** اعمال می‌شوند.

## Time Machine، کاربر فقط‌خواندنی و نگه‌داری دیسک

- **Time Machine (مک):** در زبانه **سرویس‌ها** کلید Time Machine را روشن کنید و در صورت نیاز سقف حجم هر کاربر (GB) را بدهید. در مک: **System Settings ← Time Machine ← Add Backup Disk** و پوشه خصوصی خودتان را انتخاب کنید. پشتیبان هر مک در پوشه خصوصی صاحبش می‌ماند.
- **کاربر فقط‌خواندنی:** هنگام ساخت کاربر گزینه **فقط خواندنی** را بزنید یا بعدا دکمه **فقط خواندنی** کنار کاربر را بزنید. این کاربر Shared و Media را فقط می‌بیند و نمی‌تواند چیزی را پاک یا عوض کند؛ پوشه خصوصی خودش عادی است. برای بچه‌ها مناسب است.
- **بررسی و تعمیر دیسک:** بعد از قطع ناگهانی برق یا جدا شدن USB بدون «آزادسازی»، در زبانه **دیسک ← نگه‌داری دیسک** دکمه **بررسی و تعمیر** را بزنید. اشتراک‌ها چند دقیقه قطع می‌شوند و نتیجه (سالم، تعمیرشده یا نیاز به تعویض دیسک) نمایش داده می‌شود.
- **خاموش شدن خودکار هارد:** برای هارد مکانیکی، بسته `hd-idle` را نصب کنید و مدت بیکاری را انتخاب کنید تا صدا، مصرف برق و فرسودگی کم شود. برای فلش لازم نیست.
- **سطل بازیابی:** در زبانه **سطل بازیابی** هر مورد را **بازیابی** کنید (به پوشه خصوصی صاحبش برمی‌گردد) یا برای همیشه حذف کنید. پوشه کاربر حذف‌شده را بعد از ساختن دوباره کاربری با همان نام می‌توانید بازیابی کنید.

## امنیت

- هر کاربر فقط اشتراک خصوصی خودش را می‌بیند (اشتراک‌های دیگران در فهرست نمایش داده نمی‌شوند) و به پوشه دیگران دسترسی ندارد (مجوز پوشه `0700`).
- ورود مهمان غیرفعال است و Samba فقط روی شبکه داخلی (LAN) کار می‌کند.
- دسترسی از بیرون فقط از راه تونل رمزنگاری‌شده WireGuard است؛ هر کاربر کلید جداگانه دارد که قابل لغو است، و از راه تونل فقط پورت SMB (445) باز است. پورت SMB هرگز روی اینترنت باز نمی‌شود.
- کتابخانه رسانه فقط‌خواندنی وصل می‌شود؛ هیچ کاربری نمی‌تواند فایل‌های آن دیسک را تغییر دهد یا پاک کند.
- بعد از ۴ رمز اشتباه، حساب ۱۵ دقیقه قفل می‌شود (خطای 1909 در ویندوز).
- رمزها هرگز در خط فرمان منتقل نمی‌شوند؛ از طریق یک فایل یک‌بارمصرف که فقط root می‌خواند و بلافاصله پاک می‌شود.
- ساخت پیوند نمادین (symlink) از طریق SMB غیرفعال است و عملیات پوشه‌ها پیوندها را دنبال نمی‌کنند.
- فقط دیسک‌های فیزیکی USB پذیرفته می‌شوند؛ حافظه داخلی روتر هرگز پارتیشن‌بندی یا به‌عنوان NAS استفاده نمی‌شود.
- صفحه مدیریت فقط برای مدیر روتر (root در LuCI) است.

## محدودیت‌ها

لطفا قبل از استفاده این موارد را بخوانید:

**دیسک و فایل‌سیستم**
- فقط **دیسک USB** پشتیبانی می‌شود (نه کارت SD داخلی، نه SATA داخلی، نه حافظه خود روتر).
- دیسک NAS باید **ext2/3/4، btrfs یا xfs** باشد. **FAT32، exFAT و NTFS پشتیبانی نمی‌شوند** چون نمی‌توانند پوشه‌های خصوصی را قفل کنند. دیسکی که مخزن آماده می‌کند ext4 است.
- «تقسیم دیسک» **کل دیسک را پاک می‌کند**؛ تغییر اندازه پارتیشن‌ها بدون پاک‌کردن ممکن نیست. فضای «تخصیص نیافته» بعدا فقط با تقسیم دوباره (و پاک‌شدن دیسک) قابل استفاده است.
- حداقل اندازه‌ها: extroot حدود ۱۳۴، swap حدود ۱۷ و NAS حدود ۳۴ مگابایت. ۱۶ مگابایت برای جدول پارتیشن کنار گذاشته می‌شود.
- در هر زمان فقط **یک** دیسک به‌عنوان NAS فعال است.
- سهمیه فضا (quota) برای کاربران وجود ندارد؛ هر کاربر می‌تواند تا پرشدن دیسک فایل بریزد.
- مصرف فضای هر کاربر و پوشه هر ۵ دقیقه یک بار محاسبه می‌شود؛ تغییرات با کمی تاخیر در نمودار دیده می‌شوند.

**مدیر دانلود**
- فقط لینک مستقیم HTTP یا HTTPS که سرور حجم فایل را اعلام کند. FTP، تورنت و صفحه‌هایی که دانلود را با کلیک در مرورگر شروع می‌کنند پشتیبانی نمی‌شوند.
- ادامه دانلود از جای قبلی به پشتیبانی سرور از Range و شناسه فایل (ETag یا Last-Modified) بستگی دارد؛ در غیر این صورت دانلود از اول شروع می‌شود.
- روی هم حداکثر ۱۶ اتصال همزمان؛ با فایل همزمان بیشتر، اتصال هر فایل کمتر می‌شود. صف و تاریخچه حداکثر ۱۰۰ مورد است.
- دانلودهای زمان‌دار و «دانلود در زمان دلخواه» تا همگام‌شدن ساعت روتر با اینترنت منتظر می‌مانند.

**extroot**
- بعد از آماده‌شدن extroot باید روتر را **ریبوت** کنید.
- دیسکی که extroot فعال روی آن است قابل آزادسازی یا تقسیم دوباره نیست. **برای برگرداندن extroot:** روتر را خاموش و USB را جدا کنید، روتر را روشن کنید (با حافظه داخلی بالا می‌آید)، سپس با SSH دستور `uci set fstab.makhzan_extroot.enabled=0; uci commit fstab` را اجرا کنید و USB را دوباره وصل کنید.
- اگر USB حاوی extroot جدا شود، روتر با حافظه داخلی (تنظیمات قبل از extroot) بالا می‌آید.

**Samba و ورود**
- مخزن چهار تنظیم به قالب Samba (`/etc/samba/smb.conf.template`) اضافه می‌کند: پایگاه رمز `tdbsam` (برای قفل ورود)، پنهان‌کردن اشتراک‌های غیرمجاز، خاموش‌کردن `unix extensions` و `map to guest = Never` (رد کاربر ناشناس به‌جای ورود مهمان، تا ویندوز پنجره رمز را نشان دهد). این تنظیمات روی **سایر اشتراک‌های Samba روتر هم اثر دارند**؛ اشتراک مهمان (بدون رمز) دیگر کار نمی‌کند. هنگام حذف، حساب‌های مخزن و این تنظیمات حذف می‌شوند؛ `tdbsam` فقط برای حفظ حساب‌های باقی‌مانده خارج از مخزن نگه داشته می‌شود.
- تنظیم قفل ورود در RAM نگه‌داری می‌شود و در هر بوت دوباره اعمال می‌شود؛ در چند ثانیه اول بوت (قبل از اجرای مخزن) قفل فعال نیست.
- زمان قفل با ساعت روتر محاسبه می‌شود؛ روتر باید ساعت درست (NTP) داشته باشد.
- قفل ورود فقط روی SMB اعمال می‌شود (رمز ورود LuCI و SSH جداست).
- فقط **SMB2 و SMB3** (ویندوز قدیمی XP پشتیبانی نمی‌شود). دسترسی مستقیم فقط از **LAN** است؛ برای دسترسی از اینترنت از قابلیت **دسترسی از بیرون (WireGuard)** استفاده کنید. پورت SMB را هرگز روی اینترنت باز نکنید.
- نام کاربری فقط حروف کوچک انگلیسی، عدد، `_` و `-` (حداکثر ۳۱ نویسه). نام‌های `shared`، `media`، `homes`، `root` و `admin` رزرو شده‌اند.

**پوشه‌ها و سطل بازیابی**
- رابط وب فقط **پوشه‌های سطح اول** کاربر را مدیریت می‌کند؛ کار با فایل‌ها و زیرپوشه‌ها از طریق SMB انجام می‌شود.
- نام پوشه نمی‌تواند شامل `/ \ : * ? " < > |` باشد یا با نقطه/فاصله تمام شود (محدودیت ویندوز).
- فایل‌هایی که کاربر از طریق SMB پاک می‌کند **به سطل نمی‌روند** و مستقیم حذف می‌شوند. سطل فقط برای حذف از طریق رابط مخزن است.
- بازیابی، مورد را به پوشه خصوصی صاحب اصلی برمی‌گرداند؛ اگر آن کاربر حذف شده باشد، ابتدا کاربری با همان نام بسازید.

**DLNA و پوشه‌ها**
- **DLNA رمز ندارد:** هر دستگاهی در شبکه داخلی می‌تواند محتوای پوشه `Media` را ببیند. فایل خصوصی را در Media نگذارید.
- پوشه‌های `Shared` و `Media` برای **همه کاربران** قابل خواندن و نوشتن‌اند (به‌جز کاربران فقط‌خواندنی که فقط می‌خوانند).

**سخت‌افزار**
- سرعت به پورت USB و پردازنده روتر بستگی دارد؛ روی روترهای USB 2.0 معمولا ۱۵ تا ۳۰ مگابایت بر ثانیه. برای پشتیبان‌گیری خانگی و پخش فیلم مناسب است، نه RAID یا ویرایش ویدیوی سنگین.
- قبل از کشیدن USB حتما **آزادسازی دیسک** را بزنید تا اطلاعات خراب نشود.
- **آداپتور برق استاندارد روتر** را استفاده کنید (برای Google WiFi: USB-C با ۵ ولت و ۳ آمپر، یعنی ۱۵ وات). آداپتور ضعیف (مثلا ۱ آمپر) همراه با فلش یا هارد USB باعث ریبوت ناگهانی روتر (مخصوصا هنگام بوت یا اتصال دستگاه‌های وای‌فای) و خراب‌شدن اطلاعات دیسک می‌شود. برای هارد ۲.۵ اینچی از هاب USB برق‌دار یا هارد با برق جداگانه استفاده کنید.

**دسترسی از بیرون، کتابخانه و قابلیت‌های دیگر**
- WireGuard به IP عمومی یا فوروارد پورت نیاز دارد و پشت CGNAT کار نمی‌کند. بعضی اینترنت‌ها ممکن است اتصال WireGuard را محدود کنند. آدرس عمومی فقط به‌صورت IPv4 یا نام DDNS پذیرفته می‌شود. **DLNA از راه تونل کار نمی‌کند** (فقط SMB).
- کتابخانه رسانه **فقط‌خواندنی** است، در هر زمان فقط **یک** دیسک کتابخانه دارد و همه کاربران مخزن آن را می‌بینند (پوشه خصوصی ندارد).
- Time Machine در سطح تنظیمات Samba آزمایش شده است، نه با یک مک واقعی.
- خاموش شدن خودکار فقط برای هارد مکانیکی معنا دارد و بعضی قاب‌های USB فرمان خاموشی را نادیده می‌گیرند.
- بررسی دیسک فقط برای ext2/3/4 است و در طول بررسی اشتراک‌ها و DLNA قطع می‌شوند.

**عمومی**
- مدیر روتر (root) به همه فایل‌ها دسترسی دارد.
- WebDAV، FTP و دسترسی ابری پشتیبانی نمی‌شوند.

## ساخت بسته از سورس

برنامه کد کامپایل‌شده ندارد، پس SDK هر معماری کافی است: SDK نسخه **25.12** فایل `.apk` و SDK نسخه **24.10** فایل `.ipk` می‌سازد. خروجی روی همه معماری‌ها نصب می‌شود.

ساخت خودکار: با هر push، GitHub Actions بسته‌ها را با SDK رسمی OpenWrt می‌سازد و روی x86-64، ARMv8/ARMv9 و ARMv7 نصب و تست می‌کند. با push یک تگ نسخه (مثلا `v1.1.0`) نسخه جدید به‌طور خودکار در بخش Releases منتشر می‌شود.

<div dir="ltr">

```sh
./scripts/build-package.sh /path/to/openwrt-sdk-25.12 /path/to/openwrt-sdk-24.10
ls dist/
```

</div>

## مجوز

Copyright © 2026 dreamboxone

این برنامه نرم‌افزار آزاد است: می‌توانید آن را تحت شرایط **GNU General Public License نسخه ۳** که توسط بنیاد نرم‌افزار آزاد منتشر شده، بازتوزیع یا تغییر دهید. این برنامه **بدون هیچ ضمانتی** ارایه می‌شود. متن کامل مجوز در فایل [LICENSE](LICENSE) است.

هر کس این برنامه یا نسخه تغییریافته آن را منتشر کند باید نام صاحب اثر و این مجوز را حفظ کند و سورس کامل را هم منتشر کند.

فونت وزیرمتن با مجوز SIL Open Font License 1.1 همراه برنامه است ([OFL.txt](files/www/luci-static/resources/view/makhzan/fonts/OFL.txt)).

پشتیبانی: [t.me/routekernel1](https://t.me/routekernel1)

</div>

---

<a id="makhzan-english"></a>

# Makhzan (English)

**A home NAS for OpenWrt routers.** Plug a USB flash drive or hard disk into the router and reach your files from Windows, Android, iOS, macOS, Linux and TVs.

Copyright © 2026 dreamboxone — licensed under the **GNU GPL version 3** — no warranty.

## Features

- **USB disk planner** with three independent, optional roles: file server (NAS), swap and extroot.
- **Smart space warning:** if extroot and/or swap leave no room for the file server, Makhzan warns you (warning only, it never blocks).
- **Users with private folders:** every user gets a private folder and an SMB share of the same name that only they can see and open.
- **Shared folders:** `Shared` for all users and `Media` for movies/music (DLNA streaming).
- **Login lockout:** 4 wrong passwords lock the account for 15 minutes; the administrator can unlock earlier.
- User management (add, change password, unlock, delete) and top-level folder management (create, rename, delete; Unicode names supported).
- **Recovery trash** for folders and homes deleted through the UI, with one-click **restore** and permanent delete.
- **Safe disk release** before unplugging or re-partitioning.
- **Remote access with WireGuard:** every user gets a QR code and reaches their files from anywhere, encrypted; only the file server is reachable through the tunnel.
- **Media library:** an existing NTFS, exFAT or FAT disk full of movies is shared read-only as `Library` and on TVs, **without erasing it**.
- **Download manager:** downloads straight to the USB disk with several connections per file, a queue, Persian-calendar scheduling, download hours, speed limits, checksum verification and resume after disconnects; no computer needs to stay on.
- **Time Machine** backups for Macs into each user's private folder.
- **Read-only users** (e.g. children): they can view Shared and Media but not change them.
- **Disk maintenance:** filesystem check and repair from the page, and spin-down of idle mechanical disks.
- **Space usage chart** (per user, Shared, Media, trash) and **disk-full warnings** at 90% and 97%.
- DLNA integration with library rescan, Persian/English UI with tabs, light/dark mode, mobile friendly.

## Compatibility

Architecture independent (`PKGARCH:=all`): ARMv7, ARMv8/aarch64, ARMv9, x86-64 and MIPS. Use the `.apk` on OpenWrt 25.12+ and the `.ipk` on OpenWrt 24.10 and older. Required: a USB port with `kmod-usb-storage` and `kmod-fs-ext4`. Dependencies installed automatically: `luci-base rpcd rpcd-mod-file block-mount e2fsprogs parted swap-utils curl ca-bundle jshn`. Optional: `samba4-server` (needed for file sharing), `minidlna` (TVs), `kmod-wireguard wireguard-tools` (remote access), `kmod-fs-ntfs3` / `kmod-fs-exfat` / `kmod-fs-vfat` (media library) and `hd-idle` (spin-down).

## Install

Download the files from the [latest release](https://github.com/dreamboxone/makhzan/releases/latest).

```sh
scp -O luci-app-makhzan-*.apk root@192.168.1.1:/tmp/

# OpenWrt 25.12+
apk update && apk add kmod-usb-storage kmod-fs-ext4 samba4-server minidlna
apk add --allow-untrusted /tmp/luci-app-makhzan-*.apk

# OpenWrt 24.10 and older
opkg update && opkg install kmod-usb-storage kmod-fs-ext4 samba4-server minidlna
opkg install /tmp/luci-app-makhzan_*_all.ipk
```

Or upload the package in **System → Software**. Log out of LuCI and log in again once (rpcd grants the new permissions at login), then open **Services → Makhzan**. When upgrading from 1.0.0, also reload the page once with Ctrl+F5.

> **To upgrade, install the new version over the existing one; do not uninstall first.** Starting with r5, removal deletes Makhzan accounts, passwords and settings. An in-place upgrade keeps them.

## Remove

```sh
apk del luci-app-makhzan        # OpenWrt 25.12+
opkg remove luci-app-makhzan    # OpenWrt 24.10 and older
```

Starting with **1.2.0-r5**, removal deletes Makhzan-managed accounts and their Samba passwords, the `makhzan` group, its SMB shares, settings in `/etc/config/makhzan`, and the **entire `/tmp/run/makhzan` directory**, including abandoned password tokens and usage-cache files. Private homes on an available NAS disk move to `.makhzan-trash/<username>/home:…` on that disk. If the disk is unavailable, files remain at their original locations instead of moving to the trash.

Removal also undoes Makhzan's Samba template changes (`tdbsam` is retained only if it still contains unrelated accounts), disables its DLNA/spin-down configuration and WireGuard access, and releases the read-only media-library mount. USB files, Shared, Media, recovery trash, NAS/swap/extroot partitions and their `fstab` mount entries remain. Removal does not format the disk or disable an active extroot.

> **To upgrade, install the new version over the existing one; do not uninstall first.**

After reinstalling, open Makhzan. If the old NAS disk is connected and its saved `fstab` entry is enabled, it mounts automatically and its path fills the **Existing storage (no erase)** field. Use **Reconnect previous disk** to retry after plugging it in. The group reuses the ID owning Shared if that ID is still free. Set up services and users again; recreate each original username to restore its old home from **Recovery trash**. Deleted accounts and passwords are not restored automatically.

`apk del` can also remove dependencies installed with Makhzan (such as `block-mount`), which unmounts the USB disk. Run `apk add block-mount e2fsprogs` first if these packages should remain installed.

## Quick start

1. Plug in the USB disk.
2. On the **Disk** tab, in **USB disk allocation**, select the disk (press **Release disk** if it is in use), enable **File server · NAS**, press **Use all remaining**, then **Next step** → type the disk name → **Erase and create**. This erases the disk; use **Existing storage** instead to keep an ext4 disk's files.
3. On the **Services** tab turn on **SMB** (and **DLNA** for TVs).
4. On the **Users** tab press **Add user**.
5. Connect (see below).

## Folders: private, Shared and Media

| Folder | Who can see it | Good for |
|---|---|---|
| **Private folder** (named after the user, e.g. `ali`) | **Only that user**, with their password. Other users do not even see its name. | Personal files, documents, phone backups |
| **Shared** | **All Makhzan users**, with their own passwords (read and write) | Family files: documents, family photos, installers |
| **Media** | **All Makhzan users** (read and write) **and every TV, VLC or other player on the home network through DLNA, without a password** (view/listen only) | Movies, series, music and photos to play on TVs |

> ⚠️ **Important:** DLNA has no password. Every device on your Wi-Fi, including guests' phones, can see what is in **Media**. **Never put ID cards, documents or personal files in Media**; keep them in your private folder (or in Shared if the whole family needs them).

Media is a separate share next to your private folder — do not create a "Media" folder inside your private folder (it would stay private and never reach the TV). Files copied into Media appear in the DLNA library automatically after a few seconds.

## Connect

Use your router's address instead of `192.168.1.1` and the username/password created in Makhzan.

| Device | How |
|---|---|
| **Windows** | File Explorer: `\\192.168.1.1\ali` (private), `\\192.168.1.1\Shared`, `\\192.168.1.1\Media`. To keep it: right-click This PC → **Map network drive**. |
| **Android** | **CX File Explorer** — step by step below |
| **iPhone / iPad** | **Files** app → ⋯ → **Connect to Server** → `smb://192.168.1.1` |
| **macOS** | Finder → **Go → Connect to Server** → `smb://192.168.1.1` |
| **Linux** | File manager → `smb://192.168.1.1/ali` |
| **TV** | With MiniDLNA on, the TV lists a media server named **Makhzan** |

**Android with CX File Explorer** (free, Google Play):

1. Install and open **CX File Explorer**.
2. Open the **NETWORK** tab.
3. Tap **New location**.
4. Choose **Remote** → **SAMBA** (Samba is the SMB file-sharing protocol).
5. **Host:** your router's IP address (for example `192.168.1.1`).
6. Untick **Anonymous** and enter the **Username** and **Password** created in Makhzan.
7. Tap **OK** to connect: your private folder, **Media** and **Shared** appear.

To send photos or videos from the phone: long-press the file → **Copy** → open the network location → open the target folder → **Paste**. The connection is saved in the NETWORK tab.

**Windows note:** Windows connects to a server as only one user at a time. After logging in as one user it will not ask again, and another user's private folder will not open. Close File Explorer and run `net use * /delete /y` (or sign out of Windows) to switch users, or use the IP address for one user and the router name (`\\OpenWrt.lan\ali2`) for another.

## Remote access (WireGuard)

Requirements: `kmod-wireguard` and `wireguard-tools`; the router must be reachable from the internet with a **public IP** or a **DDNS** name. If the router sits behind another modem (its WAN address looks like `192.168.x.x`), forward **UDP 51820** on that modem to the router's WAN address. It cannot work behind **CGNAT**.

1. **Remote access** tab → enter the public address and port → **Turn on remote access**.
2. Next to each user press **Create access and QR**.
3. Install the **WireGuard** app (Google Play, App Store, or wireguard.com), tap **+** → **Scan from QR code**, then switch the tunnel on.
4. Connect as at home: `smb://192.168.1.1` (your router's LAN address) in CX File Explorer or Files, `\\192.168.1.1\user` on Windows.

Only the file server (SMB) is reachable through the tunnel; the router's admin page, SSH and the rest of the home network stay closed. A QR code works like a password: **Revoke** it if a phone is lost. Turning remote access off invalidates every QR code and closes the port.

## Media library (existing NTFS or exFAT disk)

Install the filesystem driver (`kmod-fs-ntfs3`, `kmod-fs-exfat` or `kmod-fs-vfat`), plug the disk in, then **Disk** tab → **Media library** → **Use as library**. The disk is mounted **read-only**: its content appears as the `Library` share (for all Makhzan users) and in DLNA, and nothing on it is changed.

## Download manager

The **Download manager** tab downloads straight to the USB disk; no computer needs to stay on. Finished files appear in the read-only **Downloads** share (SMB must be on).

- **Segmented downloads:** several connections per file (default 8); servers without range support get one connection.
- **Download** starts a link at once, skipping the queue, schedules and download hours, even while the manager is off. **Add to queue** waits for its turn.
- **Several links at once:** one per line, or import them from a text file; the queue's links can be exported.
- **Queue:** 1-6 files at a time, reorder, pause and resume where it stopped, start now, download again, refresh an expired link, search and filter by state and file type.
- **Speed:** a total limit for all downloads and a separate limit per download.
- **Scheduling:** start at a chosen Persian date and time, **download at chosen times** (for example only 01:00-07:00), and shut the router down when the queue is done.
- **Automatic retry** after a disconnection, with a configurable interval.
- **Checksum (SHA-256 or MD5):** when the site publishes one, the file is verified and a corrupt file is rejected.
- **Protected links:** username and password (HTTP Basic or Digest), Referer, User-Agent and Cookie, kept only in a private administrator directory on the USB disk.
- File size and free USB space (including queued files) are checked first; the queue survives reboots and closing the browser.

The bandwidth limit, retry and download-hours settings are applied with the **Save** button at the bottom of the **Download settings** card.

## Time Machine, read-only users and disk maintenance

- **Time Machine:** turn it on in the **Services** tab (optionally with a per-user size limit in GB). On the Mac: **System Settings → Time Machine → Add Backup Disk** and choose your own private folder.
- **Read-only users:** tick **Read-only** when creating a user, or press **Read-only** next to an existing user. They can view Shared and Media but not change them; their own private folder works normally.
- **Check and repair disk:** after a power cut or an unplug without release, **Disk → Disk maintenance → Check and repair**. Shares pause for a few minutes and the result (healthy, repaired, or replace the disk) is shown.
- **Spin-down:** install `hd-idle` and choose an idle time for mechanical disks.
- **Recovery trash:** **Restore** returns an item to its owner's private folder; a deleted user's home can be restored after creating a user with the same name again.

## Limitations

- USB disks only; the NAS filesystem must be ext2/3/4, btrfs or xfs (FAT/exFAT/NTFS are refused because they cannot enforce private folders).
- The planner erases the whole disk; it cannot resize. Unallocated space can only be used later by re-partitioning (erasing). One NAS disk at a time. No per-user quotas.
- Extroot needs a reboot; a disk holding the active extroot cannot be released. To undo extroot: power off, unplug the USB disk, boot (the router uses internal storage), run `uci set fstab.makhzan_extroot.enabled=0; uci commit fstab`, then plug the disk back in.
- Makhzan appends four settings to `/etc/samba/smb.conf.template`: tdbsam (lockout), access-based share enumeration, unix extensions off, and `map to guest = Never` (unknown accounts are rejected instead of becoming guests, so Windows shows its password prompt). They also affect other Samba shares on the router; guest (passwordless) shares stop working. Removal takes all of them out except tdbsam, so passwords are not lost. The lockout policy lives in RAM and is re-applied at every boot (not active during the first seconds of boot) and relies on a correct router clock. Lockout applies to SMB only.
- SMB2/SMB3 only; direct access from the LAN only. Use **Remote access (WireGuard)** from outside; never expose SMB to the internet.
- Usernames: lowercase a-z, 0-9, `_`, `-` (max 31); `shared`, `media`, `homes`, `root`, `admin` are reserved. Folder names cannot contain `/ \ : * ? " < > |` or end with a dot/space.
- The web UI manages top-level folders only; files are handled over SMB. Files deleted over SMB do not go to the recovery trash. Space usage is recalculated every five minutes.
- DLNA has no authentication: anything in `Media` is visible to every device on the LAN. `Shared` and `Media` are writable by all Makhzan users except read-only users.
- Performance depends on the router (typically 15-30 MB/s on USB 2.0). Always release the disk before unplugging it.
- Use the router's proper power supply (Google WiFi: USB-C 5 V / 3 A, 15 W). A weak adapter (for example 1 A) combined with a USB disk causes sudden resets (typically during boot or when Wi-Fi clients connect) and can corrupt data on the disk. Power 2.5-inch hard disks from a powered USB hub or their own supply.
- WireGuard needs a public IP or port forwarding and cannot work behind CGNAT; some networks restrict WireGuard. The endpoint must be an IPv4 address or a DDNS name. DLNA does not work through the tunnel (SMB only).
- The media library is read-only, one library disk at a time, visible to all Makhzan users.
- Download manager: direct HTTP/HTTPS links whose size the server reports; no FTP, torrents or click-through download pages. Resuming needs server range support and a validator (ETag or Last-Modified), otherwise the download starts over. At most 16 connections in total and 100 queue items. Scheduled jobs and download hours wait until the router clock has synchronized.
- Time Machine was verified at the Samba configuration level, not with a real Mac. Spin-down only matters for mechanical disks, and some USB enclosures ignore it. The disk check supports ext2/3/4 and pauses shares while it runs.
- The router's root administrator can access all files. No WebDAV, FTP or cloud access.

## Build

The package contains no compiled code, so an SDK for any target works: a 25.12 SDK produces the `.apk`, a 24.10 SDK the `.ipk`. GitHub Actions builds both with the official OpenWrt SDK images on every push, installs and exercises them on x86-64, ARMv8/ARMv9 and ARMv7 OpenWrt containers, and publishes a release when a version tag (for example `v1.1.0`) is pushed.

```sh
./scripts/build-package.sh /path/to/openwrt-sdk-25.12 /path/to/openwrt-sdk-24.10
```

## License

Copyright © 2026 dreamboxone. This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License version 3 as published by the Free Software Foundation. It is distributed WITHOUT ANY WARRANTY. See [LICENSE](LICENSE). Anyone who redistributes Makhzan or a modified version must keep this copyright notice and license and publish the complete corresponding source. The bundled Vazirmatn font is licensed under the SIL Open Font License 1.1.

Support: [t.me/routekernel1](https://t.me/routekernel1)

---

<div dir="rtl">

## 💚 حمایت از این پروژه

اگر این پروژه به کارتان آمده، می‌توانید با واریز تتر از آن حمایت کنید:

**USDT (تتر) — فقط شبکه BEP20 (BSC)**

</div>

```
0x56daaa6b76d88ee0c8dba8042121f4b77de0a813
```

<div dir="rtl">

> ⚠️ این آدرس فقط برای واریز تتر در شبکه BEP20 (BSC) است. واریز ارز دیگر یا از شبکه دیگر به این آدرس از دست می‌رود.

</div>

---

## 💚 Support this project

If this project has been useful to you, you can support it with Tether:

**USDT — BEP20 (BSC) network only**

```
0x56daaa6b76d88ee0c8dba8042121f4b77de0a813
```

> [!WARNING]
> This address is for USDT on the BEP20 (BSC) network only. Any other coin, or USDT sent over any other network, is lost.
