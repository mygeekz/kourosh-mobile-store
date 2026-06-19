# Stage 60 — Root Icon/Text/Badge Layout Contract

## Problem
Across the project, several RTL controls used icons, clear buttons, dropdown indicators, or numeric badges without a stable spacing contract. This allowed text to slide under icons in sidebar search, PageKit search, react-select controls, and filter chips.

## Fix
Added a late runtime override:

`styles/runtime-overrides/10h-icon-text-layout-contract.css`

The file establishes global layout invariants for:

- sidebar navigation rows
- sidebar search input
- generic RTL inputs with absolute icons
- PageKit / report search controls
- filter chips and numeric count badges
- compact pills/badges that combine icon + text
- sales react-select item selector

## Safety
The change is CSS-contract based and imported after all existing runtime overrides. It does not change business logic, routes, handlers, or labels.

`SellableItemSelect.tsx` also received `classNamePrefix="sellable-select"` and matching react-select style slots so the sales selector reserves a safe right-side action lane.
