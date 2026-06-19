# Stage 53 — Settings Business/API/User `any` Cleanup

## Scope
This stage continues from Stage 52 and only touches low-risk central logic inside `pages/Settings.tsx` plus the backup schedule parser signature.

## Changed areas
- Business/module feature flag helpers
- Initial settings/users/roles loading
- Store ownership profit-share status loading
- Business info QR/currency/backup schedule normalization
- Logo upload response typing
- Backup list / restore / schedule response typing
- User create/edit/reset/delete error handling

## Safety rules followed
- No JSX was moved.
- No CSS, className, layout, text, button, or UI behavior was changed.
- Telegram internals were intentionally left untouched.
- Pricing cleanup from Stage 52 was preserved.
- Windows-safe Settings barrel import stayed explicit: `./settings/index`.
- `Link` import remained in `pages/Settings.tsx`.

## Type improvements
- Added typed API result models for settings, users, roles, logo upload, backup list, backup restore, and backup check-restore.
- Replaced low-risk `catch (error: any)` blocks with `unknown` + `getErrorMessage`.
- Removed `any` from user enrichment during `/api/users` loading.
- Removed `any[]` from partner share profile response.
- Removed dynamic `businessInfo as any` access for QR/currency and local backup schedule loading.
- Added a narrow `BusinessInfoDynamic` helper type for feature-flag setting keys.

## Validation
- `pages/Settings.tsx` transpile check passed.
- `utils/backupSchedule.ts` transpile check passed.
- `scripts/vite-dev.cjs` syntax check passed.
- `scripts/postcss-warning-filter.cjs` syntax check passed.
- ZIP integrity checked with `unzip -t`.
