# Stage 67 — Final full ZIP search fixes

Fixes applied directly to source files, not only runtime CSS:

- Sidebar search magnifier moved left in JSX and CSS.
- Sidebar clear/X remains removed.
- Sales cash react-select indicators removed from React components and CSS.
- Search results and PageKit search icons are left-positioned directly.
- Global search now searches both `invoices/invoice_items` and the actual sales source tables `sales_orders/sales_order_items`.
- Sales order matches are returned as invoice-domain results so `/invoices/:id` keeps working.

ZIP is created with project files at root; no `stage53` wrapper folder.
