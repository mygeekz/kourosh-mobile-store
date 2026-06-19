# Stage 43 — Settings Windows Case-Sensitive Import Fix

## Problem
On Windows, importing `./settings` from `pages/Settings.tsx` can collide with `pages/Settings.tsx` itself because the filesystem is case-insensitive. Vite resolved the import to `/pages/Settings.tsx` instead of the `pages/settings/index.ts` barrel, causing:

```txt
The requested module '/pages/Settings.tsx' does not provide an export named 'SettingsAccountPanel'
```

## Fix
Changed the barrel import in `pages/Settings.tsx` from:

```ts
from './settings';
```

to:

```ts
from './settings/index';
```

This removes the Windows case-collision ambiguity while preserving the same exported panels and runtime behavior.

## Safety
- No JSX changed.
- No CSS changed.
- No props, state, handlers, or UI layout changed.
- Only the import specifier changed.
