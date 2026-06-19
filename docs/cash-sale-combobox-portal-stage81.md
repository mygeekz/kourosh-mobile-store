# Stage 81 — Cash sale combobox portal layering

Problem:
The combobox dropdown still went under the cart card because parent containers created stacking context/overflow boundaries.

Fix:
- The dropdown menu is now rendered with `createPortal(..., document.body)`.
- Menu uses fixed positioning based on the control's `getBoundingClientRect()`.
- The position updates on open, scroll and resize.
- Outside-click logic accounts for the portal menu.

Files:
- `components/SellableItemSelect.tsx`
- `styles/runtime-overrides/10p-single-surface-search-system.css`
