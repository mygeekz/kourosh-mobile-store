# Stage 41 — Settings type cleanup

## Scope

This stage centralizes Settings panel prop contracts without changing JSX, CSS, handlers, or runtime behavior.

## Added

- `pages/settings/settingsPanelTypes.ts`
- barrel type export from `pages/settings/index.ts`

## Changed

Panel-local `*Props` types and small supporting UI model types were moved out of the panel implementation files. The panels now import their props from the shared type module.

## Safety rules used

- No JSX blocks were moved.
- No className values were changed.
- No handlers/state ownership changed.
- The Vite launcher and PostCSS filter from the stable stage were left unchanged.

## Notes

`SettingsTelegramPanelProps` intentionally remains `Record<string, any>` for this stage because Telegram has a very large prop surface. Narrowing it should be a separate stage with a dedicated validation pass.
