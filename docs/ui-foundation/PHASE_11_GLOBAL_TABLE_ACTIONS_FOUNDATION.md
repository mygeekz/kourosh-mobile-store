# Phase 11 — Global Cards / Tables / Action Buttons Foundation

## Scope
This phase keeps application behavior untouched and only consolidates safe UI/CSS contracts related to shared action buttons and table/action layout.

## Files added

- `styles/system/shared-action-buttons-foundation.css`
- `styles/system/table-actions-foundation.css`
- `styles/system/finance-tables-foundation.css`
- `styles/system/partner-capital-table-foundation.css`

## Import changes

The following direct runtime override imports were replaced by system foundations while preserving their previous cascade positions:

- `01a7-shared-primitives-button-system.css` → `shared-action-buttons-foundation.css`
- `08a-unified-table-actions.css` → `table-actions-foundation.css`
- `10b-finance-tables-density-system.css` → `finance-tables-foundation.css`
- `10zp/10zq/10zr partner capital table chain` → `partner-capital-table-foundation.css`

## UI contracts added

- Buttons/actions keep icon and text alignment safer.
- Table action cells get predictable centering and wrapping.
- Finance tables get limited overflow-safe behavior.
- Partner capital tables keep the accepted table layout while consolidating compact/polish rules.
- LTR identifiers such as IMEI/system IDs get safer bidi behavior inside table scopes.

## Not changed

- No API changes.
- No database changes.
- No accounting/sales/reporting calculations changed.
- No JSX feature behavior changed.
- No global reset was introduced.

## Suggested checks

- Customers table action buttons
- Partners table action buttons
- Products table action buttons
- Finance report/action buttons
- Partner capital table
- IMEI/system ID display
- Dark/light modes
- Desktop widths 1366/1280 and mobile widths
