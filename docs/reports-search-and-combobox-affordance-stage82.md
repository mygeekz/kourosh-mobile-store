# Stage 82 — Reports search icon + cash-sale combobox affordance

Fixes:
1. Reports route search icon is forced to the physical left side.
2. Cash-sale native selector now has a proper combobox affordance:
   - toggle button
   - chevron up/down
   - ARIA combobox state
   - portal dropdown remains
   - still single-surface, no inner box

Files:
- `components/SellableItemSelect.tsx`
- `components/ui/PageKit.tsx`
- `styles/runtime-overrides/10p-single-surface-search-system.css`
