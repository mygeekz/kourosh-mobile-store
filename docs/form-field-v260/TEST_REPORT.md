# v260 Test Report

Date: 2026-08-29

## Source gate — PASS

Command:

`npm run test:v260`

Result:

- Exit code: 0
- Release: v260
- Source checks: 56 / 56 PASS
- Included UI-foundation gates: root vertical metrics, Settings/Inventory canonical primitives, Select foundation, Dialog form primitives, Style Manifest.

Full log: `docs/form-field-v260/logs/test-v260-source.log`

## Changed TS/TSX syntax — PASS

The following changed source files were parsed with TypeScript 5.8.3 and produced no syntax diagnostics:

- `app/bootstrap/styles.ts`
- `components/ui/AppSearchField.tsx`
- `components/ui/SelectField.tsx`
- `components/ui/TextField.tsx`
- `pages/mobilePhones/MobilePhonesModalStack.tsx`
- `pages/reports/PartnerPerformanceReport.tsx`
- `pages/settings/SettingsController.tsx`
- `pages/settings/SettingsSmsPanel.tsx`

Full log: `docs/form-field-v260/logs/tsx-syntax.log`

## Full production gate — ENVIRONMENT BLOCKED

Command:

`npm run verify:miniapp`

Result:

- Source checks complete successfully.
- Gate stops fail-closed at check 57/72 (`verify:miniapp:environment-v260`).
- Exit code: 1.
- Node available: 22.16.0.
- Project requirement: ^22.17.0 || >=24.
- Project `node_modules`: absent.
- Required packages such as Vite/React/tsx/jalali-moment are not installed in the supplied archive.

This is not recorded as a product PASS or product regression.

Full log: `docs/form-field-v260/logs/verify-miniapp-full.log`

## Production build — ENVIRONMENT BLOCKED

Command:

`npm run build:miniapp`

Result:

- Release synchronization: PASS, v260.
- Vite invocation: unavailable (`vite: not found`).
- Exit code: 127.

No production-build PASS is claimed.

Full log: `docs/form-field-v260/logs/build-miniapp.log`

## Browser / physical visual sign-off — PENDING

This container cannot render the application because dependencies are absent. v260 external RC evidence therefore requires real browser confirmation for:

- desktop field text not clipped;
- mobile field text not clipped;
- 200% zoom field text not clipped.

The corresponding v260 evidence checks are fail-closed and ship as `PENDING` in the example evidence file.
