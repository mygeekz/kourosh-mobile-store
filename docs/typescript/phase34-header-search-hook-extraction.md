# Phase 34 — Header Search Hook Extraction

## Goal
Move Header global-search state, debounce, API fetch, result routing, search history and suggestion orchestration out of `components/Header.tsx` into a focused hook.

## Changed files
- `components/Header.tsx`
- `components/header/useHeaderSearch.ts`
- `components/header/HeaderSearch.tsx`
- `components/header/headerTypes.ts`
- `scripts/audit-header-search-hook.mjs`

## Preserved behavior
- Header search input UI
- command palette shortcut behavior
- mobile search trigger
- global search API endpoint and debounce timing
- search history recording
- related/recent/popular suggestions
- result routing behavior
- header quick actions and data hook
- RBAC, feature flags, route policy and business logic

## Contract
`Header.tsx` now composes the search surface through `useHeaderSearch({ token })` and passes the returned contract to `HeaderSearch`.

`useHeaderSearch.ts` owns:
- `searchQuery`
- `searchFocused`
- global search API state
- recent/popular/related suggestions
- `openGlobalResult`
- `openSearchResultsPage`
- submit handling
- command palette query stashing

## Audit
Run:

```bash
npm run audit:header-search-hook
```

This confirms that `Header.tsx` no longer owns search implementation details and that the search hook remains the source of truth for this behavior.
