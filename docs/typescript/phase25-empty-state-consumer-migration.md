# Phase 25 — EmptyState Consumer Migration

## Scope

This phase migrates legacy `EmptyState` JSX consumers from the temporary `text` alias to the canonical `title` prop.

## What changed

- `pages/reports/MobileSalesAnalytics.tsx` now uses `title` for all `EmptyState` instances.
- The `text` alias remains supported inside `components/ui/EmptyState.tsx` as a rollback-safe adapter for any future legacy consumer that may still exist outside the scanned tree.
- A dedicated audit script now prevents new `EmptyState text=` JSX usage from entering the app surface.

## Why the alias remains

The adapter is intentionally retained for one more phase because it is a low-risk compatibility layer. Removing it should happen only after a successful full build and a UI smoke test of reports/empty states.

## Validation

Run:

```bash
npm run audit:empty-state-consumers
npm run audit:ui-props
npm run build
```
