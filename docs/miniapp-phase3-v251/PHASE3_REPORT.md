# Mini App Phase 3 — v251 Identity Sync Hardening

Date: 2026-08-29
Source: v250 Phase 2 availability-semantics release
Output release: v251

## Objective
Harden Customer/Partner Telegram identity synchronization so a committed local identity change converges to Cloudflare snapshot state with explicit `pending / ready / failed` status and bounded retry, without ever rolling back the already-committed local identity because of a Cloud/Edge failure.

Also give the Mini App a short bounded recovery window when Edge is temporarily missing the snapshot for a just-linked identity instead of immediately presenting the final offline error.

## Server-side identity synchronization

A new pure coordinator was added:

`server/cloud/snapshots/miniAppIdentitySyncCoordinator.ts`

Each Customer/Partner identity mutation creates the latest operation for that local subject with:

- `pending`
- `ready`
- `failed`

The operation records:

- operation id
- identity kind (`customer` / `partner`)
- local subject id
- operation (`link` / `unlink`)
- attempt count
- maximum attempts
- requested / updated / ready / failed timestamps
- last synchronization error code

Telegram User ID is deliberately retained only in the internal synchronization target and is stripped from the public status object.

### Retry contract

Server reconciliation attempts are bounded to:

1. immediate
2. +1 second
3. +2 seconds
4. +4 seconds

There is no infinite retry loop. Periodic Snapshot reconciliation remains the long-term safety net.

If a periodic reconciliation later makes a previously failed target consistent, reading its status upgrades it from `failed` to `ready`.

A newer identity operation for the same Customer/Partner supersedes the older pending operation.

## Readiness definition

Scheduling a refresh is not considered success.

For a link, `ready` means the locally persisted Snapshot runtime state contains the exact expected Telegram identity for the same Customer/Partner.

For an unlink, `ready` means that subject no longer exists in the persisted active Snapshot runtime state, which means a previously published identity has either been revoked successfully or there was never an active persisted snapshot to revoke.

Per-subject synchronization errors are tracked separately so the status of one Customer/Partner does not accidentally inherit an unrelated subject's failure when diagnostic UI is added in Phase 4.

## Identity mutation coverage

The new targeted synchronization is scheduled after the local DB transaction commits for:

- Partner one-time Telegram token redemption
- Customer link by verified identity
- Partner link by verified identity
- Customer unlink
- Partner unlink

The helper remains lazy-loaded and fire-and-forget. A Cloud synchronization error cannot roll back the successful local DB identity change.

### Staff security invariant

Staff is intentionally excluded from this Snapshot identity coordinator.

No Staff Snapshot was introduced. Staff Mini App access remains live-only.

## Mini App transitional recovery

A pure client recovery module was added:

`miniapp/auth/miniAppIdentitySyncRecovery.ts`

Only this transient Edge auth failure is retried automatically:

`MINIAPP_OFFLINE_SNAPSHOT_UNAVAILABLE`

Client retry delays are:

- 1 second
- 2 seconds
- 4 seconds

This gives a maximum of four auth attempts including the original request.

During this bounded window, the bootstrap UI enters `syncing` and shows:

`در حال بررسی و همگام‌سازی اطلاعات حساب…`

with title:

`همگام‌سازی حساب`

After the retry budget is exhausted, the original Edge error is preserved and shown normally. Errors such as `MINIAPP_ACCOUNT_UNLINKED` are not delayed or masked.

Auth fetches now accept an `AbortSignal`, so closing/unmounting the Telegram WebView can cancel a pending auth request/retry delay.

## Release / deployment identity

Release source of truth is now v251 and Phase 1 guarantees remain intact:

- Mini App HTML marker: v251
- Edge worker marker: v251
- Gateway release reads the central source
- canonical Cloudflare command remains `npm run miniapp:cloudflare:prepare`
- stale `dist-miniapp` builds are rejected

Historical v248/v250 regression checks were made successor-compatible where they previously asserted an exact release string; their behavioral assertions remain intact.

## Files materially changed

- `KOUROSH_SOURCE_VERSION`
- `miniapp.html` (release marker)
- `deployment/cloudflare-pages/_worker.js` (release marker)
- `server/services/telegramIdentitySecurity.service.ts`
- `server/cloud/snapshots/miniAppSnapshotRuntime.ts`
- `server/cloud/snapshots/miniAppIdentitySyncCoordinator.ts` (new)
- `miniapp/apiClient.ts`
- `miniapp/auth/MiniAppAuthContext.tsx`
- `miniapp/auth/miniAppIdentitySyncRecovery.ts` (new)
- `miniapp/App.tsx`
- `package.json`
- v248/v250 compatibility regression assertions
- new v251 audits/tests/docs

No financial/business logic, database schema, snapshot payload schema, Telegram Bot behavior, Staff Snapshot capability, or tenant-isolation rule was changed.

## Verification actually executed

`npm run test:v251` — PASS

This gate includes and passed:

- v251 release synchronization/audit
- Cloudflare stale-build rejection
- v251 identity-sync source audit
- server identity-sync coordinator behavioral tests
- Mini App identity-sync recovery behavioral tests
- v250 availability semantics regressions
- v248 identity-sync regression
- Snapshot runtime regression
- offline Edge snapshot fallback regression
- style manifest audit
- Edge regression suite
- live refresh regression

The server coordinator tests cover:

- pending → ready
- explicit failed after bounded attempts
- eventual periodic recovery from failed → ready
- supersession of an older operation
- exclusion of Telegram User ID from public status

The client recovery tests cover:

- 1s / 2s / 4s retry sequence
- maximum four auth attempts
- retry only for missing offline snapshot
- no retry for `MINIAPP_ACCOUNT_UNLINKED`
- preservation of the original final failure

Pure TypeScript syntax checks for the new dependency-free coordinator/recovery modules also passed using Node's strip-types mode.

## Production-build limitation

`npm run build:miniapp` was attempted.

Result: blocked at `vite: not found` because the supplied archive contains no `node_modules`.

Therefore a Vite production-build success is not claimed in this delivery environment.

On the normal project machine with dependencies installed, execute:

```bash
npm run test:v251
npm run build:miniapp
npm run miniapp:cloudflare:prepare
npx wrangler pages deploy dist-miniapp --project-name kourosh
```

## Deferred by roadmap

Phase 3 intentionally does not add the management Diagnostic Center UI. The new identity-sync status APIs inside the runtime are the foundation that Phase 4 / v252 can surface safely.

Also deferred:

- unified Availability ViewModel / refresh-state preservation — Phase 5
- Telegram viewport/fullscreen/accessibility/RTL cleanup — Phase 6
- unified final Release Gate cleanup of historical test drift — Phase 7

## Next roadmap phase

Phase 4 / v252: Mini App Diagnostic Center for administrators, using the v251 identity-sync state plus Live Origin, local Snapshot runtime, Cloud/Edge reachability, identity binding and request diagnostics.
