# Phase 24 — Legacy UI Prop Mismatch Cleanup

## Goal

Close confirmed prop-contract drift between the newer shared UI primitives and older screens without changing business logic, routes, storage, or visual layout.

## Changes

### `components/ui/ControlShell.tsx`

- Accepts safe `data-*` attributes on the shell wrapper.
- Spreads shell-level props onto the root `<label>` wrapper.
- Keeps canonical field-shell behavior intact.

This preserves older field wrappers that still pass metadata such as `data-ui-control-kind` while avoiding scattered one-off changes in each consumer.

### `components/ui/EmptyState.tsx`

- Keeps canonical `title` support.
- Adds legacy `text` alias used by older report tables.
- Promotes `text` to title when `title` is not provided.
- Supports both icon class strings and React nodes.

This fixes report-level legacy usages such as `<EmptyState text="..." />` without rewriting the report markup.

## Audit

New command:

```bash
npm run audit:ui-props
```

Generated audit output:

```text
docs/typescript/phase24-ui-prop-contracts.json
```

## Non-goals

- No UI redesign.
- No route/policy changes.
- No report logic changes.
- No removal of legacy consumers yet.

## Next cleanup candidate

After this phase is stable, legacy `<EmptyState text="..." />` call sites can be migrated gradually to the canonical `title` prop, but this phase intentionally keeps backward compatibility first.
