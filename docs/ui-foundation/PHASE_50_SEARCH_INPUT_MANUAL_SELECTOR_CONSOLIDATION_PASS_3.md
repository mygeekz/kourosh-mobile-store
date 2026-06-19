# Phase 50 — Search Input Manual Selector Consolidation — Pass 3

Scope: `styles/system/search-input-foundation.css` only.

## Target

Only legacy sidebar fallback selectors were consolidated:

```css
.app-sidebar .ux-sidebar-search__input
.app-sidebar input[aria-label="جستجو در منو"]
.app-sidebar .ux-sidebar-search__icon
.app-sidebar .ux-sidebar-search > i.fa-magnifying-glass
.app-sidebar input[aria-label="جستجو در منو"] + i
```

## Method

Removed older top-level fallback blocks that were later replaced by the final physical-left sidebar search rule in the same file. The final rule was left intact.

Not touched: header search, report search, grid/final sidebar search classes, dark mode, media queries, placeholders, and shared field contracts.

## Result

- Removed blocks: 6
- Removed declarations: 31
- Reduced lines: 52
- Reduced bytes: 1680
- Reduced `!important`: 31

## QA

- CSS files checked: 151
- CSS imports in `index.tsx`: 58
- Missing CSS imports: 0
- Direct runtime imports: 0
- Files with literal `\n`: 0
- Brace balance issues: 0
- CSS parser errors: 0
