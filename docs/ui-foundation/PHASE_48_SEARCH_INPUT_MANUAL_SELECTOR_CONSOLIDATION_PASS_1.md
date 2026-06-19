# Phase 48 — Search Input Manual Selector Consolidation — Pass 1

Scope: `styles/system/search-input-foundation.css` only.

No JSX, API, database, route, report, Telegram, sales or business logic was changed.

## Targeted selector family

- `.header-search-submit`
- `.header-search-input`

## What changed

The early header search submit/input blocks were removed because the same selectors are declared later with the same or stronger final declarations. To keep the computed final style stable, these declarations from the early `.header-search-input` block were preserved in the later block:

```css
text-align: right !important;
direction: rtl !important;
```

## Result

- Removed blocks: 2
- Removed declarations: 6
- Search foundation size: 68705 bytes
- Search foundation lines: 2060
- `!important` count in search foundation: 906
- Direct `runtime-overrides` imports in `index.tsx`: 0

## QA

- CSS parser errors: 0
- Missing CSS imports: 0
- Textual `\n` CSS files: 0
- Brace issues: 0

## Suggested manual tests

- Header search input
- Header search submit/magnifier button
- Header search placeholder and RTL text
- Sidebar search
- Report search
- Dark/light mode
- 1280/1366 widths and mobile
