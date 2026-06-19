# Phase 87 — Settings General / Modules Final Polish

Scope: general Settings shell, sidebar, mobile tabs, workspace, modules panel and Smart Brain panel.

No API, database, feature flags, module persistence, Telegram service, routing, or business logic was changed.

## Changes

- Added `settings-redesign-v1` scope to the main Settings shell.
- Added scoped CSS: `styles/system/settings-redesign/settings-general-modules-final-polish.css`.
- Polished Settings sticky command bar, sidebar, workspace surface, mobile tabs, module cards and Smart Brain cards.
- Improved focus-visible states, responsive density, dark/light consistency, and LTR safety for technical values.
- Cleaned two visible status strings: `ذخیره شده` and `تغییرات ذخیره‌نشده`.

## QA checklist

- Settings root page
- Account / Business / Style tabs
- Modules tab
- Smart Brain tab
- Settings sidebar active/hover states
- Mobile settings tabs
- Save/revert buttons
- Dark/light mode
- 1366, 1280, tablet and mobile widths
