# MiniApp v255 Release Gate

## `npm run verify:miniapp:source`

Fail-closed source verification. Current manifest contains 44 checks across:

- release identity and stale-build protection
- Telegram WebView / RTL / accessibility contracts
- unified Availability state
- Diagnostic Center and signed Edge probe
- Customer/Partner identity sync and recovery
- Snapshot contract, sync, runtime and safe observability
- offline Edge fallback and Staff offline isolation
- live connectivity, refresh and recovery
- MiniApp API envelope
- Telegram BackButton
- public URL/tunnel/menu reconciliation
- gateway WebP behavior
- build reuse/invalid-build contract

It does **not** claim a production build has passed.

## `npm run verify:miniapp`

Canonical final release gate. It runs all source checks above plus 16 release-only checks:

1. supported Node + local dependency environment
2. MiniApp client typecheck
3. MiniApp server typecheck
4. MiniApp foundation tests
5. MiniApp hardening tests
6. MiniApp production security tests
7. Staff security/runtime tests
8. Telegram authorization tests
9. Telegram identity security tests
10. production-readiness audit
11. production MiniApp build
12. isolated built-output audit
13. built MiniApp browser runtime
14. gateway browser runtime
15. Cloudflare Pages prepare
16. built release/Edge version consistency

The runner stops at the first failure and returns non-zero. Missing dependencies, unsupported Node, absent build artifacts, type errors, runtime errors and deployment-preparation errors are never converted to warnings/skips.

## Platform-only supplemental checks

Windows process-management checks are kept outside the portable release gate and should be run on the intended Windows host where relevant. Their classification is explicit in the release-gate manifest.
