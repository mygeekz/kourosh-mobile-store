# Phase 57 — People Table Detail Manual Selector Consolidation — Pass 2

Scope: `styles/system/people-table-detail-foundation.css`.

## Change

Only the customer toolbar search input cleanup block was touched. The later compatibility block for `.people-customers-shell .customers-toolbar__search-input` kept appearance reset and `box-shadow: none`, while duplicate declarations already provided earlier by the primary block were removed:

- `border: none !important`
- `background: transparent !important`
- `outline: none !important`

## Guardrails

The following were intentionally left unchanged because they interact with cascade/media behavior:

- `.people-customers-shell .customers-toolbar`
- `.people-customers-shell .customers-toolbar__inline-strip`
- mobile media rules
- dark-mode rules
- focus-within ring rules
- select wrapper rules

## QA

- CSS import count in `index.tsx`: 58
- Direct `runtime-overrides` imports: 0
- Missing CSS imports: 0
- CSS parse error files: 0
- Literal `\n` CSS files: 0
- Brace balance issue files: 0
