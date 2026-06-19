# Stage 34 — Settings Account Panel Extract

## Scope

Extracted the Account tab JSX from `pages/Settings.tsx` into:

`pages/settings/SettingsAccountPanel.tsx`

## Safety model

- State, memo values, computed account metadata and handlers remain in `Settings.tsx`.
- The extracted panel receives values and callbacks as props only.
- No UI copy, className, layout, Button props, avatar controls, password inputs or account status cards were intentionally changed.
- The parent still owns `tab === 'account'` routing.

## Extracted behavior

- Avatar preview / upload
- Account identity hero
- User management shortcut for admins
- Account metadata cards
- Current-user password change form
- Password strength/status visualization
- Account security status cards

## Validation

- `Settings.tsx` was reduced in size.
- Local imports were checked.
- The new panel is intentionally prop-driven to reduce regression risk.
