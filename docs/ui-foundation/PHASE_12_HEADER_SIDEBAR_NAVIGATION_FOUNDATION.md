# Phase 12 — Header / Sidebar / Navigation Foundation

## Scope

This phase consolidates the header, sidebar, layout shell and icon/text layout CSS chain into a single foundation file while preserving the previous cascade order.

## Files consolidated

- `styles/runtime-overrides/10e-header-final-polish.css`
- `styles/runtime-overrides/10f-sidebar-final-polish.css`
- `styles/runtime-overrides/10g-layout-shell-final-qa.css`
- `styles/runtime-overrides/10h-icon-text-layout-contract.css`

## New foundation file

- `styles/system/header-sidebar-navigation-foundation.css`

## Additional hardening

The new foundation adds scoped contracts for:

- Header action icons
- Header search controls
- Sidebar navigation row text overflow
- Sidebar support/contact card
- Focus-visible states
- Mobile header action sizing
- Layout shell min-width safety

## Not changed

No application logic, navigation routes, access control, API calls, theme state, sidebar collapse state, search behavior, notification behavior or dashboard behavior was changed.

## Test checklist

- Header desktop and mobile
- Header search field and quick search button
- Header action icons and dropdowns
- Sidebar expanded mode
- Sidebar collapsed mode
- Sidebar hover and active states
- Sidebar search field
- Sidebar support/contact card
- Dark mode and light mode
- Widths: 1366px, 1280px and mobile
