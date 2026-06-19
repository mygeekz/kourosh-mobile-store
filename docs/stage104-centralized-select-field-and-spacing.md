# Stage 104 — Centralized AppSelectField + customer spacing

Implemented:
- Created `components/ui/AppSelectField.tsx`.
- Created `styles/components/select-field.css`.
- Replaced Customers sort select with AppSelectField.
- Replaced Partners sort select with AppSelectField.
- Added layout compatibility CSS:
  `styles/runtime-overrides/10za-app-select-field-layout-compat.css`
- Increased vertical breathing room on Customers page sections/toolbars.

Canonical select contract:
- Select itself is the only visible box.
- Leading icon is physical-left.
- Chevron is physical-right.
- Text is RTL/right aligned.
- Wrapper is layout-only.
