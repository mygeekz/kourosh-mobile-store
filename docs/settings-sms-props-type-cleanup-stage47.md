# Stage 47 — Settings SMS Props Type Cleanup

## Scope

This stage narrows the SMS settings panel types without changing the rendered JSX, layout, CSS classes, event handlers, or runtime behavior.

## Changed files

- `pages/settings/settingsPanelTypes.ts`
- `pages/settings/SettingsSmsPanel.tsx`

## What changed

- Added SMS-specific typed models:
  - `SmsAutomationMode`
  - `SmsProviderKey`
  - `SmsPatternAccent`
  - `SmsBusinessInfoValue`
  - `SmsBusinessInfo`
  - `SmsPatternKey`
- Changed `SettingsSmsPanelProps.businessInfo` from the broad `BusinessInformationSettings` shape to `SmsBusinessInfo` so SMS-only dynamic keys can be read without `as any` casts.
- Removed `as any` casts from `SettingsSmsPanel.tsx`.
- Kept `handleBusinessInfoChange`, JSX structure, pattern rows, SMS health panel, logs panel, and provider UI unchanged.

## Safety notes

- No CSS changed.
- No JSX layout changed.
- No text/copy changed.
- No state ownership changed.
- No handler behavior changed.
- Stage 45 Windows-safe import fix remains intact: `Settings.tsx` imports the settings barrel using `./settings/index`.
