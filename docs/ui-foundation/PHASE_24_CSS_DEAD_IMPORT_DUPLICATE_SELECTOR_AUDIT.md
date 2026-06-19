# PHASE 24 — CSS Dead Import / Duplicate Selector Audit
این مرحله تغییر ظاهری عمدی ندارد. هدف حذف CSS مرده‌ی باقی‌مانده از runtime-overrides و ثبت نقشه‌ی کاهش واقعی CSS در فازهای بعدی است.
## تغییر انجام‌شده
- پوشه `styles/runtime-overrides` حذف شد، چون بعد از مرحله ۲۳ هیچ import فعالی از آن در `index.tsx` باقی نمانده بود.
- تعداد فایل‌های حذف‌شده: `136`
- حجم حذف‌شده: `1,124,352` bytes
- تعداد `!important` حذف‌شده از فایل‌های مرده: `12,225`
## وضعیت importها
- کل CSS import در `index.tsx`: `61`
- importهای CSS پروژه: `58`
- importهای خارجی وابسته به node_modules: `3`
- import گم‌شده داخلی: `0`
## دسته‌بندی importهای فعال
- `components`: `3`
- `generated`: `1`
- `system-foundation`: `54`
## Audit selectorهای فعال
- selectorهای یکتای تخمینی در CSSهای import شده: `9,573`
- selectorهای تکراری بین چند فایل فعال: `815`
- ruleهای دقیقاً تکراری بین چند فایل فعال: `184`
## بزرگ‌ترین فایل‌های فعال
- `styles/generated/tailwind-entry.generated.css` — `414,936` bytes
- `styles/system/telegram-ui-foundation.css` — `181,278` bytes
- `styles/system/modal-partner-foundation.css` — `130,894` bytes
- `styles/system/search-input-foundation.css` — `69,300` bytes
- `styles/system/people-table-detail-foundation.css` — `39,441` bytes
- `styles/system/modal-products-foundation.css` — `37,827` bytes
- `styles/system/legacy-quarantine/people-empty-list-detail-foundation.css` — `36,571` bytes
- `styles/system/legacy-quarantine/enterprise-forms-reports-foundation.css` — `35,491` bytes
- `styles/system/dashboard-smart-widgets-foundation.css` — `34,752` bytes
- `styles/system/reports-risk-cashflow-foundation.css` — `30,543` bytes
- `styles/system/legacy-quarantine/people-detail-command-foundation.css` — `28,624` bytes
- `styles/system/ui-density-accessibility-foundation.css` — `26,015` bytes
- `styles/system/telegram-runtime/legacy-telegram-monitor-foundation.css` — `25,673` bytes
- `styles/system/mobile-phones-foundation.css` — `25,483` bytes
- `styles/system/partner-detail-visual-foundation.css` — `24,179` bytes
## بیشترین `!important` در فایل‌های فعال
- `styles/system/telegram-ui-foundation.css` — `2,107`
- `styles/system/modal-partner-foundation.css` — `1,627`
- `styles/generated/tailwind-entry.generated.css` — `978`
- `styles/system/search-input-foundation.css` — `914`
- `styles/system/people-table-detail-foundation.css` — `583`
- `styles/system/reports-risk-cashflow-foundation.css` — `531`
- `styles/system/legacy-quarantine/people-detail-command-foundation.css` — `529`
- `styles/system/telegram-runtime/legacy-telegram-monitor-foundation.css` — `439`
- `styles/system/legacy-quarantine/people-empty-list-detail-foundation.css` — `328`
- `styles/system/header-sidebar-navigation-foundation.css` — `297`
- `styles/system/dashboard-smart-widgets-foundation.css` — `291`
- `styles/system/partner-detail-visual-foundation.css` — `289`
- `styles/system/modal-products-foundation.css` — `239`
- `styles/system/partner-capital-table-foundation.css` — `206`
- `styles/system/partner-detail-responsive-ledger-foundation.css` — `205`
## اولویت پیشنهادی کاهش واقعی CSS
1. `telegram-ui-foundation.css` و `telegram-runtime/*` فقط بعد از تثبیت کامل UI تلگرام.
2. `modal-partner-foundation.css` بعد از یکسان‌سازی کامل contract مودال‌های پرداخت/دریافت.
3. `search-input-foundation.css` بعد از اطمینان از Field/Form Contract در تمام searchها.
4. `reports-risk-cashflow-foundation.css` و `reports-shell/filter` بعد از تست همه گزارش‌ها.
5. `legacy-quarantine/*` باید آخرین لایه‌ای باشد که حذف می‌شود، نه اولین.
## فایل‌های گزارش
- `docs/ui-foundation/PHASE_24_CSS_DEAD_IMPORT_DUPLICATE_SELECTOR_AUDIT.json`
- `docs/ui-foundation/PHASE_24_REMOVED_RUNTIME_OVERRIDES_MANIFEST.json`
## Validation
- فایل CSS دارای `\n` متنی: `0`
- مشکل تعداد brace در CSS: `0`
- import داخلی گم‌شده: `0`
