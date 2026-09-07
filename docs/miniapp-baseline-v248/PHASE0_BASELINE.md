# Kourosh Telegram MiniApp — Phase 0 Baseline (v248)

Date: 2026-08-29  
Source archive: `Kourosh-Store-management-v248-miniapp-new-identity-sync-fix-final.zip`  
Source of truth: `KOUROSH_SOURCE_VERSION = v248`  
Scope: Baseline/audit only. **No runtime, business, identity, snapshot, edge, UI, or deployment behavior was changed in Phase 0.**

## 1. Source-of-truth resolution

The supplied project context file `KOUROSH_CURRENT_STATE.md` still mentions v197 as the last manually known source. The actual attached source contains `KOUROSH_SOURCE_VERSION` with `v248`; therefore v248 is the implementation source of truth for this phase.

## 2. Environment used for the baseline

- OS/runtime used for audit: Linux container
- Node: `v22.16.0`
- npm: `10.9.2`
- Project engine requirement: Node `^22.17.0 || >=24.0.0`, npm `>=10.9.2 <12`
- `node_modules`: absent in supplied ZIP
- `dist-miniapp`: absent in supplied ZIP before tests

Consequences:

- Pure-Node/source-level MiniApp tests and audits can be executed and are authoritative for the code paths they inspect.
- Build/typecheck tests requiring installed project packages cannot be treated as product failures in this environment.
- Windows launcher/tunnel runtime tests cannot be treated as authoritative when run under Linux.

## 3. Current MiniApp architecture baseline

### 3.1 Telegram identity

Current v248 behavior verified from source and `audit:miniapp-new-identity-sync-v248`:

- MiniApp identity continues to authenticate partners by `telegram_user_id`.
- `telegram_chat_id` / delivery chat ids are not promoted to MiniApp authentication identity.
- Customer/partner link and unlink paths trigger an expedited snapshot refresh request after the database identity change.
- The refresh request is intentionally best-effort; a failed snapshot refresh request does not roll back an already committed identity link/unlink.
- Periodic snapshot reconciliation remains the safety net.

Current implementation helper:

`requestMiniAppSnapshotRefreshAfterIdentityChange(delayMs = 1000)`

### 3.2 Snapshot runtime

Verified current invariants:

- Snapshot contract audit passes.
- Snapshot sync test passes.
- Snapshot runtime v192 and v193 tests pass.
- Snapshot observability v194 passes.
- Offline Edge fallback v192 passes.
- Snapshot reconciliation interval remains 5 minutes in the current runtime.

### 3.3 Staff offline policy

Current Edge behavior intentionally blocks offline snapshot reads for staff:

`MINIAPP_STAFF_OFFLINE_UNAVAILABLE`

Customer/partner snapshot fallback remains available subject to the existing authorization and snapshot validity checks. This security policy is preserved for later phases.

### 3.4 Current availability/connectivity semantics

The current source has two related models:

- `MiniAppDataAvailability` — data source/freshness presentation.
- `MiniAppStoreConnectivity` — store online/offline/unknown inference.

Current `resolveMiniAppStoreConnectivity()` behavior is:

- source `live` => `online`
- source `snapshot` with no/invalid timestamp => `unknown`
- source `snapshot` generated within 7 minutes => `online`
- older snapshot => `offline`

Therefore a fresh snapshot can currently produce the title `فروشگاه آنلاین است` with badge `اطلاعات همگام‌شده`. This is an intentional current-source behavior covered by v195/v196 tests, but it is also the semantic area scheduled for redesign in Phase 2 so connectivity, data source, and freshness become independent user-facing concepts.

### 3.5 Global availability refresh behavior

`MiniAppDataAvailabilityContext.beginRequest()` currently clears the previous metadata for a primary request:

`setState({ meta: null, pending: true, requestPath: path })`

This means the global availability state can temporarily lose the last known status while a primary refresh is running. This is not changed in Phase 0; it is recorded for the later Availability/Refresh UX phase.

## 4. Confirmed release/deployment drift

These are baseline findings, not Phase 0 fixes:

- `KOUROSH_SOURCE_VERSION`: `v248`
- `miniapp.html` meta `kourosh-release`: `v197`
- Cloudflare Edge `EDGE_VERSION`: `v197`
- `miniapp/reference/miniAppRelease.ts` human-facing display version: `1.24.02`
- Cloudflare preparation command name still contains historical suffix: `miniapp:cloudflare:prepare-v167`

The Edge test output also reports `edgeVersion: "v197"`, confirming this is observable at runtime/test level, not only a stale comment.

These findings are assigned to Phase 1.

## 5. Accessibility/deployment items recorded for later phases

No changes were made in Phase 0. Confirmed current-source items:

- `miniapp.html` contains `maximum-scale=1` in the viewport meta tag.
- Telegram MiniApp fullscreen/safe-area behavior still needs the dedicated later review.
- Mixed RTL/LTR identifiers remain a later hardening item.

## 6. Test results — current high-value paths

### PASS

The following commands were actually executed and passed in this environment:

