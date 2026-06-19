# Stage 24 — Tailwind `@layer` Runtime Fix

## Problem

Stage 23 moved Tailwind-layer CSS files from `index.css` `@import` statements into direct ESM imports in `index.tsx`. That made Vite/PostCSS process each CSS file in isolation. Files containing `@layer components`, `@layer utilities`, or `@layer base` then failed because the matching `@tailwind components`, `@tailwind utilities`, or `@tailwind base` directive was not present in that same PostCSS/Tailwind context.

## Fix

A generated runtime CSS entry was added:

```txt
styles/generated/tailwind-entry.generated.css
```

This file concatenates the previously split source CSS files plus the small `index.css` Tailwind base fragment into one PostCSS/Tailwind context. `index.tsx` now imports this generated file once. Runtime override CSS files that do not use `@layer` continue to load after it, preserving the previous cascade.

## Source of truth

The maintainable source files remain split across `styles/core`, `styles/components`, `styles/pages`, and `styles/legacy`. The generated file is runtime output and should not be edited directly.

Regenerate it after CSS source edits with:

```bash
node scripts/rebuild-css-entry.mjs
```

## Why this is safer

- No direct isolated ESM import for files containing Tailwind `@layer`.
- No large CSS `@import` chain in the runtime entry.
- Split source files remain manageable.
- Runtime receives a single Tailwind context, which fixes the reported Vite/PostCSS errors.

## Validation

See:

```txt
docs/css-stage24-validation.json
docs/css-stage24-tailwind-entry-sources.csv
```
