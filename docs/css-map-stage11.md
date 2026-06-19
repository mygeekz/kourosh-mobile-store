# CSS Map / Ownership Audit — Stage 11

This report documents the current CSS structure after the split/refactor stages. It does **not** change visual behavior. Its purpose is to make future edits safer by showing ownership, import order, selector density, and override hotspots.

## Executive summary

- Total CSS files scanned: **109**
- Runtime override files imported after `index.css`: **65**
- Total CSS size: **1105.4 KB**
- Total selector entries: **10100**
- Total `!important` declarations: **7961**
- Selector hotspots with 3+ occurrences: **577**
- Exact duplicate rule blocks detected: **92**

## Folder-level map

| Folder | Files | Size KB | Lines | Selectors | !important | Cross-file selector hits |
|---|---:|---:|---:|---:|---:|---:|
| `.` | 1 | 2.5 | 83 | 14 | 2 | 8 |
| `styles` | 3 | 151.9 | 5942 | 2014 | 181 | 332 |
| `styles/components` | 15 | 96.6 | 3309 | 1094 | 271 | 393 |
| `styles/core` | 5 | 6.6 | 250 | 62 | 1 | 36 |
| `styles/layout` | 7 | 7.4 | 285 | 59 | 11 | 21 |
| `styles/pages` | 12 | 145.2 | 4952 | 1279 | 650 | 159 |
| `styles/runtime-overrides` | 65 | 695.1 | 24377 | 5578 | 6845 | 1022 |
| `styles/vendors` | 1 | 0.1 | 1 | 0 | 0 | 0 |

## Highest-impact files by size

| file | size_kb | lines | selectors | important_count | cross_file_selector_count | domain | candidate_action |
|---|---|---|---|---|---|---|---|
| styles/legacy-monolith.css | 146.7 | 5777 | 1985 | 170 | 329 | forms/modals | migrate gradually into domain files |
| styles/pages/telegram.css | 60.9 | 1628 | 536 | 263 | 37 | telegram | reduce !important after page QA |
| styles/pages/reports.css | 59.0 | 2376 | 508 | 355 | 52 | reports | reduce !important after page QA |
| styles/runtime-overrides/09b-telegram-control-center-monitoring.css | 37.4 | 1229 | 275 | 536 | 45 | telegram | audit before edit: runtime override hotspot |
| styles/runtime-overrides/09c-telegram-template-center-cards.css | 35.3 | 1108 | 225 | 540 | 39 | telegram | audit before edit: runtime override hotspot |
| styles/runtime-overrides/09e-telegram-accordion-logs-modals.css | 31.1 | 1167 | 314 | 50 | 0 | telegram | audit before edit: runtime override hotspot |
| styles/runtime-overrides/03d-legacy-telegram-monitor-patches.css | 24.9 | 991 | 179 | 439 | 5 | telegram | audit before edit: runtime override hotspot |
| styles/runtime-overrides/09a-telegram-settings-foundation.css | 22.3 | 751 | 222 | 82 | 53 | telegram | audit before edit: runtime override hotspot |
| styles/runtime-overrides/08c-customers-partners-headers.css | 22.0 | 706 | 118 | 343 | 7 | people | audit before edit: runtime override hotspot |
| styles/runtime-overrides/08b-message-composer-controls.css | 21.6 | 768 | 155 | 79 | 3 | telegram | audit before edit: runtime override hotspot |
| styles/runtime-overrides/05-mobile-phones.css | 19.6 | 782 | 173 | 112 | 11 | mobile phones | audit before edit: runtime override hotspot |
| styles/runtime-overrides/06a-enterprise-actions-fields-validation.css | 16.8 | 408 | 158 | 86 | 36 | forms/modals | audit before edit: runtime override hotspot |
| styles/runtime-overrides/10b-finance-tables-density-system.css | 16.8 | 426 | 110 | 179 | 3 | tables | audit before edit: runtime override hotspot |
| styles/runtime-overrides/03e-sidebar-settings-dashboard-root-fixes.css | 16.5 | 428 | 87 | 170 | 17 | layout/sidebar/header | audit before edit: runtime override hotspot |
| styles/runtime-overrides/08d-people-table-detail-contracts.css | 16.5 | 558 | 127 | 240 | 27 | people | audit before edit: runtime override hotspot |


## Highest `!important` concentration

