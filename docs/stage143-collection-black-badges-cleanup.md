# Stage 143 — Collection Center black badge cleanup

Problem:
Black blocks/pills were visible in Collection Center. They were legacy status/mode badges using `bg-slate-900/950`.

Fix:
- Added scoped classes for neutral chips.
- Added a Collection Center-only CSS cleanup for remaining old slate/black chips.
- Buttons can remain dark if intentionally used, but non-button pills are normalized to readable blue/neutral chips.

Files:
- `pages/reports/CollectionFollowupCenter.tsx`
- `styles/runtime-overrides/11c-collection-black-badges-cleanup.css`
- `index.tsx`
