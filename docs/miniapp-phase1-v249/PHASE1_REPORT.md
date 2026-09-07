# Mini App Phase 1 — v249 Release Identity Baseline

Date: 2026-08-29
Source: Phase 0 baseline v248
Output release: v249

## Objective
Remove active runtime release drift and make Cloudflare preparation fail closed when a stale Mini App build is about to be deployed.

## Scope boundary
No customer/partner/staff authentication behavior was changed. No snapshot schema, snapshot authorization, financial data, Telegram Bot behavior, or online/offline semantics were changed in this phase.

## Implemented

1. **Single release source**
   - `KOUROSH_SOURCE_VERSION` = `v249`
   - New `scripts/lib/kourosh-release.mjs` validates and exposes the source release.

2. **Runtime release consistency**
   - `miniapp.html` release marker synchronized to v249.
   - Cloudflare Edge `EDGE_VERSION` synchronized to v249.
   - Local Mini App Gateway runtime version now derives from `KOUROSH_SOURCE_VERSION`.
   - Windows Gateway launcher expected version derives from the same source.

3. **Build synchronization**
   - New `npm run sync:miniapp-release`.
   - `npm run build:miniapp` runs release sync before Vite.

4. **Cloudflare prepare cleanup**
   - New canonical command: `npm run miniapp:cloudflare:prepare`.
   - Historical `miniapp:cloudflare:prepare-v167` remains as a compatibility alias.
   - Prepare verifies the release embedded in `dist-miniapp/miniapp.html` equals the current source release.
   - A stale/missing release fails before a deployable `_worker.js` is generated.
   - Prepared Edge worker is stamped with the current release.

5. **Regression test compatibility**
   - v195/v196 tests no longer hard-code v197.
   - v248 identity regression accepts v248 and compatible successors.
   - New v249 release audit and Cloudflare prepare regression test added.

## Verification performed

- `node scripts/sync-miniapp-release-identity.mjs --check` — PASS
- `node scripts/audit-miniapp-release-v249.mjs` — PASS
- `node scripts/test-miniapp-cloudflare-prepare-v249.mjs` — PASS
  - stale v248 build rejected
  - current v249 build accepted
  - prepared Edge worker stamped v249
- `npm run test:v249` — PASS
- `npm run test:miniapp-edge-v167` — PASS with Edge logs reporting v249
- `node scripts/test-miniapp-snapshot-observability-v194.mjs` — PASS
- `npm run test:miniapp-live-refresh-v235` — PASS
- Node syntax checks for all changed `.mjs` test/runtime files — PASS

## Environment limitation
`node_modules` is absent from the supplied archive. Therefore `npm run build:miniapp` / Vite production build was not executed and is not claimed as verified here. The deployment prepare behavior was tested through a temporary synthetic `dist-miniapp` fixture, including stale-build rejection.

## Active release result

- Source release: `v249`
- Mini App HTML release: `v249`
- Edge source release: `v249`
- Edge runtime test logs: `v249`
- Gateway runtime/expected release: derived dynamically from source release

Historical test/script names such as `test:v197` remain for regression history; they are not active runtime release markers.

## Next roadmap phase
Phase 2 / v250: separate Connectivity, Data Source, and Freshness semantics so a recent snapshot is no longer presented as a live store connection.
