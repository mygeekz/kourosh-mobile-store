# Phase 38 — Sidebar Module Decomposition

The sidebar now has a dedicated module boundary under `components/sidebar`.

## Extracted module members

- `SidebarBrandBar`
- `SidebarSearch`
- `SidebarFavorites`
- `SidebarSupport`
- `useSidebarBranding`
- `useSidebarBadges`
- `useSidebarSearchReset`

## Contract

`components/Sidebar.tsx` remains the navigation orchestrator. It owns the active row logic, route open state, flyout positioning, and row rendering. The extracted module owns stable sub-surfaces and runtime side effects that were previously embedded inside the sidebar component.

## Why this phase is intentionally conservative

The row renderer and mini-sidebar flyout are the riskiest part of the sidebar. They were intentionally left in place so this phase only reduces independent responsibilities without changing navigation behavior.
