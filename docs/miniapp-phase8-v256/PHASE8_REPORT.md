# Kourosh MiniApp Phase 8 — v256 Release Candidate

Date: 2026-08-29
Source: v255 Phase 7 final
Target: v256

## Scope

Phase 8 does not add a product feature. It adds Release Candidate verification around the MiniApp roles, offline/reconnect behavior, infrastructure failure modes, and external sign-off evidence.

Runtime business logic, financial logic, database schema, Bot behavior, Identity sync implementation, Snapshot payloads, Diagnostic protocol, Availability UI and Staff authorization were not refactored in this phase.

## Automated RC matrix

### Role/reconnect matrix — PASS

`test:miniapp-rc-role-matrix-v256`

Verified automatically against the Cloudflare Edge worker:

- Customer live -> live response
- Customer local-origin failure -> own snapshot
- Partner live -> live response
- Partner local-origin failure -> own snapshot
- Staff live -> live response
- Staff local-origin failure -> `MINIAPP_STAFF_OFFLINE_UNAVAILABLE`
- Customer cannot read Partner routes
- Partner cannot read Customer routes
- Customer reconnect snapshot -> live
- Partner reconnect snapshot -> live
- Staff reconnect offline-denied -> live

### Infrastructure failure/recovery matrix — PASS

`test:miniapp-rc-infrastructure-matrix-v256`

Verified:

- unavailable live origin + valid snapshot -> snapshot
- HTML/tunnel error disguised as HTTP 200 -> snapshot, not fake live
- missing snapshot -> `MINIAPP_OFFLINE_SNAPSHOT_UNAVAILABLE`
- expired snapshot -> `MINIAPP_OFFLINE_SNAPSHOT_EXPIRED`
- revoked identity snapshot -> `MINIAPP_ACCOUNT_UNLINKED`
- snapshot installation mismatch -> rejected
- D1 snapshot read failure -> `MINIAPP_EDGE_STORAGE_UNAVAILABLE` + Retry-After
- revoked installation -> rejected
- live 4xx authorization rejection does not bypass to snapshot
- origin recovery -> snapshot -> live
- cross-origin request -> rejected

## Release gate

`npm run test:v256` / `npm run verify:miniapp:source`

Result: **48/48 PASS**.

The v256 source gate contains the v255 contract coverage plus:

- v256 release identity
- v256 Cloudflare stale-build guard
- RC role/reconnect matrix
- RC infrastructure failure matrix
- RC evidence-gate self-test
- RC structure/security audit

## RC evidence gate

The repository intentionally does **not** include `config/quality/miniapp-rc-evidence-v256.json`.

Only the non-passing template is shipped:

`config/quality/miniapp-rc-evidence-v256.example.json`

The real local evidence file is `.gitignore`d. `verify:miniapp:rc:evidence-v256` fails unless all required physical/production checks have PASS evidence.

Evidence verifier self-test: PASS

- valid temporary evidence accepted
- PENDING evidence rejected
- evidence containing sensitive fields rejected

## Full production gate in this environment

`npm run verify:miniapp`

Result: **FAIL at environment check, by design**.

Observed environment:

- Node: 22.16.0
- Required Node: ^22.17.0 or >=24
- missing local project dependencies: TypeScript, Vite, TSX, React, React DOM, Puppeteer Core, Jalali Moment

The gate stopped before typecheck/build rather than converting missing prerequisites to warnings.

Independent checks also confirmed:

- `build:miniapp` -> blocked at `vite: not found`
- `typecheck:miniapp` -> blocked by missing React/Jalali Moment modules/types
- `typecheck:miniapp-server` -> blocked by missing Node type definitions

These are environment/dependency blockers and are **not recorded as PASS**.

## External E2E status

Production/physical E2E is **PENDING**, because this environment cannot impersonate or access the user's real Telegram accounts, Windows host, Telegram iOS/Android/Desktop apps, or perform the user's actual Cloudflare production deployment.

Required sign-off is defined in `EXTERNAL_E2E_CHECKLIST.md` and enforced by `verify:miniapp:rc:evidence-v256`.

## RC status

- Automated source RC: **PASS**
- Runtime regression suite: **PASS**
- Release identity: **v256**
- Full supported-environment build/typecheck: **PENDING / blocked in this environment**
- Physical Telegram multi-account E2E: **PENDING**
- Actual Cloudflare deployment evidence: **PENDING**
- Final Production RC approval: **NOT YET SIGNED OFF**

This status is deliberate: v256 is a release-candidate package with fail-closed external sign-off, not a fabricated production approval.
