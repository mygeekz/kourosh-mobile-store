# Phase 26 — EmptyState Adapter Removal

The temporary `text` alias on the shared `EmptyState` primitive has been removed after the known legacy consumers were migrated to `title`.

Canonical usage:

```tsx
<EmptyState title="داده‌ای برای نمایش وجود ندارد" />
```

Legacy usage is now forbidden for the shared primitive:

```tsx
<EmptyState text="..." />
```

Guardrails:

- `npm run audit:empty-state-consumers`
- `npm run audit:empty-state-adapter`
- `npm run audit:ui-props`
