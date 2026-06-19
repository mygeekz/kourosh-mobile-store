# Stage 107 — PartnerDetail central layout cleanup

What was found:
PartnerDetail hero was affected by multiple CSS layers:
- `01a4-people-detail-repair-header-filters.css`
- `01a5-partner-command-detail-refinement.css`
- `01a6-detail-kpi-filter-icon-system.css`
- `04c-people-detail-pages.css`
- `10zc-partner-detail-actions-responsive.css`

Problem:
These files mixed flex/grid/max-width/overflow rules for the same hero/actions area. The action buttons could be clipped at normal zoom.

Fix:
- Added explicit JSX classes to PartnerDetail hero:
  - `partner-detail-hero-card`
  - `partner-detail-hero-card__head`
  - `partner-detail-hero-layout`
  - `partner-detail-profile-main`
  - `partner-detail-profile-text`
  - `partner-detail-actions--central`
- Replaced the previous Stage 106 action CSS import with:
  `styles/runtime-overrides/10zd-partner-detail-central-layout.css`
- The final layout is one grid contract:
  - desktop: profile + actions
  - medium: actions become a full-width 4-column row
  - smaller: actions become 2 columns, then 1 column
- Hero overflow no longer clips the actions.
