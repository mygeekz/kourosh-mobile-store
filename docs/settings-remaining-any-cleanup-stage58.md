# Stage 58 — Settings remaining `any` cleanup

## Scope
This stage continues from Stage 57 and only targets the remaining low-risk `any` usages inside `pages/Settings.tsx`.

## Changes
- Removed the remaining `as any`, `: any`, `Record<string, any>`, and `any[]` usages from `pages/Settings.tsx`.
- Replaced `setBusinessInfo((prev: any) => ...)` in Telegram preset application with the typed state updater.
- Typed Telegram template grouping with `TelegramTemplateDef[]` instead of casting grouped items with `any`.
- Removed unnecessary `HTMLElement` focus casts in Telegram Control Center jump behavior.
- Removed modal prop casts for `format` and `allowedVars` in `TelegramTemplateTestModal` usage.

## Safety notes
- No JSX layout was intentionally changed.
- No CSS or class names were changed.
- No user-facing Persian copy was changed.
- No Telegram/SMS send behavior was changed.
- Windows-safe import path from Stage 43 remains intact: `./settings/index`.
- `Link` import from Stage 45 remains intact.

## Validation
- `pages/Settings.tsx` transpile check passed.
- `pages/settings/SettingsTelegramPanel.tsx` transpile check passed.
- `pages/settings/settingsPanelTypes.ts` transpile check passed.
- Brace balance passed for the touched files.
- No `as any`, `: any`, `Record<string, any>`, or `any[]` remains in `pages/Settings.tsx`.
