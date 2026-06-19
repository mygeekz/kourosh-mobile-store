# Phase 08 — Partner / Customer Detail UI Foundation

## Scope
This phase is UI-only. It does not change accounting logic, transaction APIs, Telegram services, database code, report calculations, or sale/payment behavior.

## What changed

### 1. People table/detail CSS consolidation
The previous customer/partner toolbar and table-detail hotfix chain was consolidated into:

```txt
styles/system/people-table-detail-foundation.css
```

It preserves the original order of:

```txt
08c-customers-partners-headers.css
08d-people-table-detail-contracts.css
```

### 2. PartnerDetail visual CSS consolidation
The top visual reset chain was consolidated into:

```txt
styles/system/partner-detail-visual-foundation.css
```

It preserves the original order of:

```txt
10zh-partner-detail-safe-top-actions.css
10zi-partner-detail-solid-visual-reset.css
10zj-partner-detail-page-stack-clean.css
```

### 3. PartnerDetail responsive / ledger CSS consolidation
The responsive ledger chain was consolidated into:

```txt
styles/system/partner-detail-responsive-ledger-foundation.css
```

It preserves the original order of:

```txt
10zl-partner-detail-responsive-system.css
10zm-partner-detail-100zoom-responsive-fix.css
10zn-partner-ledger-insight-responsive.css
```

### 4. Shared people ledger contract
A new scoped contract was added:

```txt
styles/system/people-ledger-contract.css
```

It improves ledger/table containment in CustomerDetail and PartnerDetail:

- safer table overflow behavior
- sticky ledger table headers
- clearer Apple-minimal ledger surfaces
- RTL-safe LTR handling for IMEI/system IDs
- safer wrapping for long descriptions and IDs
- compact action-row wrapping
- dark-mode-compatible ledger surfaces

## Files changed

```txt
index.tsx
styles/system/people-table-detail-foundation.css
styles/system/partner-detail-visual-foundation.css
styles/system/partner-detail-responsive-ledger-foundation.css
styles/system/people-ledger-contract.css
docs/ui-foundation/PHASE_08_PEOPLE_DETAIL_FOUNDATION.md
```

## Manual test checklist

- Customer detail page
- Partner detail page
- Customer ledger table
- Partner ledger table
- Partner ledger insight cards
- IMEI display and system ID alignment
- Transaction action buttons in ledger rows
- Payment/receipt modal still opens
- Dark mode and light mode
- 1366px / 1280px laptop widths
- Mobile width / narrow viewport

## Notes
No original runtime override files were deleted. They are no longer directly imported for the grouped chains, but remain in the repository for rollback/reference.
