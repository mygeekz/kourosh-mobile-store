# Stage 18 - Legacy Global Button System Split

Source file removed:

```txt
styles/legacy/07-legacy-global-button-system.css
```

Replacement files:

```txt
styles/legacy/07a-legacy-button-stroke-normalization.css
styles/legacy/07b-legacy-premium-button-unification.css
```

Validation:

- Byte-for-byte reconstruction: PASS
- Original SHA256: `fcd84c6b3a857df0a07dc3d6bb9c30bba8cbacaba21992aec3597f7c3b6320f4`
- Reconstructed SHA256: `fcd84c6b3a857df0a07dc3d6bb9c30bba8cbacaba21992aec3597f7c3b6320f4`
- Selector/value edits: none
- Split boundaries: existing phase markers only
- Cascade order: preserved in `index.css`

Notes:

This file controls project-wide button normalization, so the split was intentionally conservative. The source order must remain `07a` before `07b`.
