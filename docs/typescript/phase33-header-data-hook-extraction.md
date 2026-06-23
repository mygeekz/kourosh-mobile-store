# Phase 33 — Header Data Hook Extraction

Phase 33 moves Header quick data and refresh orchestration from `components/Header.tsx` to `components/header/useHeaderQuickData.ts`.

## Why

`Header.tsx` had already been decomposed visually, but it still owned remote data fetching for sales, notifications, due installments, finance pulse, risky customers, refresh intervals, and custom refresh events. That made the component responsible for both UI orchestration and data orchestration.

## Result

- `Header.tsx`: 373 lines
- `useHeaderQuickData.ts`: 254 lines
- Header no longer imports `jalali-moment` or `apiFetch`
- Header no longer contains quick-stat endpoints or quick refresh event listeners
- All quick-action data remains passed into `HeaderQuickActions` through the same prop names

## Risk control

The hook preserves existing endpoint paths, refresh intervals, custom event names, feature checks, and data-shaping logic.
