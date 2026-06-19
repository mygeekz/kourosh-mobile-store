# Stage 110 — PartnerDetail overlay/z-index cleanup

User observation:
The part of the header action button inside the hero card is washed out, while the part outside the card is clear.

Diagnosis:
This is not a simple responsive issue. It indicates an overlay/pseudo-layer/backdrop/filter is covering content inside `.detail-hero-card`.

Relevant CSS families found around this section:
- `01a4-people-detail-repair-header-filters.css`
- `01a5-partner-command-detail-refinement.css`
- `01a6-detail-kpi-filter-icon-system.css`
- `04c-people-detail-pages.css`
- Previous partner layout patches

Fix:
- Keep action buttons in the same top location as CustomerDetail.
- Remove failed partner layout imports.
- Add `10zg-partner-detail-overlay-cleanup.css`.
- Disable hero pseudo-elements and decorative absolute overlays.
- Force hero card solid background, no blur/filter/opacity/mask.
- Raise real header content/action buttons with z-index.
