# Phase 25 — Search Input Duplicate Selector Reduction

Scope: `styles/system/search-input-foundation.css` only.

This phase intentionally avoided broad selector rewrites. It removed only exact duplicate CSS rules where the selector group and declarations were identical. Rules with the same selector but different declarations were left untouched because they may be intentional cascade refinements from the previous hotfix chain.

## Changes

- Removed the later duplicate sidebar clear-button rule.
- Removed the later duplicate `sellable-select` menu portal/menu z-index rule pair.
- Preserved all non-identical duplicate selectors for later manual consolidation.

## Metrics

| Metric | Before | After |
|---|---:|---:|
| File size | 69300 bytes | 68919 bytes |
| Lines | 2086 | 2070 |
| `!important` count | 914 | 910 |
| Exact duplicate rule groups | 3 | 0 |
| Extra duplicate occurrences | 3 | 0 |

## Safety rule

Only exact duplicates were removed. Selector groups that appear multiple times with different bodies were not changed.

## Validation

- Missing CSS imports: 0
- CSS parse errors: 0
- Literal `\n` in CSS files: 0
- Brace balance errors: 0

## Recommended test

Test search fields in header, sidebar, reports, people lists, mobile phones, and sellable product selectors.
