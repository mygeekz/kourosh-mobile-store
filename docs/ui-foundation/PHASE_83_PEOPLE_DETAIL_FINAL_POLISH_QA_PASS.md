# Phase 83 — People Detail Redesign Final Polish / QA Pass

Scope: Partner / Customer detail pages.

## Changed files

- `index.tsx`
- `styles/system/people-detail-redesign/people-detail-redesign-pass-3.css`

## Intent

Final visual polish for the People Detail redesign, without changing business logic.

## UI areas covered

- Partner detail page
- Customer detail page
- Hero / account focus cards
- KPI cards
- Ledger and expanded rows
- Settlement timeline
- Partner capital table shells
- Action buttons
- CRM tags and add-tag controls
- LTR values such as IMEI, system IDs, sale IDs and technical codes
- Dark/light mode
- 1366 / 1280 / tablet / mobile responsiveness

## Non-goals

No API, route, database, ledger calculation, balance calculation, payment/receipt logic, Telegram logic, report logic, or sales logic was changed.

## QA checklist

- Open Partner detail.
- Open Customer detail.
- Check account focus / balance cards.
- Check KPI cards.
- Check customer ledger table and expanded transaction row.
- Check partner ledger table and expanded transaction row.
- Check settlement timeline.
- Check partner phone/capital table.
- Verify IMEI and system IDs stay LTR and readable.
- Verify payment/receipt modals still open and work.
- Test dark mode and light mode.
- Test 1366, 1280, tablet and mobile widths.
