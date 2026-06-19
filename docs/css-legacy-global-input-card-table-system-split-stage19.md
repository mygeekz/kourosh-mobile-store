# Stage 19 — Legacy Global Input/Card/Table System Split

Source file removed:

`styles/legacy/08-legacy-global-input-card-table-system.css`

Replacement files, imported in the same cascade order:

1. `styles/legacy/08a-legacy-global-field-system.css`
2. `styles/legacy/08b-legacy-global-card-section-system.css`
3. `styles/legacy/08c-legacy-global-table-row-actions.css`

Safety validation:

- Byte-for-byte reconstruction: PASS
- Original sha256: `eca606667353c501a1bd09aac45e26b29fac11ee35c9182ff1593f3887192857`
- Reconstructed sha256: `eca606667353c501a1bd09aac45e26b29fac11ee35c9182ff1593f3887192857`
- Selector/value modifications: none intended
- Split boundaries: existing phase markers only
- Local CSS import validation: PASS
- Brace balance validation: PASS
- tinycss2 parse validation: PASS

Notes:

This stage is a structural split only. It keeps the global field system, card/section shell system, and table/row-action system as independent files while preserving exact source order.
