# v337 final validation summary

## Accounting governance

- `audit:release`: PASS. The accounting governance v337 audit remains the final canonical release audit.
- `verify:miniapp:source`: PASS, 65/65 checks.
- `accountingGovernanceV337.test.mjs`: PASS.
- Validation on a copy of the real SQLite database: PASS.
- Applied migration rows: 3; missing SHA256 checksums: 0.
- SQLite accounting period lock triggers: 48.
- Behzad supplier receivable before/after governance migration: 284,100,000 toman.
- Behzad ledger increases: 690,600,000; reductions/payments: 406,500,000; 32 ledger rows.
- Behzad profit allocation remains separate: 196,417,423 toman across 188 allocations.
- Snapshot update/delete mutation is blocked as append-only.
- Closed-period changes are blocked for sales order totals, cash-sale items, installment-sale items, installment receipts and profit allocations.
- Validation backup SHA256 sidecar verification: PASS.

## Deterministic release tooling

- Release runtime pinned to Node 24.11.1 via `.nvmrc` and `.node-version`.
- npm pinned to 11.6.2 via `.npm-version` and `packageManager`.
- Existing GitHub quality/safety workflows now consume `.nvmrc` instead of a floating Node 22 line.
- New `.github/workflows/release-gate-v337.yml` uses a package-lock keyed project npm cache.
- The seed job runs a locked install, immediately proves an offline reinstall, executes `audit:release`, production build and the Full MiniApp gate, then uploads a portable cache artifact.
- A second fresh runner downloads that cache artifact, forces the npm registry to `127.0.0.1:9`, runs strict `npm ci --offline`, and reruns release audit + production build + Full MiniApp gate.
- Cache identity is fail-closed against release, Node, npm and SHA256 of `package-lock.json`.

## Local environment limitation

The current execution container has Node 22.16.0, npm 10.9.2 and no project `node_modules`. The new toolchain verifier correctly rejects this environment. The remote GitHub workflow is therefore included but cannot be triggered from this extracted ZIP/container because it has no connected Git repository/remote in this session.
