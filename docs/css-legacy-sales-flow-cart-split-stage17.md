# Stage 17 CSS Split - Legacy Sales Flow / Cart

Source file split:

`styles/legacy/06-legacy-sales-flow-cart.css`

The split was performed conservatively on existing phase marker boundaries. No selector or declaration value was intentionally changed.

## Replacement files

| Order | File | Bytes | Lines | Boundary |
|---:|---|---:|---:|---|
| 1 | `styles/legacy/06a-legacy-sales-flow-visual-pass.css` | 2091 | 109 | `/* Phase 28: sales flow and action center visual pass */` |
| 2 | `styles/legacy/06b-legacy-sales-cart-button-borders.css` | 854 | 44 | `/* Phase 32: sales cart refinement and softer button borders */` |
| 3 | `styles/legacy/06c-legacy-sales-cart-premium-cleanup.css` | 580 | 23 | `/* Phase 33: sales cart premium cleanup */` |
| 4 | `styles/legacy/06d-legacy-sales-cart-full-page-redesign.css` | 517 | 13 | `/* Phase 34: sales cart full-page redesign */` |

## Validation

- Byte-for-byte reconstruction: PASS
- Original SHA-256: `94c459e8c3ead99d0b324ca2ae9231872d59d9f6479da66af49896ec8e5de9e7`
- Reconstructed SHA-256: `94c459e8c3ead99d0b324ca2ae9231872d59d9f6479da66af49896ec8e5de9e7`
- Import replacement in `index.css`: PASS
- Local CSS import existence check: PASS
- Brace balance across CSS files: PASS
- `tinycss2` parse across CSS files: PASS

## Notes

This stage only reorganizes the legacy sales/cart CSS into smaller ordered files. Keep the `06a` through `06d` imports in their current order because later files intentionally override earlier sales button/cart styling.
