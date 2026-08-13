// Domain database API extracted from legacyRuntime in Phase 1E.

import { getDbInstance } from "../core/runtimeBindings";
import {
  addExpenseToDb as addExpenseToRepo,
  updateExpenseInDb as updateExpenseInRepo,
  deleteExpenseFromDb as deleteExpenseFromRepo,
  listExpensesFromDb as listExpensesFromRepo,
  getExpensesSummaryFromDb as getExpensesSummaryFromRepo,
  addRecurringExpenseToDb as addRecurringExpenseToRepo,
  listRecurringExpensesFromDb as listRecurringExpensesFromRepo,
  updateRecurringExpenseInDb as updateRecurringExpenseInRepo,
  deleteRecurringExpenseFromDb as deleteRecurringExpenseFromRepo,
  getRecurringExpenseByIdFromDb as getRecurringExpenseByIdFromRepo,
  advanceRecurringExpenseNextRunDateInDb as advanceRecurringExpenseNextRunDateInRepo,
  markRecurringExpenseRunInDb as markRecurringExpenseRunInRepo,
  addRecurringExpensePaymentToDb as addRecurringExpensePaymentToRepo,
  type ExpensePayload,
  type RecurringExpensePayload,
  type RecurringExpensePaymentPayload,
} from "../../repositories/expenseRecords.repo";

export type {
  ExpenseCategory,
  ExpensePayload,
  RecurringExpensePayload,
  RecurringExpensePaymentPayload,
} from "../../repositories/expenseRecords.repo";

export const addExpenseToDb = async (
  payload: ExpensePayload,
  actor?: { userId?: number; username?: string },
) => {
  await getDbInstance();
  return addExpenseToRepo(payload, actor);
};

export const updateExpenseInDb = async (
  id: number,
  payload: Partial<ExpensePayload>,
) => {
  await getDbInstance();
  return updateExpenseInRepo(id, payload);
};

export const deleteExpenseFromDb = async (id: number) => {
  await getDbInstance();
  return deleteExpenseFromRepo(id);
};

export const listExpensesFromDb = async (filters?: {
  from?: string;
  to?: string;
  category?: string;
}) => {
  await getDbInstance();
  return listExpensesFromRepo(filters);
};

export const getExpensesSummaryFromDb = async (filters?: {
  from?: string;
  to?: string;
}) => {
  await getDbInstance();
  return getExpensesSummaryFromRepo(filters);
};

export const addRecurringExpenseToDb = async (
  payload: RecurringExpensePayload,
  actor?: { userId?: number; username?: string },
) => {
  await getDbInstance();
  return addRecurringExpenseToRepo(payload, actor);
};

export const listRecurringExpensesFromDb = async () => {
  await getDbInstance();
  return listRecurringExpensesFromRepo();
};

export const updateRecurringExpenseInDb = async (
  id: number,
  payload: Partial<RecurringExpensePayload>,
) => {
  await getDbInstance();
  return updateRecurringExpenseInRepo(id, payload);
};

export const deleteRecurringExpenseFromDb = async (id: number) => {
  await getDbInstance();
  return deleteRecurringExpenseFromRepo(id);
};

export const getRecurringExpenseByIdFromDb = async (id: number) => {
  await getDbInstance();
  return getRecurringExpenseByIdFromRepo(id);
};

export const advanceRecurringExpenseNextRunDateInDb = async (
  id: number,
  nextRunDate: string,
) => {
  await getDbInstance();
  return advanceRecurringExpenseNextRunDateInRepo(id, nextRunDate);
};

export const markRecurringExpenseRunInDb = async (
  recurringExpenseId: number,
  runMonth: string,
) => {
  await getDbInstance();
  return markRecurringExpenseRunInRepo(recurringExpenseId, runMonth);
};

export const addRecurringExpensePaymentToDb = async (
  recurringExpenseId: number,
  payload: RecurringExpensePaymentPayload,
  actor?: { userId?: number; username?: string },
) => {
  await getDbInstance();
  return addRecurringExpensePaymentToRepo(recurringExpenseId, payload, actor);
};