- `npm run test:v248`
- `npm run test:miniapp-live-refresh-v235`
- `npm run test:miniapp-edge-v167`
- `npm run audit:miniapp-edge-v167`
- `npm run audit:miniapp-telegram-backbutton-v177`
- `npm run audit:miniapp-api-envelope-v176`
- `npm run audit:miniapp-offline-ux-v168`
- `npm run test:miniapp-store-connectivity-v196`
- `npm run test:miniapp-snapshot-sync-v166`
- `npm run test:miniapp-snapshot-contract-v165`
- `npm run test:miniapp-snapshot-observability-v194`
- `npm run test:miniapp-live-state-v195`
- `npm run test:miniapp-auto-tunnel-v163`
- `npm run test:telegram-dynamic-miniapp-launch-v163`
- `npm run test:miniapp-public-sync-service-v163`
- `npm run test:windows-miniapp-startup-order-v163` (source-level test passed under this environment; this does not replace a real Windows runtime test)
- `npm run test:miniapp-stable-tunnel-v164`
- `npm run audit:miniapp-stable-tunnel-v164`
- `npm run audit:windows-miniapp-tunnel-v162` (static audit only)
- `npm run audit:miniapp-snapshot-contract-v165`
- `npm run audit:miniapp-snapshot-sync-v166`
- `npm run test:miniapp-webp-gateway-v186`
- `npm run audit:miniapp-webp-gateway-v186`
- `npm run audit:miniapp-inline-hero-v187`
- `npm run audit:miniapp-partner-account-v190`
- `npm run audit:miniapp-partner-sections-v191`
- `npm run test:miniapp-snapshot-runtime-v192`
- `npm run audit:miniapp-offline-runtime-v192`
- `npm run test:miniapp-snapshot-runtime-v193`
- `npm run audit:miniapp-new-identity-sync-v248`

### TEST DRIFT / historical assertion drift

These commands were executed and failed because their assertions are coupled to superseded text/assets/style implementation rather than because a current MiniApp runtime invariant was proven broken:

1. `npm run test:miniapp-live-recovery-v236`
   - Failure: expects literal `Snapshot Sync:` in `SettingsTelegramPanel.tsx`.
   - Current source still fetches `/api/settings/miniapp-snapshot/status` and renders snapshot sync state, but the UI is now Persian (`همگام‌سازی اطلاعات`, `آخرین همگام‌سازی`).
   - Classification: **Test Drift**.

2. `npm run audit:miniapp-auto-tunnel-v163`
   - Failure: expects historical literal `Telegram Menu:`.
   - Current Telegram settings UI has since been redesigned and uses Persian/structured status UI.
   - Classification: **Test Drift**.

3. `npm run audit:miniapp-visual-v178`
   - Failure: expects historical visual marker/primitive naming in a page.
   - Classification: **Historical visual audit drift**.

4. `npm run audit:miniapp-premium-v179`
   - Failure: expects historical literal `اطلاعات زنده` in a specific component implementation.
   - Current availability rendering is composed differently.
   - Classification: **Historical UI assertion drift**.

5. `npm run audit:miniapp-home-polish-v180`
   - Failure: expects exact historical Tailwind token `bg-premium-green/90`.
   - Classification: **Historical style snapshot drift**.

6. `npm run audit:miniapp-home-v184`
   - Failure: expects removed asset `miniapp/assets/home-hero-exact-v184.png`.
   - Current repository uses later WebP/public assets.
   - Classification: **Obsolete historical asset audit**.

These tests should not simply be deleted. In Phase 7 each assertion should be either migrated to a current behavioral invariant or archived if the behavior it represented is no longer a product contract.

### ENVIRONMENT / BUILD PREREQUISITE BLOCKED

The following were executed but cannot be interpreted as current product failures from this supplied ZIP:

- `npm run build:miniapp` — `vite: not found` because dependencies are not installed.
- `npm run typecheck:miniapp` — missing React/Jalali/project dependency types because `node_modules` is absent.
- `npm run typecheck:miniapp-server` — missing Node type definitions because `node_modules` is absent.
- `npm run test:miniapp-foundation` — cannot resolve package `tsx` because `node_modules` is absent.
- `npm run audit:miniapp-production-readiness` — same `tsx` prerequisite issue.
- `npm run test:miniapp-runtime` — preview/build runtime prerequisite unavailable.
- `npm run test:miniapp-build-isolation-v150` — `dist-miniapp` does not exist.
- `npm run test:miniapp-gateway-browser-v150` — requires the MiniApp build directory.

Other tests defined with `node --import tsx` have the same dependency prerequisite and were not falsely reported as passed.

### PLATFORM BLOCKED / non-authoritative under Linux

- `npm run test:windows-miniapp-tunnel-v162`
- `npm run test:miniapp-public-access-v162`

Both hit Windows process-management behavior and are not authoritative from this Linux environment. They must be re-run on the project's supported Windows environment after dependencies/build prerequisites are present.

## 7. What `test:v248` currently guarantees

The current v248 aggregate test executes:

1. `audit:miniapp-new-identity-sync-v248`
2. `test-miniapp-snapshot-runtime-v193.mjs`
3. `test-miniapp-offline-edge-v192.mjs`
4. `audit:style-manifest`

This is useful but **not a complete MiniApp release gate**. It does not include all current high-value checks such as live refresh/recovery, API envelope, Telegram BackButton, build/typecheck, Edge version consistency, or Windows production-path verification.

The unified release gate is intentionally deferred to Phase 7 after the behavior changes in Phases 1–6 stabilize.

## 8. Phase 0 exit status

Phase 0 is complete when interpreted as the agreed baseline phase:

- [x] Actual source version verified as v248.
- [x] Relevant MiniApp architecture traced from source.
- [x] Current high-value source-level tests executed where environment permits.
- [x] Current PASS paths recorded.
- [x] Historical Test Drift separated from product failures.
- [x] Build/dependency/platform blockers separated from product failures.
- [x] Known release-version drift recorded for Phase 1.
- [x] Current connectivity semantics recorded for Phase 2.
- [x] No runtime behavior changed.

## 9. Handoff to Phase 1

Phase 1 should start from this unchanged v248 runtime baseline and make only the release/deployment identity cleanup:

- establish one source of truth for deploy/release identity,
- remove hard-coded runtime `v197` drift from HTML and Edge,
- make Cloudflare preparation command version-neutral,
- add a release-consistency audit,
- preserve all current identity/snapshot/security behavior.
