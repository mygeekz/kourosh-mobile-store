# Phase 31 Header Decomposition Cleanup

`Header.tsx` was split into focused presentation modules while keeping behavior stable. This phase intentionally avoids moving fetch/state logic for quick panels because that requires a separate state-machine pass.

## New canonical modules

| Module | Responsibility |
|---|---|
| `components/header/HeaderSearch.tsx` | Desktop search, mobile search trigger, search result surface |
| `components/header/HeaderTitleArea.tsx` | Title, breadcrumb, favorite action |
| `components/header/HeaderThemeToggle.tsx` | Theme cycle button |
| `components/header/HeaderProfileMenu.tsx` | Profile/settings/logout menu |
| `components/header/headerTypes.ts` | Shared header search and quick menu types |

## Policy

`Header.tsx` should now coordinate data and pass it down. New JSX-heavy header surfaces should not be added directly to `Header.tsx`; they should be added as focused modules under `components/header/`.
