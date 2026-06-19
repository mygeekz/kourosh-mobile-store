# Stage 109 — PartnerDetail customer-parity clean header

User feedback:
- Stage 108 made the page worse.
- Actions should stay at the top, like CustomerDetail.
- The hero/card looked transparent/washed out.

Fix:
- Removed imports for failed Stage 107/108 partner layout CSS.
- Restored PartnerDetail hero/action markup to CustomerDetail-like layout.
- Added `partner-detail-hero-clean` and `partner-detail-actions--customer-parity`.
- Added final CSS to:
  - keep actions at top
  - wrap safely without clipping
  - remove transparent/washed-out card look
  - preserve CustomerDetail visual theme

Files:
- `pages/PartnerDetail.tsx`
- `styles/runtime-overrides/10zf-partner-detail-customer-parity-clean.css`
- `index.tsx`
