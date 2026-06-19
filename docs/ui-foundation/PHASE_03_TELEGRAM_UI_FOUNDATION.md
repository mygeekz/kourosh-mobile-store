# Phase 03 — Telegram UI Foundation

## Scope
This phase consolidates the main Telegram-specific CSS hotfix chain into a single controlled foundation file:

- `styles/system/telegram-ui-foundation.css`

The change is intentionally conservative. It preserves the exact previous source order from `index.tsx` and does not redesign JSX, API calls, Telegram service logic, or runtime behavior.

## Consolidated files

1. `09a-telegram-settings-foundation.css`
2. `09b-telegram-control-center-monitoring.css`
3. `09c-telegram-template-center-cards.css`
4. `09d1-telegram-studio-filter-controls.css`
5. `09d2-telegram-studio-search-empty-states.css`
6. `09d3-telegram-monitor-title-value-layout.css`
7. `09d4-telegram-studio-cleanup-mini-cards.css`
8. `09d5-telegram-lower-stat-cards.css`
9. `09d6-telegram-lower-mini-cards-search.css`
10. `09d7-telegram-monitor-card-standard.css`
11. `09d8-telegram-monitor-size-placement-contract.css`
12. `09d9-telegram-monitor-anchoring-hotfixes.css`
13. `09e-telegram-accordion-logs-modals.css`

## Files intentionally left in their original cascade location

- `02b-settings-telegram-compact.css`
- `02g-telegram-real-compact-patch.css`
- `03d-legacy-telegram-monitor-patches.css`
- `08b-message-composer-controls.css`
- `10zt-partner-telegram-status-colors.css`

These files are outside the contiguous Telegram block or affect cross-module behavior. Moving them now would increase regression risk.

## What to test

- Settings > Telegram main panel
- Telegram control/operations center
- Telegram monitor cards: icon → title → status ordering
- Telegram template cards
- Telegram Studio filters/search/empty states
- Telegram logs accordion
- Message composer modal and template test modal
- Dark/light mode readability
- Mobile/responsive widths

## Next recommended phase

After this passes manual testing, the next phase should be component-level Telegram Chatbox redesign. That should happen in JSX + scoped CSS, not as another global override patch.
