# CSS Governance Map — Stage 22
این سند نقشه اجرایی CSS پروژه بعد از split مرحله ۲۱ است. هدف آن این است که بعد از سبک شدن `index.css`، تیم بداند هر CSS کجا import می‌شود، چه سطح ریسکی دارد، و برای refactorهای بعدی دقیقاً چه قانونی باید رعایت شود.
## خلاصه مدیریتی
- تعداد فایل‌های CSS اسکن‌شده: **159**
- حجم کل CSS: **1109.48KB**
- تعداد selector entry: **6358**
- تعداد `!important`: **7961**
- selector hotspot با تکرار ۳ بار یا بیشتر: **201**
- گروه rule دقیقاً تکراری: **77**
- import گمشده: **0**
- خطای brace balance: **0**
- خطای parse سطح stylesheet: **0**

## معماری فعلی CSS
CSS پروژه الان دو entry اصلی دارد:

1. `index.css`: orchestrator اصلی. شامل importهای foundation، layout، components، pages، vendors و legacy split شده، سپس font و Tailwind directives.
2. `index.tsx`: بعد از `index.css`، runtime overrides را مستقیم import می‌کند. این بخش از نظر cascade حساس‌ترین بخش پروژه است و نباید alphabetically reorder شود.

### دسته‌بندی فایل‌ها
- `component-shared`: **15** فایل
- `core-foundation`: **5** فایل
- `entry-orchestrator`: **1** فایل
- `layout-system`: **7** فایل
- `legacy-split`: **51** فایل
- `other`: **2** فایل
- `page-domain`: **12** فایل
- `runtime-override`: **65** فایل
- `vendor-override`: **1** فایل

### توزیع ریسک
- `critical`: **11** فایل
- `high`: **38** فایل
- `low`: **70** فایل
- `medium`: **40** فایل

## قانون طلایی ترتیب import
ترتیب فعلی نباید با auto-sort یا lint autofix تغییر کند. ترتیب cascade به شکل زیر است:

```txt
1) package CSS قبل از index.css: react-grid-layout / react-resizable
2) index.css
   2.1 themes + vendor fontawesome
   2.2 core tokens/base/typography/animations/utilities
   2.3 layout
   2.4 shared components
   2.5 page CSS
   2.6 vendor overrides
   2.7 legacy split files
   2.8 late shared component CSS
   2.9 @tailwind base/components/utilities
3) runtime-overrides imported from index.tsx
```

هر فایل داخل `styles/runtime-overrides/` عمداً بعد از `index.css` آمده است؛ پس حتی اگر اسم فایل شبیه یک کامپوننت باشد، از نظر cascade یک late override است.

## ماتریس ریسک فایل‌های حساس
| فایل | ریسک | امتیاز | KB | selector | !important | دامنه | دلیل |
|---|---:|---:|---:|---:|---:|---|---|
| `styles/runtime-overrides/09b-telegram-control-center-monitoring.css` | critical | 14 | 37.37 | 176 | 536 | Telegram | runtime override imported after index.css; very high !important count; large selector surface; sensitive UI/business domain; medium file >25KB; active imported CSS |
| `styles/runtime-overrides/09c-telegram-template-center-cards.css` | critical | 14 | 35.34 | 163 | 540 | Telegram | runtime override imported after index.css; very high !important count; large selector surface; sensitive UI/business domain; medium file >25KB; active imported CSS |
| `styles/runtime-overrides/09e-telegram-accordion-logs-modals.css` | critical | 13 | 31.12 | 240 | 50 | Telegram, Modals | runtime override imported after index.css; high !important count; large selector surface; sensitive UI/business domain; medium file >25KB; active imported CSS |
| `styles/runtime-overrides/03d-legacy-telegram-monitor-patches.css` | critical | 13 | 24.85 | 147 | 439 | Telegram | runtime override imported after index.css; very high !important count; medium selector surface; sensitive UI/business domain; medium file >25KB; active imported CSS |
| `styles/runtime-overrides/08c-customers-partners-headers.css` | critical | 12 | 22.03 | 103 | 343 | Partners, Customers, Header | runtime override imported after index.css; very high !important count; medium selector surface; sensitive UI/business domain; active imported CSS |
| `styles/runtime-overrides/05-mobile-phones.css` | critical | 12 | 19.57 | 135 | 112 | Mobile Phones | runtime override imported after index.css; very high !important count; medium selector surface; sensitive UI/business domain; active imported CSS |
| `styles/runtime-overrides/03e-sidebar-settings-dashboard-root-fixes.css` | critical | 12 | 16.49 | 64 | 170 | Sidebar, Dashboard, Settings | runtime override imported after index.css; very high !important count; medium selector surface; sensitive UI/business domain; active imported CSS |
| `styles/runtime-overrides/07b-products-modal-responsive-polish.css` | critical | 12 | 12.91 | 113 | 114 | Modals, Products | runtime override imported after index.css; very high !important count; medium selector surface; sensitive UI/business domain; active imported CSS |
| `styles/pages/telegram.css` | critical | 11 | 60.89 | 320 | 263 | Telegram | very high !important count; large selector surface; sensitive UI/business domain; large file >50KB; active imported CSS |
| `styles/pages/reports.css` | critical | 11 | 58.98 | 366 | 355 | Reports | very high !important count; large selector surface; sensitive UI/business domain; large file >50KB; active imported CSS |
| `styles/runtime-overrides/09a-telegram-settings-foundation.css` | critical | 11 | 22.31 | 131 | 82 | Telegram, Settings | runtime override imported after index.css; high !important count; medium selector surface; sensitive UI/business domain; active imported CSS |
| `styles/runtime-overrides/10b-finance-tables-density-system.css` | high | 10 | 16.77 | 62 | 179 | Tables | runtime override imported after index.css; very high !important count; medium selector surface; active imported CSS |
| `styles/runtime-overrides/08d-people-table-detail-contracts.css` | high | 10 | 16.49 | 92 | 240 | People, Tables | runtime override imported after index.css; very high !important count; medium selector surface; active imported CSS |
| `styles/runtime-overrides/01b-people-foundation-after-fields.css` | high | 10 | 16.25 | 100 | 123 | People, Forms/Inputs | runtime override imported after index.css; very high !important count; medium selector surface; active imported CSS |
| `styles/runtime-overrides/02c-repairs-apple-commercial.css` | high | 10 | 14.62 | 78 | 151 | Repairs | runtime override imported after index.css; very high !important count; medium selector surface; active imported CSS |

