# Stage 66 — Search position hardening

## Fixed
- Sidebar search magnifier is forced to the left side.
- Sidebar clear/X button remains removed.
- Sales cash item selector no longer shows the inner oval/indicator bubble.
- Generic local/report search shells are hardened so magnifier icons move left even when old right-* classes remain.
- Unified search API invoice fallback is strengthened to search cash-sale invoice notes and invoice item descriptions more reliably.

## Changed files
- `components/SellableItemSelect.tsx`
- `index.tsx`
- `styles/runtime-overrides/10l-search-position-hardening.css`
- `server/index.ts`

## Safety
- No business calculation changed.
- No sales order creation flow changed.
- Search API fallback only adds invoice matches and then slices after ranking.