| file | size_kb | important_count | selectors | cross_file_selector_count | domain | candidate_action |
|---|---|---|---|---|---|---|
| styles/runtime-overrides/09c-telegram-template-center-cards.css | 35.3 | 540 | 225 | 39 | telegram | audit before edit: runtime override hotspot |
| styles/runtime-overrides/09b-telegram-control-center-monitoring.css | 37.4 | 536 | 275 | 45 | telegram | audit before edit: runtime override hotspot |
| styles/runtime-overrides/03d-legacy-telegram-monitor-patches.css | 24.9 | 439 | 179 | 5 | telegram | audit before edit: runtime override hotspot |
| styles/pages/reports.css | 59.0 | 355 | 508 | 52 | reports | reduce !important after page QA |
| styles/runtime-overrides/08c-customers-partners-headers.css | 22.0 | 343 | 118 | 7 | people | audit before edit: runtime override hotspot |
| styles/runtime-overrides/01a5-partner-command-detail-refinement.css | 14.1 | 265 | 108 | 13 | people | audit before edit: runtime override hotspot |
| styles/pages/telegram.css | 60.9 | 263 | 536 | 37 | telegram | reduce !important after page QA |
| styles/runtime-overrides/08d-people-table-detail-contracts.css | 16.5 | 240 | 127 | 27 | people | audit before edit: runtime override hotspot |
| styles/runtime-overrides/02e-people-commercial-redesign.css | 14.8 | 187 | 205 | 88 | people | audit before edit: runtime override hotspot |
| styles/runtime-overrides/01a4-people-detail-repair-header-filters.css | 9.4 | 181 | 73 | 30 | people | audit before edit: runtime override hotspot |
| styles/runtime-overrides/10b-finance-tables-density-system.css | 16.8 | 179 | 110 | 3 | tables | audit before edit: runtime override hotspot |
| styles/runtime-overrides/04c-people-detail-pages.css | 14.3 | 175 | 90 | 0 | people | audit before edit: runtime override hotspot |
| styles/legacy-monolith.css | 146.7 | 170 | 1985 | 329 | forms/modals | migrate gradually into domain files |
| styles/runtime-overrides/03e-sidebar-settings-dashboard-root-fixes.css | 16.5 | 170 | 87 | 17 | layout/sidebar/header | audit before edit: runtime override hotspot |
| styles/runtime-overrides/09d9-telegram-monitor-anchoring-hotfixes.css | 10.9 | 169 | 83 | 25 | telegram | audit before edit: runtime override hotspot |


## Highest cross-file selector overlap

| file | size_kb | selectors | cross_file_selector_count | important_count | domain | candidate_action |
|---|---|---|---|---|---|---|
| styles/legacy-monolith.css | 146.7 | 1985 | 329 | 170 | forms/modals | migrate gradually into domain files |
| styles/components/unified-buttons.css | 8.4 | 131 | 100 | 94 | people | reduce !important after page QA |
| styles/runtime-overrides/01a7-shared-primitives-button-system.css | 10.2 | 142 | 90 | 144 | people | audit before edit: runtime override hotspot |
| styles/runtime-overrides/02e-people-commercial-redesign.css | 14.8 | 205 | 88 | 187 | people | audit before edit: runtime override hotspot |
| styles/runtime-overrides/01a2-people-page-hero-lists.css | 8.5 | 84 | 67 | 123 | people | audit before edit: runtime override hotspot |
| styles/components/unified-fields.css | 15.6 | 171 | 62 | 127 | forms/modals | reduce !important after page QA |
| styles/runtime-overrides/04b-people-list-unification.css | 13.1 | 132 | 56 | 151 | people | audit before edit: runtime override hotspot |
| styles/runtime-overrides/09a-telegram-settings-foundation.css | 22.3 | 222 | 53 | 82 | telegram | audit before edit: runtime override hotspot |
| styles/pages/reports.css | 59.0 | 508 | 52 | 355 | reports | reduce !important after page QA |
| styles/runtime-overrides/01b-people-foundation-after-fields.css | 16.3 | 156 | 50 | 123 | settings | audit before edit: runtime override hotspot |
| styles/pages/partners.css | 12.5 | 111 | 47 | 32 | people | reduce !important after page QA |
| styles/runtime-overrides/09b-telegram-control-center-monitoring.css | 37.4 | 275 | 45 | 536 | telegram | audit before edit: runtime override hotspot |
| styles/components/modals.css | 7.2 | 111 | 39 | 43 | layout/sidebar/header | reduce !important after page QA |
| styles/runtime-overrides/09c-telegram-template-center-cards.css | 35.3 | 225 | 39 | 540 | telegram | audit before edit: runtime override hotspot |
| styles/pages/telegram.css | 60.9 | 536 | 37 | 263 | telegram | reduce !important after page QA |


## Ownership map by inferred domain

### telegram
Files: `styles/pages/telegram.css`, `styles/runtime-overrides/02b-settings-telegram-compact.css`, `styles/runtime-overrides/02g-telegram-real-compact-patch.css`, `styles/runtime-overrides/03a-global-commercial-qa.css`, `styles/runtime-overrides/03d-legacy-telegram-monitor-patches.css`, `styles/runtime-overrides/08b-message-composer-controls.css`, `styles/runtime-overrides/09a-telegram-settings-foundation.css`, `styles/runtime-overrides/09b-telegram-control-center-monitoring.css`, `styles/runtime-overrides/09c-telegram-template-center-cards.css`, `styles/runtime-overrides/09d1-telegram-studio-filter-controls.css`, `styles/runtime-overrides/09d2-telegram-studio-search-empty-states.css`, `styles/runtime-overrides/09d3-telegram-monitor-title-value-layout.css` (+7 more)

