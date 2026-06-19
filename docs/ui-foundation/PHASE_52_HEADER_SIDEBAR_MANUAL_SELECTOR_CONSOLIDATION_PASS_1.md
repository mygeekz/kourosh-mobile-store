# Phase 52 — Header / Sidebar Manual Selector Consolidation — Pass 1

Scope: `styles/system/header-sidebar-navigation-foundation.css`

## What changed

Two top-level `:root` blocks were consolidated into one. This is intentionally conservative: both blocks only define CSS custom properties and their variable names did not overlap, so the computed token values remain unchanged.

## Why other repeated selectors were not changed

Repeated selectors such as `.header-premium-shell`, `.header-search-shell`, `.header-search-input`, `.app-sidebar`, `.sidebar-support-*`, and `.sidebar-nav-row` contain non-overlapping properties or layout-sensitive declarations. They were left untouched to avoid changing cascade behavior around header/sidebar layout.

## Result

- Removed blocks: 1 `:root` block
- Removed bytes: -59
- Removed lines: -1
- Runtime override imports: 0
- JSX/API/business logic changes: none

## Test checklist

- Header desktop/mobile
- Header search
- Header icon actions and dropdowns
- Sidebar expanded/collapsed
- Sidebar navigation active/hover state
- Sidebar support card/link
- Dark mode / light mode
- 1280px / 1366px / mobile widths
