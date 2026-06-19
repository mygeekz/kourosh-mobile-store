# Stage 119 — Partner ledger insight responsive cleanup

Target:
The area shown in the screenshot:
- آخرین گردش‌های حساب
- خلاصه سریع دفتر

Fix:
- Added semantic classes:
  - `partner-ledger-insight-grid`
  - `partner-ledger-entry-metrics`
  - `partner-ledger-entry-metric`
  - `partner-ledger-quick-summary`
  - `partner-ledger-quick-item`
- The ledger insight grid collapses to 1 column earlier.
- Transaction metric cards become 2 columns, then 1 column on smaller screens.
- Amount chips and long values wrap safely and no longer overflow.
- Quick summary cards are solid and responsive.

Files:
- `pages/PartnerDetail.tsx`
- `styles/runtime-overrides/10zn-partner-ledger-insight-responsive.css`
- `index.tsx`
