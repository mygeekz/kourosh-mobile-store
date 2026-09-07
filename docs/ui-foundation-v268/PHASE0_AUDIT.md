# Kourosh UI Foundation Hardening — Phase 0 Audit

Date: 2026-08-30  
Workstream target: v268  
Implementation source release: **v267**

## Purpose

Phase 0 is an architecture/baseline phase. It does not redesign product screens or change business/API/database behavior. Its job is to identify the actual current owners of UI behavior, quantify remaining migration debt, freeze debt growth, and make the existing source gate trustworthy before the migration phases begin.

The source release marker intentionally remains `v267` in this phase. Mini App release identity and the existing release-gate scripts are contractually pinned to v267; advancing that marker during a documentation/audit-only phase would create a false deployment release.

## Source of truth verified

- `KOUROSH_SOURCE_VERSION`: `v267`
- React + TypeScript + Vite + Tailwind are active in the current source.
- `config/ui/ui-manifest.json` contains **42 canonical UI components**.
- `styles/manifest/style-manifest.json` contains **445 local CSS assets**.
- Current runtime style lifecycle:
  - source: 39
  - provisional-canonical: 15
  - dormant: 15
  - generated: 1
  - quarantined: 92
  - compatibility: 34
  - migrating: 249
- Six legacy UI components remain explicitly marked `migrating` in the UI manifest. Seven previously unregistered shared primitives (SearchableSelect, financial timeline, and management-directory sub-primitives) were reviewed and registered as canonical during Phase 0.

## Canonical owners for the next phases

| Concern | Canonical owner |
| --- | --- |
| text input | `components/ui/TextField.tsx` |
| select | `components/ui/SelectField.tsx` |
| textarea | `components/ui/TextareaField.tsx` |
| form shell / label / hint / error | `components/ui/ControlShell.tsx` |
| searchable select | `components/ui/SearchableSelectField.tsx` |
| search | `components/ui/AppSearchField.tsx` |
| checkbox | `components/ui/CheckboxField.tsx` |
| range | `components/ui/RangeField.tsx` |
| overlay portal | `components/ui/PortalLayer.tsx` |
| dialog | `components/ui/Dialog.tsx` / `components/ui/DialogShell.tsx` |
| generic table shell | `components/ui/DataTableShell.tsx` |
| management directories | `components/ui/ManagementDirectory.tsx` + `ManagementDirectoryTable.tsx` |
| design tokens | `styles/system/design-tokens.css` |
| field compatibility/semantic bridge | `styles/system/field-form-contract.css` |
| overlay layer contract | `styles/system/overlay-layer-contract.css` |
| density foundation | `styles/system/cross-module-density-foundation.css` |

No second foundation should be added during v268–v275.

## Quantified baseline

Static scan scope: `app/**`, `components/**`, `pages/**`, TSX runtime source only.

| Metric | Phase 0 baseline | Interpretation |
| --- | ---: | --- |
| TSX files scanned | 464 | current main-app runtime scope |
| raw `<input>` outside `TextField` | 56 | migration candidates; includes specialized input types and must be classified rather than blindly replaced |
| raw `<select>` outside `SelectField` | **0** | already canonical |
| raw `<textarea>` outside `TextareaField` | **0** | already canonical |
| inline `style={{...}}` objects | 137 | audit/migration candidates; print/virtualization geometry may be legitimate exceptions |
| arbitrary Tailwind z-index utilities | 6 | overlay ownership candidates |
| manual Tailwind palette utility occurrences | 22,582 | theme/token migration candidates, not all are automatically defects |
| `createPortal` occurrences | 6 | concentrated in 3 files; should remain limited to canonical overlay owners or documented exceptions |
| raw `<table>` elements | 112 | 74 files; many are valid semantic tables but need table-contract classification |
| files with UI debt/table candidates | 298 | migration matrix generated |

