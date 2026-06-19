# Stage 33 — Settings Users Panel Extract

## Scope
Extracted the Users / Roles tab from `pages/Settings.tsx` into `pages/settings/SettingsUsersPanel.tsx`.

## Safety approach
- Preserved the JSX for the Users tab without changing class names, text, table layout, buttons, icons, filters, or modal handlers.
- Kept state, memoized data, and CRUD handlers in `Settings.tsx`.
- Passed data and handlers into the extracted panel as props.
- Did not move add/edit/reset/delete modals in this stage to reduce regression risk.

## Expected behavior
The Users tab should render exactly as before, including:
- user statistics cards
- search input
- role select
- quick role chips
- users table
- edit/reset/delete/add buttons

## Notes
This is a structural split only. UI/UX and runtime behavior are intentionally unchanged.
