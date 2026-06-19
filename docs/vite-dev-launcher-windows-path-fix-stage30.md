# Stage 30 — Vite Dev Launcher Windows Path Fix

## Problem

Stage 29 started Vite through `scripts/vite-dev.cjs`, but the preload path was also injected through `NODE_OPTIONS`.
On Windows, the quoted absolute path was mangled by the npm/concurrently command chain:

```txt
D:\Kourosh\end\scripts\postcss-warning-filter.cjs
```

became:

```txt
D:Kouroshendscriptspostcss-warning-filter.cjs
```

That caused:

```txt
MODULE_NOT_FOUND
Cannot find module 'D:Kouroshendscriptspostcss-warning-filter.cjs'
```

## Fix

`NODE_OPTIONS` injection was removed completely.

The launcher now prefers the real Vite JavaScript entry:

```txt
node_modules/vite/bin/vite.js
```

and starts it with a normal argv preload:

```txt
node --require <absolute-preload-path> node_modules/vite/bin/vite.js
```

Because the preload path is passed as a direct spawn argument, Windows backslashes are preserved and npm/concurrently cannot mangle the path.

## Safety

- No CSS was changed.
- No Settings UI was changed.
- No runtime behavior was changed except the dev launcher startup path.
- The PostCSS warning filter remains active when `node_modules/vite/bin/vite.js` exists.
- If Vite's JS entry is missing, the script falls back to `.bin/vite` without `NODE_OPTIONS`, so startup is preferred over filtering.

## Validation

- `scripts/vite-dev.cjs` passes `node --check`.
- `scripts/postcss-warning-filter.cjs` passes `node --check`.
- The launcher no longer contains `NODE_OPTIONS`.
- The launcher no longer uses `require.resolve('vite/bin/vite.js')`.
