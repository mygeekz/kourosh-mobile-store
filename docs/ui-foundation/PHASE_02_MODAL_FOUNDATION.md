# UI Foundation Phase 02 — Modal / Overlay Foundation

## Scope
This phase is intentionally conservative. It does not redesign modals and does not change React logic.
It consolidates modal-related CSS hotfix chains that were already imported in contiguous order or were tightly related to the same modal family.

## New foundation files

- `styles/system/modal-people-foundation.css`
  - Consolidates people add/edit modal overrides and people finance transaction modal overrides.

- `styles/system/modal-products-foundation.css`
  - Consolidates product modal precision, responsive, and Apple-style redesign passes.

- `styles/system/modal-partner-foundation.css`
  - Consolidates partner payment/ledger modal passes, central sidebar-safe modal/overlay safety, date-source tooltip fix, and balance no-wrap fixes.

## Why this was done
The project had a long modal hotfix chain in `index.tsx`, especially around partner payment modals and sidebar-safe overlays. Keeping these chains as scattered runtime imports makes future UI work risky.

This phase creates clearer control points while preserving the original source order inside each foundation file.

## What was not changed

- No API logic changed.
- No backend/server code changed.
- No modal JSX logic changed.
- No component props changed.
- No CSS selectors were rewritten or deleted in this phase.
- Single modal-related files that are not part of a safe contiguous chain were left untouched to avoid cascade drift.

## Test checklist

1. Partner detail page
   - Open payment/receipt modal.
   - Confirm modal is visually centered/safe from sidebar.
   - Confirm current balance and after-transaction balance are in one line and do not wrap badly.
   - Confirm transaction type tag has spacing from the title.
   - Confirm the blue balance-after icon is centered in its square.

2. Partner ledger modal/table
   - Confirm ledger rows, system ID, IMEI, date/source chips remain aligned.

3. Customer/Partner add/edit modals
   - Open create/edit modals.
   - Confirm fields, icons, spacing, footer actions and responsiveness are unchanged.

4. Product modals
   - Open product/category/supplier-related modals.
   - Confirm layout, responsive sizing, and dark/light mode are unchanged.

5. Global overlay safety
   - Check large drawers, quick search/command surfaces, and modal overlays do not slide under the right sidebar.

## Next recommended phase
Phase 03 should target Telegram UI Foundation, because the Telegram panel still has multiple separate CSS passes and is the most visually dense settings area.
