# CSS Stage 13 — legacy reports premium components split

This stage splits `styles/legacy/02-legacy-reports-premium-components.css` into smaller cascade-ordered files.

Safety policy:

- No selector name was intentionally changed.
- No declaration value was intentionally changed.
- The original import was replaced by ordered imports from `02a` to `02p`.
- Large internal `@layer components` content was split into sequential `@layer components` blocks, preserving same named layer and source order.
- Tail CSS outside `@layer` stayed outside `@layer`.

## New files

| File | Lines | Size |
|---|---:|---:|
| `02a-legacy-reports-kpi-table-foundation.css` | 61 | 962 bytes |
| `02b-legacy-premium-modal-base.css` | 85 | 2231 bytes |
| `02c-legacy-detail-drawer-primitives.css` | 120 | 2122 bytes |
| `02d-legacy-detail-compact-density.css` | 40 | 935 bytes |
| `02e-legacy-smart-tooltip-transitions.css` | 42 | 1098 bytes |
| `02f-legacy-page-shell-modern.css` | 63 | 1389 bytes |
| `02g-legacy-ux-button-core-loading.css` | 161 | 3886 bytes |
| `02h-legacy-ux-button-motion-presets.css` | 200 | 7406 bytes |
| `02i-legacy-people-list-controls-fields.css` | 173 | 4173 bytes |
| `02j-legacy-report-toolbar-filters.css` | 176 | 3854 bytes |
| `02k-legacy-cards-toasts-feedback-loading.css` | 222 | 7713 bytes |
| `02l-legacy-wizard-table-quicklinks-installments.css` | 190 | 6013 bytes |
| `02m-legacy-accessibility-focus-transition-base.css` | 11 | 302 bytes |
| `02n-legacy-customers-hero-toolbar.css` | 39 | 1724 bytes |
| `02o-legacy-telegram-link-modal.css` | 370 | 13916 bytes |
| `02p-legacy-people-action-buttons-chips.css` | 31 | 1124 bytes |

## Verification summary

- CSS imports were checked after the split.
- Brace balance was checked across CSS files.
- CSS parse was checked with `tinycss2`.
- The original source is stored for audit at `docs/legacy-02-before-stage13.txt`; it is not imported by the app.

## Build note

`npm run build` was attempted in this sandbox after the split, but the extracted ZIP does not include `node_modules`, so the command stopped with `vite: not found`. This is an environment/dependency availability issue, not a CSS parse/import error. Structural CSS checks passed before packaging.
