# Phase 42 — MainLayout Barrel + App Shell Boundary Audit

## Purpose

Phase 42 formalizes the application shell boundary after the Header, Sidebar, and MainLayout decomposition passes.

The shell is now treated as a composition layer, not a place for page-level business logic.

## Public Shell Entry

Use this module when app-level routing or bootstrap code needs shell components:

```ts
import { MainLayout } from '../../components/shell';
```

Shell public exports live in:

```text
components/shell/index.ts
```

Current public shell exports:

- `MainLayout`
- `Header`
- `Sidebar`
- `MobileBottomNav`

## Boundary Rules

### Allowed shell responsibilities

- app layout composition
- navigation shell wiring
- route outlet placement
- desktop/mobile sidebar orchestration
- header/sidebar/mobile-bottom-nav composition
- command palette shortcut wiring

### Forbidden shell responsibilities

- page-level data fetching
- sales/report/settings business logic
- route policy duplication
- feature flag duplication
- direct page imports
- hardcoded role policy outside route/navigation policy utilities

## Current Boundary Shape

```text
components/
├─ shell/
│  └─ index.ts
├─ MainLayout.tsx
├─ Header.tsx
├─ Sidebar.tsx
├─ MobileBottomNav.tsx
├─ main-layout/
├─ header/
└─ sidebar/
```

`app/routes/AppRoutes.tsx` imports the shell through `components/shell`, which makes the shell boundary explicit from the route layer.

## Why this matters

Future page-level code should not leak into Header, Sidebar, MobileBottomNav, or MainLayout. Any new shell behavior should be added as one of:

1. a shell hook
2. a shell subcomponent
3. a documented policy utility
4. a route/navigation matrix entry

## Validation

Run:

```bash
npm run audit:shell-boundary
```
