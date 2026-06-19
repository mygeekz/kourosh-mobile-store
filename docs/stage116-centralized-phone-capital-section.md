# Stage 116 — Centralized PartnerPhoneCapital section

Why Stage 115 still could fail:
The section was still visually composed with scattered Tailwind utility classes and generic detail-page CSS could still compete.

Fix:
- The actual section is converted to semantic classes:
  - `partner-phone-capital-section`
  - `partner-phone-capital-header`
  - `partner-phone-capital-eyebrow`
  - `partner-phone-capital-title`
  - `partner-phone-capital-description`
  - `partner-phone-capital-summary-card`
  - `partner-phone-capital-metrics`
  - `partner-phone-capital-metric-card`
  - `partner-phone-capital-table-shell`
- The centralized CSS now owns the section visuals instead of fighting random utility classes.

Files:
- `pages/PartnerDetail.tsx`
- `styles/runtime-overrides/10zk-partner-phone-capital-solid-reset.css`
