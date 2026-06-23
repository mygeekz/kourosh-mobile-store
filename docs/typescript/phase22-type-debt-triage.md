# Phase 22 — Full TypeScript Debt Triage

## Scope

This phase converts TypeScript cleanup from page-by-page firefighting into auditable buckets. It does not rewrite business logic, report calculations, feature flags, routing, RBAC, storage, or UI behavior.

## What changed

### Structural audit buckets

The following fast TypeScript audit configs were added:

- `config/typescript-audits/tsconfig.type-triage.components.json`
- `config/typescript-audits/tsconfig.type-triage.utils.json`
- `config/typescript-audits/tsconfig.type-triage.hooks.json`
- `config/typescript-audits/tsconfig.type-triage.contexts.json`
- `config/typescript-audits/tsconfig.type-triage.dashboard.json`

The following command was added:

```bash
npm run audit:types:triage
```

This command validates the core structural buckets. Settings and reports still keep their dedicated audit commands:

```bash
npm run audit:settings-types
npm run audit:reports-types
```

## Root-cause fixes applied

- Added `types/react-grid-layout.d.ts` so Dashboard no longer depends on an implicit-any third-party module.
- Added `types/**/*.d.ts` to `tsconfig.json` so local ambient declarations are included consistently.
- Normalized Dashboard loading state to a strict boolean.
- Typed Dashboard layout id normalization instead of allowing implicit-any filter callbacks.
- Aligned Customers installment status comparison with the real `OverallInstallmentStatus` union.
- Updated `components/style/StylePanel.tsx` to the current `StyleContext` contract.
- Fixed `components/Orb.tsx` nullability and listener typing without changing animation behavior.
- Restored missing Sidebar collapsed-flyout pointer handlers and removed dead accent-only variables.
- Corrected `SmsHealthCheckPanel` to import `SmsPatternDef` from the actual exported file.
- Hardened backup schedule parsing against unknown settings payloads.
- Removed safe unused default React imports where the automatic JSX runtime makes them unnecessary.

## Validation commands

Run these after unzip:

```bash
npm run audit:routes
npm run audit:rbac
npm run audit:features
npm run audit:navigation
npm run audit:settings-features
npm run audit:settings-types
npm run audit:reports-types
npm run audit:types:triage
npm run build
```

## Remaining tracked debt

Project-wide `noUnusedLocals` and `noUnusedParameters` cleanup remains intentionally separate. Many old report/demo variables and props are currently unused, and removing them broadly would be higher-risk than this phase allows.

The full route/page import graph is also expensive to typecheck in one shot because the route manifest imports most pages. Route behavior remains covered by route/RBAC/feature/navigation audits, and page type debt should continue by feature bucket.

## Next recommended phase

Phase 23 should target `noUnused` cleanup in a narrow, low-risk bucket, starting with non-report shared components before touching reports or page-root files.
