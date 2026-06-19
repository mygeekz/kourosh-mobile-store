# Stage 78 — Cash sale select inner input reset

Problem:
The cash-sale product combobox still showed an inner rounded box. That box came from the actual input inside `react-select`, which inherited global input/focus styles.

Fix:
- The react-select inner input and input container are hard-reset.
- Only the outer `.sellable-select__control` remains visible.
- Placeholder and selected values are flat children, not separate boxes.

Files:
- `components/SellableItemSelect.tsx`
- `styles/runtime-overrides/10p-single-surface-search-system.css`
