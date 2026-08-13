import { purchasesRepo } from '../repositories/purchases.repo';

export const purchasesService = {
  listPurchases: () => purchasesRepo.listPurchases(),
  getPurchaseById: (id: number) => purchasesRepo.getPurchaseById(id),

  async createPurchase(input: { body: any; user?: any }) {
    const userId = input.user?.id;
    const payload = { ...(input.body || {}), createdByUserId: userId || null };
    const data = await purchasesRepo.createPurchaseReceipt(payload);

    // Inventory ledger IN (FIFO layers)
    try {
      const items = (data as any)?.items || [];
      for (const it of items) {
        if (it?.productId && it?.quantity) {
          const unitCost = Number(it?.unitCost || it?.price || 0);
          await purchasesRepo.recordInventoryEntry({
            productId: Number(it.productId),
            entryType: 'in',
            quantity: Number(it.quantity),
            unitCost,
            refType: 'purchase',
            refId: Number((data as any)?.id),
            entryDate: String(
              (data as any)?.purchaseDate || new Date().toISOString(),
            ),
          });
        }
      }
    } catch {}

    // Auto expense for inventory purchase (to make financial report real)
    try {
      const totalCost = Number((data as any)?.totalCost || 0);
      if (totalCost > 0) {
        let vendor: string | null = null;
        const supplierId = (data as any)?.supplierId;
        if (supplierId) {
          try {
            vendor = await purchasesRepo.getPartnerNameById(Number(supplierId));
          } catch {}
        }
        const actor = input.user
          ? { userId: input.user.id, username: input.user.username }
          : undefined;
        await purchasesRepo.addInventoryPurchaseExpense(
          {
            expenseDate: String(
              (data as any)?.purchaseDate || new Date().toISOString(),
            ),
            category: 'inventory',
            title: `خرید کالا (رسید #${(data as any)?.id ?? ''})`,
            amount: totalCost,
            vendor,
            notes: (data as any)?.invoiceNumber
              ? `فاکتور: ${(data as any).invoiceNumber}`
              : null,
          } as any,
          actor as any,
        );
      }
    } catch {}

    if (input.user) {
      try {
        purchasesRepo.addAuditLog(
          input.user.id,
          input.user.username,
          input.user.roleName,
          'create',
          'purchase',
          (data as any)?.id || null,
          `ثبت رسید خرید #${(data as any)?.id ?? ''}`,
        );
      } catch {}
    }

    return data;
  },
};