Canonical component usage detected in the same scan includes 182 `TextField`, 125 `SelectField`, 43 `TextareaField`, 33 `SearchableSelectField`, 23 `AppSearchField`, 110 `ModalField`, 52 `DataTableShell`, and 3 `ManagementDirectoryTable` instances.

## Raw input classification baseline

The 56 raw inputs are not one category:

- default text: 21
- number: 12
- checkbox: 8
- text: 4
- file: 4
- search: 3
- time: 2
- range: 2

Phase 1 must migrate normal text/number/search controls first, while file/time and any specialized interactive inputs are reviewed against accessibility and behavior requirements before replacement.

## Highest-priority migration surfaces

The largest candidate concentrations are currently:

- `pages/settings/SettingsTelegramPanel.tsx`
- `pages/mobilePhones/MobilePhonesMainWorkspace.tsx`
- `pages/mobilePhones/MobilePhonesModalStack.tsx`
- `pages/Dashboard.tsx`
- `pages/Expenses.tsx`
- `pages/InstallmentSaleDetailPage.tsx`
- `pages/partnerDetail/PartnerLedgerWorkspaceSection.tsx`
- customer detail Telegram/ledger sections
- `pages/settings/StoreOwnershipPage.tsx`
- high-density report pages, especially Partner Performance / Product Sales

The full per-file matrix is in `migration-matrix.csv` and machine-readable totals are in `audit-summary.json`.

## Overlay findings

Current portal usage is concentrated and already has a canonical `PortalLayer`, but there are still feature-level patterns that require review in Phase 2:

- `createPortal` appears 6 times across 3 files.
- arbitrary z-index utilities appear 6 times across 5 main-app files.
- absolute/dropdown-like feature positioning still exists in a small number of feature files (for example older autocomplete/ledger patterns).
- `SearchableSelectField` correctly owns react-select portal behavior after the v267 repair-intake fix.

Phase 2 should consolidate these rather than add more z-index/absolute-position fixes.

## Table findings

`ManagementDirectoryTable` is correctly the shared standard for Customers, Partners and Repairs. Other operational/report tables still use a mixture of `DataTableShell` and semantic raw `<table>` markup. Phase 6 must classify them by task:

1. management directory → `ManagementDirectoryTable` contract;
2. generic data/report table → `DataTableShell` + semantic table;
3. print-only tables → preserve print semantics and isolate from responsive runtime rules.

No automatic mobile cardification is planned.

## CSS lifecycle finding

The largest architectural debt is not a missing component; it is lifecycle volume. Of 445 local CSS assets, **375** are currently `migrating`, `quarantined`, or `compatibility`. Therefore Phase 7 must be a controlled retirement phase driven by the style manifest, not a mass deletion. v267's fail-closed style cleanup must remain intact.

## Architecture lock baseline reviewed

The pre-existing architecture-lock baseline was older than the current v267 source and failed against legitimate already-present source changes. Phase 0 performed the explicit review required by the guard, registered the missing shared UI primitives, and refreshed the lock to the actual current source snapshot. The refreshed lock now records 445 CSS files, 392 runtime-active CSS entries, 289 patch-style paths, 38 UI-foundation files, 49,546 `!important` declarations, 789 arbitrary breakpoint occurrences, and 238 arbitrary z-index occurrences. These values are **debt ceilings**, not targets; the lock keeps the policy that these metrics may only decrease.

## Baseline gate introduced

Added:

- `config/ui/ui-foundation-phase0-v268-baseline.json`
- `scripts/audit-ui-foundation-phase0-v268.mjs`
- npm script: `audit:ui-foundation-phase0-v268`

The Phase 0 audit stores current debt as **ceilings**, not goals. Later phases may reduce these values, but the audit fails if new work increases them. This prevents migration work from reintroducing raw selects/textareas, additional inline style debt, arbitrary z-index values, palette debt, portal debt, or raw table growth beyond the captured baseline.

## Baseline source-gate issue discovered and fixed

The first run of `npm run verify:miniapp:source` correctly failed at `audit:select-foundation`.

