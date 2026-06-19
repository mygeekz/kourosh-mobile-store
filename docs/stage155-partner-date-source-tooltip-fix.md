# Stage 155 — Partner date/source chip + tooltip fix

Fixes:
- Removed native `title` tooltip from partner date/source chips.
- Removed custom `data-ux-title` tooltip triggers from those chips where matched.
- Replaced hidden/truncated text spans with visible wrapping spans.
- Added scoped CSS so date/source chips wrap text instead of truncating.
- Prevents two tooltip layers from appearing for the same chip.

Files:
- `pages/PartnerDetail.tsx`
- `styles/runtime-overrides/11o-partner-date-source-tooltip-fix.css`
- `index.tsx`
