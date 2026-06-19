# Stage 62 — Mixed Persian/English Bidi Text Contract

## Why this stage exists
Some UI labels contain Persian text mixed with English terms, IDs, IMEI, URLs, usernames, product model names or numbers. In RTL layouts, those mixed strings can reorder visually or push text into icon/count areas.

## What changed
- Added `styles/runtime-overrides/10i-bidi-text-contract.css`.
- Imported it after `10h-icon-text-layout-contract.css`.
- Added semantic utilities:
  - `.ux-mixed-text`
  - `.ux-bidi-text`
  - `.ux-mixed-line`
  - `.ux-ltr-token`
  - `.ux-code-token`
  - `.ux-id-token`
- Strengthened bidi behavior for:
  - Sales item selector / react-select options
  - Sidebar labels and sidebar search
  - Filter chips and count badges
  - Table/detail values containing codes or English text
  - Explicit LTR technical tokens

## Component-level changes
- `SellableItemSelect.tsx` now wraps option labels with `.ux-mixed-text`.
- `Sidebar.tsx` marks nav labels with `.ux-mixed-text`.

## Safety notes
- No API logic changed.
- No state flow changed.
- No business behavior changed.
- This is a typography/layout contract only.
