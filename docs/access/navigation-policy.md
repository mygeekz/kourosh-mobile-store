# Navigation Policy

Phase 17 makes navigation visibility derive from one shared policy layer instead of each surface filtering routes independently.

## Source of truth

- Route/RBAC policy: `app/routes/routeAccessMatrix.ts`
- Feature route policy: `utils/featureFlags.ts` derived from `routeAccessMatrix` plus feature metadata
- Navigation tree: `constants.tsx` / `SIDEBAR_ITEMS`
- Shared composer: `utils/navigationPolicy.ts`

## Canonical helpers

Use these helpers for navigation-facing UI:

- `canAccessNavigationPath(roleName, featureFlags, path)`
- `canAccessNavigationItem(item, { roleName, featureFlags })`
- `filterNavigationItems(SIDEBAR_ITEMS, { roleName, featureFlags })`
- `filterNavigationFavorites(favorites, { roleName, featureFlags })`

## Updated consumers

- `components/Sidebar.tsx`
- `components/CommandPalette.tsx`
- `components/MobileBottomNav.tsx`
- `components/Header.tsx`

## Rule

Navigation surfaces must not call `canAccessPath` directly anymore unless they are explicitly testing raw route/RBAC behavior. UI visibility should use navigation policy so feature-disabled routes, favorites and quick actions do not drift from route access.

## Audit command

```bash
npm run audit:navigation
```
