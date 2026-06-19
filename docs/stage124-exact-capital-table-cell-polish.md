# Stage 124 — Exact capital table cell polish

Problem:
Stage 123 only added broad CSS and did not hook into the actual desktop table cells.

Fix:
- Added exact classes to desktop table cells:
  - `partner-capital-compact-table`
  - `partner-capital-cell--capital`
  - `partner-capital-cell--customer`
  - `partner-capital-cell--date-source`
  - `partner-capital-cell--action`
  - `partner-capital-status-chip`
  - `partner-capital-source-link`
- Removed effective `min-w-[170px]` pressure by replacing wrappers with `partner-capital-stack`.
- Added exact CSS for compact column widths, date/source link, progress/status chips, and action button.
