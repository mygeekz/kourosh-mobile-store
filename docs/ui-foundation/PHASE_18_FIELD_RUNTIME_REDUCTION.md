# Phase 18 — Field Runtime Reduction

## Scope

This phase reduces direct `runtime-overrides` imports for the first safe field/form-related group while preserving cascade order.

## Changes

Moved these imports out of `styles/runtime-overrides`:

- `01b-people-foundation-after-fields.css` → `styles/system/legacy-quarantine/field-form-after-primitives-foundation.css`
- `08e-finance-modal-polish.css` → `styles/system/finance-modal-field-polish-foundation.css`
- `10i-bidi-text-contract.css` → `styles/system/bidi-text-contract-foundation.css`

## Guardrails

- No JSX behavior was changed.
- No API, database, routing, accounting, Telegram, report, sales or inventory logic was changed.
- Selectors were preserved.
- CSS order in `index.tsx` was preserved at the same cascade positions.
- This is a migration step, not a visual redesign.

## Remaining direct runtime imports

The remaining direct runtime imports were intentionally left in place because they are more page-specific or cascade-sensitive and need separate contracts before removal.
