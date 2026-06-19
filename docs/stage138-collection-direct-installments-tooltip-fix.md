# Stage 138 — Collection Center direct installment/check source + tooltip cleanup

Fixes:
1. Duplicate tooltip:
   - Removed native `data-tooltip` / title sources from the collection basis badge area.
   - Kept only the custom styled tooltip.
   - Tooltip is now left-aligned and viewport-safe.

2. Missing installment/check follow-up items:
   - Added backend helper `buildDirectInstallmentCollectionItems`.
   - It reads unpaid `installment_payments` and unpaid `installment_checks` directly.
   - It creates collection-center items even if the sale is not included in the product/non-phone report rows.
   - Direct items are merged with existing risk items by `sourceType/orderId`.

Why:
The "last 3 installments" UI showed unpaid installments, so Collection Center must include direct unpaid installment/check obligations, not only product sales rows.
