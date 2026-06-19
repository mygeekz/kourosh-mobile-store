# Stage 102 — DateField report containment fix

Problem:
After centralizing ShamsiDatePicker, RealizedProfitReport still passed old `inputClassName` props into the date picker. Those legacy utility classes polluted the new centralized control and made the inner input appear as a second box/lower field.

Fix:
- Removed `inputClassName` props from ShamsiDatePicker usages in `RealizedProfitReport.tsx`.
- Added defensive DateField CSS so the centralized control remains 52px tall and the internal input remains flat.
- Date picker remains centralized through `styles/components/date-field.css`.

Files:
- `pages/reports/RealizedProfitReport.tsx`
- `styles/components/date-field.css`
