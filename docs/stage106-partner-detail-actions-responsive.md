# Stage 106 — Partner detail actions responsive fix

Problem:
The action buttons in PartnerDetail header were clipped at normal zoom because the action strip had a restrictive width and did not wrap early enough.

Fix:
- Reworked PartnerDetail action container with `partner-detail-actions--responsive`.
- Buttons now wrap before clipping.
- On medium widths, actions take a full row.
- On mobile, actions become a 2-column grid, then 1-column on very small screens.

Files:
- `pages/PartnerDetail.tsx`
- `styles/runtime-overrides/10zc-partner-detail-actions-responsive.css`
- `index.tsx`
