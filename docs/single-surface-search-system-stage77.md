# Stage 77 — Single-surface search system

Applies the finalized sidebar search visual rules to the rest of the app's important searches:
- Cash sale sellable item selector
- PageKit/report search
- Table search wrappers
- Search results search shell

Design contract:
- One visible outer search surface
- No nested input box
- No inner indicator bubble
- Search icon on the opposite side of RTL text
- Focus ring only on the outer surface

Files:
- `components/SellableItemSelect.tsx`
- `components/ui/PageKit.tsx`
- `components/reports/ModernTableTools.tsx`
- `components/reports/PremiumDataTable.tsx`
- `components/SearchBox.tsx`
- `styles/runtime-overrides/10p-single-surface-search-system.css`
- `index.tsx`
