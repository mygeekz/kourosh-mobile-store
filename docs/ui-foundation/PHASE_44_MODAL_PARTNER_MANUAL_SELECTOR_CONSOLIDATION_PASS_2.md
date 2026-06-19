# Phase 44 — Modal Partner Manual Selector Consolidation — Pass 2

Scope: `styles/system/modal-partner-foundation.css` only.

This pass consolidated the `people-ledger-type-card` family inside the horizontal partner payment modal. No JSX, API, accounting, Telegram, routing, database, or business logic was changed.

## Targeted selectors

- `.partner-payment-modal--horizontal-no-scroll .people-ledger-type-card`
- `.partner-payment-modal--horizontal-no-scroll .people-ledger-type-card__icon`
- `.partner-payment-modal--horizontal-no-scroll .people-ledger-type-card__copy strong`
- `.partner-payment-modal--horizontal-no-scroll .people-ledger-type-card__copy small`
- `.partner-payment-modal--horizontal-no-scroll .people-ledger-type-card__check`
- `.partner-payment-modal--horizontal-no-scroll .people-ledger-type-card__icon i`
- `.partner-payment-modal--horizontal-no-scroll .people-ledger-type-card__check i`

## Safety rules

Only a declaration was removed when all of the following were true:

1. It was inside a single-selector top-level block.
2. The same selector appeared later with the same property.
3. The later declaration had enough cascade strength to replace it: same `!important` status for important declarations, or any later declaration for non-important declarations.
4. The declaration was not inside `@media`, dark-mode, grouped selectors, active states, or child selectors outside the chosen scope.

## Result

- Removed declarations: 65
- Removed empty blocks: 16
- Lines before: 3754
- Lines after: 3657
- `runtime-overrides` imports: 0
- Missing CSS imports: 0
- CSS parser errors: 0
- Literal `\n` issues: 0
- Brace balance issues: 0

## Test checklist

- Partner payment/receive modal
- Transaction type cards
- Card icon, title, small description, and check indicator
- Active/inactive type card states
- Current balance / after-transaction balance
- Dark mode / light mode
- Widths 1280, 1366, and mobile
