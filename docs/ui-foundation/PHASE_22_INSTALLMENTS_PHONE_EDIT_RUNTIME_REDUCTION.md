# Phase 22 — Installments / Phone Edit Runtime Reduction

## Scope
Moved the remaining installments/phone-edit runtime override out of `styles/runtime-overrides` and into a controlled `styles/system` foundation path.

## Changed
- Replaced `styles/runtime-overrides/10a-installments-phone-edit-overrides.css`
- Added `styles/system/installments-runtime/installments-phone-edit-foundation.css`
- Preserved the exact import position in `index.tsx` to keep cascade order stable.

## Not changed
- No JSX changes
- No API changes
- No installment sale logic changes
- No phone edit logic changes
- No accounting, reporting, database, or Telegram changes

## Test checklist
- Installment sale form
- Installment customer select/combobox
- Phone edit modal/form
- Phone identity/finance/operations edit blocks
- Financial status badges affected by this file
- Header/sidebar/layout around pages using these forms
- Dark/light mode
- 1280/1366/mobile widths
