# Stage 133 — Operational Collection Center backend

Goal:
The collection center should not depend only on sale transaction date.

Backend change:
- Added operational source window helper:
  - always looks back at least 24 months for source documents
  - still respects the requested `to` date
- Added operational visibility filter:
  - show if overdue
  - show if due date is inside selected window
  - show if next follow-up date is inside selected window
  - show if sale date is inside selected window
  - show if due within 7 days and the selected window includes today
  - show if automation says escalation is needed
- Response `filters` now includes:
  - `operationalWindow: true`
  - `sourceFrom`

Why:
A customer can still need collection follow-up even when the original sale is old. The center should be driven by active debt, due date, follow-up date, and risk—not only sale date.

Files:
- `server/index.ts`
- `pages/reports/CollectionFollowupCenter.tsx`
