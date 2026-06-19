# Stage 25 — PostCSS `from` warning + Babel 500KB note guard

## Problem observed

Runtime logs still showed:

```txt
A PostCSS plugin did not pass the `from` option to `postcss.parse`.
[BABEL] Note: The code generator has deoptimised the styling of D:\Kourosh\end\pages\Settings.tsx as it exceeds the max of 500KB.
```

## Fix applied

### 1. PostCSS parse guard

`postcss.config.cjs` now patches the local PostCSS instance before the configured plugins are loaded.

If any third-party plugin calls `postcss.parse(css)` without an explicit `from` option, the guard normalizes that call to:

```js
{ from: undefined }
```

This is safer than assigning a fake file path because inline/generated snippets should not resolve asset URLs relative to a fake source file.

### 2. Babel generator note guard

`vite.config.ts` now configures `@vitejs/plugin-react` with:

```ts
react({
  babel: {
    compact: false,
  },
})
```

This prevents Babel from switching large generated output to compact mode and printing the 500KB deoptimization note for the current legacy `pages/Settings.tsx` module.

## Important maintenance note

This removes the noisy runtime notes without changing application behavior. The real long-term architectural improvement is still to split `pages/Settings.tsx` into route-level modules under `pages/settings/`, especially Telegram, SMS, Local Domain, Commercial Modules, and Data/Backup panels.
