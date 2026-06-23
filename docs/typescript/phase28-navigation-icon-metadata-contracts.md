# Phase 28 — Navigation Icon Metadata Contract Audit

## Goal

This phase separates two icon contracts that were previously easy to confuse:

1. **Shared UI primitive icon props** must remain `ReactNode`-based.
2. **Navigation/report/feature metadata icon fields** may remain FontAwesome class strings because they are registries and data records, not component public APIs.

## What changed

- Added typed metadata contracts in `types/iconMetadata.ts`:
  - `FontAwesomeIconClass`
  - `NavigationIconMetadata`
  - `ReportIconMetadata`
  - `FeatureIconMetadata`
  - `isFontAwesomeIconClass(...)`
- Updated navigation-oriented types to use the metadata contract:
  - `NavItem.icon`
  - `FlatNavItem.icon`
  - `MobileBottomNav` item icons
  - `SidebarItem.icon`
- Updated feature flag metadata to use the metadata contract:
  - `FeatureFlagDefinition.icon`
  - `FEATURE_CATEGORIES.icon`
  - `COMMERCIAL_PLANS.icon`
- Updated report card metadata types:
  - `ReportCardItem.icon`
  - `ActivityItem.icon`
- Added audit script:
  - `scripts/audit-navigation-icon-metadata.mjs`
- Added npm script:
  - `npm run audit:navigation-icons`

## Policy

### Allowed string icon metadata

FontAwesome string classes are allowed in these registry/data surfaces:

- `constants.tsx` sidebar metadata
- `components/MobileBottomNav.tsx` bottom-navigation metadata
- `utils/featureFlags.ts` feature/commercial-plan metadata
- report-local metadata in `pages/reports/**` and `components/reports/**`

### Forbidden public primitive contract

Shared primitives must not expose string icon props. Their public icon boundary should remain `ReactNode`.

Examples:

```tsx
// Allowed
<PageShell icon={<i className="fa-solid fa-chart-line" />} />

// Not allowed
<PageShell icon="fa-solid fa-chart-line" />
```

## Why this phase does not migrate every report icon

Report modules contain many local KPI/action metadata arrays. Migrating all of them to ReactNode in one pass would be high-churn and mostly cosmetic. This phase instead makes the contract explicit and auditable, while preserving report behavior.

## Validation

Run:

```bash
npm run audit:navigation-icons
npm run audit:icons
npm run audit:ui-props
```

