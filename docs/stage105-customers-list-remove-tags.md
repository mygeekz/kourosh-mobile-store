# Stage 105 — Customers list: remove tags field

Implemented:
- Removed the desktop table column `تگ‌ها`.
- Removed the desktop tag cell rendering.
- Removed mobile tag chips from customer cards.
- Added table colgroup with 4 columns instead of 5.
- Increased available space for customer full name.
- Removed `truncate` from customer name display.

Files:
- `pages/Customers.tsx`
- `styles/runtime-overrides/10zb-customers-list-name-space.css`
- `index.tsx`
