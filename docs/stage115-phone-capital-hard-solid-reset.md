# Stage 115 — Phone capital hard solid reset

Why Stage 114 did not work:
The section wrapper was selected using a repeated class string, so the marker may have landed on the wrong card. Also, translucent Tailwind utility classes remained in JSX.

Fix:
- Removed the old marker and re-added `partner-phone-capital-section` by anchoring the exact heading:
  `نمای سرمایه و وضعیت فروش گوشی‌ها`
- Added `data-partner-phone-capital-section="true"` to the actual section root.
- Replaced translucent JSX classes in that section:
  - `bg-white/90` -> `bg-white`
  - `bg-slate-950/70` -> `bg-slate-950`
  - `bg-*-50/60` -> solid `bg-*-50`
  - weak shadows/borders made more solid
- Replaced the CSS with a hard data-marker scoped reset.

Files:
- `pages/PartnerDetail.tsx`
- `styles/runtime-overrides/10zk-partner-phone-capital-solid-reset.css`
- `index.tsx`
