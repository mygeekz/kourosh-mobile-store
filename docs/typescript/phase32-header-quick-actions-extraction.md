# Phase 32 — Header Quick Actions Extraction

`Header.tsx` no longer owns the quick action popover surface. The UI and interaction mechanics now live in `components/header/HeaderQuickActions.tsx`.

The data-fetching effect intentionally remains in `Header.tsx` for this phase so the refactor is structural only and does not alter request timing, interval behavior, event refresh listeners, or feature flag checks.
