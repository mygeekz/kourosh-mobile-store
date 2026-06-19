# Phase 09 — MobilePhones UI Foundation

## Scope

This phase focuses only on the MobilePhones UI layer. It does not change inventory, sales, IMEI, pricing, partner ownership, API, or database logic.

## Changes

- Consolidated the MobilePhones page CSS into `styles/system/mobile-phones-foundation.css`.
- Consolidated the mobile sales analytics tab CSS into `styles/system/mobile-sales-tabs-foundation.css`.
- Added a MobilePhones UI contract section inside `styles/system/mobile-phones-foundation.css` for existing `phone-*` classes.
- Updated `index.tsx` imports to use the new foundation files while preserving cascade order.
- Corrected the MobilePhones addable autocomplete input from the invalid `preview` prop to `placeholder` so helper text is actually visible.

## Test checklist

- MobilePhones registration form, including model/color autocomplete.
- IMEI and numeric fields in RTL and LTR contexts.
- Add/edit phone modal/form.
- Phone list header search and action buttons.
- Phone inventory table and card mode.
- Inline row actions: sell, edit, history, delete, select.
- Mobile sales analytics tabs.
- Dark mode and light mode.
- Desktop widths: 1366, 1280.
- Responsive/mobile width.

## Notes

The legacy CSS source files were not deleted. They are no longer directly imported where replaced, so rollback remains simple if needed.
