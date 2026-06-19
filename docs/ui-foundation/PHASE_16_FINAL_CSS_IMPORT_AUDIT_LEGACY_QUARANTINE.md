# Phase 16 — Final CSS Import Audit / Legacy Quarantine

## Scope
This phase does not change product logic, API calls, database behavior, routes, report calculations, sales logic, Telegram services, or persistence. It only reorganizes remaining CSS imports that were still safe to quarantine without changing cascade order.

## Result
- Direct project CSS imports in `index.tsx`: 66 → 56
- Direct `styles/runtime-overrides/*` imports in `index.tsx`: 21 → 11
- New quarantined files: 7
- Literal `\n` sequences in CSS: 0 found
- Basic CSS brace balance check: passed

## New quarantine foundations

### `styles/system/legacy-quarantine/people-list-hero-foundation.css`
Preserves:
- `styles/runtime-overrides/01a1-people-table-action-baseline.css`
- `styles/runtime-overrides/01a2-people-page-hero-lists.css`

### `styles/system/legacy-quarantine/people-detail-command-foundation.css`
Preserves:
- `styles/runtime-overrides/01a4-people-detail-repair-header-filters.css`
- `styles/runtime-overrides/01a5-partner-command-detail-refinement.css`
- `styles/runtime-overrides/01a6-detail-kpi-filter-icon-system.css`

### `styles/system/legacy-quarantine/people-empty-list-detail-foundation.css`
Preserves:
- `styles/runtime-overrides/04a-people-empty-states.css`
- `styles/runtime-overrides/04b-people-list-unification.css`
- `styles/runtime-overrides/04c-people-detail-pages.css`

### `styles/system/legacy-quarantine/partner-settlement-foundation.css`
Preserves:
- `styles/runtime-overrides/04f-partner-phone-product-settlement.css`
- `styles/runtime-overrides/04g-partner-settlement-timeline-ledger.css`

### `styles/system/legacy-quarantine/enterprise-forms-reports-foundation.css`
Preserves:
- `styles/runtime-overrides/06a-enterprise-actions-fields-validation.css`
- `styles/runtime-overrides/06b-horizontal-forms-modals-header.css`
- `styles/runtime-overrides/06c-reports-consolidation-filters.css`

### `styles/system/legacy-quarantine/select-customer-compat-foundation.css`
Preserves:
- `styles/runtime-overrides/10za-app-select-field-layout-compat.css`
- `styles/runtime-overrides/10zb-customers-list-name-space.css`

### `styles/system/legacy-quarantine/collection-cleanup-foundation.css`
Preserves:
- `styles/runtime-overrides/11b-collection-date-selectability-fix.css`
- `styles/runtime-overrides/11c-collection-black-badges-cleanup.css`

## Runtime overrides intentionally left as direct imports
These files were not grouped because each one sits at a sensitive cascade boundary or is currently a single hotfix that should be retired only after visual replacement by a real component/system contract:

- `styles/runtime-overrides/01b-people-foundation-after-fields.css`
- `styles/runtime-overrides/02a-reports-apple-minimal.css`
- `styles/runtime-overrides/02b-settings-telegram-compact.css`
- `styles/runtime-overrides/02e-people-commercial-redesign.css`
- `styles/runtime-overrides/02g-telegram-real-compact-patch.css`
- `styles/runtime-overrides/03d-legacy-telegram-monitor-patches.css`
- `styles/runtime-overrides/08b-message-composer-controls.css`
- `styles/runtime-overrides/08e-finance-modal-polish.css`
- `styles/runtime-overrides/10a-installments-phone-edit-overrides.css`
- `styles/runtime-overrides/10i-bidi-text-contract.css`
- `styles/runtime-overrides/10zk-partner-phone-capital-solid-reset.css`

## Test checklist
- Customers list and customer detail
- Partners list and partner detail
- People filters and KPI headers
- Partner settlement / ledger panels
- Reports filters and date controls
- Collection center date controls and badges
- Select fields, especially customer selectors
- Horizontal modal forms
- Dark mode / light mode
- Desktop widths: 1366 and 1280
- Mobile width

## Next recommended phase
Start reducing the remaining direct runtime overrides by replacing them with real component contracts. The safest next target is `Design Tokens + Field/Form Contract`, because it can gradually absorb field spacing, borders, focus states, RTL/LTR behavior, and control heights across the app.
