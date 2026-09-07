# MiniApp Phase 7 — v255 Report

## Scope

Phase 7 changes release verification only. No MiniApp business logic, financial logic, snapshot payload, identity authorization, Staff permission model, Diagnostic Center protocol or runtime UI behavior was intentionally changed.

## Implemented

- Added machine-readable release-gate manifest: `config/quality/miniapp-release-gate-v255.json`.
- Added fail-closed source runner: `npm run verify:miniapp:source`.
- Added canonical full release runner: `npm run verify:miniapp`.
- Added `npm run test:v255` as the source-regression compatibility alias.
- Added release-environment gate for supported Node and required local dependencies.
- Added post-build verification that `dist-miniapp/miniapp.html` and prepared `_worker.js` both carry the current release.
- Added v255 release identity / Cloudflare stale-build tests.
- Repaired active historical Test Drift without weakening their behavioral contracts.
- Explicitly registered superseded historical UI tests instead of silently deleting them.

## Executed verification in this environment

### PASS

`npm run verify:miniapp:source`

- 44 / 44 source checks passed.
- Final source-gate duration in the recorded run: ~25 seconds.
- Edge tests reported `edgeVersion: v255`.

### Full gate — correctly blocked by environment

`npm run verify:miniapp`

The gate completed all 44 source checks and then failed at the environment check with non-zero exit status because:

- current Node: `22.16.0`
- project Node requirement: `^22.17.0 || >=24`
- project `node_modules` is absent from the supplied archive
- required local packages such as `typescript`, `vite`, `tsx`, `react`, `react-dom`, `puppeteer-core` and `jalali-moment` are unavailable

This is the intended fail-closed behavior and is **not** reported as a release PASS.

Direct probes confirm the same environment limitation:

- `npm run typecheck:miniapp` -> not passed; React/Jalali type dependencies are missing.
- `npm run build:miniapp` -> release sync passes, then `vite: not found`.
- `npm run audit:miniapp-production-readiness` -> `tsx` package unavailable.

Raw logs are stored under `docs/miniapp-phase7-v255/logs/`.

## Production command

On the supported production/development machine with dependencies installed:

```bash
npm run verify:miniapp
npx wrangler pages deploy dist-miniapp --project-name kourosh
```

Do not deploy if `verify:miniapp` is non-zero.
