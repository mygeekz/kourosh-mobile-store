# Stage 29 — Vite CLI launcher fix + Settings SMS split

## Why this stage was needed

Stage 28 used `require.resolve('vite/bin/vite.js')`, but recent Vite versions do not export that package subpath. On Node 22 this caused:

```txt
Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './bin/vite.js' is not defined by "exports"
```

## Fix

`scripts/vite-dev.cjs` now resolves Vite through real filesystem paths instead of package subpath exports:

1. `node_modules/vite/bin/vite.js`
2. `node_modules/.bin/vite` / `vite.cmd`

The PostCSS warning preload is still applied.

## Settings split

The SMS settings tab was extracted into:

```txt
pages/settings/SettingsSmsPanel.tsx
```

The parent `Settings.tsx` keeps the state and handlers; the child receives only props. This keeps behavior stable and avoids UI/UX changes.
