# Phase 56 — People Table Detail Manual Selector Consolidation — Pass 1

Scope: `styles/system/people-table-detail-foundation.css` only.

No JSX, API, database, accounting, transaction, report, Telegram, routing or application logic was changed.

## Consolidated selector families

1. `.partners-page-shell .partners-overview-hero .people-stat-card__meta`
   - Merged two adjacent blocks.
   - Preserved `font-size`, `line-height`, `margin-top`, and `padding-inline-end`.

2. `.partners-table-shell .partner-col-balance`
   - Merged the later non-overlapping `overflow: hidden !important` into the canonical width block.

3. `.partners-table-shell .partner-col-actions`
   - Merged the later non-overlapping `overflow: hidden !important` into the canonical width block.

## Metrics

- Removed/merged blocks: 3
- Byte delta: -166
- Line delta: -5
- `!important` delta: 0

## Safety notes

The pass avoided media queries, dark-mode selectors, active/hover states, grouped selectors with changed meaning, and table action button child selectors.
