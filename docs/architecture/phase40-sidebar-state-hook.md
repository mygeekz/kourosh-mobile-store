# Phase 40 — Sidebar State Hook Extraction

The sidebar now has a dedicated navigation-state hook:

```text
components/sidebar/useSidebarNavigationState.ts
```

`components/Sidebar.tsx` remains the composition boundary and consumes extracted modules through the sidebar barrel.

## Ownership

| Concern | Owner |
|---|---|
| Brand/store display | `SidebarBrandBar`, `useSidebarBranding` |
| Search UI | `SidebarSearch` |
| Search state/filter/reset | `useSidebarNavigationState` |
| Favorites UI | `SidebarFavorites` |
| Badge fetch | `useSidebarBadges` |
| Badge aggregation | `useSidebarNavigationState` |
| Row rendering | `SidebarNavTree` |
| Flyout rendering | `SidebarFlyoutPanel` |
| Flyout state/layout | `useSidebarNavigationState` |
| Final composition | `Sidebar.tsx` |

## Rollback
Revert this phase if sidebar search filtering, active-group auto-open, badge aggregation or mini-sidebar flyout positioning regresses.
