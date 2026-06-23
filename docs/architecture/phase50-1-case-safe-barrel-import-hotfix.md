# Phase 50.1 — Case-Safe Barrel Import Hotfix

## Problem

A runtime error appeared in Vite/dev mode:

```text
Uncaught SyntaxError: The requested module '/components/Header.tsx' does not provide an export named 'HeaderProfileMenu'
```

## Root Cause

Some shell compatibility files had the same name as their extracted module folders with different casing, for example:

```text
components/Header.tsx
components/header/index.ts
```

The import in `components/Header.tsx` used:

```ts
from './header'
```

On case-insensitive filesystems or certain dev-server resolution paths, this can resolve to `Header.tsx` instead of the `header/` directory barrel. That makes Vite request `/components/Header.tsx` for exports that only exist in `components/header/index.ts`.

## Fix

All same-name shell module imports now use explicit `/index` paths:

```ts
from './header/index'
from './main-layout/index'
from './sidebar/index'
from './command-palette/index'
from './mobile-bottom-nav/index'
```

## Files Patched

- `components/Header.tsx`
- `components/MainLayout.tsx`
- `components/Sidebar.tsx`
- `components/CommandPalette.tsx`
- `components/MobileBottomNav.tsx`
- related audit scripts

## Regression Guard

Added:

```bash
npm run audit:case-safe-imports
```

This audit is also included in:

```bash
npm run audit:shell
```

## Behavior

No business logic, route, RBAC, feature flag, visual style, storage or API behavior was intentionally changed.
