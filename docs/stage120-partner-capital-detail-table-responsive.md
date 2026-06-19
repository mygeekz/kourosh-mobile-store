# Stage 120 — Partner capital detail table responsive fix

Target:
The table under `جزئیات سرمایه و وضعیت فروش`.

Problem:
At normal laptop widths, the table still horizontally scrolls and part of content is clipped.

Fix:
- Added semantic markers:
  - `partner-capital-detail-table-section`
  - `partner-capital-detail-table-scroll`
  - `partner-capital-detail-table`
- At widths <= 1380px, the table becomes card rows:
  - table head hidden
  - each row becomes a responsive card
  - each td gets a label via CSS `::before`
  - action column spans full row
- At smaller widths, row cards become single-column.
