import type { FinalizeRepairPayload } from "../../types";
import { execAsync, getAsync, runAsync } from "../db/query";

interface RepairFinalizationDeps {
  addCustomerLedgerEntry: (
    customerId: number,
    description: string,
    debit: number | undefined,
    credit: number | undefined,
    transactionDateISO?: string,
  ) => Promise<any>;
  addPartnerLedgerEntry: (
    partnerId: number,
    description: string,
    debit: number | undefined,
    credit: number | undefined,
    transactionDateISO?: string,
    referenceType?: string,
    referenceId?: number,
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
    if (!data.technicianId)
      throw new Error(
        "قبل از نهایی‌سازی، باید یک تعمیرکار به این تعمیر اختصاص داده شود.",
      );

    const newStatus = "تحویل داده شده";
    await runAsync(
      `UPDATE repairs SET status = ?, finalCost = ?, laborFee = ?, dateCompleted = ?, technicianId = ? WHERE id = ?`,
      [
        newStatus,
        data.finalCost,
        data.laborFee,
        new Date().toISOString(),
        data.technicianId,
        repairId,
      ],
    );

    // Debit customer account for the final cost
    if (data.finalCost > 0) {
      const customerLedgerDesc = `هزینه تعمیر دستگاه: ${repair.deviceModel} (شناسه تعمیر: ${repairId})`;
      await deps.addCustomerLedgerEntry(
        repair.customerId,
        customerLedgerDesc,
        data.finalCost,
        0,
        new Date().toISOString(),
      );
    }

    // Credit technician's account for the labor fee
    if (data.laborFee > 0) {
      const techLedgerDesc = `اجرت تعمیر دستگاه: ${repair.deviceModel} (شناسه تعمیر: ${repairId})`;
      await deps.addPartnerLedgerEntry(
        data.technicianId,
        techLedgerDesc,
        0,
        data.laborFee,
        new Date().toISOString(),
        "repair_fee",
        repairId,
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
