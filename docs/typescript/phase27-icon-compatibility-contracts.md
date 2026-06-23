# Phase 27 — Icon Compatibility Contract Audit

Canonical shared UI primitives now use ReactNode icon props. This keeps rendering decisions at call sites and prevents shared components from accepting mixed icon formats indefinitely.

## Canonical rule

```tsx
icon?: React.ReactNode
```

## Deprecated rule

```tsx
icon?: string | React.ReactNode
```

## EmptyState migration
All public `EmptyState` call sites now pass ReactNode icons. Internal inferred EmptyState icons remain FontAwesome class strings because they are private implementation details, not public API.

## Audit

```bash
npm run audit:icons
```

This audit fails if:

- canonical shared UI primitives expose `string | ReactNode`
- `EmptyState` accepts public string icons
- any `<EmptyState icon="..." />` consumer remains

## Explicitly tolerated for now

- navigation metadata icons in `constants.tsx`
- report-local KPI icon strings
- Smart Insight metadata icon strings
- notification/status metadata icon strings

Those should be handled by a dedicated metadata-icon phase, not mixed with shared primitive cleanup.
