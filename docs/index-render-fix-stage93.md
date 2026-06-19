# Stage 93 — Fix React root render order

Problem:
Stage 92 inserted `installRootSearchSurfaceContract()` in a way that broke the React root render chain, causing:
`Cannot read properties of undefined (reading 'render')`

Fix:
- Removed the misplaced standalone call.
- Reinserted `installRootSearchSurfaceContract()` before the React render chain without splitting `createRoot(...).render(...)`.
- The login/app boot flow should now continue normally.

Files:
- `index.tsx`
