# Phase 05 — Telegram Logs Redesign

## Scope
This phase improves only the Telegram send logs UI. It does not change Telegram API calls, retry endpoints, bot service logic, database schema, queue logic, auth, or report logic.

## Files changed
- `components/TelegramLogsPanel.tsx`
- `styles/system/telegram-logs-redesign.css`
- `index.tsx`

## UX changes
1. Telegram logs now render in compact pages of 5 rows.
2. A pagination bar shows the visible row range and lets the user move between pages.
3. Failed rows now show a compact `راهکار` button instead of always pushing guidance into the table.
4. Clicking `راهکار` opens an inline accordion row with:
   - human-readable error title
   - recommended action
   - route hint
   - quick-fix navigation button
   - retry button
5. The detailed modal remains available through `جزئیات` for full request/response debugging.

## Safety notes
- The fetch query still requests `limit=50` from the backend.
- Pagination is client-side only.
- Retry uses the existing `POST /api/telegram/logs/:id/retry` endpoint.
- Existing humanized error mapping is reused through `humanizeTelegramError`.
- No global CSS contract was changed.

## Test checklist
- Open Settings > Telegram > logs section.
- Confirm only 5 log rows show per page.
- Test previous/next pagination.
- Filter by success/failure and confirm page resets to page 1.
- Search recipient and confirm page resets to page 1.
- On a failed row, click `راهکار` and confirm the accordion opens below the same row.
- Click `راهکار` again and confirm it closes.
- Test `ارسال مجدد` from the table row and inline guidance row.
- Test `جزئیات` modal still opens and shows request/response data.
- Test dark mode and responsive widths.
