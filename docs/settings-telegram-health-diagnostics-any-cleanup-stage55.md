# Stage 55 — Settings Telegram Health / Diagnostics Type Cleanup

## Scope
This stage only touched low-risk Telegram health, diagnostics, recent chat lookup, and control-center response handling inside `pages/Settings.tsx` plus the related shared types in `pages/settings/settingsPanelTypes.ts`.

## What changed
- `tgHealth` is now typed as `TelegramHealthState | null` instead of an inline state with `bot?: any`.
- `tgDiagnostics` is now typed as `TelegramDiagnosticsState | null` instead of `any | null`.
- `tgCC` is now typed as `TelegramControlCenterState | null` instead of `any | null`.
- `tgRecentChats` now uses the shared `TelegramRecentChat[]` model.
- Telegram JSON response reads in the health/diagnostics/control-center flows now use a small safe `readApiJsonObject` helper.
- Telegram error handling in these flows now catches `unknown` and formats through `getErrorMessage`.
- Telegram message format normalization no longer uses `as any`.

## Safety notes
- No JSX was changed.
- No CSS was changed.
- No `className`, text, layout, button, modal, or UI behavior was changed.
- Existing Settings panel splits, Windows-safe import fix, and Vite launcher fix were preserved.

## Files changed
- `pages/Settings.tsx`
- `pages/settings/settingsPanelTypes.ts`
- `docs/settings-telegram-health-diagnostics-any-cleanup-stage55.md`
- `docs/settings-split-validation-stage55.json`
