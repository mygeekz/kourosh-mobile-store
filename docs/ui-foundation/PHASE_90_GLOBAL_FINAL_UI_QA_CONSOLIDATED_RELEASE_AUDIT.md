# Phase 90 — Global Final UI QA / Consolidated Release Audit

این مرحله هیچ UI اجرایی، JSX، API، دیتابیس، route، تلگرام، گزارش، فروش یا منطق برنامه را تغییر نمی‌دهد. هدف فقط ساخت گزارش نهایی برای نسخه‌ای است که بعد از redesignهای مرحله ۶۲ تا ۸۹ آماده تست کامل شده است.

## مبنا

- Source zip: `kourosh_phase89_settings_users_account_business_final_polish.zip`
- Runtime overrides direct imports: **0**
- `styles/runtime-overrides` directory exists: **False**

## وضعیت CSS

| شاخص | مقدار |
|---|---:|
| فایل‌های CSS | 180 |
| حجم کل CSS | 2.2MB |
| خطوط CSS | 76,156 |
| تعداد `!important` | 14,902 |
| CSS import کل در `index.tsx` | 89 |
| CSS import داخلی پروژه | 86 |
| CSS import از پکیج‌ها | 3 |
| import مستقیم از `runtime-overrides` | 0 |

## QA نتیجه

| بررسی | نتیجه |
|---|---:|
| internal CSS import گم‌شده | 0 |
| CSS parser error | 0 |
| فایل دارای `\n` متنی | 0 |
| brace mismatch | 0 |
| CSS @import داخلی گم‌شده | 0 |

> سه import خارجی زیر از `node_modules` هستند و در zip به‌عنوان فایل داخلی چک نمی‌شوند: `react-grid-layout/css/styles.css, react-resizable/css/styles.css, @fortawesome/fontawesome-free/css/all.min.css`.

## بزرگ‌ترین CSSهای باقی‌مانده

- `styles/generated/tailwind-entry.generated.css` — 405.2KB — `!important`: 978
- `styles/system/telegram-ui-foundation.css` — 164.6KB — `!important`: 1808
- `styles/system/modal-partner-foundation.css` — 119.5KB — `!important`: 1473
- `styles/system/search-input-foundation.css` — 64.7KB — `!important`: 854
- `styles/pages/telegram.css` — 60.9KB — `!important`: 263
- `styles/pages/reports.css` — 59.4KB — `!important`: 355
- `styles/system/people-table-detail-foundation.css` — 38.1KB — `!important`: 579
- `styles/system/modal-products-foundation.css` — 36.9KB — `!important`: 239
- `styles/system/legacy-quarantine/people-empty-list-detail-foundation.css` — 35.7KB — `!important`: 328
- `styles/system/legacy-quarantine/enterprise-forms-reports-foundation.css` — 34.7KB — `!important`: 110
- `styles/system/dashboard-smart-widgets-foundation.css` — 33.9KB — `!important`: 291
- `styles/system/reports-risk-cashflow-foundation.css` — 29.8KB — `!important`: 531


## پرریسک‌ترین نقاط برای تست دستی

1. Settings > Telegram — چون چندین pass redesign روی آن انجام شده و هنوز بزرگ‌ترین foundation اختصاصی را دارد.
2. Dashboard — به‌خصوص drag/resize، Add Widget modal و Clock widget.
3. Reports — به‌خصوص Reports Hub، Financial Overview، Cashflow، Debtors/Creditors و خروجی‌ها.
4. Mobile Phones — فرم ثبت/ویرایش، autocomplete، جدول، کارت‌ها و actionهای فروش.
5. Partner/Customer Detail — ledger، expanded row، IMEI/شناسه سیستم و مودال پرداخت/دریافت.
6. Products/Services/Repairs — table/card/board view و actionهای عملیاتی.
7. Settings داخلی — Account, Business, Users و مودال‌های کاربر.

## نکته درباره duplicateها

از این مرحله به بعد cleanup خودکار ارزش کم و ریسک بالا دارد. فایل‌های دارای selector تکراری با body متفاوت هنوز وجود دارند، اما این‌ها اغلب بخشی از cascade و compatibility layer هستند. ادامه کار باید **screenshot-driven و صفحه‌محور** باشد، نه حذف سراسری.

## پیشنهاد تست کامل

- ابتدا `npm install` یا نصب dependencyهای پروژه را روی سیستم خودت انجام بده.
- سپس `npm run build` یا `npm run dev` را اجرا کن.
- اگر خطای build آمد، همان error دقیق را بفرست.
- اگر build بالا آمد، تست دستی را از Telegram، Dashboard، Reports و MobilePhones شروع کن.
