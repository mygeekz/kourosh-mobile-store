# Kourosh Store Management v263 — AddRepair No Custom CSS

## Scope
This release removes the legacy page-specific CSS architecture from `pages/AddRepair.tsx` without changing repair business endpoints, draft compatibility, identity/snapshot logic, or financial calculations.

## Runtime UI changes
- Rebuilt AddRepair composition on existing shared primitives: `PageShell`, `PanelCard`, `TextField`, `TextareaField`, `SearchableSelectField`, and existing `Button`.
- Removed raw `input/select/textarea` renderers from AddRepair: 0 remain.
- Removed inline style objects from AddRepair: 0 remain.
- Removed runtime `<style>` injection and `useStyle` dependency.
- Removed the retired `data-ui-repair-page="add"` opt-in so legacy repair-intake CSS can no longer target this page.
- Preserved the specialized addable model/color autocomplete behavior, implemented with existing primitives + utilities only.

## Retired legacy CSS
- `styles/components/modal-system.css`: 3,527 AddRepair override lines retired.
- `styles/system/ui-contracts/repair-services-workflow-foundation-phase15.css`: 997 AddRepair intake lines retired.
- Total retired AddRepair-specific CSS: **4,524 lines**.
- Unrelated Repairs list/export-menu rules that had been colocated in the historical override block were retained.
- No new custom CSS file was added.

## Preserved contracts
- `/api/repairs`
- `/api/customers`
- `/api/phone-models`
- `/api/phone-colors`
- `kourosh:repair-intake-drafts:v1`
- `kourosh:repair-intake-draft`
- Existing submit/draft/customer/device/issue behavior remains wired.

## Release
- Source: v263
- MiniApp HTML marker: v263
- Cloudflare Edge marker: v263
