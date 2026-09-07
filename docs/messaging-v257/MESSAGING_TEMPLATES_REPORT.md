# Kourosh v257 — Messaging Templates Cleanup & Safety Fix

## تصمیم معماری

`shared/messages.ts` منبع واحد (Source of Truth) برای **پیام‌های تراکنشی آماده و قرارداد متغیرهای آن‌ها** است.

این تصمیم درست است، اما با این مرزبندی:

- متن پیش‌فرض SMS/Telegram، عنوان‌ها، Previewها، نام برند و ترتیب Tokenهای Pattern در `shared/messages.ts` نگهداری می‌شوند.
- BodyId/TemplateId/PatternCode سرویس‌دهندگان و متن سفارشی مدیر همچنان در Settings/DB می‌مانند.
- گزارش‌های پویا، پاسخ‌های تعاملی ربات، OTP و متن‌های UI که ماهیت Template تراکنشی مشترک ندارند در ماژول تخصصی خود باقی می‌مانند.
- Runtime نباید نسخه دوم متن یا ترتیب Token را تعریف کند.

این ساختار از یک فایل عظیم شامل تمام متن‌های برنامه جلوگیری می‌کند، ولی برای پیام‌های آماده یک قرارداد مرکزی واحد ایجاد می‌کند.

## اصلاحات مهم

### 1. پاکسازی متن‌های خراب

- عبارت خراب چک برگشتی `عملیات ناعملیات با موفقیت انجام شد بود...` از Runtime حذف شد.
- `ثبت اطلاعات نشده است` در پیام‌های مشتری به `ثبت نشده است` تبدیل شد.
- `ثبت اطلاعات گردید` به `ثبت شد` تبدیل شد.
- `به موقع` به `به‌موقع` اصلاح شد.
- `تماس حاصل فرمایید` با عبارت طبیعی‌تر `با فروشگاه تماس بگیرید/هماهنگ کنید` جایگزین شد.
- وضعیت چک از `ناموفق` به `برگشتی` اصلاح شد.
- عنوان‌هایی مانند `گزارش ثبت اطلاعات فروش`، `ثبت اطلاعات پرداخت قسط` و `ثبت اطلاعات پذیرش تعمیر` کوتاه و طبیعی شدند.
- عنوان دریافت پول فاکتور به `گزارش دریافت وجه فاکتور` اصلاح شد.
- نام برند پیام‌های تراکنشی روی `فروشگاه کوروش` یکپارچه شد.

### 2. Catalog مرکزی SMS

۱۴ Pattern ملی پیامک در `MELI_PAYAMAK_PATTERN_DEFINITIONS` تعریف شده‌اند. هر Pattern شامل:

- key تنظیمات
- عنوان و دسته‌بندی
- ترتیب واقعی `tokenKeys`
- نام قابل‌نمایش Tokenها
- Preview نهایی

ترتیب Tokenهای حساس:

| پیام | ترتیب Token |
| --- | --- |
| تسویه اقساط | name |
| دیرکرد قسط | name, amount, dueDate |
| ثبت فروش اقساطی | name, saleId, total |
| سررسید قسط | name, dueDate, amount |
| تأیید پرداخت قسط | name, amount |
| پذیرش تعمیر | name, deviceModel, repairId |
| هزینه تعمیر | name, deviceModel, estimatedCost |
| آماده تحویل | name, deviceModel, finalCost |
| تحویل تعمیر | name, deviceModel, repairId |
| وضعیت تعمیر | deviceModel, status |
| وضعیت حساب | status, amount |
| چک برگشتی | name, dueDate, amount |
| ثبت فاکتور | name, invoiceNo, total |
| دریافت وجه فاکتور | name, invoiceNo, amount |

`buildMeliPayamakPatternTokens()` تنها مرجع تولید ترتیب Token برای Patternهای جدید است.

### 3. Catalog مرکزی Telegram

۱۴ Template اصلی Telegram برای سه مخاطب نگهداری می‌شوند:

- customer
- partner
- manager

