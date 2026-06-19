# PHASE 53 — Header / Sidebar Manual Selector Consolidation — Pass 2

Scope: `styles/system/header-sidebar-navigation-foundation.css` only.

No JSX, API, route, search logic, notification logic, sidebar collapse logic, database, or business logic changed.

## Target families

- `.header-search-shell`
- `.header-search-input`

## Conservative change

Two late single-purpose blocks were folded into their earlier matching selector blocks:

- `.header-search-shell { min-width: 0 !important; }`
- `.header-search-input { min-width: 0 !important; text-overflow: ellipsis !important; }`

The declarations were preserved, only their duplicate later blocks were removed. The dark-mode selector, media query blocks, search-bar mobile max-width, sidebar search, and dropdown/header action styles were not modified.

## Result

- Blocks removed: 2
- Declarations preserved: 3
- Net reduction: 52 bytes / 6 lines
- `!important` reduction: 0
- Direct runtime-overrides imports: 0

## Test checklist

- Header search shell width and layout
- Header search input ellipsis behavior
- Placeholder and Persian typing in header search
- Header icons/dropdowns
- Sidebar open/collapsed
- Dark/light mode
- 1280, 1366, and mobile widths