## بزرگ‌ترین فایل‌ها
| فایل | KB | selector | !important | دسته | دامنه |
|---|---:|---:|---:|---|---|
| `styles/pages/telegram.css` | 60.89 | 320 | 263 | page-domain | Telegram |
| `styles/pages/reports.css` | 58.98 | 366 | 355 | page-domain | Reports |
| `styles/runtime-overrides/09b-telegram-control-center-monitoring.css` | 37.37 | 176 | 536 | runtime-override | Telegram |
| `styles/runtime-overrides/09c-telegram-template-center-cards.css` | 35.34 | 163 | 540 | runtime-override | Telegram |
| `styles/runtime-overrides/09e-telegram-accordion-logs-modals.css` | 31.12 | 240 | 50 | runtime-override | Telegram, Modals |
| `styles/runtime-overrides/03d-legacy-telegram-monitor-patches.css` | 24.85 | 147 | 439 | runtime-override | Telegram |
| `styles/runtime-overrides/09a-telegram-settings-foundation.css` | 22.31 | 131 | 82 | runtime-override | Telegram, Settings |
| `styles/runtime-overrides/08c-customers-partners-headers.css` | 22.03 | 103 | 343 | runtime-override | Partners, Customers, Header |
| `styles/runtime-overrides/08b-message-composer-controls.css` | 21.57 | 112 | 79 | runtime-override | General/System |
| `styles/runtime-overrides/05-mobile-phones.css` | 19.57 | 135 | 112 | runtime-override | Mobile Phones |
| `styles/runtime-overrides/10b-finance-tables-density-system.css` | 16.77 | 62 | 179 | runtime-override | Tables |
| `styles/runtime-overrides/06a-enterprise-actions-fields-validation.css` | 16.76 | 83 | 86 | runtime-override | Forms/Inputs |
| `styles/runtime-overrides/03e-sidebar-settings-dashboard-root-fixes.css` | 16.49 | 64 | 170 | runtime-override | Sidebar, Dashboard, Settings |
| `styles/runtime-overrides/08d-people-table-detail-contracts.css` | 16.49 | 92 | 240 | runtime-override | People, Tables |
| `styles/runtime-overrides/01b-people-foundation-after-fields.css` | 16.25 | 100 | 123 | runtime-override | People, Forms/Inputs |

