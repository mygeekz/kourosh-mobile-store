# Phase 38 — Telegram Manual Selector Consolidation — Pass 2

Scope: `styles/system/telegram-ui-foundation.css` only.

## What changed

Consolidated the `telegram-plain-field-heading__text` family. The earlier block was removed and the effective final declarations were preserved in the later Telegram studio field contract.

## Preserved computed style

- `min-width: 0`
- light color `rgb(15, 23, 42)`
- dark color `rgb(248, 250, 252)`
- final `font-size: 13px`
- final `line-height: 1.5`
- `font-weight: 950`

## Safety approach

Only this selector family was touched. No JSX, API, service, route, or application logic changed. Selectors with body differences outside this family were left untouched.

## Metrics

- File: `styles/system/telegram-ui-foundation.css`
- Size: 179196 bytes
- Lines: 5782
- `!important`: 2076
- `telegram-plain-field-heading__text` occurrences after consolidation: 2

## QA checks

- CSS parser errors: 0
- textual `\n` files: 0
- brace balance problems: 0
- missing CSS imports: 0
- runtime-overrides imports: 0
