# Stage 83 — Cash-sale combobox rollback

The native combobox change was too risky and broke the expected combobox behavior.

What changed:
- `components/SellableItemSelect.tsx` was rolled back to the stable react-select based implementation from Stage 78.
- The risky native/portal combobox code from Stages 79-82 is removed.
- Report search icon-left hardening is preserved in CSS.

Files:
- `components/SellableItemSelect.tsx`
- `styles/runtime-overrides/10p-single-surface-search-system.css`
