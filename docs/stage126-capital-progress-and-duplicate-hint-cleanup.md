# Stage 126 — Capital progress height + duplicate hint cleanup

Changes:
- Progress bar in the partner capital table is now visible again:
  - 14px wrapper / 10px rail at <=1500px
  - 12px wrapper / 9px rail at <=1368px
- Removed the duplicate sale-type/source hint under `پرونده فروش مشتری`.
- The source/cash/installment context remains available in `تاریخ و منبع`.

Files:
- `pages/PartnerDetail.tsx`
- `styles/runtime-overrides/10zs-partner-capital-progress-final.css`
