# Phase 14 — Products / Services / Repairs Foundation

Scope: UI-only consolidation for operational product, service, inventory and repair screens.

## Changed

- Added `styles/system/products-services-repairs/products-ui-foundation.css`.
  - Preserves the prior order of:
    - `styles/runtime-overrides/07d-product-category-supplier-management.css`
    - `styles/runtime-overrides/07e-product-list-table-density.css`
  - Adds scoped contracts for product tables, management panels, modal fields, row actions, numeric cells and responsive table overflow.

- Added `styles/system/products-services-repairs/services-inventory-foundation.css`.
  - Preserves the prior service/inventory polish rules from:
    - `styles/runtime-overrides/02d-services-inventory-polish.css`
  - Adds scoped contracts for services surfaces, inputs, tables, numeric values and mobile stacking.

- Added `styles/system/products-services-repairs/repairs-ui-foundation.css`.
  - Preserves the prior repair polish rules from:
    - `styles/runtime-overrides/02c-repairs-apple-commercial.css`
  - Adds scoped contracts for repair list/detail surfaces, repair tables, repair mobile cards, status pills and mobile layout.

- Updated `index.tsx` to import these three foundation files instead of the previous direct runtime override imports.

## Not changed

- No API changes.
- No database changes.
- No product/service/repair business logic changes.
- No pricing, stock, accounting, warranty or repair status logic changes.
- No JSX structural rewrite.

## QA notes

- CSS files were checked for literal `\\n` sequences.
- CSS parse errors were checked with `tinycss2`.
- Basic brace balance was checked across `styles/**/*.css`.
- A real Vite build was not run because `node_modules` is not available in the zip environment.

## Suggested manual test checklist

- Products list and product table actions.
- Product add/edit modal.
- Category and supplier management modal/panel.
- Services list, filters, stats, add/edit/delete modals.
- Repairs list, repair status cards, filters and table.
- Add repair page.
- Repair detail page.
- Repair receipt page if used.
- Light/dark mode.
- 1366px, 1280px and mobile widths.
