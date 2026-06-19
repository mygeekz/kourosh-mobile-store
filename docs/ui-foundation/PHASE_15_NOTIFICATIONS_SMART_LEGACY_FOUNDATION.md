# Phase 15 — Notifications / Smart Insight / Remaining Legacy Foundation

## Scope

This phase consolidates scattered UI-only CSS chains into safer system foundation files.

No runtime logic was changed. No API, database, accounting, sales, report calculation, Telegram bot logic, routing, or persistence logic was changed.

## New foundation files

- `styles/system/notifications-foundation.css`
- `styles/system/global-commercial-qa-foundation.css`
- `styles/system/ui-density-accessibility-foundation.css`
- `styles/system/cross-module-density-foundation.css`
- `styles/system/people-status-mobile-foundation.css`
- `styles/system/partner-capital-status-foundation.css`
- `styles/system/reports-risk-cashflow-foundation.css`
- `styles/system/smart-insight-foundation.css`

## Consolidated source files

### Notifications

- `styles/runtime-overrides/02f-notifications-commercial-redesign.css`

### Global commercial QA

- `styles/runtime-overrides/03a-global-commercial-qa.css`

### KPI density / accessibility / RTL

- `styles/runtime-overrides/06d-kpi-navigation-density-mobile.css`
- `styles/runtime-overrides/06e-accessibility-rtl-targeted-fixes.css`

### Cross-module density

- `styles/runtime-overrides/07f-cross-module-density-pass.css`

### People filters / financial status badges

- `styles/runtime-overrides/10c-people-filters-mobile-cards.css`
- `styles/runtime-overrides/10d-financial-status-badges.css`

### Partner capital / Telegram status

- `styles/runtime-overrides/10zs-partner-capital-progress-final.css`
- `styles/runtime-overrides/10zt-partner-telegram-status-colors.css`

### Reports: debtors / creditors / cashflow / collection center

- `styles/runtime-overrides/10zu-reports-debtors-cashflow-polish.css`
- `styles/runtime-overrides/10zv-cashflow-risk-cumulative-charts.css`
- `styles/runtime-overrides/10zw-cashflow-card-icons.css`
- `styles/runtime-overrides/10zx-creditors-report-polish.css`
- `styles/runtime-overrides/10zy-cashflow-collection-center-fixes.css`
- `styles/runtime-overrides/10zz-collection-center-basis-badge.css`
- `styles/runtime-overrides/11a-report-basis-badges.css`

### Smart Insight

- `styles/runtime-overrides/11e-smart-insight-redesign.css`
- `styles/runtime-overrides/11f-smart-insight-precise-redesign.css`

## Notes

- Source order was preserved inside each foundation file.
- Old runtime override files were not deleted; only direct imports were replaced.
- Small scoped contract rules were added for overflow safety, focus-visible, RTL text safety, badge nowrap, and card min-width safety.
- The number of direct CSS imports in `index.tsx` is now 69.

## Validation performed

- Checked all CSS files for literal `\\n` sequences.
- Checked CSS brace balance.
- Parsed all CSS files with `tinycss2`; no stylesheet parse errors were reported.
- Build was not run because the extracted project does not include `node_modules`.

## Manual QA checklist

- Notifications page / notification center
- Header notification dropdown if present
- Smart Insight panels
- Debtors report
- Creditors report
- Cashflow report
- Collection center report
- Report basis badges
- Partner capital progress
- Partner Telegram status chips
- People filters on mobile width
- Financial status badges
- Dark mode and light mode
- 1366px, 1280px and mobile widths
