# Phase 13 — Settings / Modules / Smart Brain Foundation

Scope: UI-only foundation pass for Settings shell, commercial modules, and Smart Brain / AI feature control surfaces.

## Changed

- Replaced the direct settings shell runtime override import with `styles/system/settings-shell-foundation.css`.
- Merged the contiguous smoke/smartbrain runtime override chain into `styles/system/settings-modules-smart-foundation.css` while preserving import order.
- Added semantic UI classes to `SettingsModulesPanel.tsx` for module hero, runtime cards, commercial plan cards, feature cards, child feature rows, and status chips.
- Added semantic UI classes to `AiFeatureControlPanel.tsx` for Smart Brain shell, header, grid, cards, progress, status chips, signals, and guide blocks.
- Added scoped contracts for settings layout safety, responsive modules grids, toggle alignment, details/summary markers, dark mode, and focus-visible states.

## Not changed

- No settings persistence logic changed.
- No feature flag logic changed.
- No API routes changed.
- No Smart Brain / AI feature toggle behavior changed.
- No Telegram, report, sales, inventory, customer, partner, database, or accounting logic changed.

## Test checklist

- Settings page shell and sidebar.
- Mobile settings tabs.
- Modules tab.
- Save module changes card.
- Runtime summary cards.
- Commercial plan cards.
- Feature category accordions.
- Parent feature toggles.
- Child feature toggles.
- Smart tab / AI feature panel.
- AI feature cards, progress bars, signal cards, and auto-pause blocks.
- Dark mode and light mode.
- Widths: 1366, 1280, tablet, and mobile.
