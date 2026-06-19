# Stage 8 CSS cleanup audit
این گزارش برای پاک‌سازی کم‌ریسک CSSهای runtime پروژه ساخته شده است. اصل این مرحله: حذف نکردن overrideهای مشکوک بدون QA تصویری.
## تغییر اعمال‌شده
- یک بلاک تکراری کامل با عنوان `Phase 101: People + detail headers refinement` از فایل `styles/runtime-overrides/01a5-partner-command-detail-refinement.css` حذف شد.
- این بلاک دقیقاً پشت سر نسخه اول خودش تکرار شده بود و بین دو نسخه هیچ rule دیگری وجود نداشت؛ بنابراین حذف نسخه دوم cascade را تغییر نمی‌دهد.
- کاهش حجم مستقیم: حدود `5,007` کاراکتر CSS.

## وضعیت بعد از cleanup
- تعداد ruleهای بررسی‌شده در runtime overrides: `3,774`
- exact duplicate signature باقی‌مانده: `31` مورد
- selectorهایی که چند تعریف متفاوت دارند و باید با QA بررسی شوند: `407` مورد

## چرا بقیه موارد حذف نشدند؟
باقی موارد تکراری در فایل‌های مختلف، breakpointها، dark mode، hotfixهای نهایی یا overrideهای عمدی قرار دارند. حذف خودکار آن‌ها می‌تواند روی بخش‌های حساس مثل تلگرام، جدول گوشی‌ها، گزارش‌ها و مودال‌ها اثر بگذارد.

