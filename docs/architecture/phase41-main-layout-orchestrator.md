# Phase 41 — MainLayout Orchestrator Cleanup

`MainLayout.tsx` is now a compact orchestrator. Shell rendering, mobile/desktop sidebar state, content frame, page-title resolution, recent-page tracking, and command-palette shortcut behavior live in dedicated modules under `components/main-layout/`.

## Module map

| Module | Responsibility |
|---|---|
| `MainLayout.tsx` | Composition only |
| `MainLayoutShell.tsx` | App shell, Sidebar, mobile overlay, content margin |
| `MainContentFrame.tsx` | Main scroll area, route outlet, mobile bottom nav |
| `useMainLayoutSidebar.ts` | Desktop/mobile mode, drawer state, sidebar width |
| `useCurrentPageTitle.ts` | Current route title resolution |
| `useRecentPageTracker.ts` | Recent page tracking |
| `useCommandPaletteShortcut.ts` | Ctrl/Cmd+K shortcut |

## Non-goals

- No route changes.
- No RBAC changes.
- No feature flag changes.
- No Header/Sidebar behavior changes.
- No CSS redesign.
