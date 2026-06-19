# Stage 51 — Settings Local Domain any cleanup

## Scope

This stage performs a low-risk type cleanup inside `pages/Settings.tsx`, focused on the Local Domain settings flow and small adjacent business-info helpers.

## Changes

- Replaced Local Domain reads from `(businessInfo as any)` with typed `BusinessInformationSettings` fields.
- Replaced Local Domain `setBusinessInfo((prev: any) => ...)` / `setInitialBusinessInfo((prev: any) => ...)` with typed updater callbacks.
- Replaced the Local Domain save payload cast from `Record<string, any>` with `satisfies BusinessInformationSettings`.
- Replaced local-domain `catch (error: any)` branches with `unknown` plus the local `getErrorMessage` helper.
- Replaced browser platform detection cast from `(navigator as any)` with a typed `Navigator & { userAgentData?: { platform?: string } }`.
- Replaced a few business-info casts for QR/currency/store name with direct typed fields.
- Changed `SavedStyleProfile.snapshot` from `any` to `unknown`.

## Safety notes

- No JSX was moved.
- No CSS, `className`, text, layout, state ownership, or handler behavior was changed.
- The Windows-safe Settings barrel import remains explicit: `./settings/index`.
- The Stage 30 Vite launcher and PostCSS warning filter were not modified.

## Remaining work

`pages/Settings.tsx` still contains `any` in higher-risk areas such as Telegram, pricing learning/API responses, and SMS/provider integrations. Those should be cleaned up in later, focused stages.
