# Stage 15 — Legacy global input/save/repairs split

Source file removed:

`styles/legacy/04-legacy-global-input-save-repairs.css`

Replacement files, in required import order:

- `styles/legacy/04a-legacy-repairs-saved-views-inputs.css` — Repairs saved views inputs, search icons, filter chip cleanup (1711 bytes)
- `styles/legacy/04b-legacy-premium-data-chart-shell.css` — Premium data shell, chart empty states and stat/chart cards (2788 bytes)
- `styles/legacy/04c-legacy-motion-focus-accessibility.css` — Motion, hover, focus-visible, loading animations and reduced motion (4364 bytes)
- `styles/legacy/04d-legacy-field-attention-page-actions.css` — Field attention animation and page shell action responsive rules (1710 bytes)

## Validation

- Original SHA-256: `c289289c13f3ad70fb9166dd3cc3061bcce85045625500dbb81b44426ee03ed1`
- Reconstructed SHA-256: `c289289c13f3ad70fb9166dd3cc3061bcce85045625500dbb81b44426ee03ed1`
- Byte-for-byte reconstruction before deletion: PASS
- CSS import existence check: PASS
- CSS brace balance: PASS
- tinycss2 stylesheet parse: PASS
- Selector/declaration edits: none; split only.

## Notes

The split was performed only on complete top-level CSS block boundaries. The original source order is preserved through sequential imports in `index.css`.
