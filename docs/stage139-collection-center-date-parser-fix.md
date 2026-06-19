# Stage 139 — Collection Center date parser 500 fix

Fixes:
- `Cannot read properties of undefined (reading 'isValid')`
- Added safe date helpers:
  - `collectionCenterSafeMoment`
  - `collectionCenterDateDiffInDays`
  - `collectionCenterOverdueDays`
- Replaced fragile `moment(...).isValid()` usage in direct installment/check source.
- Hardened `buildCollectionCenterSourceFromISO`.
- Hardened `normalizeCollectionCenterDate`.

Why:
Some installment/check due dates can be empty, malformed, Jalali, Gregorian, or already ISO. The route must never call `.isValid()` on an undefined parser result.
