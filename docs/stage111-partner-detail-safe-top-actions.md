# Stage 111 — PartnerDetail safe top actions

Problem:
The header action buttons stayed in the correct top position, but the action strip was wider than its safe space and clipped on the physical left. The profile chips/text also contributed to min-content width and pushed actions out.

Fix:
- Kept actions at the top, like CustomerDetail.
- Replaced flexible action strip with a compact 2-column grid at desktop safe width.
- Let profile column shrink with `min-width: 0` and `max-width: calc(100% - 460px)`.
- Removed previous PartnerDetail layout/overlay patch imports to reduce cascade conflicts.
- Preserved overlay/pseudo cleanup and solid hero background.

Files:
- `pages/PartnerDetail.tsx`
- `styles/runtime-overrides/10zh-partner-detail-safe-top-actions.css`
- `index.tsx`
