# Stage 142 — Collection shamsi helper crash fix

Fix:
- `CollectionFollowupCenter.tsx` `shamsi()` no longer assumes `moment(...)` returns an object with `.isValid`.
- All parsing paths are wrapped in defensive guards.
- If parsing fails, it returns the original raw value instead of crashing the page.

Error fixed:
`Cannot read properties of undefined (reading 'isValid')`

Files:
- `pages/reports/CollectionFollowupCenter.tsx`
