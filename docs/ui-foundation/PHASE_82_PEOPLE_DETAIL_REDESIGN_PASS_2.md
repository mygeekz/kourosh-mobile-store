# Phase 82 — Partner / Customer Detail Redesign Pass 2

Scope: ledger timeline, transaction tables, expanded rows, ledger actions, finance chips, and RTL/LTR polish for PartnerDetail and CustomerDetail.

No API, database, accounting, balance calculation, payment/receipt flow, Telegram, route, or report logic was changed.

## Files changed

- `pages/CustomerDetail.tsx` — fixed one native input `preview` attribute to `placeholder`.
- `index.tsx` — added scoped CSS import.
- `styles/system/people-detail-redesign/people-detail-redesign-pass-2.css` — scoped visual redesign for ledgers only.

## QA checklist

- Partner detail ledger table and expanded rows
- Customer detail ledger table and expanded rows
- Ledger timeline cards
- Ledger search/filter controls
- Finance action buttons
- IMEI/system IDs and LTR numeric values
- Dark/light mode
- 1366, 1280, tablet and mobile widths
