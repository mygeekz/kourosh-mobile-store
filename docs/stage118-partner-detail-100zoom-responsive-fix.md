# Stage 118 — PartnerDetail 100% zoom responsive correction

Problem:
At 90% zoom the page is OK, but at 100% zoom the same screen clips the top action buttons. This means the breakpoint is too late: the desktop two-column layout stays active when the effective viewport is already too narrow.

Fix:
- Added `10zm-partner-detail-100zoom-responsive-fix.css`.
- Safe layout activates at `max-width: 1380px` instead of waiting until 1180px.
- Header actions become a full safe row before clipping starts.
- Account summary and phone capital header also switch earlier.
- Added guards for 1280/1366 laptop widths at 100% zoom.

Files:
- `styles/runtime-overrides/10zm-partner-detail-100zoom-responsive-fix.css`
- `index.tsx`
