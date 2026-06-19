# Stage 79 — Cash sale native combobox

Problem:
The cash-sale product selector still showed a nested internal input box because `react-select` renders its own internal input structure and global input styles were affecting it.

Fix:
- Replaced `react-select` in `SellableItemSelect.tsx` with a native controlled combobox.
- No internal secondary input box exists anymore.
- Search, filtering, dropdown, keyboard Enter selection and outside-click close are preserved.
- The visible control is a single surface.

Files:
- `components/SellableItemSelect.tsx`
- `styles/runtime-overrides/10p-single-surface-search-system.css`
