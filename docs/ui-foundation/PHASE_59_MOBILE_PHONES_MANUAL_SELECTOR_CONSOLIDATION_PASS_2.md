# Phase 59 — Mobile Phones Manual Selector Consolidation — Pass 2

## Scope

Only this file was changed:

```txt
styles/system/mobile-phones-foundation.css
```

No JSX, API, database, inventory, sales, IMEI, pricing, reporting, Telegram, routing, or business logic was changed.

## Target family

This pass only consolidated the mobile phones list header search input:

```css
.phone-list-apple-head__search-input
```

## What changed

The late compatibility rules for `.phone-list-apple-head__search-input` were folded into the primary search input rule. The final effective values were preserved:

```css
padding-inline-start: 2.75rem;
padding-inline-end: 1rem;
text-overflow: ellipsis;
```

The selector was also removed from the later shared field-control group because its effective `min-height`, `border-radius`, and `text-overflow` values are now present on the primary rule.

## Safety rules used

- No media query rules were modified.
- No dark-mode rules were modified.
- No autocomplete/menu rules were modified.
- No form/register/IMEI/price rules were modified.
- The final computed behavior of the search input was preserved by moving the effective declarations into the primary selector.

## Expected UI impact

No intentional visual change. This is a small CSS consolidation pass.

## Test checklist

- Mobile phones page
- Phone list header search input
- Placeholder and Persian typing inside phone search
- Search icon spacing
- Mobile phone autocomplete model/color, for regression check
- Register/edit phone forms, for regression check
- Dark mode / light mode
- Desktop widths: 1280 and 1366
- Mobile width
