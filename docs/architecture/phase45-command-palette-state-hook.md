# Phase 45 — CommandPalette State Hook Extraction

## Goal
Keep `components/CommandPalette.tsx` as a composition/orchestration layer by extracting query state, active-result navigation, focus restore, escape handling, and scroll-into-view behavior.

## Added
- `components/command-palette/useCommandPaletteState.ts`
- `npm run audit:command-palette-state-hook`

## Preserved behavior
- Initial query seeding from `commandPaletteInitialQuery`
- Focus restoration after close
- Escape-to-close
- Arrow/Home/End/Tab/Enter keyboard navigation
- Active row scroll-into-view
- Data result and navigation result opening
- Existing debounce/fetch hook from Phase 44

## Risk level
Low-medium. This moves lifecycle and keyboard behavior, but keeps exact interaction rules and route/data action callbacks.
