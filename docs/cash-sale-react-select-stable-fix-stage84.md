# Stage 84 — Cash-sale react-select stable fix

Goal:
Keep the original react-select combobox behavior, remove the inner oval/input surface, and keep the dropdown above all cards.

Changes:
- React-select remains in place.
- Dropdown chevron is restored as a flat indicator, so it still looks like a combobox.
- Loading/clear/separator indicators stay removed.
- Inner react-select input is hard-reset.
- Menu portal z-index is raised to 2147483647.

Files:
- `components/SellableItemSelect.tsx`
- `styles/runtime-overrides/10p-single-surface-search-system.css`
