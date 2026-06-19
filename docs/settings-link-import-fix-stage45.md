# Stage 45 — Settings Link Import Fix

## Problem
`pages/Settings.tsx` still renders several `<Link>` elements after the settings panel split, but the `Link` import from `react-router-dom` had been removed/omitted from the parent file.

Runtime error:

```txt
ReferenceError: Link is not defined
```

## Fix
Updated `pages/Settings.tsx` import:

```ts
import { Link, useLocation, useNavigate } from 'react-router-dom';
```

## Safety
- No JSX moved.
- No UI text/className/layout changed.
- No handlers/state changed.
- Existing settings panel split remains unchanged.
- Windows-safe `./settings/index` import remains unchanged.
