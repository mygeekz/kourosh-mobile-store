# Stage 40 — Settings architecture cleanup

## Scope

This stage keeps the stable Stage 30 Vite launcher and all previous Settings panel splits intact, then performs a low-risk architecture cleanup:

1. Extracts pure Settings helpers from `pages/Settings.tsx` into `pages/settings/settingsHelpers.ts`.
2. Adds a Settings panel barrel file at `pages/settings/index.ts`.
3. Replaces the long list of panel imports in `Settings.tsx` with a grouped import from `./settings`.

## Safety contract

- No JSX was intentionally changed.
- No className, text, layout, CSS, handler body, state shape, or component behavior was intentionally changed.
- Helper functions were moved as-is and exported.
- Panel files were not modified.
- `scripts/vite-dev.cjs` and `scripts/postcss-warning-filter.cjs` were not modified.

## Extracted helpers

- Local domain helpers: `normalizeLocalHostname`, `normalizeLocalSuffix`, `buildLocalDomain`
- Pricing date helpers: `toLatinDigits`, `parsePricingDecisionDateFilter`, `normalizePricingDateInput`, `formatPricingDatePreview`
- Settings tab and role helpers: `TabKey`, `PartnerShareStatus`, `canManageStoreOwnershipByRole`, `getRoleLabelFa`, `buildPartnerShareStatus`
- Clock mode helpers: `ClockViewMode`, `CLOCK_VIEW_MODE_OPTIONS`, `loadClockViewMode`, `saveClockViewMode`

## Why this matters

`Settings.tsx` is now closer to an orchestration container: it holds state, effects, and handler wiring, while pure helpers and panel imports live in dedicated files. This reduces future merge conflicts and makes the next extraction stages safer.