### forms/modals
Files: `index.css`, `styles/layout/responsive.css`, `styles/components/buttons.css`, `styles/components/cards.css`, `styles/legacy-monolith.css`, `styles/components/forms.css`, `styles/components/button-normalization.css`, `styles/components/unified-fields.css`, `styles/runtime-overrides/03c-notifications-sidebar-smartbrain.css`, `styles/runtime-overrides/04d-people-add-edit-modals.css`, `styles/runtime-overrides/06a-enterprise-actions-fields-validation.css`, `styles/runtime-overrides/06b-horizontal-forms-modals-header.css` (+5 more)

### people
Files: `styles/pages/customers.css`, `styles/pages/partners.css`, `styles/components/detail.css`, `styles/pages/customers-shell.css`, `styles/components/unified-buttons.css`, `styles/runtime-overrides/01a1-people-table-action-baseline.css`, `styles/runtime-overrides/01a2-people-page-hero-lists.css`, `styles/runtime-overrides/01a4-people-detail-repair-header-filters.css`, `styles/runtime-overrides/01a5-partner-command-detail-refinement.css`, `styles/runtime-overrides/01a6-detail-kpi-filter-icon-system.css`, `styles/runtime-overrides/01a7-shared-primitives-button-system.css`, `styles/runtime-overrides/02e-people-commercial-redesign.css` (+11 more)

### reports
Files: `styles/components/filters.css`, `styles/pages/reports.css`, `styles/components/badges.css`, `styles/runtime-overrides/02a-reports-apple-minimal.css`, `styles/runtime-overrides/06c-reports-consolidation-filters.css`, `styles/runtime-overrides/06d-kpi-navigation-density-mobile.css`, `styles/runtime-overrides/10d-financial-status-badges.css`

### layout/sidebar/header
Files: `styles/core/animations.css`, `styles/layout/app-shell.css`, `styles/layout/sidebar.css`, `styles/layout/page-shell.css`, `styles/components/modals.css`, `styles/layout/sidebar-chrome.css`, `styles/layout/print-shells.css`, `styles/runtime-overrides/02c-repairs-apple-commercial.css`, `styles/runtime-overrides/03b-reports-mobile-settings-smoke.css`, `styles/runtime-overrides/03e-sidebar-settings-dashboard-root-fixes.css`, `styles/runtime-overrides/10e-header-final-polish.css`, `styles/runtime-overrides/10f-sidebar-final-polish.css` (+1 more)

### tables
Files: `styles/layout/print.css`, `styles/components/tables.css`, `styles/components/toolbars.css`, `styles/pages/repairs.css`, `styles/runtime-overrides/08a-unified-table-actions.css`, `styles/runtime-overrides/10b-finance-tables-density-system.css`

### mobile phones
Files: `styles/pages/inventory.css`, `styles/pages/mobile-phones.css`, `styles/runtime-overrides/02d-services-inventory-polish.css`, `styles/runtime-overrides/05-mobile-phones.css`, `styles/runtime-overrides/10a-installments-phone-edit-overrides.css`

### settings
Files: `styles/pages/settings.css`, `styles/pages/settings-overrides.css`, `styles/runtime-overrides/01a3-settings-adaptive-sidebar-cleanup.css`, `styles/runtime-overrides/01b-people-foundation-after-fields.css`

### products
Files: `styles/runtime-overrides/07d-product-category-supplier-management.css`, `styles/runtime-overrides/07e-product-list-table-density.css`

### dashboard
Files: `styles/pages/dashboard.css`, `styles/runtime-overrides/03f-stable-panels-dashboard-clock.css`

### notifications
Files: `styles/components/toasts.css`, `styles/components/empty-states.css`, `styles/runtime-overrides/02f-notifications-commercial-redesign.css`

### shared/base
Files: `styles/themes.css`, `styles/core/tokens.css`, `styles/core/base.css`, `styles/core/typography.css`, `styles/core/utilities.css`, `styles/pages/purchases.css`, `styles/vendors/overrides.css`, `styles/components/detail-hero.css`


## Practical editing rules

1. Keep `index.css` as the orchestrator for foundation imports only.
2. Do not alphabetically reorder `styles/runtime-overrides/*`; their order is part of the cascade contract.
3. New page-level CSS should go into `styles/pages/<page>.css` when it is stable. Temporary compatibility patches should go into `styles/runtime-overrides/` with a numbered prefix.
4. Before deleting duplicated selectors, compare the effective declarations at desktop and mobile breakpoints.
5. For high-risk areas — Telegram, people/partners, mobile inventory, reports — cleanup should be done one domain at a time with visual QA.

## Generated companion files

- `docs/css-map-stage11.csv`: full file-by-file metrics.
- `docs/css-selector-hotspots-stage11.csv`: selectors with repeated project-wide appearances.
- `docs/css-exact-duplicates-stage11.json`: exact duplicate rule blocks, capped to the top 300 entries.

## Recommended next cleanup target

The next safest target is not a broad delete pass. It should be a domain pass over files with both high cross-file overlap and high `!important` usage. Based on this audit, start with the largest runtime override hotspots listed above, then move repeated rules into stable component/page files only after visual QA.
