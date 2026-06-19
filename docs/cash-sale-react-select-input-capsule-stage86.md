# Stage 86 — Hide react-select internal input capsule

Fix:
- Keeps react-select combobox behavior.
- Shrinks react-select's internal inputContainer/input to a 1px typing layer.
- Placeholder and selected value remain the visible text layer.
- Removes the small internal oval/capsule seen in the screenshot.
- Portal z-index from Stage 85 remains intact.

Files:
- `components/SellableItemSelect.tsx`
- `styles/runtime-overrides/10p-single-surface-search-system.css`
