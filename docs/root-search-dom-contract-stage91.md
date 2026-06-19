# Stage 91 — DOM-backed root search contract

Stage 90 CSS did not win in the actual app. Stage 91 marks key search fields with:
- `data-root-search-surface="true"`
- `data-root-search-input="true"`

Then `index.tsx` applies the final single-surface search contract directly to DOM nodes via:
`element.style.setProperty(property, value, 'important')`

Covered:
- Customers search
- Partners search
- Realized Profit document search
- ModernTableTools shared search
- TableToolbar shared search
- PageKit shared search

This mirrors the sidebar approach that worked.
