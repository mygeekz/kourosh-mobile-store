import type { FinalizeRepairPayload } from "../../types";
import { execAsync, getAsync, runAsync } from "../db/query";

interface RepairFinalizationDeps {
  addCustomerRepairCharge: (
    customerId: number,
    repairId: number,
    description: string,
    amount: number,
    transactionDateISO: string,
  ) => Promise<any>;
  addPartnerRepairFee: (
    partnerId: number,
    repairId: number,
    description: string,
    amount: number,
    transactionDateISO: string,
  ) => Promise<any>;
  getRepairById: (repairId: number) => Promise<any>;
}

export const finalizeRepairInDb = async (
  repairId: number,
  data: FinalizeRepairPayload,
  deps: RepairFinalizationDeps,
): Promise<any> => {
  await execAsync("BEGIN TRANSACTION;");
  try {
    const repair = await getAsync("SELECT * FROM repairs WHERE id = ?", [
      repairId,
    ]);
    if (!repair) throw new Error("تعمیر برای نهایی‌سازی یافت نشد.");
    if (repair.status === "تحویل داده شده")
      throw new Error("این تعمیر قبلا نهایی شده است.");
    const technicianId = Number(data.technicianId);
    const finalCost = Number(data.finalCost);
    const laborFee = Number(data.laborFee);

    if (!Number.isInteger(technicianId) || technicianId <= 0)
      throw new Error(
        "قبل از نهایی‌سازی، باید یک تعمیرکار معتبر به این تعمیر اختصاص داده شود.",
      );
    if (!Number.isFinite(finalCost) || finalCost <= 0)
      throw new Error("هزینه نهایی تعمیر باید یک مبلغ معتبر و بیشتر از صفر باشد.");
    if (!Number.isFinite(laborFee) || laborFee < 0)
      throw new Error("اجرت تعمیرکار باید یک مبلغ معتبر و صفر یا بیشتر باشد.");
    if (laborFee > finalCost)
      throw new Error("اجرت تعمیرکار نمی‌تواند بیشتر از هزینه نهایی کل باشد.");

    const newStatus = "تحویل داده شده";
    await runAsync(
      `UPDATE repairs SET status = ?, finalCost = ?, laborFee = ?, dateCompleted = ?, technicianId = ? WHERE id = ?`,
      [
        newStatus,
        finalCost,
        laborFee,
        new Date().toISOString(),
        technicianId,
        repairId,
      ],
    );

    // Debit customer account for the final cost
    if (finalCost > 0) {
      const customerLedgerDesc = `هزینه تعمیر دستگاه: ${repair.deviceModel} (شناسه تعمیر: ${repairId})`;
      await deps.addCustomerRepairCharge(
        repair.customerId,
        repairId,
        customerLedgerDesc,
        finalCost,
        new Date().toISOString(),
      );
    }

    // Credit technician's account for the labor fee
    if (laborFee > 0) {
      const techLedgerDesc = `اجرت تعمیر دستگاه: ${repair.deviceModel} (شناسه تعمیر: ${repairId})`;
      await deps.addPartnerRepairFee(
        technicianId,
        repairId,
        techLedgerDesc,
        laborFee,
        new Date().toISOString(),
      );
    }

    await execAsync("COMMIT;");
    return await deps.getRepairById(repairId);
  } catch (err: any) {
    await execAsync("ROLLBACK;");
    console.error("DB Error (finalizeRepairInDb):", err);
    throw err;
  }
};
