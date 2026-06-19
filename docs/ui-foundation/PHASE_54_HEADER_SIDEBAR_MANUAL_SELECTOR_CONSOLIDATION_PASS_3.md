# Phase 54 — Header / Sidebar Manual Selector Consolidation — Pass 3

Scope: `styles/system/header-sidebar-navigation-foundation.css` only.

## Target families

- `.app-sidebar .sidebar-support-shell`
- `.app-sidebar .sidebar-support-link`

## Change summary

This pass consolidated two small support-card/sidebar support selector families. Later standalone blocks were removed only after their effective declarations were moved into the first matching selector block.

Preserved declarations:

```css
.app-sidebar .sidebar-support-shell {
  flex-shrink: 0;
}

.app-sidebar .sidebar-support-link {
  color: var(--app-nav-text) !important;
  text-decoration: none !important;
}
```

## Guardrails

- No JSX changed.
- No route, API, search, notification, collapse, or sidebar logic changed.
- Hover, focus-visible, dark-mode, media-query, collapsed sidebar rules were left untouched.
- Only standalone duplicate selector blocks with non-conflicting declarations were consolidated.

## QA

- CSS imports in `index.tsx`: 58
- Direct `runtime-overrides` imports: 0
- Missing CSS imports: 0
- Literal `\n` CSS issues: 0
- Brace balance issues: 0
- CSS parser errors: 0

## Test checklist

- Sidebar support/contact card
- Sidebar support/contact link hover
- Sidebar collapsed mode
- Sidebar active/hover nav rows
- Header search, for regression check
- Dark mode / light mode
- 1280, 1366, and mobile widths
