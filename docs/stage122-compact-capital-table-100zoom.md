# Stage 122 — Compact capital table for 100% zoom

User feedback:
Card conversion was bad. Keep the table and make it compact at 100% zoom:
- smaller gaps
- smaller fonts
- smaller icons
- tighter cell padding
- tighter chips/buttons
- no forced card conversion

Implementation:
- Based on Stage 120, not Stage 121.
- Removed `10zo-partner-capital-detail-table-responsive.css` import.
- Added `10zp-partner-capital-table-compact-100zoom.css`.

Files:
- `styles/runtime-overrides/10zp-partner-capital-table-compact-100zoom.css`
- `index.tsx`
