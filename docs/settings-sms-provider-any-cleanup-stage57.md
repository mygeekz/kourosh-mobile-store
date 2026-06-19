# Stage 57 — Settings SMS provider access type cleanup

## Scope
This stage only cleans low-risk SMS provider access inside `pages/Settings.tsx`.

## What changed
- Added a typed `smsInfo` alias based on `SmsBusinessInfo`.
- Replaced remaining `(businessInfo as any)` access for SMS provider readiness and SMS pattern body ids.
- Added `getSmsInfoString(key)` to centralize string normalization for SMS settings values.
- Passed `smsInfo` to `SettingsSmsPanel` instead of raw `businessInfo`.

## Safety notes
- No JSX structure was moved.
- No CSS, className, layout, label text, modal behavior, or submit handler was changed.
- Telegram logic was not touched.
- Previous Windows-safe import path is preserved: `./settings/index`.
- Previous `Link` import fix is preserved.

## Remaining known `any` in `Settings.tsx`
The remaining cases are unrelated to SMS provider access and are intentionally left for separate targeted stages:
- Telegram template grouping/cast helpers.
- DOM focus helper.
- Telegram template preview modal format/vars casting.
