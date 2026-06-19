# Phase 42 — Telegram Manual Selector Consolidation — Pass 6

Scope: `styles/system/telegram-ui-foundation.css` only.

Targets:

- `#telegram-settings-form .telegram-monitor-v2-action__label`
- `#telegram-settings-form .telegram-monitor-v2-action__value`

No JSX/API/database/Telegram service logic was changed.

## Method

Only top-level, exact single-selector blocks were considered. A declaration was removed only when the same property was assigned again later by the exact same selector. Grouped selectors, media queries, dark-mode selectors, child selectors, and LTR-specific selectors were not modified.

## Result

| Metric | Value |
|---|---:|
| Declarations removed | 97 |
| Empty blocks removed | 5 |
| Bytes before | 171971 |
| Bytes after | 168517 |
| Lines before | 5544 |
| Lines after | 5439 |
| `!important` before | 1905 |
| `!important` after | 1808 |

## Removed by selector

```json
{
  "#telegram-settings-form .telegram-monitor-v2-action__label": 42,
  "#telegram-settings-form .telegram-monitor-v2-action__value": 55
}
```

## QA notes

- CSS parser should pass after this phase.
- No direct import from `styles/runtime-overrides` should exist.
- This pass should be tested in Settings > Telegram monitor cards, especially label/value text alignment and LTR values.
