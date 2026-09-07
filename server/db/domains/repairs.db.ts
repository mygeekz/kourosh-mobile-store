// Repair database API extracted from legacyRuntime in Phase 1F.
// This module talks directly to repositories/core and does not import legacyRuntime.

import { getDbInstance } from "../core/runtimeBindings";
import { allAsync } from "../query";
import { addCustomerLedgerEntryInternal } from "./customers.db";
import { addPartnerLedgerEntryInternal } from "./ledgerSupport.db";
import type {
  FinalizeRepairPayload,
  NewRepairData,
  Repair as FrontendRepair,
  RepairPart,
} from "../../../types";
import {
  getAllRepairsFromDb as getAllRepairsFromRepo,
  getRepairByIdFromDb as getRepairByIdFromRepo,
  getRepairDetailsForSms as getRepairDetailsForSmsFromRepo,
  getRepairsReadyForPickupFromDb as getRepairsReadyForPickupFromRepo,
  createRepairInDb as createRepairInRepo,
  updateRepairInDb as updateRepairInRepo,
  finalizeRepairInDb as finalizeRepairInRepo,
  addPartToRepairInDb as addPartToRepairInRepo,
  deletePartFromRepairInDb as deletePartFromRepairInRepo,
} from "../../repositories/repairs.repo";

export interface RepairFinancialSummary {
  count: number;
  revenue: number;
  partsCost: number;
  laborFee: number;
  costs: number;
  profit: number;
}

export const getRepairFinancialSummary = async (
  fromISO: string,
  toISO: string,
): Promise<RepairFinancialSummary> => {
  await getDbInstance();

  const rows = await allAsync(
    `SELECT
        r.id,
        COALESCE(r.finalCost, 0) AS finalCost,
        COALESCE(r.laborFee, 0) AS laborFee,
        COALESCE(SUM(COALESCE(rp.quantityUsed, 0) * COALESCE(p.purchasePrice, 0)), 0) AS partsCost
       FROM repairs r
       LEFT JOIN repair_parts rp ON rp.repairId = r.id
       LEFT JOIN products p ON p.id = rp.productId
      WHERE r.status = 'تحویل داده شده'
        AND date(COALESCE(r.dateCompleted, r.dateReceived)) BETWEEN date(?) AND date(?)
      GROUP BY r.id`,
    [fromISO, toISO],
  );

  let count = 0;
  let revenue = 0;
  let partsCost = 0;
  let laborFee = 0;
  for (const r of (rows || []) as any[]) {
    count += 1;
    revenue += Number(r.finalCost || 0);
    partsCost += Number(r.partsCost || 0);
    laborFee += Number(r.laborFee || 0);
  }
  const costs = partsCost + laborFee;
  const profit = revenue - costs;
  return { count, revenue, partsCost, laborFee, costs, profit };
};

export const createRepairInDb = async (data: NewRepairData): Promise<any> => {
  await getDbInstance();
  return await createRepairInRepo(data, { getRepairById: getRepairByIdFromDb });
};

export const getAllRepairsFromDb = async (
  statusFilter?: string,
): Promise<FrontendRepair[]> => {
  await getDbInstance();
  return await getAllRepairsFromRepo(statusFilter);
};

export const getRepairByIdFromDb = async (repairId: number): Promise<any> => {
  await getDbInstance();
  return await getRepairByIdFromRepo(repairId);
};

export const updateRepairInDb = async (
  repairId: number,
  data: Partial<FrontendRepair>,
): Promise<any> => {
  await getDbInstance();
  return await updateRepairInRepo(repairId, data, {
    getRepairById: getRepairByIdFromDb,
  });
};

export const finalizeRepairInDb = async (
  repairId: number,
  data: FinalizeRepairPayload,
): Promise<any> => {
  return await finalizeRepairInRepo(repairId, data, {
    addCustomerLedgerEntry: addCustomerLedgerEntryInternal,
    addPartnerLedgerEntry: addPartnerLedgerEntryInternal,
    getRepairById: getRepairByIdFromDb,
  });
};

export const addPartToRepairInDb = async (
  repairId: number,
  productId: number,
  quantityUsed: number,
): Promise<RepairPart> => {
  await getDbInstance();
  return await addPartToRepairInRepo(repairId, productId, quantityUsed);
};

export const deletePartFromRepairInDb = async (
  partId: number,
): Promise<boolean> => {
  await getDbInstance();
  return await deletePartFromRepairInRepo(partId);
};

export const getRepairDetailsForSms = async (
  repairId: number,
): Promise<any> => {
  await getDbInstance();
  return await getRepairDetailsForSmsFromRepo(repairId);
};

export const getRepairsReadyForPickupFromDb = async (): Promise<any[]> => {
  await getDbInstance();
  return await getRepairsReadyForPickupFromRepo();
};
