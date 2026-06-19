# Stage 114 — Partner phone capital section solid reset

User feedback:
Top box is fixed, but the lower box titled "نمای سرمایه گوشی‌ها / نمای سرمایه و وضعیت فروش گوشی‌ها" still has the washed-out/haze issue.

Fix:
- Added a dedicated class to the phone-capital section:
  `partner-phone-capital-section`
- Added `10zk-partner-phone-capital-solid-reset.css`
- Scoped reset only to this lower section.
- Removed translucent backgrounds, filters, overlays, pseudo layers, and weak text contrast in this section.
- Solidified metric cards, filter pills, table rows, table headers, and local surfaces.

Files:
- `pages/PartnerDetail.tsx`
- `styles/runtime-overrides/10zk-partner-phone-capital-solid-reset.css`
- `index.tsx`
