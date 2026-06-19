# Phase 01 — Search/Input Foundation

## Scope
Only UI/CSS foundation for search inputs was changed. No business logic, API, database, Telegram service, reports logic, or sales logic was modified.

## What changed
1. Consolidated the search hotfix import chain into one controlled foundation file:
   - New file: `styles/system/search-input-foundation.css`
   - Replaces these direct imports in `index.tsx`:
     - `styles/runtime-overrides/10j-search-affix-contract.css`
     - `styles/runtime-overrides/10k-search-input-unification.css`
     - `styles/runtime-overrides/10l-search-position-hardening.css`
     - `styles/runtime-overrides/10m-sidebar-search-left-final.css`
     - `styles/runtime-overrides/10n-sidebar-search-physical-opposite.css`
     - `styles/runtime-overrides/10o-sidebar-search-grid-no-overlap.css`
     - `styles/runtime-overrides/10p-single-surface-search-system.css`
     - `styles/runtime-overrides/10q-reports-search-left-final.css`
     - `styles/components/search-field.css`
     - `styles/runtime-overrides/10z-app-search-field-layout-compat.css`

2. Preserved the old cascade order inside the new foundation file to reduce regression risk.

3. Fixed a UI typo in `components/Header.tsx`:
   - Replaced invalid `preview="..."` on the header search input with `placeholder="..."`.

## Why this phase is intentionally conservative
The project has many search-related CSS hotfixes that affect sidebar, header, reports, people pages, and AppSearchField. This phase reduces import fragmentation without deleting the legacy source files yet. After testing, the next phase can remove or simplify duplicated selectors safely.

## Manual test checklist
- Header global search: placeholder visible, text does not overlap the magnifier, dropdown still opens.
- Sidebar menu search: icon stays on the physical left, RTL text stays right-aligned, no clear button overlaps text.
- Reports search fields: icon and text spacing remain correct.
- Customers/Partners list search: width/responsiveness still correct.
- Dark mode: search borders/background/icons remain readable.
