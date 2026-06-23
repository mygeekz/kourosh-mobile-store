# Phase 43 — CommandPalette Module Boundary

`CommandPalette.tsx` is now an orchestrator, not a monolithic renderer. The command-palette module owns rendering for search header, discovery chips, result rows, footer hints, and data-path utilities.

## Public module
```ts
import { ... } from './command-palette';
```

## Boundary rules
- Keep auth, router navigation, feature policy, active index, and server data fetching in the top-level orchestrator until a future hook extraction phase.
- Keep row rendering inside `components/command-palette/CommandPaletteRows.tsx`.
- Keep search chip/discovery UI inside `CommandPaletteDiscoverySections.tsx`.
- Keep result section composition inside `CommandPaletteResultsList.tsx`.
- Do not reintroduce local `Row`, `DataRow`, or `Section` renderers into `CommandPalette.tsx`.

## Validation
Run:
```bash
npm run audit:command-palette
```
