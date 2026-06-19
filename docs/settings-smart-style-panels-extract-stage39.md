# Stage 39 — Settings Smart / Style Panels Extract

## Scope

Extracted the remaining small Settings tabs for Smart and Style into dedicated panel components.

## Files added

- `pages/settings/SettingsSmartPanel.tsx`
- `pages/settings/SettingsStylePanel.tsx`

## Safety approach

- Only JSX orchestration was moved out of `pages/Settings.tsx`.
- Feature gate logic for the AI control panel remains exactly the same.
- `setNotification` is still passed to `AiFeatureControlPanel` unchanged.
- `StyleSettings` remains the same component and is only wrapped behind the `tab === 'style'` guard.
- No CSS/className/layout/text changes were made.
- Vite launcher and PostCSS warning filter from Stage 30 were not changed.