## Hotspotهای مهم برای refactor بعدی
- `.phone-inventory-table-v2 th:nth-child(4), .phone-inventory-table-v2 td:nth-child(4)` — `10` variant / `12` definitions — files: `05-mobile-phones.css, 06a-enterprise-actions-fields-validation.css, 06e-accessibility-rtl-targeted-fixes.css, 07a-products-modal-precision-cleanup.css, 07b-products-modal-responsive-polish.css`
- `.phone-inventory-table-v2 col:nth-child(4)` — `9` variant / `11` definitions — files: `05-mobile-phones.css, 06e-accessibility-rtl-targeted-fixes.css, 07a-products-modal-precision-cleanup.css, 07b-products-modal-responsive-polish.css`
- `.phone-inventory-table-v2 col:nth-child(3)` — `8` variant / `11` definitions — files: `05-mobile-phones.css, 06e-accessibility-rtl-targeted-fixes.css, 07a-products-modal-precision-cleanup.css, 07b-products-modal-responsive-polish.css`
- `.phone-inventory-table-v2 col:nth-child(2)` — `8` variant / `10` definitions — files: `06e-accessibility-rtl-targeted-fixes.css, 07a-products-modal-precision-cleanup.css, 07b-products-modal-responsive-polish.css`
- `#telegram-settings-form .telegram-monitor-v2-action` — `8` variant / `8` definitions — files: `09b-telegram-control-center-monitoring.css, 09d1-telegram-studio-filter-controls.css, 09d7-telegram-monitor-card-standard.css, 09d8-telegram-monitor-size-placement-contract.css`
- `#telegram-settings-form .telegram-monitor-v2-action__value` — `8` variant / `8` definitions — files: `09b-telegram-control-center-monitoring.css, 09c-telegram-template-center-cards.css, 09d1-telegram-studio-filter-controls.css, 09d3-telegram-monitor-title-value-layout.css, 09d7-telegram-monitor-card-standard.css`
- `.phone-table-action-btn` — `8` variant / `8` definitions — files: `06e-accessibility-rtl-targeted-fixes.css, 07a-products-modal-precision-cleanup.css, 07b-products-modal-responsive-polish.css`
- `.premium-modal-shell .premium-form-grid` — `8` variant / `8` definitions — files: `07a-products-modal-precision-cleanup.css, 07b-products-modal-responsive-polish.css`
- `#telegram-settings-form .telegram-monitor-v2-action__copy` — `7` variant / `8` definitions — files: `09c-telegram-template-center-cards.css, 09d1-telegram-studio-filter-controls.css, 09d3-telegram-monitor-title-value-layout.css, 09d7-telegram-monitor-card-standard.css, 09d8-telegram-monitor-size-placement-contract.css`
- `#telegram-settings-form .telegram-monitor-v2-action__icon` — `7` variant / `7` definitions — files: `09b-telegram-control-center-monitoring.css, 09c-telegram-template-center-cards.css, 09d1-telegram-studio-filter-controls.css, 09d3-telegram-monitor-title-value-layout.css, 09d7-telegram-monitor-card-standard.css`
- `#telegram-settings-form .telegram-monitor-v2-action__label` — `7` variant / `7` definitions — files: `09c-telegram-template-center-cards.css, 09d1-telegram-studio-filter-controls.css, 09d3-telegram-monitor-title-value-layout.css, 09d7-telegram-monitor-card-standard.css, 09d8-telegram-monitor-size-placement-contract.css`
- `#telegram-settings-form .telegram-monitor-v2-action__state` — `7` variant / `7` definitions — files: `09b-telegram-control-center-monitoring.css, 09c-telegram-template-center-cards.css, 09d1-telegram-studio-filter-controls.css, 09d3-telegram-monitor-title-value-layout.css, 09d7-telegram-monitor-card-standard.css`
- `.premium-modal-shell .premium-form-section` — `7` variant / `7` definitions — files: `07a-products-modal-precision-cleanup.css, 07b-products-modal-responsive-polish.css`
- `#telegram-settings-form .telegram-template-mode-buttons` — `6` variant / `9` definitions — files: `09c-telegram-template-center-cards.css, 09d1-telegram-studio-filter-controls.css, 09d2-telegram-studio-search-empty-states.css`
- `#telegram-settings-form .tg-apple-setup-card__inner, #telegram-settings-form .telegram-monitor-v2-action` — `6` variant / `6` definitions — files: `09d9-telegram-monitor-anchoring-hotfixes.css`
- `.phone-addable-autocomplete__menu` — `6` variant / `6` definitions — files: `01b-people-foundation-after-fields.css, 03b-reports-mobile-settings-smoke.css, 05-mobile-phones.css`
- `.phone-card-specs-row` — `6` variant / `6` definitions — files: `07b-products-modal-responsive-polish.css`
- `#telegram-settings-form .telegram-studio-filter-row` — `5` variant / `6` definitions — files: `09c-telegram-template-center-cards.css, 09d1-telegram-studio-filter-controls.css, 09d2-telegram-studio-search-empty-states.css`
- `#telegram-settings-form .telegram-monitor-v2-action__copy, #telegram-settings-form .telegram-monitor-v2-checkcard__copy` — `5` variant / `5` definitions — files: `09b-telegram-control-center-monitoring.css, 09c-telegram-template-center-cards.css`
- `#telegram-settings-form .telegram-monitor-v2-action__top` — `5` variant / `5` definitions — files: `09c-telegram-template-center-cards.css, 09d1-telegram-studio-filter-controls.css, 09d3-telegram-monitor-title-value-layout.css, 09d7-telegram-monitor-card-standard.css, 09d8-telegram-monitor-size-placement-contract.css`

## فایل‌های کمکی
- `docs/css-override-hotspots-stage8.csv`: لیست selectorهای چندتعریفی برای بررسی مرحله بعد.
- `docs/css-exact-duplicates-after-stage8.json`: exact duplicateهای باقی‌مانده بعد از cleanup.

## پیشنهاد مرحله بعد
مرحله بعد بهتر است refactor هدفمند و دستی روی سه hotspot انجام شود: جدول گوشی‌ها، action cardهای تلگرام، و فرم‌های premium modal. قبل از حذف هر rule باید صفحه مربوطه در حالت light/dark و desktop/mobile تست شود.
