# Phase 88 — Settings Users / Account / Business Redesign Pass 1

Scope: Settings internal panels for Account, Business, and Users.

No business logic, API calls, user permissions, role management, save handlers, or routing were changed.

## Changes

- Added scoped semantic classes:
  - `settings-inner-panel-redesign-v1`
  - `settings-account-redesign-v1`
  - `settings-business-redesign-v1`
  - `settings-users-redesign-v1`
- Added a new scoped CSS file:
  - `styles/system/settings-redesign/settings-users-account-business-redesign-pass-1.css`
- Polished account, business, and users surfaces under the existing `settings-redesign-v1` shell.
- Improved form focus states, table readability, user role chips, avatar/logo cards, LTR technical values, dark mode, and responsive density.

## QA checklist

- Settings > Account
- avatar upload area
- password fields and visibility toggle
- Settings > Business
- logo upload area
- store information fields
- ownership warning card if visible
- Settings > Users
- user search
- role filter
- role chips
- users table
- edit/reset/delete actions
- dark/light mode
- widths: 1366, 1280, tablet, mobile