## فایل‌های دارای بیشترین `!important`
| فایل | !important | selector | KB | ریسک |
|---|---:|---:|---:|---|
| `styles/runtime-overrides/09c-telegram-template-center-cards.css` | 540 | 163 | 35.34 | critical |
| `styles/runtime-overrides/09b-telegram-control-center-monitoring.css` | 536 | 176 | 37.37 | critical |
| `styles/runtime-overrides/03d-legacy-telegram-monitor-patches.css` | 439 | 147 | 24.85 | critical |
| `styles/pages/reports.css` | 355 | 366 | 58.98 | critical |
| `styles/runtime-overrides/08c-customers-partners-headers.css` | 343 | 103 | 22.03 | critical |
| `styles/runtime-overrides/01a5-partner-command-detail-refinement.css` | 265 | 87 | 14.07 | high |
| `styles/pages/telegram.css` | 263 | 320 | 60.89 | critical |
| `styles/runtime-overrides/08d-people-table-detail-contracts.css` | 240 | 92 | 16.49 | high |
| `styles/runtime-overrides/02e-people-commercial-redesign.css` | 187 | 59 | 14.77 | high |
| `styles/runtime-overrides/01a4-people-detail-repair-header-filters.css` | 181 | 52 | 9.43 | high |
| `styles/runtime-overrides/10b-finance-tables-density-system.css` | 179 | 62 | 16.77 | high |
| `styles/runtime-overrides/04c-people-detail-pages.css` | 175 | 67 | 14.31 | high |
| `styles/runtime-overrides/03e-sidebar-settings-dashboard-root-fixes.css` | 170 | 64 | 16.49 | critical |
| `styles/runtime-overrides/09d9-telegram-monitor-anchoring-hotfixes.css` | 169 | 35 | 10.94 | high |
| `styles/runtime-overrides/09d8-telegram-monitor-size-placement-contract.css` | 165 | 24 | 7.41 | high |

## قوانین نگهداری CSS
1. **هیچ import را alphabetically sort نکنید.** نام فایل‌ها مرحله‌ای است و ترتیب source order بخشی از منطق UI است.
2. **هر تغییر CSS باید نزدیک‌ترین فایل دامنه‌ای را انتخاب کند.** مثال: تغییر گزارش‌ها داخل reports، تغییر تلگرام داخل telegram، تغییر phone table داخل mobile phones؛ نه داخل final override.
3. **فایل‌های `runtime-overrides` فقط برای hotfix یا overrideهای late-stage باشند.** وقتی یک rule پایدار شد، باید به فایل domain اصلی منتقل شود.
4. **قبل از حذف selector تکراری، مقدار مؤثر cascade در breakpointهای اصلی تست شود.** حداقل عرض‌های 500، 768، 1024 و 1400 پیکسل.
5. **هر rule جدید با `!important` باید دلیل داشته باشد.** اگر selector specificity قابل اصلاح است، `!important` ممنوع است.
6. **برای RTL/LTR داده‌های لاتین، fix عمومی نسازید.** فقط روی کلاس/کامپوننت هدفمند اعمال شود تا جدول‌ها و فرم‌ها خراب نشوند.
7. **برای بخش‌های فروش، گوشی، گزارش‌ها و تلگرام، حذف CSS بدون QA تصویری ممنوع است.** این‌ها business-critical هستند.

## مسیر مهاجرت پیشنهادی
### فاز A — تثبیت
- هیچ تغییر ظاهری. فقط نگهداری import map، مستندات و validation.
- هر PR/patch باید `css-stage22-validation.json` یا معادل جدید تولید کند.

### فاز B — انتقال overrideهای پایدار
- فایل‌های `runtime-overrides/10*` و `runtime-overrides/09*` اولویت دارند.
- هر rule که فقط یک دامنه واضح دارد، به فایل page/component همان دامنه منتقل شود.
- بعد از انتقال، before/after computed rules برای selectorهای همان بخش ثبت شود.

### فاز C — حذف تکرارها
- از `css-selector-hotspots-stage22.csv` و `css-exact-duplicate-rules-stage22.json` شروع شود.
- فقط duplicateهای byte-identical و هم‌مجاور یا duplicateهایی که computed output را تغییر نمی‌دهند حذف شوند.

### فاز D — component-level CSS
- برای کامپوننت‌های پایدار مثل Button، Modal، Table، Filter، Toast، Header و Sidebar فایل component CSS مستقل تعریف شود.
- بعد از مهاجرت، runtime overrideهای مربوطه حذف شوند.

## قرارداد نام‌گذاری پیشنهادی
```txt
styles/
  core/              tokens, reset/base, typography, utilities
  layout/            shell, sidebar, page, responsive, print
  components/        button, input, modal, table, toast, card, filter
  pages/             dashboard, reports, telegram, settings, mobile-phones
  legacy/            فقط CSSهای تاریخی split شده؛ محل توسعه جدید نیست
  runtime-overrides/ hotfix late-stage؛ باید به‌مرور خالی شود
```

## فایل‌های تولیدشده در Stage 22
- `docs/css-governance-map-stage22.md`
- `docs/css-import-order-stage22.csv`
- `docs/css-file-inventory-stage22.csv`
- `docs/css-risk-matrix-stage22.csv`
- `docs/css-selector-hotspots-stage22.csv`
- `docs/css-exact-duplicate-rules-stage22.json`
- `docs/css-stage22-validation.json`

## وضعیت validation
Validation ساختاری CSS سبز است: import گمشده، brace error و parse error گزارش نشده است.
