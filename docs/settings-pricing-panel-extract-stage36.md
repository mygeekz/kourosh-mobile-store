# Stage 36 — Settings Pricing Panel Extract

## Scope

Extracted the Pricing / AI Pricing settings tab from `pages/Settings.tsx` into:

```txt
pages/settings/SettingsPricingPanel.tsx
```

## Safety approach

- State and handlers remain in `Settings.tsx`.
- Only the JSX panel was moved.
- UI classes, Persian copy, buttons, filters, exports, strategy advisor, learning cards and layout were preserved.
- The parent still gates rendering with `tab === 'pricing'`.

## Size impact

- `pages/Settings.tsx` before: 253,424 bytes
- `pages/Settings.tsx` after: 250,414 bytes
- New panel size: 24,239 bytes

## Validation

- TypeScript transpile syntax check passed for `Settings.tsx`.
- TypeScript transpile syntax check passed for `SettingsPricingPanel.tsx`.
- Existing Vite launcher/PostCSS warning filter files were not changed.
