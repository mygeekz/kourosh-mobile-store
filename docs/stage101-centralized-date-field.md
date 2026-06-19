# Stage 101 — Centralized DateField via ShamsiDatePicker

Goal:
Apply the same centralization approach used for search fields to date fields.

Implemented:
- Refactored `components/ShamsiDatePicker.tsx` to use canonical classes:
  - `app-date-field`
  - `app-date-field__control`
  - `app-date-field__icon`
  - `app-date-field__input`
- Created `styles/components/date-field.css`.
- Removed conflicting date runtime override imports:
  - `10t-date-field-single-surface.css`
  - `10u-date-and-realized-search-final.css`
  - `10v-realized-profit-report-local-fixes.css`
  - `10w-search-opposite-and-date-no-focus.css`
- Updated `styles/pages/reports.css` so generic report input styling does not target date picker internals.

Canonical date contract:
- ShamsiDatePicker owns all date field visuals.
- Control wrapper is the only visible surface.
- Internal input is flat.
- No page/report CSS may create a second box.
