# Stage 46 — Settings Telegram Type Cleanup

## Scope
This stage continues the conservative type cleanup for the Settings Telegram panel after the Stage 45 `Link` import regression fix.

## Changes
- Added Telegram-specific business info typing in `pages/settings/settingsPanelTypes.ts`:
  - `TelegramBusinessInfo`
  - `TelegramBusinessInfoValue`
  - `TelegramMessageFormat`
  - `TelegramTemplatePolicy`
  - `TelegramToggleValue`
- Added `TelegramAudienceTemplateEntry` for the per-audience template rows rendered inside `SettingsTelegramPanel`.
- Replaced `businessInfo as any` usage in `SettingsTelegramPanel.tsx` with a local typed alias:
  - `const telegramInfo = businessInfo as TelegramBusinessInfo;`
- Removed remaining `as any` / `: any` casts from `SettingsTelegramPanel.tsx`.
- Kept JSX, class names, text, layout, handlers, and state ownership unchanged.

## Safety Notes
- No UI/UX changes were made.
- No CSS changes were made.
- `Settings.tsx` still imports settings barrel explicitly via `./settings/index` to avoid Windows case-insensitive path collisions.
- `scripts/vite-dev.cjs` and `scripts/postcss-warning-filter.cjs` were not changed.

## Validation
- Local import scan: passed.
- Brace balance for `Settings.tsx`, `SettingsTelegramPanel.tsx`, and `settingsPanelTypes.ts`: passed.
- No `as any` / `: any` remains in `SettingsTelegramPanel.tsx`.
- ZIP integrity test: passed.
