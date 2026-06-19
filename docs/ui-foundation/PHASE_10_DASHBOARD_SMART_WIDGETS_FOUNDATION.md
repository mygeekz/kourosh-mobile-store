# Phase 10 — Dashboard / Smart Widgets Foundation

## Scope

This phase consolidates the dashboard/root panel hotfix chain and adds a small scoped contract for the Dashboard page and smart widgets.

No dashboard API, layout persistence, widget registry, calculations, data fetching, database logic, sales logic, inventory logic, or feature flag logic was changed.

## Files changed

- `index.tsx`
- `styles/system/dashboard-smart-widgets-foundation.css`
- `pages/dashboard/WidgetShell.tsx`
- `pages/dashboard/AddWidgetModal.tsx`
- `docs/ui-foundation/PHASE_10_DASHBOARD_SMART_WIDGETS_FOUNDATION.md`

## Consolidated CSS sources

The following direct imports were replaced with one controlled import:

- `styles/runtime-overrides/03e-sidebar-settings-dashboard-root-fixes.css`
- `styles/runtime-overrides/03f-stable-panels-dashboard-clock.css`

New import:

- `styles/system/dashboard-smart-widgets-foundation.css`

The original source order is preserved inside the new foundation file.

## UI contract additions

The new foundation adds scoped rules for:

- Dashboard page surface tokens
- React-grid-layout placeholder and transition stability
- `dashboard-widget-shell`
- `dashboard-widget-content`
- `dashboard-clock-card`
- Dashboard card manager sections/items
- Quick action links
- Add widget modal header/body/footer/body scroll behavior
- Mobile radius and spacing adjustments

## JSX changes

### `WidgetShell.tsx`

Added a semantic class to the widget content wrapper:

- `dashboard-widget-content`

### `AddWidgetModal.tsx`

Added semantic classes for modal-level CSS control:

- `dashboard-add-widget-modal`
- `dashboard-add-widget-modal__header`
- `dashboard-add-widget-modal__body`
- `dashboard-add-widget-modal__footer`
- `dashboard-add-widget-card`

## Validation performed

- Verified `index.tsx` points to the new dashboard foundation import.
- Verified the removed CSS files are no longer directly imported from `index.tsx`.
- Verified CSS brace balance for the new foundation file.
- Verified basic TSX brace/parenthesis balance for changed TSX files.

Full build was not executed because the uploaded zip does not include `node_modules`.

## Manual QA checklist

- Dashboard page initial load
- Dashboard edit mode
- Drag widgets
- Resize widgets
- Add widget modal
- Search inside add widget modal
- Category chips in add widget modal
- Add a widget
- Remove a removable widget
- Fixed/non-removable widget label
- Smart clock widget
- Dashboard quick action links
- Light mode
- Dark mode
- 1366px width
- 1280px width
- Mobile/narrow width
