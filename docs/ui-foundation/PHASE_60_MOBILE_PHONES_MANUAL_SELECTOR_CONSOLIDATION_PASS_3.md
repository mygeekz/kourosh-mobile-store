# Phase 60 — Mobile Phones Manual Selector Consolidation — Pass 3

Scope: `styles/system/mobile-phones-foundation.css`

## Goal
Consolidate only the `phone-register-submitbar` family without changing runtime behavior.

## Changes

- Moved the final sticky positioning declarations into the main submitbar rule:
  - `position: sticky`
  - `bottom: 0.75rem`
  - `z-index: 20`
  - `backdrop-filter: blur(12px)`
- Moved `white-space: nowrap` into the shared submit/reset button rule.
- Removed the later redundant submitbar and submit/reset blocks after preserving their effective declarations.

## Intentionally untouched

- Mobile media queries
- Dark mode
- Submit/reset hover and focus states
- Autocomplete
- IMEI and price fields
- Register/edit form logic
- Table/card actions

## QA

- CSS parser: passed
- Textual `\\n`: none
- Missing CSS imports: none
- Runtime-overrides imports: zero
- Brace balance: passed