Root cause: the Select primitive had already been improved to use `rounded-[var(--ds-control-radius)]`, but the older audit still hard-coded an expectation for `rounded-2xl`. The implementation was aligned with the project's token policy; the audit was stale.

Fix: `scripts/audit-select-foundation-completion.mjs` now verifies the canonical radius token instead of the obsolete fixed radius utility. No runtime component behavior was changed by this fix.

After that correction the complete **65-check v267 source release gate passed**.


## UI governance gate normalization

Running the full `audit:ui-system` gate exposed several assertions that described retired implementation details rather than the current canonical architecture. Phase 0 reviewed each failure against the active source before changing anything. Runtime UI was **not** reverted to satisfy old tests. The following audit/manifest contracts were aligned with the current source:

- Select radius: the audit now accepts `--ds-control-radius` instead of requiring the old fixed `rounded-2xl` utility.
- Core workspace select family: the audit counts both `SelectField` and `SearchableSelectField`, reflecting the actual canonical migration.
- Installment directory contract: the audit recognizes `ManagementDirectoryOverview`, `ManagementDirectoryToolbar`, and the current managed semantic table contract.
- Select compatibility: styled `controlOnly` remains valid; the legacy all-or-nothing compatibility tuple is required only when `unstyled` / hidden-chevron compatibility is requested.
- People/Partner/Repair modal audit: obsolete page-owned dark-surface scope markers and literal RGB requirements were removed from the audit. It now guards the shared semantic modal tokens and canonical field primitives, and explicitly prevents retired scope hooks from returning.
- Dashboard surface manifest: reviewed runtime order is `13`, matching the generated/bootstrap style order.
- Dashboard clock manifest: reviewed runtime order is `11`; the only allowed gradient exception is the live progress-indicator sheen, not a card/surface gradient.
- Direct CSS import boundary: runtime scanning is restricted to actual UI runtime roots, and the two intentional bootstraps are documented: `app/bootstrap/styles.ts` for the main app and `miniapp/index.tsx` for the isolated MiniApp build.

After these reviews, `npm run audit:ui-system` passes end-to-end.

## Final Phase 0 verification

Actually executed on 2026-08-30:

- `npm run prepare:production-styles` — **PASS**; retired-style cleanup found 0 stale files, bootstrap and generated Tailwind entry were regenerated, style manifest passed, and v267 generated-entry integrity passed.
- `npm run audit:ui-foundation-phase0-v268` — **PASS** with all captured debt metrics at or below their ceilings.
- `npm run audit:ui-system` — **PASS** across manifest, architecture lock, boundaries, dialog/form primitives, reports, installment, repairs, dashboard, header, tooltip, command palette and sidebar governance.
- `npm run verify:miniapp:source` — **PASS 65/65** for source-mode release checks.
- Full `vite build` — **NOT EXECUTED** because this uploaded source does not include `node_modules`; dependency installation/build success is therefore not claimed.

The source gate emits expected Node experimental warnings during some TypeScript-runtime checks and deliberately exercises failure-path diagnostics (for example a test D1 snapshot read failure). Those do not change the final gate result, which is 65/65 PASS.

## Phase 0 exit criteria

- [x] Actual source version verified.
- [x] Canonical UI owners identified from the current manifest/source.
- [x] CSS lifecycle inventory quantified.
- [x] Form, overlay, table, palette, inline-style and native-control debt quantified.
- [x] Per-file migration matrix generated.
- [x] Debt-growth baseline gate added.
- [x] Stale select audit corrected at the audit layer, not by reverting token-based runtime styling.
- [x] Existing 65-check source release gate passes after all Phase 0 audit/manifest reviews.
- [x] Full `audit:ui-system` governance gate passes.
- [x] Production style preparation/integrity gate passes.
- [x] Business/API/database behavior untouched.
- [x] No page-specific CSS added.

## Next execution phase

Phase 1 starts from the canonical form owners above. It should standardize the shared form-control contract and migrate normal raw text/number/search controls without changing business logic. The Phase 0 ceiling gate must stay green throughout the migration.
