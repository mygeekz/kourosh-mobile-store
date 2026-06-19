# Phase 81 — Partner / Customer Detail Redesign Pass 1

Scope: UI-only redesign for PartnerDetail and CustomerDetail pages.

## Changed

- Added `people-detail-redesign-v1` scoped class to PartnerDetail and CustomerDetail root shells.
- Added `people-detail-redesign-v1--partner` and `people-detail-redesign-v1--customer` modifiers.
- Added scoped CSS at `styles/system/people-detail-redesign/people-detail-redesign-pass-1.css`.
- Imported the new CSS after the existing people/partner foundation stack.

## Intent

- Executive Apple-minimal surface treatment for detail hero cards.
- Cleaner account focus cards and KPI/ledger surfaces.
- Safer LTR handling for IMEI/system IDs/technical values.
- More consistent ledger/action button spacing.
- Better responsive density for 1366, 1280, tablet and mobile.

## Not changed

- No API changes.
- No accounting or ledger logic changes.
- No payment/receipt behavior changes.
- No Telegram logic changes.
- No route/database changes.
