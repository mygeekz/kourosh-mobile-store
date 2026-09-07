# UI Foundation Hardening — Phase 1 / v269

## Scope

Phase 1 hardens the shared form-control foundation on top of the Phase 0 / v268 audited baseline. It intentionally does not modify database queries, API contracts, financial calculations, Telegram business logic, or domain workflows.

The Mini App/source release identity remains `v267` during this staged UI workstream. `v269` is the package/workstream version for the UI hardening phase.

## Root decisions

1. `components/ui/formControlContract.ts` is the single shared density contract for form controls.
2. `sm` is the canonical Kourosh operational-SaaS default.
3. Desktop density tokens are `36 / 40 / 44px` for `sm / md / lg`.
4. Compact/touch viewports expand those same tokens to `40 / 44 / 48px`; pages do not own mobile height patches.
5. Text-bearing controls use `height:auto` plus token-owned `min-height`, padding and line-height to prevent Persian glyph clipping under zoom/font scaling.
6. Semantic foreground/background/border/focus/error colors are read from design tokens; no new page CSS or new CSS file was added.
7. `ControlShell` owns label, required marker, hint/error placement and semantic field state. Error feedback uses `role="alert"` and `aria-live="polite"`.
8. Canonical native renderers are `TextField`, `AppSearchField`, `CheckboxField`, `RangeField`, `SelectField` and `TextareaField`. `SearchableSelectField` consumes the same density default.
9. Hidden `type=file` controls remain explicit browser-native exceptions. They are allowlisted and audited rather than wrapped for appearance-only reasons.

## Migration result

Compared with the Phase 0 baseline:

- Raw `<input>` occurrences outside `TextField`: **56 → 7**.
- **49** native input usages were migrated across **33** runtime files.
- The remaining 7 are exactly:
  - 1 native input inside `AppSearchField` (canonical owner)
  - 1 native checkbox inside `CheckboxField` (canonical owner)
  - 1 native range inside `RangeField` (canonical owner)
  - 4 reviewed hidden file-input exceptions
- Raw non-file inputs outside canonical owners: **0**.
- Raw `<select>` outside `SelectField`: **0**.
- Raw `<textarea>` outside `TextareaField`: **0**.

The detailed per-file delta is recorded in `native-input-migration.csv`.

## Canonical controls updated

- `ControlShell`
- `TextField`
- `SelectField`
- `TextareaField`
- `AppSearchField`
- `SearchableSelectField`
- `CheckboxField`
- `RangeField`
- `PriceInput`
- `PhoneModelAutocomplete`
- `ShamsiDatePicker`

`TextField`, `SelectField`, `TextareaField`, `AppSearchField` and `SearchableSelectField` now consume `DEFAULT_FORM_CONTROL_SIZE` rather than owning divergent default geometry.

## Governance

Added:

- `config/ui/ui-foundation-phase1-v269-baseline.json`
- `scripts/audit-ui-foundation-phase1-v269.mjs`
- `npm run audit:ui-foundation-phase1-v269`
- `docs/ui-foundation-v269/native-input-migration.csv`
- `docs/ui-foundation-v269/audit-summary.json`

The UI manifest is advanced to `UI-FOUNDATION-PHASE1-V269` and explicitly registers the shared form-control contract. Stale source audits that required the old per-component size maps were updated to validate the new shared contract instead; runtime code was not reverted to satisfy obsolete assertions.

## Verification

- `npm run prepare:production-styles`: PASS
- `npm run audit:ui-foundation-phase1-v269`: PASS
- `npm run audit:ui-foundation-phase0-v268`: PASS (debt only decreased)
- `npm run audit:ui-system`: PASS
- `npm run verify:miniapp:source`: **65/65 PASS**
- TypeScript parser syntax sweep: PASS
- Full Vite production build: environment-blocked because the supplied source does not contain `node_modules`; no build PASS is claimed.

## Out of scope for Phase 1

- Overlay/Portal consolidation beyond existing SearchableSelect/DatePicker behavior — Phase 2.
- Central validation orchestration, FormGrid and full BiDi policy — Phase 3.
- Whole-application form migration beyond native-renderer ownership — Phase 4.
- Dialog/Table/token retirement/global responsive/data-integrity/MiniApp release hardening — later roadmap phases.