`buildTelegramTemplatePreset()` متن نهایی پیش‌فرض را بر اساس مخاطب تولید می‌کند. Runtimeها دیگر cardهای تکراری خودشان را تعریف نمی‌کنند.

### 4. رفع اشتباه کلید دریافت قسط / تسویه کامل

- `INSTALLMENT_PAYMENT_RECEIVED` اکنون فقط از `telegram_installment_payment_received_message` استفاده می‌کند.
- `INSTALLMENT_COMPLETED` به معنای تسویه کامل، اول `telegram_installment_settlement_message` را می‌خواند.
- `telegram_installment_completed_message` فقط به‌عنوان fallback سازگاری قدیمی باقی مانده است.
- Telegram Logs نیز همین تفکیک معنایی را رعایت می‌کند.

### 5. سازگاری با Patternهای Legacy

برای BodyIdهای قدیمی که قبل از Catalog یکپارچه ساخته شده‌اند، مسیرهای Legacy حفظ شده‌اند تا ارتقای نسخه باعث شکست ناگهانی تنظیمات موجود نشود. Patternهای جدید/یکپارچه از قرارداد مرکزی استفاده می‌کنند.

### 6. Repair متن‌های ذخیره‌شده در DB

`server/repositories/settings.repo.ts` فقط برای کلیدهای `telegram_*_message`:

- هنگام خواندن Settings، خرابی‌های شناخته‌شده را Repair می‌کند.
- هنگام ذخیره نیز همان Repair ایمن را اعمال می‌کند.
- متن سفارشی سالم مدیر تغییر نمی‌کند.
- Migration مخرب یا Rewrite گروهی دیتابیس انجام نمی‌شود.

### 7. مسیرهای Runtime یکپارچه‌شده

- Settings SMS view model
- Settings Telegram view model
- Telegram audience helper
- Telegram event notification runtime
- Reminder runtime
- Telegram runtime
- Installment service
- Repairs route
- Customer Telegram notifications
- Collection Center (حداقل نام برند مرکزی)
- SMS diagnostics fallback
- Telegram logs semantic mapping

## تست‌ها

`test:messaging-v257` موارد زیر را Fail-closed کنترل می‌کند:

- ۱۴ SMS و ۱۴ Telegram definition یکتا باشند.
- تعداد و ترتیب placeholderهای `{1}`, `{2}`, ... دقیقاً با `tokenKeys` برابر باشد.
- عبارت‌های خراب/منسوخ دوباره وارد Templateها نشوند.
- نام برند در SMSها یکدست باشد.
- Token mapping واقعی برای قسط، تعمیر، حساب، چک و فاکتور درست باشد.
- payment received و settlement از کلیدهای درست Telegram استفاده کنند.
- Runtime به `tokenCandidates` عمومی برنگردد.
- Settings و Repairs Runtime از Catalog مرکزی استفاده کنند.
- Templateهای خراب ذخیره‌شده در DB Repair شوند.

## Release Gate v257

- Source gate: 49 check
- Full gate: 65 check
- External RC evidence: الزامی و fail-closed
- Messaging v257 یکی از Release blockerهای Source Gate است.

برای RC واقعی v257 علاوه بر تست‌های قبلی، Evidence این موارد نیز اضافه شده است:

- SMS سررسید قسط
- SMS اعلام هزینه تعمیر
- SMS چک برگشتی
- SMS ثبت فاکتور
- Telegram دریافت قسط
- Telegram چک برگشتی

## وضعیت QA این محیط

- `verify:miniapp:source`: PASS — 49/49
- TypeScript syntax برای فایل‌های تغییرکرده: PASS
- Release v257 HTML/Edge sync: PASS
- Cloudflare stale-build guard: PASS
- Full production gate: در مرحله Environment متوقف می‌شود، چون Node محیط 22.16.0 است و پروژه `^22.17.0 || >=24` می‌خواهد و dependencyهای local نصب نیستند.

این توقف یک Fail واقعی Release Gate است و به warning تبدیل نشده است.
