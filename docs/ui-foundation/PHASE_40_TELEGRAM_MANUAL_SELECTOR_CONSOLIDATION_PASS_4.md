# Phase 40 — Telegram Manual Selector Consolidation — Pass 4

Scope: `styles/system/telegram-ui-foundation.css`

Target selector:

```css
#telegram-settings-form .telegram-monitor-v2-action
```

This pass only removed earlier declarations when the same property was reassigned later by the exact same selector. Grouped selectors, media rules, child selectors, and related monitor selectors were intentionally left untouched.

## Result

- Removed declarations: 72
- Removed empty blocks: 9
- Bytes reduced: 3082
- Lines reduced: 99
- `!important` reduced: 72

## QA

- CSS parser error files: 0
- Missing CSS imports: 0
- Direct runtime-overrides imports: 0
- Literal `\n` CSS files: 0
- Brace balance issues: 0
