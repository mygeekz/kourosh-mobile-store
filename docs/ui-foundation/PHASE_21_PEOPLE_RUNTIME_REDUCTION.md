# Phase 21 — People Runtime Reduction

## Scope
Moved the remaining people/customer/partner commercial redesign CSS out of `styles/runtime-overrides` and into a controlled system runtime foundation while preserving its exact cascade position in `index.tsx`.

## Changed
- Replaced direct runtime import:
  - `styles/runtime-overrides/02e-people-commercial-redesign.css`
- Added controlled system foundation:
  - `styles/system/people-runtime/people-commercial-redesign-foundation.css`

## Important
The CSS content was copied as-is. This phase does not delete selectors or alter UI logic. It only relocates the file to reduce direct runtime-overrides dependency.

## Not Changed
- API
- database
- accounting logic
- customer/partner transactions
- ledger logic
- Telegram logic
- reports logic
- routes

## Test Checklist
- Customers list
- Customer detail
- Partners list
- Partner detail
- people KPI cards
- people filters
- add/edit customer modal
- add/edit partner modal
- financial status badges
- dark mode / light mode
- 1280px, 1366px, and mobile widths
