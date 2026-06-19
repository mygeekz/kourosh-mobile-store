# Phase 78 — Mobile Phones Redesign Pass 1

Scope: UI/UX-only redesign for `MobilePhones.tsx`.

## What changed

- Added `mobile-phones-redesign-v1` scope to the Mobile Phones page root.
- Added scoped stylesheet: `styles/system/mobile-redesign/mobile-phones-redesign-pass-1.css`.
- Polished the page surface, registration form sections, inputs/selects/textareas, autocomplete menu, submit bar, inventory table/card surfaces, phone cards, LTR numeric/IMEI handling, and responsive density.
- Replaced invalid native `preview` attributes with valid `placeholder` attributes on native `input`/`textarea` controls in `MobilePhones.tsx`.

## What did not change

- No API logic changed.
- No sales logic changed.
- No IMEI logic changed.
- No pricing, ownership, partner, reporting, or inventory calculations changed.
- No route or database behavior changed.

## QA checklist

- Mobile Phones page opens.
- Register phone form.
- Edit phone form.
- Model/color autocomplete.
- IMEI field.
- Battery health field.
- Price fields.
- Submit/reset bar.
- Inventory table.
- Phone cards.
- Sell/details/barcode/edit/delete actions.
- Dark and light mode.
- 1366, 1280, tablet, and mobile widths.
