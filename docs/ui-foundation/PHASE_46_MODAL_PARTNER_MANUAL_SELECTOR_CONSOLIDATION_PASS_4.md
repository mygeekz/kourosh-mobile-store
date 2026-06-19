# Phase 46 — Modal Partner Manual Selector Consolidation — Pass 4

## Scope

Changed only:

```txt
styles/system/modal-partner-foundation.css
```

No JSX, API, database, accounting, payment/receipt logic, Telegram, routes, or business logic was changed.

## Target family

This pass focused on the shared balance/preview-balance card family in the partner payment modal:

```css
.partner-payment-modal--horizontal-no-scroll .people-finance-modal__balance,
.partner-payment-modal--horizontal-no-scroll .partner-payment-modal__preview-balance

.partner-payment-modal--horizontal-no-scroll .people-finance-modal__balance-icon,
.partner-payment-modal--horizontal-no-scroll .partner-payment-modal__preview-balance > span:first-child

.partner-payment-modal--horizontal-no-scroll .people-finance-modal__balance-copy span,
.partner-payment-modal--horizontal-no-scroll .partner-payment-modal__preview-balance span:not(:first-child)

.partner-payment-modal--horizontal-no-scroll .people-finance-modal__balance-copy strong,
.partner-payment-modal--horizontal-no-scroll .partner-payment-modal__preview-balance strong
```

## Conservative consolidation rule

Only declarations were removed when the same property was later reassigned by the same exact top-level selector group.

Kept untouched:

- media query blocks
- dark-mode blocks
- state/color classes such as `--ok`, `--warning`, `--danger`
- account-card placement rules
- single preview-balance status styling
- LTR/number/amount handling
- JSX or class names

## Result

| Metric | Result |
|---|---:|
| declarations removed | 22 |
| empty blocks removed | 1 |
| size reduction | 901 bytes |
| line reduction | 25 lines |
| `!important` reduction | 22 |
| CSS parser errors | 0 |
| literal `\n` issues | 0 |
| missing CSS imports | 0 |
| direct `runtime-overrides` imports | 0 |

## QA notes

The final effective declarations for the balance preview family remain defined by later rules in the same file. This pass only removed earlier overwritten declarations, so the computed end-state should remain unchanged.

## Recommended manual test

- Partner payment/receipt modal
- Current balance card
- After-transaction balance card
- Number + تومان staying on one line
- Preview states: ok / warning / danger if available
- Dark mode / light mode
- widths 1280, 1366, and mobile
