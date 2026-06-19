# PHASE 36 — Full CSS Duplicate Audit Summary

این مرحله فقط audit انجام می‌دهد و هیچ CSS/JSX اجرایی را تغییر نمی‌دهد.

## Snapshot

- **CSS files:** 152
- **Total CSS bytes:** 1992103
- **Total CSS lines:** 67602
- **Total !important:** 13775
- **CSS imports in index.tsx:** 58
- **Direct runtime-overrides imports:** 0
- **Files with exact duplicate rules:** 5
- **Exact duplicate extra occurrences:** 51
- **Files with repeated selectors / different bodies:** 32
- **Repeated selector groups / different bodies:** 437

## QA

- CSS parser error files: 0
- textual `\n` CSS files: 0
- brace balance issues: 0
- missing CSS imports: 0
- direct runtime-overrides imports: 0

## Top CSS files by size

| File | KB | Lines | !important | Exact dup extra | Repeated selector groups |
|---|---:|---:|---:|---:|---:|
| `styles/generated/tailwind-entry.generated.css` | 405.2 | 14445 | 978 | 39 | 110 |
| `styles/system/telegram-ui-foundation.css` | 175.9 | 5809 | 2095 | 2 | 84 |
| `styles/system/modal-partner-foundation.css` | 126.4 | 3792 | 1611 | 8 | 70 |
| `styles/system/search-input-foundation.css` | 67.3 | 2070 | 910 | 0 | 17 |
| `styles/pages/telegram.css` | 60.9 | 1628 | 263 | 1 | 29 |
| `styles/pages/reports.css` | 59.4 | 2376 | 355 | 0 | 1 |
| `styles/system/people-table-detail-foundation.css` | 38.4 | 1257 | 582 | 0 | 11 |
| `styles/system/modal-products-foundation.css` | 36.9 | 1484 | 239 | 0 | 22 |
| `styles/system/legacy-quarantine/people-empty-list-detail-foundation.css` | 35.7 | 1262 | 328 | 0 | 4 |
| `styles/system/legacy-quarantine/enterprise-forms-reports-foundation.css` | 34.7 | 1169 | 110 | 0 | 0 |
| `styles/system/dashboard-smart-widgets-foundation.css` | 33.9 | 948 | 291 | 0 | 8 |
| `styles/system/reports-risk-cashflow-foundation.css` | 29.8 | 1188 | 531 | 0 | 5 |
| `styles/system/legacy-quarantine/people-detail-command-foundation.css` | 28.0 | 842 | 529 | 0 | 2 |
| `styles/system/ui-density-accessibility-foundation.css` | 25.4 | 957 | 150 | 1 | 7 |
| `styles/system/telegram-runtime/legacy-telegram-monitor-foundation.css` | 25.1 | 993 | 439 | 0 | 0 |

## Top candidates for safe exact duplicate cleanup

| File | Exact duplicate extra occurrences | Exact duplicate groups |
|---|---:|---:|
| `styles/generated/tailwind-entry.generated.css` | 39 | 39 |
| `styles/system/modal-partner-foundation.css` | 8 | 8 |
| `styles/system/telegram-ui-foundation.css` | 2 | 2 |
| `styles/pages/telegram.css` | 1 | 1 |
| `styles/system/ui-density-accessibility-foundation.css` | 1 | 1 |

## Highest-risk refactor candidates

این‌ها exact duplicate نیستند؛ selector تکراری با body متفاوت دارند و باید دستی refactor شوند.

| File | Repeated selector groups / different bodies | !important | KB |
|---|---:|---:|---:|
| `styles/generated/tailwind-entry.generated.css` | 110 | 978 | 405.2 |
| `styles/system/telegram-ui-foundation.css` | 84 | 2095 | 175.9 |
| `styles/system/modal-partner-foundation.css` | 70 | 1611 | 126.4 |
| `styles/pages/telegram.css` | 29 | 263 | 60.9 |
| `styles/system/modal-products-foundation.css` | 22 | 239 | 36.9 |
| `styles/system/search-input-foundation.css` | 17 | 910 | 67.3 |
| `styles/system/people-table-detail-foundation.css` | 11 | 582 | 38.4 |
| `styles/system/legacy-quarantine/field-form-after-primitives-foundation.css` | 10 | 123 | 16.4 |
| `styles/system/mobile-phones-foundation.css` | 10 | 112 | 24.9 |
| `styles/system/header-sidebar-navigation-foundation.css` | 9 | 297 | 23.1 |
| `styles/system/dashboard-smart-widgets-foundation.css` | 8 | 291 | 33.9 |
| `styles/system/telegram-runtime/message-composer-controls-foundation.css` | 8 | 79 | 21.8 |
| `styles/system/ui-density-accessibility-foundation.css` | 7 | 150 | 25.4 |
| `styles/system/partner-capital-status-foundation.css` | 5 | 63 | 6.6 |
| `styles/system/partner-detail-visual-foundation.css` | 5 | 289 | 23.6 |
| `styles/system/reports-risk-cashflow-foundation.css` | 5 | 531 | 29.8 |
| `styles/system/legacy-quarantine/people-empty-list-detail-foundation.css` | 4 | 328 | 35.7 |
| `styles/components/unified-fields.css` | 3 | 127 | 15.6 |
| `styles/system/products-services-repairs/products-ui-foundation.css` | 3 | 74 | 17.8 |
| `styles/components/modals.css` | 2 | 43 | 7.2 |

## Recommendation

از این نقطه به بعد، کاهش واقعی CSS نباید با حذف خودکار انجام شود. پیشنهاد امن: ابتدا فایل‌هایی با repeated selector بالا را به contractهای کوچک‌تر و semantic تقسیم کنیم، سپس با تست UI هر scope، selectorهای متفاوت را ادغام کنیم.
