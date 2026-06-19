# Stage 113 — PartnerDetail page stack/clip cleanup

User feedback:
Stage 112 still did not remove the haze. That suggests the problem is a parent stacking/clip/overlay issue, not just child opacity.

Fix:
- Added a page-level cleanup for `.detail-page-shell.people-detail-apple.partner-detail-apple`.
- Removed page-level pseudo/decorative overlays.
- Forced PartnerDetail page tree above old overlays with z-index and isolation.
- Forced major partner detail surfaces to be solid and fully opaque.
- Preserved current layout; this stage targets visual haze/stacking only.

Files:
- `styles/runtime-overrides/10zj-partner-detail-page-stack-clean.css`
- `index.tsx`
