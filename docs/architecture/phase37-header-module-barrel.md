# Phase 37 — Header Module Barrel + Import Hygiene

## Goal

Turn `components/header/` into a clean internal module surface.

## Changes

- Added `components/header/index.ts`.
- Re-exported header subcomponents, hooks, and type contracts from the barrel.
- Updated `components/Header.tsx` to import all header module members from `./header`.
- Added a guard script to prevent `Header.tsx` from drifting back to direct submodule imports.

## Behavior

No runtime behavior changed.

The phase only changes import shape and module ownership:

- routes unchanged
- RBAC unchanged
- feature flags unchanged
- search behavior unchanged
- quick actions unchanged
- currency behavior unchanged
- profile menu behavior unchanged

## Validation

Run:

```bash
npm run audit:header-barrel
```

Recommended full check:

```bash
npm run audit:routes
npm run audit:rbac
npm run audit:features
npm run audit:navigation
npm run audit:settings-features
npm run audit:unused-imports
npm run audit:header-decomposition
npm run audit:header-quick-actions
npm run audit:header-data-hook
npm run audit:header-search-hook
npm run audit:header-currency-hook
npm run audit:header-final-orchestrator
npm run audit:header-barrel
npm run build
```

## Rollback

If there is an import resolution issue, revert only:

- `components/header/index.ts`
- `components/Header.tsx`
- `scripts/audit-header-barrel.mjs`
- `package.json` script entry
