# Kourosh v266 — Repairs Workspace + Production Tailwind Prebuild

## Scope
- Migrated Repairs hero/status/Kanban runtime away from retired `repairs-*` custom CSS hooks.
- Preserved the v265 Management Directory table standard for the repairs list.
- Removed dead Repairs-only CSS from the production style manifest/bootstrap.
- Fixed the production Tailwind build failure caused by malformed `py-2/**/.5` tokens at the source/generator level.
- Made production CSS regeneration + integrity checking mandatory before `npm run build`.

## Tailwind build root cause
The generated Tailwind entry was not the root source. A malformed utility token could be copied from registered CSS sources into `styles/generated/tailwind-entry.generated.css`. The production build then failed in PostCSS/Tailwind.

v266 changes the build contract:
1. `styles/manifest/style-manifest.json` remains the CSS source-of-truth.
2. `npm run prebuild` runs `npm run prepare:production-styles` automatically before `npm run build`.
3. The prebuild regenerates `app/bootstrap/styles.ts` from the style manifest.
4. `scripts/rebuild-css-entry.mjs` regenerates the Tailwind source CSV from active bundled-source entries in the style manifest, including size and SHA256 metadata.
5. The generated Tailwind CSS entry is rebuilt from those exact sources.
6. Style-manifest and Tailwind integrity audits run before Vite is allowed to start.

## CSS removed from Repairs production runtime
- `styles/pages/repairs.css` — 32 lines
- `styles/system/products-services-repairs/repairs-ui-foundation.css` — 1105 lines
- `styles/system/products-services-redesign/products-services-repairs-redesign-pass-1.css` — 234 lines
- `styles/system/products-services-redesign/products-services-repairs-redesign-pass-2.css` — 257 lines
- `styles/system/products-services-redesign/products-services-repairs-redesign-pass-3.css` — 207 lines
- 10 Repairs-specific lines removed from `styles/components/modal-system.css`

Total retired Repairs-related custom CSS: 1845 lines.

Print-only repair report CSS is intentionally preserved as a special-case print contract.

## Production style inventory after cleanup
- 445 registered local CSS files
- 308 ordered runtime imports
- 86 active bundled Tailwind sources

## Verification actually run
- `npm run prepare:production-styles` — PASS
- second identical regeneration produced the same generated CSS SHA256 — PASS/idempotent
- `npm run audit:production-style-prebuild-v266` — PASS
- `npm run audit:repairs-workspace-no-custom-css-v266` — PASS
- `npm run audit:tailwind-entry-integrity-v266` — PASS
- `npm run audit:style-manifest` — PASS
- v266 source release gate contracts — all 64 checks verified across fail-closed runs/batches; no check was skipped
- malformed `py-2/**/.5` occurrence in runtime CSS/generated CSS — 0
- malformed comment inside `@apply` across bundled sources — 0

## Production build status in this environment
`npm run build` was invoked. The new mandatory prebuild ran first and PASSed, regenerating and validating all style artifacts. Vite itself could not start because this archive does not contain `node_modules`/`vite` in the current environment (`vite: not found`). Therefore a successful production Vite build is not claimed here.

On the supported Windows project environment with dependencies installed, run:

```bat
npm ci
npm run build
```

The prebuild is automatic; do not edit `styles/generated/tailwind-entry.generated.css` manually.
