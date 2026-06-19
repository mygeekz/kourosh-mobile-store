# Phase 41 — Telegram Manual Selector Consolidation — Pass 5

Scope: `styles/system/telegram-ui-foundation.css` only.

Focused selectors:

- `#telegram-settings-form .telegram-monitor-v2-action__icon`
- `#telegram-settings-form .telegram-monitor-v2-action__state`

Method: conservative property-level consolidation. Only declarations inside exact single-selector blocks were removed, and only when the same property was later redefined by a top-level block containing the same selector. Grouped selector blocks, media queries, child selectors, and dark-mode blocks were left untouched.

## Result

| Metric | Value |
|---|---:|
| Removed declarations | 93 |
| Removed empty blocks | 8 |
| Size before | 175466 bytes |
| Size after | 171971 bytes |
| Lines before | 5666 |
| Lines after | 5544 |
| `!important` before | 1998 |
| `!important` after | 1905 |
| CSS parser errors | 0 |
| Missing CSS imports | 0 |
| Direct runtime imports | 0 |

## Removed by selector

```json
{
  "#telegram-settings-form .telegram-monitor-v2-action__icon": 46,
  "#telegram-settings-form .telegram-monitor-v2-action__state": 47
}
```

## Removed by property

```json
{
  "width": 6,
  "height": 6,
  "min-width": 6,
  "border-radius": 8,
  "min-height": 6,
  "padding": 6,
  "font-size": 5,
  "display": 3,
  "align-items": 3,
  "justify-content": 2,
  "align-self": 9,
  "gap": 1,
  "max-width": 3,
  "white-space": 3,
  "overflow": 1,
  "text-overflow": 1,
  "grid-column": 6,
  "justify-self": 8,
  "grid-row": 4,
  "border": 1,
  "background": 1,
  "color": 1,
  "line-height": 3
}
```

## Safety notes

- No JSX, API, Telegram service, database, route, queue, or settings logic changed.
- Grouped blocks such as setup-card shared selectors were not edited.
- `@media` blocks were not edited.
- Dark-mode blocks were not edited.
- The final top-level declarations for icon/state remain in the cascade.
