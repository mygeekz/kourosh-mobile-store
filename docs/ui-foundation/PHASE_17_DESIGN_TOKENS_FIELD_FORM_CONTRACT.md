# Phase 17 — Design Tokens + Field/Form Contract

## Scope
This phase establishes a central token layer and a semantic field/form contract. It is intentionally conservative: no API, business logic, routing, reporting, Telegram logic, accounting, or persistence code was changed.

## Files added

- `styles/system/design-tokens.css`
- `styles/system/field-form-contract.css`
- `docs/ui-foundation/PHASE_17_DESIGN_TOKENS_FIELD_FORM_CONTRACT.md`

## Files updated

- `index.tsx`
- `components/ModalField.tsx`
- `components/ui/AppSearchField.tsx`
- `components/ui/AppSelectField.tsx`

## What changed

### 1. Central design tokens
`styles/system/design-tokens.css` now defines the first stable token layer for:

- surfaces
- text colors
- borders
- focus rings
- radius scale
- restrained shadows
- control heights
- field spacing
- z-index conventions
- mobile control sizing
- dark mode values

This file only defines CSS custom properties. It does not reset page visuals.

### 2. Field/form contract
`styles/system/field-form-contract.css` creates a semantic contract for:

- `.app-field`
- `.app-field__control-wrap`
- `.app-field__control`
- `.app-field__leading-icon`
- `.app-field__clear`
- `.app-field__feedback`
- `.app-input`
- `.app-select`
- `.app-textarea`
- `.modal-control-premium`
- `.app-search-field`
- `.app-select-field`
- `.app-date-field`

The contract is imported after existing date/select/search CSS so it can normalize the shared field layer without touching business logic.

### 3. Semantic classes added to reusable field components

`ModalField.tsx` now exposes semantic classes while preserving all existing classes.

`AppSearchField.tsx` now exposes semantic app-field classes while preserving all existing app-search classes.

`AppSelectField.tsx` now exposes semantic app-field classes while preserving all existing app-select classes.

## Intent
This phase prepares the project for real removal of old form/search/date/select overrides. It does not remove the sensitive legacy field files yet.

## Not changed

- API calls
- database code
- accounting logic
- Telegram logic
- report calculations
- sale/inventory logic
- route definitions
- dashboard widget persistence
- validation logic

## Validation performed

- Checked all CSS files for literal `\\n` strings.
- Checked CSS brace balance.
- Parsed all CSS files with `tinycss2`; no parser errors found.
- Verified `index.tsx` imports.
- Verified updated TSX files for structural class changes.

## Recommended QA checklist

- Modal fields with icons
- Modal fields without icons
- Textarea fields
- Select fields
- AppSearchField in customers/partners/reports/header/sidebar
- AppSelectField in customers/partners/reports
- Date fields in reports and transaction modals
- Error states in modal forms
- LTR fields such as IMEI, phone number, system id, numeric values
- Dark mode and light mode
- Mobile width
