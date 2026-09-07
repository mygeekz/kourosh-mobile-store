# MiniApp v248 — Phase 0 Test Matrix

Legend:
- **PASS**: executed and passed.
- **TEST DRIFT**: executed; failure is tied to superseded exact text/style/asset assertion.
- **ENV BLOCKED**: executed or inspected; missing installed dependencies/build artifacts prevent authoritative result.
- **PLATFORM BLOCKED**: requires the intended Windows runtime for authoritative execution.
- **DEFERRED**: not run because it is redundant with a proven prerequisite class or is not a release test (server/benchmark/start command).

| Area | Command | Phase 0 status | Notes |
|---|---|---:|---|
| v248 aggregate | `npm run test:v248` | PASS | Identity refresh + snapshot runtime + offline edge + style manifest |
| Identity sync | `npm run audit:miniapp-new-identity-sync-v248` | PASS | Current v248 regression |
| Snapshot contract | `npm run test:miniapp-snapshot-contract-v165` | PASS | Current contract still valid |
| Snapshot contract audit | `npm run audit:miniapp-snapshot-contract-v165` | PASS | Static contract audit |
| Snapshot sync | `npm run test:miniapp-snapshot-sync-v166` | PASS | Runtime/source test |
| Snapshot sync audit | `npm run audit:miniapp-snapshot-sync-v166` | PASS | Static audit |
| Snapshot runtime | `npm run test:miniapp-snapshot-runtime-v192` | PASS | Runtime behavior |
| Snapshot runtime | `npm run test:miniapp-snapshot-runtime-v193` | PASS | Current v248 aggregate dependency |
| Snapshot observability | `npm run test:miniapp-snapshot-observability-v194` | PASS | Safe diagnostics |
| Offline Edge | `npm run test:miniapp-offline-edge-v192` | PASS | Included through v248 and separately reviewed |
| Offline runtime audit | `npm run audit:miniapp-offline-runtime-v192` | PASS | Static audit |
| Edge | `npm run test:miniapp-edge-v167` | PASS | Also exposes stale `edgeVersion=v197` |
| Edge audit | `npm run audit:miniapp-edge-v167` | PASS | Current source still satisfies old edge invariants |
| Availability | `npm run test:miniapp-live-state-v195` | PASS | Passes current semantics; semantics intentionally change in Phase 2 |
| Connectivity | `npm run test:miniapp-store-connectivity-v196` | PASS | Fresh snapshot <=7 min currently means online |
| Live refresh | `npm run test:miniapp-live-refresh-v235` | PASS | Current refresh behavior |
| Live recovery | `npm run test:miniapp-live-recovery-v236` | TEST DRIFT | Expects obsolete literal `Snapshot Sync:` |
| API envelope | `npm run audit:miniapp-api-envelope-v176` | PASS | Current consumers unwrap data/meta |
| Telegram BackButton | `npm run audit:miniapp-telegram-backbutton-v177` | PASS | Compatibility audit |
| Offline UX | `npm run audit:miniapp-offline-ux-v168` | PASS | Current audit passes |
| Public sync | `npm run test:miniapp-public-sync-service-v163` | PASS | Source-level runtime test |
| Dynamic Telegram launch | `npm run test:telegram-dynamic-miniapp-launch-v163` | PASS | Source-level runtime test |
| Auto tunnel | `npm run test:miniapp-auto-tunnel-v163` | PASS | Test passes |
| Auto tunnel audit | `npm run audit:miniapp-auto-tunnel-v163` | TEST DRIFT | Expects obsolete `Telegram Menu:` text |
| Stable tunnel | `npm run test:miniapp-stable-tunnel-v164` | PASS | Source-level test |
| Stable tunnel audit | `npm run audit:miniapp-stable-tunnel-v164` | PASS | Static audit |
| Windows startup order | `npm run test:windows-miniapp-startup-order-v163` | PASS | Source-level only; not substitute for Windows runtime |
| Windows tunnel audit | `npm run audit:windows-miniapp-tunnel-v162` | PASS | Static audit only |
| Windows tunnel runtime | `npm run test:windows-miniapp-tunnel-v162` | PLATFORM BLOCKED | Windows process-management path |
| Public access v162 | `npm run test:miniapp-public-access-v162` | PLATFORM BLOCKED | Enters Windows gateway process-management path |
| WebP gateway | `npm run test:miniapp-webp-gateway-v186` | PASS | Current assets/gateway behavior |
| WebP gateway audit | `npm run audit:miniapp-webp-gateway-v186` | PASS | Static audit |
| Inline hero | `npm run audit:miniapp-inline-hero-v187` | PASS | Current audit passes |
| Partner account | `npm run audit:miniapp-partner-account-v190` | PASS | Current audit passes |
| Partner sections | `npm run audit:miniapp-partner-sections-v191` | PASS | Current audit passes |
| Visual v178 | `npm run audit:miniapp-visual-v178` | TEST DRIFT | Historical primitive marker assertion |
| Premium v179 | `npm run audit:miniapp-premium-v179` | TEST DRIFT | Historical exact copy assertion |
| Home polish v180 | `npm run audit:miniapp-home-polish-v180` | TEST DRIFT | Historical exact class assertion |
| Home v184 | `npm run audit:miniapp-home-v184` | TEST DRIFT | Removed historical asset expected |
| Client typecheck | `npm run typecheck:miniapp` | ENV BLOCKED | Dependencies/types absent from ZIP |
| Server typecheck | `npm run typecheck:miniapp-server` | ENV BLOCKED | `@types/node` absent with no node_modules |
| MiniApp build | `npm run build:miniapp` | ENV BLOCKED | `vite` absent with no node_modules |
| Foundation TS test | `npm run test:miniapp-foundation` | ENV BLOCKED | `tsx` package absent |
| Production readiness TS audit | `npm run audit:miniapp-production-readiness` | ENV BLOCKED | `tsx` package absent |
| Built runtime preview | `npm run test:miniapp-runtime` | ENV BLOCKED | Build/runtime prerequisite unavailable |
| Build isolation | `npm run test:miniapp-build-isolation-v150` | ENV BLOCKED | `dist-miniapp` absent |
| Gateway browser runtime | `npm run test:miniapp-gateway-browser-v150` | ENV BLOCKED | `dist-miniapp` absent |
| Server/start/benchmark commands | `serve:*`, `start:*`, `benchmark:*` | DEFERRED | Not release tests for Phase 0 baseline |

Raw command logs are retained under `logs/` for reproducibility.
