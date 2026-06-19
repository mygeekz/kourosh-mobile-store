# Stage 37 — Settings Reminders Panel Extract

## Scope
Extracted the `reminders` tab JSX from `pages/Settings.tsx` into `pages/settings/SettingsRemindersPanel.tsx`.

## Safety model
- No CSS changes.
- No UI class changes.
- No text/content changes.
- No state or handler logic moved from the parent beyond the static JSX boundary.
- `ReminderRulesBuilder` is now imported inside the extracted panel.

## Size impact
- `pages/Settings.tsx`: 249497 bytes after extraction.
- `pages/settings/SettingsRemindersPanel.tsx`: 1147 bytes.

## Validation
- Local imports checked for modified files.
- Script files kept unchanged and checked for presence.
- ZIP integrity tested after packaging.
