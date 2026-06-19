# Stage 80 — Cash sale combobox dropdown layering fix

Problem:
The native cash-sale combobox dropdown was rendered, but later sale/cart cards appeared above it.

Fix:
- Added `sellable-native-shell--open` while the dropdown is open.
- Raised the open selector and menu with explicit z-index.
- Kept the control and menu isolated from lower cards.

Files:
- `components/SellableItemSelect.tsx`
- `styles/runtime-overrides/10p-single-surface-search-system.css`
