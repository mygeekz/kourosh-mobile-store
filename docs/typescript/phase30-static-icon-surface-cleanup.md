# Phase 30 — Static Icon Surface Cleanup

## Scope

This phase centralizes static FontAwesome rendering in the high-traffic shell/search navigation surfaces:

- `components/Header.tsx`
- `components/CommandPalette.tsx`
- `components/MobileBottomNav.tsx`

Report-heavy, chart-heavy, and legacy data surfaces were intentionally left out of scope.

## Changes

- Static `<i className="fa-..." />` usage in Header was migrated to `FontAwesomeIcon`.
- Static `<i className="fa-..." />` usage in CommandPalette was migrated to `FontAwesomeIcon`.
- MobileBottomNav was verified to already use the canonical renderer.
- Icon-specific classes were split from styling classes where practical.
- Dynamic metadata icons continue to render through `FontAwesomeIcon`.

## Audit

Run:

```bash
npm run audit:static-icons
```

This audit verifies that the Phase 30 target surfaces do not render raw `<i>` icon elements and that expected canonical renderer call sites remain present.

## Non-goals

- No route changes.
- No RBAC/feature-flag changes.
- No report UI migration.
- No icon library replacement.
- No visual redesign.
