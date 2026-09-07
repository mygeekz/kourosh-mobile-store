import type { NewRepairData, Repair as FrontendRepair } from "../../types";
import { getAsync, runAsync } from "../db/query";

interface RepairMutationDeps {
  getRepairById: (repairId: number) => Promise<any>;
}

export const createRepairInDb = async (
  data: NewRepairData,
  deps: RepairMutationDeps,
): Promise<any> => {
  const {
    customerId,
    deviceModel,
    deviceColor,
    serialNumber,
    problemDescription,
    estimatedCost,
  } = data;
  const result = await runAsync(
    `INSERT INTO repairs (customerId, deviceModel, deviceColor, serialNumber, problemDescription, estimatedCost, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      customerId,
      deviceModel,
      deviceColor || null,
      serialNumber || null,
      problemDescription,
      estimatedCost || null,
      "پذیرش شده",
    ],
  );
  return await deps.getRepairById(result.lastID);
};

export const updateRepairInDb = async (
  repairId: number,
  data: Partial<FrontendRepair>,
  deps: RepairMutationDeps,
): Promise<any> => {
  const { status, technicianNotes, finalCost, technicianId, laborFee } = data;

  const existingRepair = await getAsync("SELECT * FROM repairs WHERE id = ?", [
    repairId,
  ]);
  if (!existingRepair) throw new Error("Repair not found");

  const fieldsToUpdate: string[] = [];
  const params: any[] = [];

  if (status) {
    fieldsToUpdate.push("status = ?");
    params.push(status);
  }
  if (technicianNotes !== undefined) {
    fieldsToUpdate.push("technicianNotes = ?");
    params.push(technicianNotes);
  }
  if (finalCost !== undefined) {
    fieldsToUpdate.push("finalCost = ?");
    params.push(finalCost);
  }
  if (technicianId !== undefined) {
    fieldsToUpdate.push("technicianId = ?");
    params.push(technicianId);
  }
  if (laborFee !== undefined) {
    fieldsToUpdate.push("laborFee = ?");
    params.push(laborFee);
  }

  if (fieldsToUpdate.length === 0) return existingRepair;

  if (status === "تحویل داده شده") {
    fieldsToUpdate.push("dateCompleted = ?");
    params.push(new Date().toISOString());
  }

  params.push(repairId);

  await runAsync(
    `UPDATE repairs SET ${fieldsToUpdate.join(", ")} WHERE id = ?`,
    params,
  );
  return await deps.getRepairById(repairId);
};
