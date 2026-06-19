# Phase 32 — Products / Services / Repairs Duplicate Selector Reduction

Scope-limited exact duplicate selector reduction for operational product/service/repair CSS foundations.

## Scope

- `styles/system/products-services-repairs/products-ui-foundation.css`
- `styles/system/products-services-repairs/services-inventory-foundation.css`
- `styles/system/products-services-repairs/repairs-ui-foundation.css`

## Method

Only top-level CSS qualified rules were eligible for removal when both the selector and declaration body were exactly identical. Rules with the same selector but different bodies were intentionally preserved because they may be part of cascade/hotfix ordering.

## Removed

One exact duplicate rule was removed from `products-ui-foundation.css`:

```css
#products-print-area .product-list-table {
  table-layout: fixed;
}
```

The second exact duplicate occurrence was removed.

## QA

- CSS files checked: 152
- CSS parser errors: 0
- Literal `\n` occurrences in CSS: 0
- Missing CSS imports from `index.tsx`: 0
- Direct `styles/runtime-overrides` imports: 0

## Notes

No JSX, API, database, inventory, repair, pricing, sales, or routing logic was changed.
