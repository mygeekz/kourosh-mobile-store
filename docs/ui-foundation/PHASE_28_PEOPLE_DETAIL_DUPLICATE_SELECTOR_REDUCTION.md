# Phase 28 — People Detail Duplicate Selector Reduction

Scope: customer/partner/detail/ledger/capital related CSS foundations only.

This phase only removed top-level CSS rules where both the selector and declaration body were exact canonical duplicates. Rules with the same selector but different declarations were intentionally preserved because they may be part of the existing cascade.

- Exact duplicate rules removed: 1
- Bytes saved: 128
- Lines saved: 6
- `!important` occurrences removed: 1

## Files audited

- `styles/system/people-table-detail-foundation.css` — removed 1 duplicate rule(s), 39441 → 39313 bytes
  - removed duplicate at line 1045 matching first occurrence at line 900: `/* Phase 101.2 — People table contract + purchases purpose note */ .partners-table-shell`
- `styles/system/people-ledger-contract.css` — removed 0 duplicate rule(s), 4055 → 4055 bytes
- `styles/system/partner-detail-visual-foundation.css` — removed 0 duplicate rule(s), 24179 → 24179 bytes
- `styles/system/partner-detail-responsive-ledger-foundation.css` — removed 0 duplicate rule(s), 18847 → 18847 bytes
- `styles/system/partner-capital-table-foundation.css` — removed 0 duplicate rule(s), 23813 → 23813 bytes
- `styles/system/partner-capital-status-foundation.css` — removed 0 duplicate rule(s), 6769 → 6769 bytes
- `styles/system/people-status-mobile-foundation.css` — removed 0 duplicate rule(s), 8079 → 8079 bytes
- `styles/system/people-runtime/people-commercial-redesign-foundation.css` — removed 0 duplicate rule(s), 15123 → 15123 bytes
- `styles/system/partner-runtime/partner-phone-capital-solid-reset-foundation.css` — removed 0 duplicate rule(s), 7748 → 7748 bytes
- `styles/system/legacy-quarantine/people-list-hero-foundation.css` — removed 0 duplicate rule(s), 10668 → 10668 bytes
- `styles/system/legacy-quarantine/people-detail-command-foundation.css` — removed 0 duplicate rule(s), 28624 → 28624 bytes
- `styles/system/legacy-quarantine/people-empty-list-detail-foundation.css` — removed 0 duplicate rule(s), 36571 → 36571 bytes
- `styles/system/legacy-quarantine/partner-settlement-foundation.css` — removed 0 duplicate rule(s), 15706 → 15706 bytes
- `styles/system/legacy-quarantine/select-customer-compat-foundation.css` — removed 0 duplicate rule(s), 2467 → 2467 bytes

## Safety checks

- CSS parser check should be run after this phase.
- No JSX/API/business logic was changed.
- Direct imports from `styles/runtime-overrides` remain zero.
