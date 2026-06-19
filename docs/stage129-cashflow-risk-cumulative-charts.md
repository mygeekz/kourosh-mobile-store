# Stage 129 — Cashflow risk cards + cumulative charts

Added to CashflowReport:
- Cumulative actual cash balance chart for selected range.
- Cumulative forecast cash balance chart.
- Liquidity risk cards:
  - future liquidity status
  - minimum forecast cumulative cash
  - number of negative-net forecast days

Important:
The current API only returns `days`, `forecast`, and `totals`.
So source/category breakdown charts cannot be implemented accurately without backend data changes.
