# Stage 100 — Centralized AppSearchField

Goal:
Stop patch-on-patch CSS conflicts for search fields.

Implemented:
- Created `components/ui/AppSearchField.tsx`.
- Created `styles/components/search-field.css`.
- Migrated key searches to AppSearchField:
  - Customers
  - Partners
  - Reports main
  - RealizedProfitReport documents
  - ModernTableTools
  - TableToolbar
- Removed imports for previous conflicting search override files:
  - 10r-root-search-single-surface-contract.css
  - 10s-root-search-dom-contract-backup.css
  - 10w-search-opposite-and-date-no-focus.css
  - 10x-search-focus-on-box-final.css
  - 10y-search-final-specificity-fix.css

Canonical search contract:
- Icon is always physical-left.
- Text is RTL and right-aligned.
- Input is the only visible box.
- Wrapper is layout-only.
