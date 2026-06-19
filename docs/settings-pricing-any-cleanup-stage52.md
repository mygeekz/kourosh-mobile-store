# Stage 52 — Settings Pricing/API `any` Cleanup

## Scope

This stage continues from Stage 51 and focuses only on the lower-risk Pricing / AI Pricing data path inside `pages/Settings.tsx`.

## What changed

- Replaced `any[]` pricing learning storage with `PricingLearningItem[]`.
- Typed pricing date helpers with `PricingDateInput` instead of `any`.
- Typed historical pricing learning generation with `PricingLearningItem[]`.
- Added a typed API result shape for `/api/ai/pricing/decision-log`.
- Added typed helpers for extracting and merging pricing learning items:
  - `extractPricingLearningItems`
  - `mergePricingLearningItems`
- Removed `any` from the pricing decision log money/date formatters.
- Typed the pricing decision log `useMemo` as `PricingDecisionLogItem[]`.
- Typed export rows/columns to remove `(row as any)[col.key]` from PDF export.

## Safety notes

- No JSX was changed.
- No CSS was changed.
- No className, copy, layout, button, modal, or handler behavior was changed.
- The Windows-safe Settings import remains explicit: `./settings/index`.
- The `Link` import fix from Stage 45 is preserved.
- The stable Vite launcher and PostCSS warning filter scripts were not modified.

## Validation

- `pages/Settings.tsx` brace/parenthesis/bracket balance is clean.
- `pages/settings/settingsPanelTypes.ts` brace/parenthesis/bracket balance is clean.
- Settings local import audit found no missing local imports.
- The pricing-specific `any` patterns targeted in this stage are no longer present.
