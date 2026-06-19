# Stage 48 — Settings Pricing props type cleanup

## Scope

This stage continues the Settings refactor from Stage 47 and focuses only on the Pricing / AI Pricing panel prop contract.

## Changed files

- `pages/settings/settingsPanelTypes.ts`
- `pages/settings/SettingsPricingPanel.tsx`

## What changed

- Replaced Pricing-related `any` fields in `SettingsPricingPanelProps` with explicit lightweight models.
- Added typed filter unions for pricing decision filters.
- Added typed models for pricing learning stats, decision-log rows, tone metadata, advisor cards, advisor state, and pricing settings.
- Removed the remaining `as any` casts from `SettingsPricingPanel.tsx`.
- Imported Pricing filter/type aliases into `SettingsPricingPanel.tsx` as type-only imports.

## Safety notes

- No JSX structure was changed.
- No CSS, `className`, copy, layout, button, handler ownership, or UI/UX behavior was changed.
- Existing state and business logic remain owned by `pages/Settings.tsx`.
- The Windows-safe Settings barrel import remains explicit: `./settings/index`.
- The previous `Link` import fix remains intact.

## Validation

- `Settings.tsx` transpile check passed.
- `SettingsPricingPanel.tsx` transpile check passed.
- `settingsPanelTypes.ts` transpile check passed.
- `scripts/vite-dev.cjs` syntax check passed.
- `scripts/postcss-warning-filter.cjs` syntax check passed.
- `SettingsPricingPanel.tsx` has no remaining `as any` / `: any` casts.
