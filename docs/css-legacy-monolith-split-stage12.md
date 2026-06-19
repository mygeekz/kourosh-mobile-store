# Stage 12 — Legacy Monolith Split

Goal: reduce the remaining `styles/legacy-monolith.css` risk without changing UI behavior.

Method:

- Split the legacy monolith by existing phase/comment boundaries.
- Replaced the single `@import './styles/legacy-monolith.css';` with ordered imports from `styles/legacy/`.
- Removed the old monolith file to prevent accidental edits in the wrong location.
- Verified that concatenating the new files recreates the previous monolith byte-for-byte.

## Generated files

| File | Former line range | Size | Brace count | Purpose |
|---|---:|---:|---:|---|
| `styles/legacy/01-legacy-app-base-and-loaders.css` | 1-445 | 10,396 bytes | `90` / `90` | Base app styles, boot loader, helpers, shiny text, variable proximity. |
| `styles/legacy/02-legacy-reports-premium-components.css` | 446-2402 | 57,734 bytes | `529` / `529` | Large reports premium component block kept in original cascade order. |
| `styles/legacy/03-legacy-action-zones-sidebar-header.css` | 2403-3501 | 24,856 bytes | `220` / `220` | Legacy action zones plus sidebar/header fixes before global input pass. |
| `styles/legacy/04-legacy-global-input-save-repairs.css` | 3502-3913 | 10,573 bytes | `89` / `89` | Global input, save, repair and form-level legacy fixes. |
| `styles/legacy/05-legacy-buttons-quick-links-hardening.css` | 3914-4245 | 7,147 bytes | `47` / `47` | Phase 26 and 27 button/quick-link refinements. |
| `styles/legacy/06-legacy-sales-flow-cart.css` | 4246-4434 | 4,042 bytes | `34` / `34` | Sales flow, action center and sales cart visual passes. |
| `styles/legacy/07-legacy-global-button-system.css` | 4435-4618 | 5,012 bytes | `20` / `20` | Phase 42-43 global premium button unification. |
| `styles/legacy/08-legacy-global-input-card-table-system.css` | 4619-4975 | 10,066 bytes | `46` / `46` | Phase 44-46 input/select, cards, section headers, tables and row actions. |
| `styles/legacy/09-legacy-global-modal-toast-nav-chart.css` | 4976-5550 | 13,815 bytes | `60` / `60` | Phase 47-50 modal, drawer, toast, navbar, charts and KPI unification. |
| `styles/legacy/10-legacy-final-shell-toasts-phone-edit.css` | 5551-5776 | 6,404 bytes | `43` / `43` | Final app shell QA, smart toasts, Telegram modal stability, installment sale and phone edit overrides. |

## Safety notes

This stage intentionally did not remove or rewrite selectors. It only moved exact line ranges into smaller files. That keeps cascade behavior stable while making future cleanup safer.
