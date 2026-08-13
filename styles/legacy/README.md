# Legacy CSS split — Stage 12

This directory replaces the former `styles/legacy-monolith.css` file.

Important rules:

1. Keep the import order in `index.css` exactly as generated.
2. Do not alphabetically reorder these files; their order preserves the original cascade.
3. These files are a safe structural split. Selector values were not changed.
4. Before deleting rules from this directory, compare the effective cascade against runtime overrides and test the affected page visually.

- `01-legacy-app-base-and-loaders.css` — lines 1-445 of the former monolith. Base app styles, boot loader, helpers, shiny text, variable proximity.
- `02a` through `02p` — lines 446-2402 of the former monolith, replacing the former `02-legacy-reports-premium-components.css` file. Reports, modal, toolbar, people, customer and Telegram-link legacy styles kept in original cascade order.
- `03a` through `03g` — lines 2403-3501 of the former monolith, replacing the former `03-legacy-action-zones-sidebar-header.css` file. Action primitives, report tools, premium tabs, sidebar/header fixes, dark table fixes and button loading/progress styles kept in original cascade order.
- `04-legacy-global-input-save-repairs.css` — lines 3502-3913 of the former monolith. Global input, save, repair and form-level legacy fixes.
- `05-legacy-buttons-quick-links-hardening.css` — lines 3914-4245 of the former monolith. Phase 26 and 27 button/quick-link refinements.
- `06-legacy-sales-flow-cart.css` — lines 4246-4434 of the former monolith. Sales flow, action center and sales cart visual passes.
- `07-legacy-global-button-system.css` — lines 4435-4618 of the former monolith. Phase 42-43 global premium button unification.
- `08-legacy-global-input-card-table-system.css` — lines 4619-4975 of the former monolith. Phase 44-46 input/select, cards, section headers, tables and row actions.
- `09-legacy-global-modal-toast-nav-chart.css` — lines 4976-5550 of the former monolith. Phase 47-50 modal, drawer, toast, navbar, charts and KPI unification.
- `10-legacy-final-shell-toasts-phone-edit.css` — lines 5551-5776 of the former monolith. Final app shell QA, smart toasts, Telegram modal stability, installment sale and phone edit overrides.

## Stage 13 — `02-legacy-reports-premium-components.css` split

The former `02-legacy-reports-premium-components.css` file was split into `02a` through `02p` files. The split is intentionally conservative:

- selectors and declarations were not rewritten;
- the large internal `@layer components` block was divided into smaller sequential `@layer components` blocks;
- import order in `index.css` preserves the original cascade order;
- tail selectors that were outside any `@layer` remain outside `@layer` in their new files.

Do not reorder these imports alphabetically. They are cascade-ordered.



## Stage 14 — `03-legacy-action-zones-sidebar-header.css` split

The former `03-legacy-action-zones-sidebar-header.css` file was split into `03a` through `03g` files with stricter validation than previous stages:

- byte-for-byte reconstruction was checked before deleting the original file;
- split boundaries were selected only at complete CSS block boundaries;
- separator blank lines were preserved in the preceding chunk so reconstruction stays byte-identical;
- selectors and declarations were not rewritten;
- import order in `index.css` preserves the original cascade order;
- all CSS imports were resolved after the split;
- brace balance and CSS parsing were checked after the split.

Do not reorder these imports alphabetically. They are cascade-ordered.


## Stage 15 — 04 legacy global input/save/repairs split
`04-legacy-global-input-save-repairs.css` was split into `04a`–`04d` with byte-for-byte reconstruction validation before deletion. Do not reorder these files; they preserve the original source order.


## Stage 16

`05-legacy-buttons-quick-links-hardening.css` was split into `05a` through `05d`. These files are source-order sensitive and should not be alphabetically reordered outside the import sequence in `index.css`.

## Stage 17 - Sales flow/cart split

`06-legacy-sales-flow-cart.css` was split into four ordered files:

1. `06a-legacy-sales-flow-visual-pass.css`
2. `06b-legacy-sales-cart-button-borders.css`
3. `06c-legacy-sales-cart-premium-cleanup.css`
4. `06d-legacy-sales-cart-full-page-redesign.css`

Do not reorder these imports. The split was validated byte-for-byte against the previous file content.

## Stage 18 - Global button system split

`07-legacy-global-button-system.css` was split byte-for-byte into:

- `07a-legacy-button-stroke-normalization.css`
- `07b-legacy-premium-button-unification.css`

Do not reorder these files. The second file depends on the first file's source order and intentionally continues the global button contract.

## Stage 19

`08-legacy-global-input-card-table-system.css` was split into:

- `08a-legacy-global-field-system.css`
- `08b-legacy-global-card-section-system.css`
- `08c-legacy-global-table-row-actions.css`

The split is byte-for-byte equivalent when concatenated in import order. Do not reorder these files without a visual QA pass.

## Stage 20

`09-legacy-global-modal-toast-nav-chart.css` was split into:

- `09a-legacy-global-modal-drawer-unification.css`
- `09b-legacy-global-toast-alert-status.css`
- `09c-legacy-global-nav-sidebar-topbar.css`
- `09d-legacy-global-charts-kpi-dashboard.css`

The split is byte-for-byte equivalent when concatenated in import order. Do not reorder these files without a visual QA pass.

## Stage 21 - Final shell/toasts/phone edit split

`10-legacy-final-shell-toasts-phone-edit.css` was split into:

- `10a-legacy-final-shell-cohesion.css`
- `10b-legacy-targeted-ui-qa-cleanup.css`
- `10c-legacy-smart-toast-progress.css`
- `10d-legacy-telegram-modal-stability-lux.css`
- `10e-legacy-installment-combobox-phone-edit-vertical.css`
- `10f-legacy-phone-edit-horizontal-modal.css`

The split is byte-for-byte equivalent when concatenated in import order. Do not reorder these files without a visual QA pass.


## Stage 22 governance note

Legacy files are split historical CSS. They are active, but they should not be the default destination for new CSS. Prefer `styles/components/*` or `styles/pages/*`; move stable rules out of legacy gradually with before/after QA.

## Stage 23 PostCSS warning fix

`index.css` no longer contains the large CSS `@import` orchestrator chain. Those imports now live in `index.tsx` before `import './index.css';` so Vite resolves each CSS file as a concrete module and avoids PostCSS parse paths without a stable `from` value. Keep runtime override ordering unchanged.

