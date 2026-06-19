# Stage 61 — Follow-up fix for sidebar search + sales selector

## Root cause
The previous root-level contract improved many controls, but two high-friction areas still had overlap risks:

1. **Sidebar search** was still relying on generic `relative + absolute` selectors, while the actual component needed an explicit affix contract.
2. **SellableItemSelect (react-select)** was still using an absolute indicators lane. In RTL this could create overlap between placeholder/value text and loading / dropdown indicators.

## What changed

### Sidebar
- Added explicit structural classes:
  - `ux-sidebar-search`
  - `ux-sidebar-search__input`
  - `ux-sidebar-search__icon`
  - `ux-sidebar-search__clear`
- Fixed invalid `preview` attribute -> standard `placeholder`.
- Enforced RTL-safe padding and ellipsis behavior.

### SellableItemSelect
- Added `isRtl` to `Select`.
- Moved indicators from **absolute overlay** to **normal flex flow**.
- Added explicit `loadingIndicator` styling.
- Kept value / placeholder aligned right with ellipsis.

### CSS contract
- Extended `styles/runtime-overrides/10h-icon-text-layout-contract.css`.
- Sidebar search now has a dedicated affix contract.
- Sales selector now uses a non-overlay indicators layout.

## Files changed
- `components/Sidebar.tsx`
- `components/SellableItemSelect.tsx`
- `styles/runtime-overrides/10h-icon-text-layout-contract.css`

## Safety notes
- No business logic changed.
- No state flow changed.
- No API layer changed.
- UI/UX intent preserved; only layout contract tightened.
