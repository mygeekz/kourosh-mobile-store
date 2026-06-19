# Stage 56 — Settings Telegram BusinessInfo type cleanup

## Scope
This stage continues from Stage 55 and only targets low-risk Telegram `businessInfo` field access inside `pages/Settings.tsx`.

## What changed
- Added a typed Telegram alias in `Settings.tsx`:
  - `telegramInfo = businessInfo as TelegramBusinessInfo`
  - `initialTelegramInfo = initialBusinessInfo as TelegramBusinessInfo`
- Replaced Telegram-related `(businessInfo as any).telegram_*` reads with `telegramInfo.telegram_*`.
- Replaced Telegram-related `(initialBusinessInfo as any).telegram_*` reads with `initialTelegramInfo.telegram_*`.
- Replaced dynamic Telegram template audience reads from `(businessInfo as any)[audienceKey]` to `telegramInfo[audienceKey]`.
- Replaced Telegram OTP reads from `(businessInfo as any).sms_otp_meli_body_id` to `telegramInfo.sms_otp_meli_body_id` because that value is used in the Telegram setup flow.
- Updated `SettingsTelegramPanelProps.businessInfo` to use `TelegramBusinessInfo`.
- Passed `telegramInfo` into `SettingsTelegramPanel` instead of raw `businessInfo`.

## Safety notes
- No JSX structure changed.
- No CSS, className, text, layout, modal, button, or handler behavior changed.
- Remaining `(businessInfo as any)` usages are SMS-provider related and intentionally left for a separate SMS cleanup stage.
- The Windows-safe settings import remains explicit: `./settings/index`.
- The `Link` import fix remains intact.

## Validation
- `pages/Settings.tsx` transpile check passed.
- `pages/settings/settingsPanelTypes.ts` transpile check passed.
- `pages/settings/SettingsTelegramPanel.tsx` transpile check passed.
- No Telegram-related `(businessInfo as any)` remains in `Settings.tsx`.
- No ambiguous `from './settings'` import remains in `Settings.tsx`.
