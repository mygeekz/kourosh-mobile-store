# Phase 3.4 safe code sync

This bundle contains only source/scripts/docs changes. It does NOT contain or overwrite `server/kourosh_inventory.db`.

Preview:
`node apply-phase33-code-sync.mjs "D:\Kourosh\Astra"`

Apply:
`node apply-phase33-code-sync.mjs "D:\Kourosh\Astra" --apply --confirm=PHASE33_CODE_SYNC`

The script refuses to overwrite changed baseline files if the target Astra copy has diverged from the uploaded baseline, and backs up overwritten source files before copying.
