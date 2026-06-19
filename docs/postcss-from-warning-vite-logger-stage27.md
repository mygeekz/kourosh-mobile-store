# Stage 27 — Targeted Vite PostCSS `from` Warning Filter

## Problem

After Stage 26, the app starts and the Tailwind `@layer` crash is resolved, but Vite still prints this warning:

```txt
A PostCSS plugin did not pass the `from` option to `postcss.parse`. This may cause imported assets to be incorrectly transformed.
```

The previous `postcss.config.cjs` guard remains in place, but the warning can still be emitted by Vite's CSS pipeline or by a dependency that calls into PostCSS before/around the project PostCSS config guard.

## Fix

A targeted Vite logger filter was added in `vite.config.ts`:

- Uses Vite's `createLogger()`.
- Filters only the exact PostCSS `from` warning.
- Leaves all other Vite warnings, errors, CSS errors, HMR warnings, and build diagnostics untouched.
- Does not change CSS files, Tailwind layers, imports, UI, or runtime behavior.

## Why this is safe

This warning is non-fatal and does not identify a project CSS syntax error. The actual fatal error from the previous stage was the Tailwind `@layer ... no matching @tailwind ...` issue, which was already fixed by rebuilding the generated Tailwind entry.

The filter is intentionally narrow: it only suppresses the exact noisy PostCSS `from` warning string and does not suppress general warnings.

## Files changed

- `vite.config.ts`
- `docs/postcss-from-warning-vite-logger-stage27.md`
- `docs/stage27-validation.json`
