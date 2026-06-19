# Stage 54 — Settings Account handlers `any` cleanup

This stage performs a low-risk cleanup inside `pages/Settings.tsx` for Account handlers only.

## Scope

- Avatar upload handler
- Change password handler
- Error handling in the same account flows

## Changes

- Added typed API result contracts:
  - `AvatarUploadApiResult`
  - `ChangePasswordApiResult`
- Replaced `parseApiResult(...)` with typed generic calls for account endpoints.
- Removed `const res: any` from account handlers.
- Replaced `catch (e: any)` with `catch (error: unknown)`.
- Reused `getErrorMessage(error)` for safe error normalization.

## Safety notes

- No JSX changed.
- No CSS changed.
- No className changed.
- No handler behavior changed.
- No settings panel import/export changed.
- The Windows-safe `./settings/index` import remains intact.
- The `Link` import fix remains intact.

## Validation

- `pages/Settings.tsx` TypeScript transpile check passed.
- `scripts/vite-dev.cjs` syntax check passed.
- `scripts/postcss-warning-filter.cjs` syntax check passed.
- ZIP archive integrity checked after packaging.
