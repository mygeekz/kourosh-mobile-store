# Command Palette Architecture

The command palette is a canonical navigation overlay.

- Component owner: `components/CommandPalette.tsx`
- Structural components: `components/command-palette/*`
- Style owner: `styles/system/overlay-layer-contract.css`
- Runtime panel must not use `ux-stable-panel` or report-specific styles.
- Header and footer are fixed; only `.command-palette-viewport` scrolls.
- Selected rows use a soft semantic surface in both themes and never inverse black/white styling.
- Command Palette rows do not use Framer Motion.
- Typography, spacing, row height and focus behavior are owned by the canonical command palette contract.

## Compact density contract

- Command palette controls opt out of the global button enhancer using `data-skip-global-button`.
- Recent/popular query chips use the compact 23px control scale.
- Navigation rows use a 42px minimum block size and 26px icon cell.
- Favorite actions are frameless icon controls; they must not render a button card or pill surface.
- Typography follows the compact navigation-overlay scale, not the page-card scale.
