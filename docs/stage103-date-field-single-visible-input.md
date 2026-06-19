# Stage 103 — DateField single visible input

Problem:
Even after centralization, the date field still showed a lower/inner second box. The wrapper/control was visible and the internal input was also visible as another field.

Fix:
- Changed ShamsiDatePicker to render the input first and calendar icon as an overlay.
- DateField control wrapper is now layout-only.
- The input itself is the only visible field surface.
- Calendar icon is absolute/overlay on the right.
- DateField CSS now hard-defeats report-page generic input styles.
- Removed legacy inputClassName props from RealizedProfitReport date pickers again.

Files:
- `components/ShamsiDatePicker.tsx`
- `styles/components/date-field.css`
- `pages/reports/RealizedProfitReport.tsx`
