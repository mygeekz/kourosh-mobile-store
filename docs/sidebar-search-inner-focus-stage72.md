# Stage 72 — Remove inner blue focus box

Problem:
When the sidebar search input received focus, global input focus styles created a second blue inner box.

Fix:
- Keep the single outer shell focus ring.
- Fully neutralize the inner input focus/active/focus-visible border, outline, shadow and Tailwind ring variables.
- Remove WebKit search decorations.

Files:
- `styles/runtime-overrides/10o-sidebar-search-grid-no-overlap.css`
