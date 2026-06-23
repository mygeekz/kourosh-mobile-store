# Phase 47 — MobileBottomNav Decomposition

## Goal
`MobileBottomNav` was the final shell-adjacent navigation surface that still carried metadata, access checks, active-state rendering, primary action rendering, and shell markup in one file.

This phase decomposes it into a small mobile-bottom-nav module while preserving behavior.

## Files Added

```text
components/mobile-bottom-nav/
├─ MobileBottomNav.tsx
├─ MobileBottomNavActivePill.tsx
├─ MobileBottomNavItemLink.tsx
├─ MobileBottomNavMenuButton.tsx
├─ MobileBottomNavPrimaryAction.tsx
├─ MobileBottomNavShell.tsx
├─ index.ts
├─ mobileBottomNavItems.ts
├─ mobileBottomNavLabels.ts
├─ mobileBottomNavTypes.ts
└─ useMobileBottomNavigation.ts
```

## Compatibility File

```text
components/MobileBottomNav.tsx
```

This file remains as a thin compatibility export so existing imports do not break.

## Behavior Preserved

- Mobile bottom nav visibility remains role/feature-policy aware.
- Quick sale still navigates to `/sales/cash`.
- Quick sale remains disabled when the user lacks access.
- Active route state still uses the same pathname matching.
- Active pill animation still uses the same `layoutId`.
- Safe-area mobile shell remains intact.
- Menu button still calls `onMenuClick`.

## New Audit

```bash
npm run audit:mobile-bottom-nav
```

The audit verifies:

- module files exist,
- the legacy root export remains compatible,
- mobile nav access checks are owned by `useMobileBottomNavigation`,
- rendering is owned by small components,
- FontAwesome icons still use the canonical renderer,
- orchestrator line count remains low.

## Risk

Low. This is a decomposition-only change. Navigation policy, route paths, feature flags, business logic, storage, and CSS tokens were not changed.
