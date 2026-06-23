# Phase 35 — Header Currency Hook Extraction

`Header.tsx` no longer owns currency-unit storage, sync, label, or formatter logic. Those responsibilities now live in `components/header/useHeaderCurrency.ts`.

The extraction is intentionally narrow: `HeaderQuickActions` still receives the same props as before, and no UI, route, RBAC, feature flag, or business behavior is changed.

## Acceptance criteria
- `Header.tsx` imports and consumes `useHeaderCurrency`.
- `Header.tsx` does not import from `utils/currency` directly.
- `useHeaderCurrency.ts` owns storage persistence and `kourosh:currency-unit-updated` sync.
- `HeaderQuickActions` still receives currency unit, label, and formatting helpers.
