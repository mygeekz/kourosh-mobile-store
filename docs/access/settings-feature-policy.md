# Settings Feature Toggle Policy

Phase 18 aligns the Settings → Commercial Modules panel with the same access-policy stack used by routes, RBAC, feature flags and navigation.

## Source of truth

- Route impact: `app/routes/routeAccessMatrix.ts` through `utils/featureFlags.ts` / `featureAccessPolicyByKey`
- Navigation impact: `FEATURE_FLAGS.navIds` through `utils/featureFlags.ts`
- Settings-tab impact: `utils/settingsFeaturePolicy.ts` / `settingsTabFeatureRequirements`
- API/runtime impact: `utils/settingsFeaturePolicy.ts` / `apiGuardedFeatureKeys`

## Why this exists

Before this phase, `pages/Settings.tsx` owned local policy fragments for settings tabs and API-guarded module badges. That made the Settings module page a second policy source beside route and navigation policy.

After this phase, the page consumes `utils/settingsFeaturePolicy.ts` and only renders the current policy. Route/menu/settings/API impact can now be audited from one layer.

## Admin UX behavior

Each feature card now explains what toggling the module affects:

- menu entries
- route/page access
- settings tabs
- server/API guarded runtime surfaces

This makes destructive module disabling clearer for admins before they save changes.

## Audit command

```bash
npm run audit:settings-features
```

Recommended full access-policy gate:

```bash
npm run audit:routes
npm run audit:rbac
npm run audit:features
npm run audit:navigation
npm run audit:settings-features
npm run build
```
