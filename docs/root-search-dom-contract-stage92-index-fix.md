# Stage 92 — Fix index.tsx syntax error from Stage 91

Problem:
Stage 91 injected a typed runtime function directly into `index.tsx` in an unsafe location, causing:
`[plugin:vite:react-babel] Unexpected token`

Fix:
- Removed the injected function body from `index.tsx`.
- Created `utils/installRootSearchSurfaceContract.ts`.
- `index.tsx` now only imports and calls `installRootSearchSurfaceContract()`.
- The root search DOM contract from Stage 91 is preserved.

Files:
- `index.tsx`
- `utils/installRootSearchSurfaceContract.ts`
