# Stage 49 — Settings Data / Business Props Type Cleanup

## Scope
This stage only tightens TypeScript contracts for the Settings Data and Business panels. No JSX structure, CSS class, layout, text, state ownership, or handler implementation was changed.

## Files changed
- `pages/settings/settingsPanelTypes.ts`
- `pages/settings/SettingsDataPanel.tsx`
- `pages/settings/SettingsBusinessPanel.tsx`

## Business panel cleanup
- Added `BusinessCurrencyUnit` and `SettingsBusinessInfo`.
- Changed `SettingsBusinessPanelProps.businessInfo` from the raw settings shape to a business-specific settings shape with typed `currency_unit`.
- Removed these casts from `SettingsBusinessPanel.tsx`:
  - `(businessInfo as any).currency_unit`

## Data / backup panel cleanup
- Imported and reused `BackupScheduleMode` from `utils/backupSchedule`.
- Changed `backupScheduleMode` from `string` to `BackupScheduleMode`.
- Changed `setBackupScheduleMode` from `(value: any) => void` to `Dispatch<SetStateAction<BackupScheduleMode>>`.
- Removed this cast from `SettingsDataPanel.tsx`:
  - `e.target.value as any`

## Safety notes
- `Settings.tsx` orchestration was not changed.
- Existing state and handlers remain owned by `Settings.tsx`.
- UI/UX output should remain identical.
- The stable Vite launcher and PostCSS warning filter were not changed.
