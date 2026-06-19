# Stage 74 — Sidebar search inline input reset

If CSS order/specificity keeps creating the inner blue input box, the reset must be attached directly to the input.

Changes:
- `components/Sidebar.tsx`: input now has inline `all: 'unset'` and full flat input styling.
- `10o-sidebar-search-grid-no-overlap.css`: backup selector-level reset remains.

This should prevent global input focus/surface styles from creating a nested blue box.
