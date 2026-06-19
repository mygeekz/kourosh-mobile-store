# Stage 152 — Central sidebar-safe modals

Goal:
Wide modals should not go under the right sidebar.

Changes:
- `components/Modal.tsx` now detects large `widthClass` values.
- Large modals get:
  - `modal-shell-sidebar-safe`
  - `modal-shell-sidebar-safe--large`
- New central CSS clamps modal width against viewport and reserves space for sidebar.
- Partner-specific translate workaround was removed because the central rule now handles positioning.

Files:
- `components/Modal.tsx`
- `styles/runtime-overrides/11l-central-sidebar-safe-modals.css`
- `styles/runtime-overrides/11k-partner-modal-sidebar-date-fix.css`
- `index.tsx`
