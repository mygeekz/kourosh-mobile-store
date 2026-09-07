# MiniApp Phase 4 / v252 — Test Report

## Scope
Phase 4 adds an admin-only MiniApp Diagnostic Center for customer/partner access diagnosis without changing financial business logic, Staff authorization, or snapshot payload contents.

## Release
- Source release: `v252`
- MiniApp HTML release marker: `v252`
- Cloudflare Edge release marker: `v252`

## Diagnostic chain
The diagnostic report checks, in order:
1. Local customer/partner Telegram binding.
2. MiniApp identity resolution and ambiguity/mismatch.
3. Snapshot runtime readiness.
4. Per-subject local publication/sync state.
5. Signed metadata-only Cloudflare Edge snapshot probe.
6. Live Origin `/healthz` probe.
7. Overall MiniApp access readiness.

Each run receives a correlation ID (`diag_...`) and a recommended action.

## Security invariants
- Diagnostic API routes are Admin-only.
- Edge diagnostic endpoint requires the existing connector installation + credential signature.
- Replay protection is required on Edge.
- Edge diagnostics return snapshot metadata only.
- Edge diagnostics do not return `payload_json`, `subjectKey`, Telegram User ID, or financial data.
- No Staff snapshot was added.
- The diagnostic center does not forge or bypass Telegram `initData`; real Telegram signature validity is only verifiable during a real user login.

## Executed tests
`npm run test:v252` — **PASS** (exit code 0).

The gate includes:
- release identity sync/audit v252
- Cloudflare prepare stale-build guard v252
- Diagnostic Center structural/security audit
- signed diagnostics protocol tests
- Edge diagnostics metadata/replay/tamper tests
- Phase 3 identity-sync audits/recovery tests
- Phase 2 availability semantics regression
- Phase 1 release/Cloudflare regressions
- v248 identity regression
- snapshot runtime/fallback/observability regressions
- Staff Edge isolation regression
- live refresh regression

Additional checks:
- `node --check deployment/cloudflare-pages/_worker.js` — PASS
- targeted TypeScript parser checks on the new TS/TSX files — no non-environment diagnostics; missing dependency/type modules are expected because `node_modules` is absent.

## Production build
`npm run build:miniapp` was executed.

Result: **environment-blocked**, not claimed as PASS.
The release-sync step passed, then the command stopped at `vite: not found` because the supplied archive does not contain installed `node_modules`.

See:
- `logs/test-v252.log`
- `logs/build-miniapp.log`

## Deployment after installing dependencies
```bash
npm run test:v252
npm run build:miniapp
npm run miniapp:cloudflare:prepare
npx wrangler pages deploy dist-miniapp --project-name kourosh
```
