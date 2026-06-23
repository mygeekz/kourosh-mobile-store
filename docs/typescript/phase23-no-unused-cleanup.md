# Phase 23 — noUnused Cleanup

## Scope
This pass focuses on low-risk `noUnused` debt that can be proven without changing runtime behavior: unused import bindings across the application source tree.

## What changed

- Removed unused import bindings from 29 source files.
- Cleaned 37 import bindings total.
- Added a deterministic audit script:
  - `scripts/audit-unused-imports.mjs`
- Added package command:
  - `npm run audit:unused-imports`
- Added machine-readable cleanup report:
  - `docs/typescript/phase23-unused-import-cleanup.json`

## Safety rules used

- No business logic changed.
- No component markup was intentionally changed.
- No functions, hooks, utilities, or exported contracts were deleted.
- Only import bindings with zero lexical usage outside import declarations were removed.
- Suspicious runtime utilities were not removed.

## Validation

The following audit passed in this phase:

```bash
npm run audit:unused-imports
```

A syntax-level TypeScript transpile check was also run against the changed TS/TSX files.

## Notes

This phase intentionally does not attempt full `noUnusedLocals` cleanup for internal variables and callback parameters, because those require full dependency-aware TypeScript validation and are safer to resolve bucket-by-bucket after installing project dependencies locally.

## Next recommended phase

Phase 24 should target the remaining full-project TypeScript debt by bucket, starting with `legacy UI prop mismatches` and `date/backup utils`, while keeping runtime behavior unchanged.
