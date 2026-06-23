# Phase 46 — Command Palette Final Orchestrator Boundary

`components/CommandPalette.tsx` should only compose the Command Palette module.

## Canonical Responsibilities

| File | Responsibility |
|---|---|
| `components/CommandPalette.tsx` | Final composition/orchestration |
| `useCommandPaletteState.ts` | query, active index, refs, focus restore, keyboard state primitives |
| `useCommandPaletteDataSearch.ts` | `/api/search` debounce, fetch, abort, loading/error/data state |
| `useCommandPaletteResults.ts` | sidebar filtering, query processing, suggestions, nav/data result composition |
| `useCommandPaletteActions.ts` | navigation access checks, recordSearch, route dispatch, favorite dispatch |
| `CommandPalette*` rendering components | Visual rendering only |

## Forbidden in `CommandPalette.tsx`

- direct `SIDEBAR_ITEMS` access
- direct `processQuery` usage
- direct `/api/search` fetch ownership
- direct `recordSearch` dispatch
- direct `canAccessNavigationPath` checks
- direct data action path resolution
- derived result memoization

## Why

This prevents Command Palette from becoming another navigation-adjacent mega component and keeps search, policy, rendering, and dispatch behavior independently auditable.
