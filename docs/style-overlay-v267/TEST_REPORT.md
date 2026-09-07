# v267 Test Report

- Release marker: v267
- Production style prebuild: PASS
- Style manifest audit: PASS — 445 local CSS, 308 ordered runtime imports
- Tailwind generated entry: PASS — 86 bundled sources
- Generated CSS SHA256: `f8709e6d88d5d9884f1d9b516a8c1acb216f5a5da5dc820be741f14694c72acf`
- Overlay cleanup test: PASS
- Build artifacts excluded from source inventory: PASS
- Unknown unregistered CSS remains fail-closed: PASS
- Release/gate audit: PASS
- Source release gate: 65/65 PASS (completed across timed run + explicit continuation batches; no skips)
- `npm run build`: prebuild PASS; Vite not executable in this environment (`vite: not found`)
