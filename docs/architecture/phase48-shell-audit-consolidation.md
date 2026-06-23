# Phase 48 — Shell Audit Consolidation

## Purpose

Phase 48 consolidates the shell-related audit surface into one command so Header, Sidebar, MainLayout, CommandPalette, MobileBottomNav, and their policy boundaries can be validated together.

Before this phase, shell health required many separate audit commands. That made it easy to forget one check after refactoring the shell. The new command keeps the shell boundary auditable as a single production gate.

## New Command

```bash
npm run audit:shell
```

## What `audit:shell` Runs

The consolidated audit executes the existing dedicated audits for:

- route access matrix
- RBAC alignment
- feature policy alignment
- navigation policy
- shell boundary
- MainLayout shell
- Header decomposition and barrel hygiene
- Sidebar decomposition, row/flyout, and state hook
- CommandPalette decomposition, data hook, state hook, and final orchestrator
- MobileBottomNav decomposition
- icon renderer/static icon contracts
- unused import hygiene

## Extra Consolidated Checks

The command also checks:

- required shell files exist
- shell orchestrators stay under line-count budgets
- `components/shell/index.ts` exposes the public shell boundary
- shell root files do not import page modules directly

## Current Shell Line Counts

```text
MainLayout.tsx: 50
Header.tsx: 158
Sidebar.tsx: 135
MobileBottomNav.tsx: 3 compatibility export
mobile-bottom-nav/MobileBottomNav.tsx: 30
CommandPalette.tsx: 138
```

## Boundary Rule

Future shell work should pass:

```bash
npm run audit:shell
npm run build
```

Use `audit:shell` before build to catch architecture drift before Vite/TypeScript build noise hides the actual regression.

## Rollback

If this phase causes issues, revert only:

- `scripts/audit-shell.mjs`
- `package.json` script entry for `audit:shell`
- `docs/architecture/phase48-shell-audit-consolidation.*`
- `PHASE_48_SHELL_AUDIT_CONSOLIDATION.md`

No runtime component behavior is changed in this phase.
