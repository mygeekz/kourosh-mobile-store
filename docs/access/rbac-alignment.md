# RBAC Alignment — Phase 15

Phase 15 makes `utils/rbac.ts` consume the documented route access matrix instead of maintaining a second manual prefix table.

## Source of truth

Route access now flows from:

```text
app/routes/routeAccessMatrix.ts
```

The generated/docs mirror remains:

```text
docs/access/route-access-matrix.json
docs/access/route-access-matrix.md
```

## What changed

- Removed the local `PATH_RULES` table from `utils/rbac.ts`.
- Added `getRouteAccessEntryForPath(path)` to resolve exact, dynamic, wildcard, and conservative prefix route policies.
- Kept the existing `canAccessPath`, `filterNavItemsByRole`, `hasAnyRole`, and `canManageProducts` public API stable.
- Preserved the backward-compatible fallback for unknown authenticated app paths.
- Aligned mobile bottom navigation with `canAccessPath`, so restricted roles do not see/trigger unavailable mobile destinations.
- Added `npm run audit:rbac` for static policy-source validation.

## Why this matters

Before this phase, route guards and menu filtering could drift because route permissions lived in route files and again in `utils/rbac.ts`.

After this phase, route access, sidebar filtering, favorites filtering, command palette visibility, header favorite eligibility, and mobile navigation use the same access source.

## Safety notes

The fallback behavior intentionally remains permissive for logged-in users when a path is not documented in the matrix. This prevents accidental lockouts for legacy, dynamic, or future paths that have not yet been added to the matrix.

Only documented role-protected paths are restricted by role.

## Validation commands

```bash
npm run audit:routes
npm run audit:rbac
npm run build
```
