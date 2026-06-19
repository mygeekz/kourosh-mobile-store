# Stage 112 — PartnerDetail solid visual reset

Focus:
No layout relocation. This stage targets the washed-out / haze problem only.

Findings:
PartnerDetail inherited several old CSS layers with:
- semi-transparent `rgba(...)` backgrounds
- `bg-white/90` chips
- weak muted text colors
- possible overlay/pseudo-element layers
- backdrop/filter/opacity utilities from detail-page shells

Fix:
- Added `10zi-partner-detail-solid-visual-reset.css`.
- PartnerDetail surfaces are solid.
- Hero/account cards have no blur/filter/backdrop/mask/pseudo overlay.
- Real content is lifted above any old layer with z-index.
- Chips/buttons/text are forced to full opacity and readable contrast.
- Older visual partner cleanup imports are removed; layout patch remains.

Files:
- `styles/runtime-overrides/10zi-partner-detail-solid-visual-reset.css`
- `index.tsx`
