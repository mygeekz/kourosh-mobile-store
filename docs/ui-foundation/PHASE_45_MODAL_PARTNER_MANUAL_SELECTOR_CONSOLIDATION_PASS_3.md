# Phase 45 — Modal Partner Manual Selector Consolidation — Pass 3

Scope: `styles/system/modal-partner-foundation.css` only.

This pass focused on the balance text family inside the partner payment/receipt modal:

- `.partner-payment-modal--horizontal-no-scroll .people-finance-modal__balance-copy`
- `.partner-payment-modal--horizontal-no-scroll .people-finance-modal__balance-copy strong`
- `.partner-payment-modal--horizontal-no-scroll .people-finance-modal__balance-copy small`

## Safety rule

Only top-level exact-selector declarations were removed when the same property was assigned again later by the same exact selector. Grouped selectors, media queries, dark-mode selectors, preview-balance selectors, and state selectors were left untouched.

## Result

- Removed declarations: 13
- Removed empty blocks: 2
- Size delta: -587 bytes
- Line delta: -19
- Runtime override imports: 0
- Missing CSS imports: 0
- CSS parser errors: 0
- Literal `\n` CSS files: 0

## Test checklist

- Partner payment/receipt modal
- Current balance card
- Balance text/title/amount
- Before/after balance cards
- Amount staying on one line with تومان
- Dark mode / light mode
- 1280 / 1366 / mobile widths
