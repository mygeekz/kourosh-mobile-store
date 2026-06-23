# Phase 49 — Production Audit Consolidation

This document defines the production audit command surface for the Kourosh Partner project.

## Commands

| Command | Purpose |
|---|---|
| `npm run audit:production` | Runs release-relevant audits. Skips dependency-backed TypeScript checks only when `node_modules/.bin/tsc` is unavailable. |
| `npm run audit:production:strict` | Requires TypeScript-backed audits. Use this after dependency installation and in CI/release verification. |
| `npm run verify:production` | Runs strict production audit and then the production build. |

## Standard mode

Standard mode is intended for lightweight handoff environments where dependencies may not be installed. It still validates policy, shell, UI contracts, icon contracts, and unused import checks.

## Strict mode

Strict mode is the release gate. It enforces all standard checks plus targeted TypeScript audits for Settings, Reports, and structural type-triage buckets.

## Production release recommendation

Before merging a release candidate, run:

```bash
npm install
npm run verify:production
```

If `verify:production` fails, the failed audit group should be fixed before running the build again.
