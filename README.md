<div dir="rtl">

# مخزن (Makhzan)

**فایل‌سرور خانگی (NAS) روی روتر OpenWrt** — یک فلش مموری یا هارد USB را به روتر وصل کنید و از ویندوز، اندروید، آیفون، مک، لینوکس و تلویزیون به فایل‌هایتان دسترسی داشته باشید.

Copyright © 2026 dreamboxone — منتشرشده با مجوز **GNU GPL نسخهٔ ۳** — بدون هیچ ضمانتی. ([English version below](#makhzan-english))

---

## فهرست

1. [قابلیت‌ها](#قابلیتها)
2. [سازگاری و پیش‌نیازها](#سازگاری-و-پیشنیازها)
3. [نصب](#نصب)
4. [حذف برنامه](#حذف-برنامه)
5. [راه‌اندازی قدم‌به‌قدم](#راهاندازی-قدمبهقدم)
6. [پوشه‌ها: خصوصی، Shared و Media](#پوشهها-خصوصی-shared-و-media)
7. [اتصال از دستگاه‌ها](#اتصال-از-دستگاهها) (ویندوز، اندروید با CX File Explorer، آیفون، تلویزیون)
8. [امنیت](#امنیت)
9. [محدودیت‌ها](#محدودیتها)
10. [ساخت بسته از سورس](#ساخت-بسته-از-سورس)
11. [مجوز](#مجوز)

---

## قابلیت‌ها

- **تقسیم دیسک USB** به سه بخش مستقل: فایل‌سرور (NAS)، حافظهٔ مجازی (swap) و افزایش فضای روتر (extroot). هر کدام اختیاری است.
- **هشدار هوشمند:** اگر extroot و/یا swap تقریباً تمام دیسک را بگیرند و جایی برای فایل‌سرور نماند، برنامه هشدار می‌دهد (فقط هشدار؛ جلوی کار را نمی‌گیرد).
- **کاربران با پوشهٔ خصوصی:** هر کاربر یک پوشه و یک اشتراک SMB هم‌نام خودش دارد که **فقط خودش** آن را می‌بیند و باز می‌کند.
- **پوشه‌های مشترک:** `Shared` برای همهٔ کاربران و `Media` برای فیلم و موسیقی (قابل پخش روی تلویزیون با DLNA).
- **قفل ورود:** بعد از **۴ رمز اشتباه**، حساب کاربر **۱۵ دقیقه** قفل می‌شود. مدیر می‌تواند قفل را زودتر باز کند.
- **مدیریت کاربران:** افزودن، تغییر رمز، رفع قفل و حذف کاربر.
- **مدیریت پوشه‌ها:** ساخت، تغییر نام و حذف پوشه‌های سطح اول هر کاربر (نام فارسی پشتیبانی می‌شود).
- **سطل بازیابی:** پوشه‌های حذف‌شده و پوشهٔ کاربران حذف‌شده به سطل مدیر منتقل می‌شوند و تا خالی‌کردن سطل قابل بازیابی‌اند.
- **آزادسازی امن دیسک** (جداکردن امن) قبل از کشیدن USB یا تقسیم دوبارهٔ آن.
- **پخش رسانه (MiniDLNA)** برای پوشهٔ Media.
- رابط کاربری **فارسی و انگلیسی** با فونت وزیرمتن، **حالت روشن و تیره** و سازگار با موبایل.

## سازگاری و پیش‌نیازها

| مورد | توضیح |
|---|---|
| پردازنده | **همهٔ معماری‌ها**: ARMv7، ARMv8 (aarch64)، ARMv9، x86-64 و حتی MIPS. بسته از نوع `all` است و کد کامپایل‌شده ندارد. |
| OpenWrt 25.12 و جدیدتر | فایل `.apk` |
| OpenWrt 24.10 و قدیمی‌تر (با opkg) | فایل `.ipk` |
| رابط وب | LuCI (نصب پیش‌فرض OpenWrt) |
| درگاه USB | روتر باید پورت USB و درایور `kmod-usb-storage` داشته باشد. |
| فایل‌سیستم | `kmod-fs-ext4` (برای دیسکی که مخزن آماده می‌کند لازم است). |

بسته‌های زیر **خودکار** همراه مخزن نصب می‌شوند: `luci-base`, `rpcd`, `rpcd-mod-file`, `block-mount`, `e2fsprogs`, `parted`, `swap-utils`.

بسته‌های **اختیاری** (برای قابلیت کامل):

- `samba4-server` — برای اشتراک فایل SMB (**برای فایل‌سرور لازم است**)
- `minidlna` — برای پخش روی تلویزیون

## نصب

### ۱. کپی فایل روی روتر

فایل مناسب را از بخش Releases دانلود کنید و با برنامهٔ WinSCP یا دستور زیر به پوشهٔ `/tmp` روتر بفرستید (آدرس روتر خودتان را بگذارید):

<div dir="ltr">

```sh
scp -O luci-app-makhzan-1.1.0-r12.apk root@192.168.1.1:/tmp/
```

</div>

### ۲. نصب با SSH

**OpenWrt 25.12 و جدیدتر (apk):**

<div dir="ltr">

```sh
apk update
apk add kmod-usb-storage kmod-fs-ext4 samba4-server minidlna
apk add --allow-untrusted /tmp/luci-app-makhzan-1.1.0-r12.apk
```

</div>

**OpenWrt 24.10 و قدیمی‌تر (opkg):**

<div dir="ltr">

```sh
opkg update
opkg install kmod-usb-storage kmod-fs-ext4 samba4-server minidlna
opkg install /tmp/luci-app-makhzan_1.1.0-r12_all.ipk
```

</div>

### ۲ (روش دیگر). نصب از داخل LuCI

منوی **System ← Software** را باز کنید، روی **Upload Package** بزنید، فایل را انتخاب و نصب کنید. قبل از آن بسته‌های `samba4-server` و `kmod-usb-storage` را از همان صفحه نصب کنید.

### ۳. باز کردن برنامه

صفحهٔ LuCI را یک بار تازه کنید و به منوی **Services ← Makhzan** بروید.

> **بعد از نصب یا ارتقا:** یک بار از LuCI خارج شوید (Log out) و دوباره وارد شوید تا مجوزهای جدید اعمال شود. هنگام ارتقا از نسخهٔ 1.0.0 صفحه را یک بار هم با `Ctrl+F5` تازه کنید.

## حذف برنامه

<div dir="ltr">

```sh
apk del luci-app-makhzan        # OpenWrt 25.12+
opkg remove luci-app-makhzan    # OpenWrt 24.10 and older
```

</div>

یا از **System ← Software** روی **Remove** بزنید.

هنگام حذف، مخزن به‌طور خودکار:

- اشتراک‌های SMB ساخته‌شده توسط خودش را حذف می‌کند،
- تنظیمات «پنهان‌کردن اشتراک‌ها» و «unix extensions» را از قالب Samba برمی‌دارد. پایگاه رمز Samba روی `tdbsam` می‌ماند تا رمز کاربران از بین نرود،
- اگر MiniDLNA را برای پوشهٔ Media روشن کرده بود، آن را خاموش می‌کند.

**برای حفاظت از اطلاعات شما این‌ها باقی می‌مانند:** فایل‌های روی دیسک USB، حساب و رمز کاربران (با نصب دوباره همه‌چیز خودکار برمی‌گردد) و تنظیمات mount دیسک در `/etc/config/fstab`.

> **نکته دربارهٔ apk:** دستور `apk del` بسته‌هایی را که همراه مخزن نصب شده بودند (مثل `block-mount` و `parted`) هم حذف می‌کند و در نتیجه دیسک USB به‌طور امن unmount می‌شود (اطلاعات سالم می‌ماند). اگر می‌خواهید بعد از حذف مخزن، دیسک همچنان mount بماند، قبل از حذف این دستور را بزنید: `apk add block-mount e2fsprogs`

**پاک‌سازی کامل (اختیاری، بعد از حذف بسته):**

<div dir="ltr">

```sh
# remove Makhzan user accounts (their files on the USB disk are NOT deleted)
for u in $(awk -F: '$5=="makhzan" && $3>=1000 {print $1}' /etc/passwd); do
  smbpasswd -x "$u"; sed -i "/^$u:/d" /etc/passwd /etc/shadow
done
sed -i '/^makhzan:/d' /etc/group
# stop auto-mounting the Makhzan partitions
uci -q delete fstab.makhzan_nas; uci -q delete fstab.makhzan_swap; uci -q delete fstab.makhzan_extroot; uci commit fstab
rm -f /etc/config/makhzan
```

</div>

## راه‌اندازی قدم‌به‌قدم

1. **وصل کردن USB:** فلش یا هارد را به روتر وصل کنید. در کارت «فلش / هارد USB» باید عدد ۱ ببینید.
2. **آماده‌سازی دیسک** (بخش «تقسیم فضای دیسک USB»):
   - دیسک را از فهرست انتخاب کنید. اگر پیام «این دیسک در حال استفاده است» دیدید، دکمهٔ **آزادسازی دیسک** را بزنید.
   - گزینهٔ **فایل‌سرور · NAS** را روشن کنید و روی **همهٔ فضای باقی‌مانده** بزنید. اگر لازم دارید swap (مثلاً ۵۱۲ مگابایت) هم اضافه کنید.
   - **بررسی طرح و ادامه** ← نام دیسک (مثلاً `/dev/sda`) را تایپ کنید ← **پاک‌کردن و ساخت**.
   - ⚠️ **تمام اطلاعات آن دیسک پاک می‌شود.** اگر دیسک از قبل ext4 است و نمی‌خواهید پاک شود، به‌جای این مرحله از بخش «حافظهٔ آماده» استفاده کنید.
3. **روشن کردن SMB:** در بخش «سرویس‌های شبکه» کلید **SMB** را روشن کنید.
4. **ساخت کاربر:** **افزودن کاربر** ← نام انگلیسی کوچک (مثلاً `ali`) و رمز حداقل ۸ نویسه.
5. **اتصال** از دستگاه‌ها (بخش بعد).
6. (اختیاری) کلید **DLNA** را روشن کنید تا فیلم‌های پوشهٔ Media روی تلویزیون دیده شوند.

## پوشه‌ها: خصوصی، Shared و Media

مخزن سه نوع پوشه دارد. هر سه روی همان دیسک USB هستند، ولی **دسترسی به آن‌ها فرق دارد**:

| پوشه | چه کسی می‌بیند | مناسب برای |
|---|---|---|
| **پوشهٔ خصوصی** (هم‌نام کاربر، مثلاً `ali`) | **فقط خود کاربر** با رمز خودش. کاربران دیگر حتی نام آن را نمی‌بینند. | فایل‌های شخصی، مدارک، پشتیبان گوشی |
| **Shared** | **همهٔ کاربران مخزن** با رمز خودشان (خواندن و نوشتن) | فایل‌های مشترک خانواده: اسناد، عکس‌های خانوادگی، فایل نصب برنامه‌ها |
| **Media** | **همهٔ کاربران مخزن** (خواندن و نوشتن) **و هر تلویزیون، VLC یا دستگاه دیگری در شبکهٔ خانه از راه DLNA، بدون رمز** (فقط تماشا و شنیدن) | فیلم، سریال، موسیقی و عکس برای پخش روی تلویزیون |

به زبان ساده: **پوشهٔ خصوصی** کمد شخصی شماست، **Shared** کمد مشترک اعضای خانه و **Media** کتابخانهٔ فیلم و موسیقی که هر تلویزیونی در خانه می‌تواند از آن پخش کند.

> ⚠️ **مهم:** DLNA رمز ندارد. هر دستگاهی که به وای‌فای شما وصل است (حتی گوشی مهمان) محتوای **Media** را می‌بیند. عکس مدارک، کارت ملی و فایل‌های شخصی را **هرگز در Media نگذارید**؛ جای آن‌ها پوشهٔ خصوصی است (یا Shared اگر همهٔ اعضای خانه باید ببینند).

- پوشهٔ Media را **داخل** پوشهٔ خصوصی نسازید. Media یک اشتراک جداست که کنار پوشهٔ خصوصی دیده می‌شود؛ با باز کردن `\\192.168.1.1` در ویندوز (یا اتصال در گوشی) هر سه پوشه را می‌بینید. پوشه‌ای که داخل پوشهٔ خصوصی بسازید خصوصی می‌ماند و روی تلویزیون دیده نمی‌شود.
- فیلم‌ها، آهنگ‌ها و عکس‌هایی که در Media کپی می‌کنید چند ثانیه بعد خودکار در فهرست DLNA ظاهر می‌شوند.

## اتصال از دستگاه‌ها

به‌جای `192.168.1.1` آدرس روتر خودتان را بگذارید. نام کاربری و رمز همان است که در مخزن ساختید.

| دستگاه | روش |
|---|---|
| **ویندوز** | در File Explorer بنویسید `\\192.168.1.1\ali` (پوشهٔ خصوصی)، `\\192.168.1.1\Shared` یا `\\192.168.1.1\Media`. برای ماندگاری: راست‌کلیک روی This PC ← **Map network drive**. |
| **اندروید** | برنامهٔ **CX File Explorer** — راهنمای قدم‌به‌قدم پایین همین جدول |
| **آیفون / آیپد** | برنامهٔ **Files** ← سه‌نقطه ← **Connect to Server** ← `smb://192.168.1.1` |
| **مک** | Finder ← **Go ← Connect to Server** ← `smb://192.168.1.1` |
| **لینوکس** | مدیر فایل ← `smb://192.168.1.1/ali` |
| **تلویزیون** | اگر MiniDLNA روشن باشد، در بخش Media/DLNA تلویزیون دستگاهی با نام **Makhzan** می‌بینید. |

> **نکتهٔ ویندوز:** ویندوز به هر سرور در هر لحظه فقط با **یک کاربر** وصل می‌شود. اگر یک بار با کاربری (مثلاً `ali2`) وارد شده باشید، برای پوشهٔ کاربر دیگر رمز نمی‌خواهد و پوشه باز نمی‌شود. راه‌حل: پنجره‌های File Explorer را ببندید و در CMD دستور `net use * /delete /y` را بزنید (یا یک بار از ویندوز خارج و دوباره وارد شوید). برای استفادهٔ هم‌زمان از دو کاربر، یکی را با آدرس IP (`\\192.168.1.1\ali`) و دیگری را با نام روتر (`\\OpenWrt.lan\ali2`) باز کنید.

### اندروید با CX File Explorer

برای اندروید برنامهٔ **CX File Explorer** را پیشنهاد می‌کنیم (رایگان، از Google Play):

1. برنامهٔ **CX File Explorer** را نصب و باز کنید.
2. زبانهٔ **NETWORK** را بزنید.
3. گزینهٔ **New location** را بزنید.
4. **Remote** و سپس **SAMBA** را انتخاب کنید (SAMBA همان SMB است؛ پروتکل اشتراک فایل ویندوز).
5. در قسمت **Host** آدرس IP روتر را بدهید (مثلاً `192.168.1.1`؛ آدرس روتر خودتان را بگذارید).
6. تیک **Anonymous** را بردارید و در **Username** و **Password** همان نام کاربری و رمزی را که در مخزن ساخته‌اید وارد کنید.
7. **OK** را بزنید تا وصل شوید. پوشهٔ خصوصی شما، **Media** و **Shared** نمایش داده می‌شوند.

برای فرستادن عکس یا فیلم از گوشی: فایل را در حافظهٔ گوشی لمس طولانی کنید ← **Copy** ← به همین مکان شبکه بروید ← پوشهٔ مقصد را باز کنید ← **Paste**. اتصال ذخیره می‌شود و دفعهٔ بعد فقط کافی است از زبانهٔ NETWORK آن را باز کنید.

## امنیت

- هر کاربر فقط اشتراک خصوصی خودش را می‌بیند (اشتراک‌های دیگران در فهرست نمایش داده نمی‌شوند) و به پوشهٔ دیگران دسترسی ندارد (مجوز پوشه `0700`).
- ورود مهمان غیرفعال است و Samba فقط روی شبکهٔ داخلی (LAN) کار می‌کند.
- بعد از ۴ رمز اشتباه، حساب ۱۵ دقیقه قفل می‌شود (خطای 1909 در ویندوز).
- رمزها هرگز در خط فرمان منتقل نمی‌شوند؛ از طریق یک فایل یک‌بارمصرف که فقط root می‌خواند و بلافاصله پاک می‌شود.
- ساخت پیوند نمادین (symlink) از طریق SMB غیرفعال است و عملیات پوشه‌ها پیوندها را دنبال نمی‌کنند.
- فقط دیسک‌های فیزیکی USB پذیرفته می‌شوند؛ حافظهٔ داخلی روتر هرگز پارتیشن‌بندی یا به‌عنوان NAS استفاده نمی‌شود.
- صفحهٔ مدیریت فقط برای مدیر روتر (root در LuCI) است.

## محدودیت‌ها

لطفاً قبل از استفاده این موارد را بخوانید:

**دیسک و فایل‌سیستم**
- فقط **دیسک USB** پشتیبانی می‌شود (نه کارت SD داخلی، نه SATA داخلی، نه حافظهٔ خود روتر).
- دیسک NAS باید **ext2/3/4، btrfs یا xfs** باشد. **FAT32، exFAT و NTFS پشتیبانی نمی‌شوند** چون نمی‌توانند پوشه‌های خصوصی را قفل کنند. دیسکی که مخزن آماده می‌کند ext4 است.
- «تقسیم دیسک» **کل دیسک را پاک می‌کند**؛ تغییر اندازهٔ پارتیشن‌ها بدون پاک‌کردن ممکن نیست. فضای «بدون تخصیص» بعداً فقط با تقسیم دوباره (و پاک‌شدن دیسک) قابل استفاده است.
- حداقل اندازه‌ها: extroot حدود ۱۳۴، swap حدود ۱۷ و NAS حدود ۳۴ مگابایت. ۱۶ مگابایت برای جدول پارتیشن کنار گذاشته می‌شود.
- در هر زمان فقط **یک** دیسک به‌عنوان NAS فعال است.
- سهمیهٔ فضا (quota) برای کاربران وجود ندارد؛ هر کاربر می‌تواند تا پرشدن دیسک فایل بریزد.
- محاسبهٔ حجم مصرفی هر کاربر روی دیسک‌های خیلی پر ممکن است چند ثانیه طول بکشد.

**extroot**
- بعد از آماده‌شدن extroot باید روتر را **ریبوت** کنید.
- دیسکی که extroot فعال روی آن است قابل آزادسازی یا تقسیم دوباره نیست. **برای برگرداندن extroot:** روتر را خاموش و USB را جدا کنید، روتر را روشن کنید (با حافظهٔ داخلی بالا می‌آید)، سپس با SSH دستور `uci set fstab.makhzan_extroot.enabled=0; uci commit fstab` را اجرا کنید و USB را دوباره وصل کنید.
- اگر USB حاوی extroot جدا شود، روتر با حافظهٔ داخلی (تنظیمات قبل از extroot) بالا می‌آید.

**Samba و ورود**
- مخزن چهار تنظیم به قالب Samba (`/etc/samba/smb.conf.template`) اضافه می‌کند: پایگاه رمز `tdbsam` (برای قفل ورود)، پنهان‌کردن اشتراک‌های غیرمجاز، خاموش‌کردن `unix extensions` و `map to guest = Never` (رد کاربر ناشناس به‌جای ورود مهمان، تا ویندوز پنجرهٔ رمز را نشان دهد). این تنظیمات روی **سایر اشتراک‌های Samba روتر هم اثر دارند**؛ اشتراک مهمان (بدون رمز) دیگر کار نمی‌کند. با حذف برنامه همه به‌جز `tdbsam` برداشته می‌شوند تا رمزها از بین نروند.
- تنظیم قفل ورود در RAM نگه‌داری می‌شود و در هر بوت دوباره اعمال می‌شود؛ در چند ثانیهٔ اول بوت (قبل از اجرای مخزن) قفل فعال نیست.
- زمان قفل با ساعت روتر محاسبه می‌شود؛ روتر باید ساعت درست (NTP) داشته باشد.
- قفل ورود فقط روی SMB اعمال می‌شود (رمز ورود LuCI و SSH جداست).
- فقط **SMB2 و SMB3** (ویندوز قدیمی XP پشتیبانی نمی‌شود). دسترسی فقط از **LAN** است؛ برای دسترسی از اینترنت از VPN (مثل WireGuard) استفاده کنید. پورت SMB را هرگز روی اینترنت باز نکنید.
- نام کاربری فقط حروف کوچک انگلیسی، عدد، `_` و `-` (حداکثر ۳۱ نویسه). نام‌های `shared`، `media`، `homes`، `root` و `admin` رزرو شده‌اند.

**پوشه‌ها و سطل بازیابی**
- رابط وب فقط **پوشه‌های سطح اول** کاربر را مدیریت می‌کند؛ کار با فایل‌ها و زیرپوشه‌ها از طریق SMB انجام می‌شود.
- نام پوشه نمی‌تواند شامل `/ \ : * ? " < > |` باشد یا با نقطه/فاصله تمام شود (محدودیت ویندوز).
- فایل‌هایی که کاربر از طریق SMB پاک می‌کند **به سطل نمی‌روند** و مستقیم حذف می‌شوند. سطل فقط برای حذف از طریق رابط مخزن است.
- بازیابی از سطل با SSH انجام می‌شود (پوشهٔ `.makhzan-trash` روی دیسک NAS).

**DLNA و پوشه‌ها**
- **DLNA رمز ندارد:** هر دستگاهی در شبکهٔ داخلی می‌تواند محتوای پوشهٔ `Media` را ببیند. فایل خصوصی را در Media نگذارید.
- پوشه‌های `Shared` و `Media` برای **همهٔ کاربران** قابل خواندن و نوشتن‌اند.

**سخت‌افزار**
- سرعت به پورت USB و پردازندهٔ روتر بستگی دارد؛ روی روترهای USB 2.0 معمولاً ۱۵ تا ۳۰ مگابایت بر ثانیه. برای پشتیبان‌گیری خانگی و پخش فیلم مناسب است، نه RAID یا ویرایش ویدیوی سنگین.
- قبل از کشیدن USB حتماً **آزادسازی دیسک** را بزنید تا اطلاعات خراب نشود.
- **آداپتور برق استاندارد روتر** را استفاده کنید (برای Google WiFi: USB-C با ۵ ولت و ۳ آمپر، یعنی ۱۵ وات). آداپتور ضعیف (مثلاً ۱ آمپر) همراه با فلش یا هارد USB باعث ریبوت ناگهانی روتر (مخصوصاً هنگام بوت یا اتصال دستگاه‌های وای‌فای) و خراب‌شدن اطلاعات دیسک می‌شود. برای هارد ۲.۵ اینچی از هاب USB برق‌دار یا هارد با برق جداگانه استفاده کنید.

**عمومی**
- مدیر روتر (root) به همهٔ فایل‌ها دسترسی دارد.
- WebDAV، FTP و دسترسی ابری پشتیبانی نمی‌شوند.

## ساخت بسته از سورس

برنامه کد کامپایل‌شده ندارد، پس SDK هر معماری کافی است: SDK نسخهٔ **25.12** فایل `.apk` و SDK نسخهٔ **24.10** فایل `.ipk` می‌سازد. خروجی روی همهٔ معماری‌ها نصب می‌شود.

ساخت خودکار: با هر push، GitHub Actions بسته‌ها را با SDK رسمی OpenWrt می‌سازد و روی x86-64، ARMv8/ARMv9 و ARMv7 نصب و تست می‌کند. با push یک تگ نسخه (مثلاً `v1.1.0`) نسخهٔ جدید به‌طور خودکار در بخش Releases منتشر می‌شود.

<div dir="ltr">

```sh
./scripts/build-package.sh /path/to/openwrt-sdk-25.12 /path/to/openwrt-sdk-24.10
ls dist/
```

</div>

## مجوز

Copyright © 2026 dreamboxone

این برنامه نرم‌افزار آزاد است: می‌توانید آن را تحت شرایط **GNU General Public License نسخهٔ ۳** که توسط بنیاد نرم‌افزار آزاد منتشر شده، بازتوزیع یا تغییر دهید. این برنامه **بدون هیچ ضمانتی** ارائه می‌شود. متن کامل مجوز در فایل [LICENSE](LICENSE) است.

هر کس این برنامه یا نسخهٔ تغییریافتهٔ آن را منتشر کند باید نام صاحب اثر و این مجوز را حفظ کند و سورس کامل را هم منتشر کند.

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
- **Recovery trash** for folders and homes deleted through the UI.
- **Safe disk release** before unplugging or re-partitioning.
- MiniDLNA integration, Persian/English UI, light/dark mode, mobile friendly.

## Compatibility

Architecture independent (`PKGARCH:=all`): ARMv7, ARMv8/aarch64, ARMv9, x86-64 and MIPS. Use the `.apk` on OpenWrt 25.12+ and the `.ipk` on OpenWrt 24.10 and older. Required: a USB port with `kmod-usb-storage` and `kmod-fs-ext4`. Dependencies installed automatically: `luci-base rpcd rpcd-mod-file block-mount e2fsprogs parted swap-utils`. Optional: `samba4-server` (needed for file sharing) and `minidlna`.

## Install

```sh
scp -O luci-app-makhzan-1.1.0-r12.apk root@192.168.1.1:/tmp/

# OpenWrt 25.12+
apk update && apk add kmod-usb-storage kmod-fs-ext4 samba4-server minidlna
apk add --allow-untrusted /tmp/luci-app-makhzan-1.1.0-r12.apk

# OpenWrt 24.10 and older
opkg update && opkg install kmod-usb-storage kmod-fs-ext4 samba4-server minidlna
opkg install /tmp/luci-app-makhzan_1.1.0-r12_all.ipk
```

Or upload the package in **System → Software**. Log out of LuCI and log in again once (rpcd grants the new permissions at login), then open **Services → Makhzan**. When upgrading from 1.0.0, also reload the page once with Ctrl+F5.

## Remove

```sh
apk del luci-app-makhzan        # OpenWrt 25.12+
opkg remove luci-app-makhzan    # OpenWrt 24.10 and older
```

Removal deletes Makhzan's SMB shares, removes the settings Makhzan added to the Samba template except `tdbsam` (the password database stays, so no password is lost) and disables MiniDLNA if Makhzan enabled it. Your files, user accounts with their passwords and the fstab mount entries are kept on purpose; reinstalling restores everything automatically. Note: `apk del` also removes dependencies that were installed with Makhzan (such as `block-mount`), which cleanly unmounts the USB disk; run `apk add block-mount e2fsprogs` first if the disk should stay mounted. See the Persian section for optional full-cleanup commands.

## Quick start

1. Plug in the USB disk.
2. In **USB disk allocation**, select the disk (press **Release disk** if it is in use), enable **File server · NAS**, press **Use all remaining**, then **Review plan** → type the disk name → **Erase and create**. This erases the disk; use **Existing storage** instead to keep an ext4 disk's files.
3. Turn on **SMB** (and **DLNA** for TVs).
4. **Add user**.
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
| **Windows** | File Explorer: `\192.168.1.1\ali` (private), `\192.168.1.1\Shared`, `\192.168.1.1\Media`. To keep it: right-click This PC → **Map network drive**. |
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

**Windows note:** Windows connects to a server as only one user at a time. After logging in as one user it will not ask again, and another user's private folder will not open. Close File Explorer and run `net use * /delete /y` (or sign out of Windows) to switch users, or use the IP address for one user and the router name (`\OpenWrt.lan\ali2`) for another.

## Limitations

- USB disks only; the NAS filesystem must be ext2/3/4, btrfs or xfs (FAT/exFAT/NTFS are refused because they cannot enforce private folders).
- The planner erases the whole disk; it cannot resize. Unallocated space can only be used later by re-partitioning (erasing). One NAS disk at a time. No per-user quotas.
- Extroot needs a reboot; a disk holding the active extroot cannot be released. To undo extroot: power off, unplug the USB disk, boot (the router uses internal storage), run `uci set fstab.makhzan_extroot.enabled=0; uci commit fstab`, then plug the disk back in.
- Makhzan appends four settings to `/etc/samba/smb.conf.template`: tdbsam (lockout), access-based share enumeration, unix extensions off, and `map to guest = Never` (unknown accounts are rejected instead of becoming guests, so Windows shows its password prompt). They also affect other Samba shares on the router; guest (passwordless) shares stop working. Removal takes all of them out except tdbsam, so passwords are not lost. The lockout policy lives in RAM and is re-applied at every boot (not active during the first seconds of boot) and relies on a correct router clock. Lockout applies to SMB only.
- SMB2/SMB3 only, LAN only. Use a VPN for remote access; never expose SMB to the internet.
- Usernames: lowercase a-z, 0-9, `_`, `-` (max 31); `shared`, `media`, `homes`, `root`, `admin` are reserved. Folder names cannot contain `/ \ : * ? " < > |` or end with a dot/space.
- The web UI manages top-level folders only; files are handled over SMB. Files deleted over SMB do not go to the recovery trash. Restoring from the trash requires SSH.
- DLNA has no authentication: anything in `Media` is visible to every device on the LAN. `Shared` and `Media` are writable by all Makhzan users.
- Performance depends on the router (typically 15-30 MB/s on USB 2.0). Always release the disk before unplugging it.
- Use the router's proper power supply (Google WiFi: USB-C 5 V / 3 A, 15 W). A weak adapter (for example 1 A) combined with a USB disk causes sudden resets (typically during boot or when Wi-Fi clients connect) and can corrupt data on the disk. Power 2.5-inch hard disks from a powered USB hub or their own supply.
- The router's root administrator can access all files. No WebDAV, FTP or cloud access.

## Build

The package contains no compiled code, so an SDK for any target works: a 25.12 SDK produces the `.apk`, a 24.10 SDK the `.ipk`. GitHub Actions builds both with the official OpenWrt SDK images on every push, installs and exercises them on x86-64, ARMv8/ARMv9 and ARMv7 OpenWrt containers, and publishes a release when a version tag (for example `v1.1.0`) is pushed.

```sh
./scripts/build-package.sh /path/to/openwrt-sdk-25.12 /path/to/openwrt-sdk-24.10
```

## License

Copyright © 2026 dreamboxone. This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License version 3 as published by the Free Software Foundation. It is distributed WITHOUT ANY WARRANTY. See [LICENSE](LICENSE). Anyone who redistributes Makhzan or a modified version must keep this copyright notice and license and publish the complete corresponding source. The bundled Vazirmatn font is licensed under the SIL Open Font License 1.1.

Support: [t.me/routekernel1](https://t.me/routekernel1)
