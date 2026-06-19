# Stage 147 — Horizontal payment modals

Targets:
- PartnerDetail ledger modal: `ثبت پرداخت به همکار` / `ثبت دریافت از همکار`
- InstallmentSaleDetailPage payment modal: `ثبت پرداخت اقساط`

Changes:
- Partner payment modal width expanded to `max-w-6xl`.
- Partner modal layout is explicitly horizontal: summary/type selector on one side, fields/actions on the other.
- Installment payment modal rebuilt as a horizontal two-column modal:
  - left/side: installment summary + payment history
  - right/main: new payment form
- All field titles in installment payment modal now have icons.
- Metric cards and status chips have consistent icon/spacing.
- Form object spacing is standardized.
- Responsive fallback to one column on small screens.
