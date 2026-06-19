# Phase 49 — Search Input Manual Selector Consolidation — Pass 2

Scope: `styles/system/search-input-foundation.css` only.

## Target

This pass cleaned only the sidebar search grid families:

- `.kourosh-sidebar-search-grid__input`
- `.kourosh-sidebar-search-grid__icon`

## Safety rule

Only declarations were removed when a later top-level rule with the same effective sidebar-search selector already redefined the same property. The following were intentionally left untouched:

- header search selectors
- report/search selectors
- `.app-sidebar .ux-sidebar-search*` fallback selectors
- dark-mode rules
- media-query rules
- data-attribute fallback selectors
- placeholder typography rules

## Result

- Removed declarations: 14
- Removed empty blocks: 0
- `search-input-foundation.css` size: 68223 bytes
- `search-input-foundation.css` lines: 2046
- `!important` count in file: 892
- Direct imports from `styles/runtime-overrides`: 0

## QA

See `PHASE_49_QA_CHECKS.json`.
