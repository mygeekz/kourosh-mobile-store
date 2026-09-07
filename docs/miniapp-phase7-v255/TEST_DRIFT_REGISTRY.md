# MiniApp v255 — Test Drift Registry

Phase 7 converts MiniApp release verification from a historical version-chain into an explicit current contract.

## Drift repaired and kept active

These tests still protect valid product behavior, but their assertions were tied to older implementation/copy. They were updated rather than skipped:

| Script | Drift found | Current contract asserted |
| --- | --- | --- |
| `test:miniapp-live-recovery-v236` | expected obsolete English `Snapshot Sync:` | localized `همگام‌سازی اطلاعات:` snapshot-status surface |
| `audit:miniapp-auto-tunnel-v163` | expected obsolete English `Telegram Menu:` | localized `منوی تلگرام:` status surface |
| `audit:miniapp-offline-runtime-v192` | expected direct `meta?.source` decisions in Partner pages | centralized `AvailabilityViewModel` + shared Partner header |
| `audit:miniapp-edge-v167` | treated the stale-build error message `npm run build:miniapp` as proof that prepare triggers a build | verifies there is no executable child-process/Vite build invocation |
| `audit:telegram-stable-url-v169` | expected obsolete English BotFather copy | current Persian one-time stable MiniApp configuration guidance |
| `test:telegram-menu-preservation-v197` | emitted a fixed historical `release: v197` diagnostic | reports current `KOUROSH_SOURCE_VERSION` dynamically |

## Historical tests explicitly excluded from the active release gate

These remain callable for archaeology, but they assert superseded UI details and are not release blockers:

| Script | Reason |
| --- | --- |
| `audit:miniapp-visual-v178` | superseded visual primitive markers |
| `audit:miniapp-premium-v179` | superseded exact UI copy contract |
| `audit:miniapp-home-polish-v180` | superseded historical class contract |
| `audit:miniapp-home-v184` | superseded removed asset contract |
| `test:miniapp-store-connectivity-v196` | superseded by v250 rule: snapshot is never live |
| `test:miniapp-live-state-v195` | superseded by v250 live/offline presentation semantics |

No excluded test is silently swallowed by the runner. The list is machine-readable in `config/quality/miniapp-release-gate-v255.json`, and the v255 gate audit verifies excluded tests cannot leak back into the active release gate.
