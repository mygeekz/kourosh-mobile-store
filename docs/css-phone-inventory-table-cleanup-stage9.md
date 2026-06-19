# Stage 9 — Phone inventory table CSS cleanup

This pass focused on the accumulated `.phone-inventory-table-v2` width/column overrides.

## What changed

Removed or trimmed earlier table-width declarations that were fully superseded by later runtime contracts:

- `styles/runtime-overrides/05-mobile-phones.css`
  - Removed early non-important column width fallbacks for columns 1, 3, and 4.
  - Removed mobile `col:nth-child(3/4)` widths that are superseded by the later responsive contract.
- `styles/runtime-overrides/06a-enterprise-actions-fields-validation.css`
  - Removed the superseded column 1 width.
  - Kept the action column overflow contract, but removed its superseded width value.
- `styles/runtime-overrides/06e-accessibility-rtl-targeted-fixes.css`
  - Removed several historical phone-table column-width passes that were overridden by later v34/v36/07a/07b rules.
  - Kept the active selection-column contract for column 1.
- `styles/runtime-overrides/07a-products-modal-precision-cleanup.css`
  - Removed base column widths that were fully covered by the final breakpoint contracts.
  - Kept the `max-width: 900px` contract because it is still the active small-screen table width layer.

## Validation

The final effective declarations for these table-critical properties were compared before and after the cleanup at representative viewport widths:

- 500px
- 800px
- 1000px
- 1400px

Checked properties:

- table `col:nth-child(1..4)` widths
- `th` / `td` widths for columns 1, 3, and 4
- action column overflow
- `.phone-table-action-btn` min-width/min-height
- `.phone-table-inline-actions` gap

Result: effective values matched between Stage 8 and Stage 9 for the checked cascade surface.

## Safety note

This was intentionally not a full visual redesign. It only removes declarations that were already losing in the cascade or trims a rule to keep the non-width behavior that still matters.
