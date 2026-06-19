# Stage 23 — PostCSS `from` warning fix

## Problem

Dev server printed this warning:

```txt
A PostCSS plugin did not pass the `from` option to `postcss.parse`.
This may cause imported assets to be incorrectly transformed.
```

The app was running, but the warning is noisy and can make CSS asset resolution harder to trust.

## Root cause found in this project

`index.css` was still being used as a CSS import orchestrator and contained **92 CSS `@import` statements** before the Tailwind directives.

That pattern forces the Vite/PostCSS CSS pipeline to process a very large CSS import tree from inside a CSS file. Some plugin/internal parser paths can parse imported CSS without a stable `from` filename and PostCSS emits the warning.

## Fix applied

All `@import` lines were moved out of `index.css` and converted to ESM CSS imports in `index.tsx`, directly before:

```ts
import './index.css';
```

This preserves the previous cascade:

1. Foundation/core/legacy/page CSS files load first.
2. `index.css` still loads after them and keeps `@font-face`, `@tailwind base`, `@tailwind components`, and `@tailwind utilities`.
3. Runtime override imports still load after `index.css`, exactly as before.

## Why this is safer

- Vite receives every CSS file as a concrete module with a concrete file path.
- `index.css` is no longer responsible for CSS import orchestration.
- The previous source order is preserved.
- No selector or declaration value was changed.

## Validation

- Moved import count: **92**
- `index.css` still exists and contains the font/Tailwind entry rules.
- `index.css` has CSS `@import` after patch: **False**
- Missing local CSS imports: **0**
- Brace errors: **0**
- Parse errors: **0**

## Important maintenance rule

Do not add large CSS `@import` chains back into `index.css`. Add new CSS files as ordered ESM imports in `index.tsx`, or import component-local CSS beside the component when safe.
