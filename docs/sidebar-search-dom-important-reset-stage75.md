# Stage 75 — DOM important reset for sidebar search input

The inner focus box persisted because global input/focus styles used high specificity or `!important`.

This stage applies reset styles directly to the DOM element with:
`input.style.setProperty(property, value, 'important')`

This is stronger than normal React inline styles and scoped only to the sidebar search input.

Files:
- `components/Sidebar.tsx`
- `styles/runtime-overrides/10o-sidebar-search-grid-no-overlap.css`
