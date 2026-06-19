# PHASE 91 — Screen-by-Screen Visual QA Starter
این مرحله تغییر اجرایی UI انجام نمی‌دهد؛ هدف، آماده‌سازی یک QA تصویری مرحله‌ای بعد از redesignهای اصلی است. چون اسکرین‌شات واقعی از محیط اجرا در اختیار نبود، بررسی بر اساس سورس، scopeهای CSS، importها، و ریسک‌های شناخته‌شده انجام شد.
## وضعیت فنی نسخه
- CSS files: 180
- CSS imports in `index.tsx`: 89
- Missing internal CSS imports: 0
- Total CSS size: 2,308,639 bytes
- Total CSS lines: 76,156
- `!important`: 14,902
- Direct `runtime-overrides` imports: 0
- CSS structural issues found: 0
## اولویت QA تصویری صفحه‌به‌صفحه
1. **Settings > Telegram** — hero, monitor cards, template center, logs, mobile density, LTR values
2. **Dashboard** — hero/clock, widget grid, edit mode, add widget modal, drag/resize visuals
3. **Reports Hub** — category cards, report cards, search, quick access, KPI cards
4. **Financial Reports** — FinancialOverview, Cashflow, Debtors, Creditors, filters/tables/charts
5. **Mobile Phones** — form, autocomplete, IMEI, inventory table/cards, actions, submit bar
6. **Partner Detail** — account hero, ledger, expanded rows, phone capital, payment modal regression
7. **Customer Detail** — account hero, ledger, CRM tags, payment modal regression
8. **Products** — product table/cards, supplier/category panels, modals
9. **Services** — service table, forms, action buttons
10. **Repairs** — list/board, repair cards, status pills, form/detail pages
11. **Settings General** — settings shell, modules, smart brain, account/business/users

## نقاطی که باید با اسکرین‌شات واقعی بررسی شوند
- overflow افقی در عرض‌های ۱۲۸۰ و موبایل
- تداخل icon با متن در input/search/select
- خوانایی dark mode در کارت‌های متراکم
- LTR/RTL برای IMEI، Chat ID، Route، Proxy، email، URL و شناسه سیستم
- دکمه‌های action در جدول‌های شلوغ
- sticky/scroll در جدول‌ها و مودال‌ها
- فاصله و تراکم کارت‌ها در ۱۳۶۶ و ۱۲۸۰

## یافته‌های سورسی قابل توجه
- فایل‌هایی که هنوز prop `preview=` دارند: 43 فایل. همه الزاماً خطا نیستند چون بعضی کامپوننت‌های سفارشی از `preview` استفاده می‌کنند.
- موارد مشکوک identifier فارسی/ترکیبی: 3 مورد. Babel الزاماً با همه آن‌ها مشکل ندارد، اما برای QA build باید زیر نظر باشند.

### Top CSS Risk Files
- `styles/generated/tailwind-entry.generated.css` — 414,936 bytes, 14,444 lines, 978 `!important`
- `styles/system/telegram-ui-foundation.css` — 168,517 bytes, 5,438 lines, 1,808 `!important`
- `styles/system/modal-partner-foundation.css` — 122,328 bytes, 3,577 lines, 1,473 `!important`
- `styles/system/search-input-foundation.css` — 66,206 bytes, 1,980 lines, 854 `!important`
- `styles/pages/telegram.css` — 62,348 bytes, 1,627 lines, 263 `!important`
- `styles/pages/reports.css` — 60,790 bytes, 2,375 lines, 355 `!important`
- `styles/system/people-table-detail-foundation.css` — 39,054 bytes, 1,248 lines, 579 `!important`
- `styles/system/modal-products-foundation.css` — 37,827 bytes, 1,483 lines, 239 `!important`
- `styles/system/legacy-quarantine/people-empty-list-detail-foundation.css` — 36,571 bytes, 1,261 lines, 328 `!important`
- `styles/system/legacy-quarantine/enterprise-forms-reports-foundation.css` — 35,491 bytes, 1,168 lines, 110 `!important`

## دستور تست پیشنهادی برای خودت
1. اول `npm run dev` یا `npm run build` را اجرا کن.
2. اگر build سبز بود، از هر صفحه اصلی در عرض‌های ۱۳۶۶، ۱۲۸۰ و موبایل اسکرین‌شات بگیر.
3. هر اسکرین‌شات را بفرست تا دقیقاً همان صفحه را polish کنم، نه حدسی.
