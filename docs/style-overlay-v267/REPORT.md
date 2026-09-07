# Kourosh Store Management v267 — Production Style Overlay Cleanup

## Problem fixed
A production startup/build could fail after extracting a newer full archive over an older project folder because files deleted in the newer release remained physically on disk. The style-manifest audit then treated those stale CSS files as new unregistered source files. Build output under `dist-miniapp/assets/*.css` was also being counted as source CSS.

Observed failure included retired files such as `styles/pages/repairs.css`, old Expenses CSS, old Select/Form CSS, and `dist-miniapp/assets/*.css`.

## v267 fix
- Added `config/ui/retired-style-files.json` as an explicit retired-style registry.
- Added `scripts/cleanup-retired-style-files-v267.mjs`.
- `prepare:production-styles` now removes only explicitly retired CSS before generating/auditing styles.
- Unknown unregistered CSS is never silently deleted; it still fails the source audit.
- `walkFiles` excludes build/runtime artifact directories including `dist-miniapp`, so previously built CSS is never counted as source CSS.
- Existing v266 deterministic Tailwind entry regeneration remains mandatory before Vite.
- Release identity advanced to v267.

## Retired overlay files automatically removed
11 retired CSS paths from v260-v266 are registered, including Select/Form vertical metrics, Expenses CSS, Repairs page CSS, dormant products-services-repairs redesign CSS, and repairs UI foundation CSS.

## Exact dirty-overlay verification
A test created all 11 retired CSS files plus a fake `dist-miniapp/assets/miniapp-OLD.css`, then ran production style preparation.
Result:
- 11/11 retired source CSS files were removed automatically.
- `dist-miniapp` CSS did not pollute the source inventory.
- style manifest audit passed with 445 registered local CSS files.
- Tailwind generated-entry integrity passed with 86 bundled sources.
- an unknown unregistered CSS file still failed closed.

## Source gate
65/65 source contracts passed. The long single-process run reached check 37 before tool timeout; checks 38-65 were executed without skips in two explicit batches and all passed.

## Production build in this environment
`npm run build` executes the new cleanup/regeneration/audit lifecycle successfully, then stops at `vite: not found` because this artifact environment does not contain `node_modules`. This is an environment limitation, not a v267 style-audit failure.
