import { allAsync } from "../../database";

export async function fetchMobileAnalyticsInstallmentBaseRows(
  fromISO: string,
  toISO: string,
): Promise<any[]> {
  return allAsync(
    `
      SELECT
        isale.id AS saleId,
        COALESCE(isale.saleDateISO, isale.dateCreated) AS saleDate,
        isale.customerId AS customerId,
        c.fullName AS customerName,
        c.phoneNumber AS customerPhone,
        ph.id AS phoneId,
        ph.model AS phoneModel,
        ph.imei AS imei,
        COALESCE(isi.quantity, 1) AS quantity,
        COALESCE(ph.purchasePrice, 0) AS purchasePrice,
        NULLIF(ph.currentPurchasePrice, 0) AS currentPurchasePrice,
        COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(isi.buyPrice, 0), ph.purchasePrice, 0) AS phoneReferencePrice,
        COALESCE(isi.totalPrice, 0) AS itemTotal,
        COALESCE(isale.actualSalePrice, 0) AS actualSalePrice,
        COALESCE(isale.downPayment, 0) AS downPayment,
        COALESCE(isale.numberOfInstallments, 0) AS numberOfInstallments,
        COALESCE(isale.installmentAmount, 0) AS installmentAmount,
        isale.installmentsStartDate AS installmentsStartDate,
        isale.saleType AS saleType,
        isale.itemsSummary AS itemsSummary,
        isale.notes AS notes,
        (SELECT COALESCE(SUM(COALESCE(isi2.totalPrice, 0)), 0) FROM installment_sale_items isi2 WHERE isi2.saleId = isale.id) AS saleItemsBase,
        (SELECT balance FROM customer_ledger cl WHERE cl.customerId = isale.customerId ORDER BY cl.id DESC LIMIT 1) AS customerBalance
      FROM installment_sale_items isi
      JOIN installment_sales isale ON isale.id = isi.saleId
      LEFT JOIN phones ph ON isi.itemType = 'phone' AND isi.itemId = ph.id
      LEFT JOIN customers c ON c.id = isale.customerId
      WHERE COALESCE(isale.status,'active') = 'active'
        AND isi.itemType = 'phone'
        AND DATE(COALESCE(isale.saleDateISO, isale.dateCreated)) BETWEEN ? AND ?

      UNION ALL

      SELECT
        isale.id AS saleId,
        COALESCE(isale.saleDateISO, isale.dateCreated) AS saleDate,
        isale.customerId AS customerId,
        c.fullName AS customerName,
        c.phoneNumber AS customerPhone,
        ph.id AS phoneId,
        ph.model AS phoneModel,
        ph.imei AS imei,
        1 AS quantity,
        COALESCE(ph.purchasePrice, 0) AS purchasePrice,
        NULLIF(ph.currentPurchasePrice, 0) AS currentPurchasePrice,
        COALESCE(NULLIF(ph.currentPurchasePrice, 0), ph.purchasePrice, 0) AS phoneReferencePrice,
        COALESCE(isale.actualSalePrice, 0) AS itemTotal,
        COALESCE(isale.actualSalePrice, 0) AS actualSalePrice,
        COALESCE(isale.downPayment, 0) AS downPayment,
        COALESCE(isale.numberOfInstallments, 0) AS numberOfInstallments,
        COALESCE(isale.installmentAmount, 0) AS installmentAmount,
        isale.installmentsStartDate AS installmentsStartDate,
        isale.saleType AS saleType,
        isale.itemsSummary AS itemsSummary,
        isale.notes AS notes,
        COALESCE(isale.actualSalePrice, 0) AS saleItemsBase,
        (SELECT balance FROM customer_ledger cl WHERE cl.customerId = isale.customerId ORDER BY cl.id DESC LIMIT 1) AS customerBalance
      FROM installment_sales isale
      JOIN phones ph ON isale.phoneId = ph.id
      LEFT JOIN customers c ON c.id = isale.customerId
      WHERE COALESCE(isale.status,'active') = 'active'
        AND DATE(COALESCE(isale.saleDateISO, isale.dateCreated)) BETWEEN ? AND ?
        AND NOT EXISTS (SELECT 1 FROM installment_sale_items isi WHERE isi.saleId = isale.id AND isi.itemType = 'phone')
    `,
    [fromISO, toISO, fromISO, toISO],
  );
}

export async function fetchMobileAnalyticsInstallmentPaymentMaps(
  installmentBaseRows: any[],
): Promise<{
  paymentsBySale: Map<number, any[]>;
  checksBySale: Map<number, any[]>;
}> {
  const saleIds = Array.from(
    new Set(
      (installmentBaseRows as any[])
        .map((r: any) => Number(r.saleId || 0))
        .filter(Boolean),
    ),
  );
  const paymentsBySale = new Map<number, any[]>();
  const checksBySale = new Map<number, any[]>();
  if (saleIds.length) {
    const ph = saleIds.map(() => "?").join(",");
    const payRows = await allAsync(
      `SELECT
         ip.id AS paymentId,
         ip.saleId,
         ip.installmentNumber,
         ip.dueDate,
         ip.amountDue,
         ip.paymentDate,
         ip.status,
         ip.sourceType,
         ip.sourceId,
         COALESCE((
           SELECT SUM(it.amount_paid)
           FROM installment_transactions it
           WHERE it.installment_payment_id = ip.id
         ), 0) AS amountPaid
       FROM installment_payments ip
       WHERE ip.saleId IN (${ph})`,
      saleIds,
    );
    for (const row of payRows as any[]) {
      const id = Number(row.saleId || 0);
      const arr = paymentsBySale.get(id) || [];
      arr.push(row);
      paymentsBySale.set(id, arr);
    }
    const checkRows = await allAsync(
      `SELECT id AS checkId, saleId, checkNumber, bankName, dueDate, amount, status FROM installment_checks WHERE saleId IN (${ph})`,
      saleIds,
    ).catch(() => []);
    for (const row of checkRows as any[]) {
      const id = Number(row.saleId || 0);
      const arr = checksBySale.get(id) || [];
      arr.push(row);
      checksBySale.set(id, arr);
    }
  }

  return { paymentsBySale, checksBySale };
}
