# PHASE 62 — Settings > Telegram Redesign Pass 1

این فاز redesign واقعی اما محدود برای صفحه Settings > Telegram است. منطق برنامه، API، سرویس تلگرام، صف ارسال، دیتابیس، routeها و محاسبات تغییر نکرده‌اند.

## فایل‌های تغییرکرده

- `pages/settings/SettingsTelegramPanel.tsx`
- `styles/system/telegram-redesign/settings-telegram-redesign-pass-1.css`
- `index.tsx`

## تغییرات اصلی

1. به فرم تلگرام کلاس scope جدید اضافه شد: `telegram-redesign-v1`.
2. یک کارت خلاصه وضعیت در hero تلگرام اضافه شد: `telegram-executive-pulse`.
3. attributeهای نامعتبر `preview` روی input/textareaهای بومی همین فایل به `placeholder` تبدیل شدند.
4. CSS جدید Apple-minimal و محدود به scope تلگرام اضافه شد.
5. import جدید بعد از Telegram UI/Logs foundation ثبت شد تا فقط روی تلگرام اثر بگذارد.

## اصول طراحی اعمال‌شده

- سطح‌های سفید/تیره خوانا به‌جای شلوغی زیاد.
- کارت خلاصه آمادگی سیستم، مقصدها و مسیر اتصال در بالای صفحه.
- فرم‌های اصلی توکن/نام کاربری/Chat ID/Proxy داخل یک سطح منظم‌تر.
- حفظ RTL و LTR برای مقدارهای فنی.
- responsive layout برای ۱۱۸۰، ۸۶۰ و ۶۴۰px.

## QA

- CSS parser error: `0`
- Missing CSS imports: `0`
- Runtime imports in index: `False`
- Literal `\n` in CSS: `0`
- Brace mismatch CSS: `0`

## تست پیشنهادی

- Settings > Telegram در حالت ساده و پیشرفته
- فرم توکن، username، Chat ID و proxy
- کارت خلاصه آمادگی سیستم
- Chat ID guide
- مرکز پایش تلگرام
- کارت‌های monitor
- Telegram Studio و فیلترها
- دارک‌مود / لایت‌مود
- عرض ۱۳۶۶، ۱۲۸۰ و موبایل
