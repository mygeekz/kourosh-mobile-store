# Phase 23 — Partner Phone Capital Runtime Reduction

## Scope
This phase moves the final direct `runtime-overrides` CSS import into the controlled `styles/system` area while preserving its original cascade position.

## Changed
- Replaced `styles/runtime-overrides/10zk-partner-phone-capital-solid-reset.css` import in `index.tsx` with:
  - `styles/system/partner-runtime/partner-phone-capital-solid-reset-foundation.css`

## Safety constraints
- No JSX changes.
- No business logic changes.
- No API, database, reporting, accounting, sales, partner, or Telegram logic changes.
- CSS content was copied as-is to preserve behavior.
- Import position was kept in the same location in `index.tsx`.

## Test checklist
- Partner detail page.
- Partner phone/capital section.
- Partner ledger and capital cards.
- IMEI / system IDs / LTR numeric values.
- Light and dark theme.
- 1280px, 1366px, and mobile widths.
