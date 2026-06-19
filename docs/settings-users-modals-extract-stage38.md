# Stage 38 — Settings Users Modals Extract

Extracted the Users/Roles modal cluster from `pages/Settings.tsx` into `pages/settings/SettingsUsersModals.tsx`.

## Scope
- Add user modal
- Edit user role modal
- Reset password modal
- Delete user confirmation modal

## Safety model
- State remains in `Settings.tsx`.
- Handlers remain in `Settings.tsx`.
- JSX/classes/text were preserved.
- No CSS changes.
- Vite launcher and PostCSS warning filter were not changed.
