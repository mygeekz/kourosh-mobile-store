import moment from "jalali-moment";
import { allAsync, getAsync, runAsync } from "../db/query";

export type ExpenseCategory =
  | "rent"
  | "salary"
  | "inventory"
  | "marketing"
  | "logistics"
  | "utilities"
  | "software"
  | "repair"
  | "tax"
  | "loan"
  | "overhead";

export type ExpensePayload = {
  expenseDate: string; // ISO
  category: ExpenseCategory;
  title: string;
  amount: number;
  vendor?: string | null;
  notes?: string | null;
  paymentMethod?: "cash" | "card" | "transfer" | string | null;
  referenceNo?: string | null;
};

export const addExpenseToDb = async (
  payload: ExpensePayload,
  actor?: { userId?: number; username?: string },
) => {
  const title = String(payload.title || "").trim();
  if (!title) throw new Error("عنوان هزینه خالی است.");
  const amount = Number(payload.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0)
    throw new Error("مبلغ هزینه نامعتبر است.");
  const category = String(payload.category || "").trim() as any;
  const allowed: ExpenseCategory[] = [
    "rent",
    "salary",
    "inventory",
    "marketing",
    "logistics",
    "utilities",
    "software",
    "repair",
    "tax",
    "loan",
    "overhead",
  ];
  if (!allowed.includes(category))
    throw new Error("دسته‌بندی هزینه نامعتبر است.");
  const expenseDate = String(payload.expenseDate || "").trim();
  if (!expenseDate) throw new Error("تاریخ هزینه خالی است.");
  const paymentMethod = String(payload.paymentMethod || "cash").trim();
  const allowedPaymentMethods = ["cash", "card", "transfer"];
  if (!allowedPaymentMethods.includes(paymentMethod))
    throw new Error("روش پرداخت هزینه نامعتبر است.");

  const result = await runAsync(
    `INSERT INTO expenses (expenseDate, category, title, amount, vendor, notes, paymentMethod, referenceNo, createdByUserId, createdByUsername)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      expenseDate,
      category,
      title,
      Math.round(amount),
      payload.vendor ?? null,
      payload.notes ?? null,
      paymentMethod,
      payload.referenceNo ?? null,
      actor?.userId ?? null,
      actor?.username ?? null,
    ],
  );
  return await getAsync(`SELECT * FROM expenses WHERE id = ?`, [result.lastID]);
};

export const updateExpenseInDb = async (
  id: number,
  payload: Partial<ExpensePayload>,
) => {
  const updates: string[] = [];
  const params: any[] = [];

  if (payload.title != null) {
    const t = String(payload.title || "").trim();
    if (!t) throw new Error("عنوان هزینه خالی است.");
    updates.push("title = ?");
    params.push(t);
  }
  if (payload.amount != null) {
    const a = Number(payload.amount);
    if (!Number.isFinite(a) || a <= 0)
      throw new Error("مبلغ هزینه نامعتبر است.");
    updates.push("amount = ?");
    params.push(Math.round(a));
  }
  if (payload.category != null) {
    const c = String(payload.category).trim() as any;
    const allowed: ExpenseCategory[] = [
      "rent",
      "salary",
      "inventory",
      "marketing",
      "logistics",
      "utilities",
      "software",
      "repair",
      "tax",
      "loan",
      "overhead",
    ];
    if (!allowed.includes(c)) throw new Error("دسته‌بندی هزینه نامعتبر است.");
    updates.push("category = ?");
    params.push(c);
  }
  if (payload.expenseDate != null) {
    const d = String(payload.expenseDate || "").trim();
    if (!d) throw new Error("تاریخ هزینه خالی است.");
    updates.push("expenseDate = ?");
    params.push(d);
  }
  if (payload.vendor !== undefined) {
    updates.push("vendor = ?");
    params.push(payload.vendor ?? null);
  }
  if (payload.notes !== undefined) {
    updates.push("notes = ?");
    params.push(payload.notes ?? null);
  }
  if (payload.paymentMethod !== undefined) {
    const pm = String(payload.paymentMethod || "cash").trim();
    const allowedPaymentMethods = ["cash", "card", "transfer"];
    if (!allowedPaymentMethods.includes(pm)) throw new Error("روش پرداخت هزینه نامعتبر است.");
    updates.push("paymentMethod = ?");
    params.push(pm);
  }
  if (payload.referenceNo !== undefined) {
    updates.push("referenceNo = ?");
    params.push(payload.referenceNo ?? null);
  }

  if (!updates.length)
    return await getAsync(`SELECT * FROM expenses WHERE id = ?`, [id]);

  params.push(id);
  await runAsync(
    `UPDATE expenses SET ${updates.join(", ")} WHERE id = ?`,
    params,
  );
  const updated = await getAsync(`SELECT * FROM expenses WHERE id = ?`, [id]);
  if (updated) {
    try {
      await runAsync(
        `UPDATE recurring_expense_payments
            SET amount = ?, paymentDate = date(?), paymentMethod = ?, referenceNo = ?, notes = ?
          WHERE expenseId = ?`,
        [
          Number(updated.amount || 0),
          String(updated.expenseDate || "").slice(0, 10),
          updated.paymentMethod || "cash",
          updated.referenceNo ?? null,
          updated.notes ?? null,
          id,
        ],
      );
    } catch {}
  }
  return updated;
};

export const deleteExpenseFromDb = async (id: number) => {
  try {
    await runAsync(`DELETE FROM recurring_expense_payments WHERE expenseId = ?`, [id]);
  } catch {}
  await runAsync(`DELETE FROM expenses WHERE id = ?`, [id]);
};

export const listExpensesFromDb = async (filters?: {
  from?: string;
  to?: string;
  category?: string;
}) => {
  const where: string[] = [];
  const params: any[] = [];
  if (filters?.from) {
    where.push("date(expenseDate) >= date(?)");
    params.push(String(filters.from).slice(0, 10));
  }
  if (filters?.to) {
    where.push("date(expenseDate) <= date(?)");
    params.push(String(filters.to).slice(0, 10));
  }
  if (filters?.category && filters.category !== "all") {
    where.push("category = ?");
    params.push(filters.category);
  }
  const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";
  return await allAsync(
    `SELECT * FROM expenses ${whereSql} ORDER BY expenseDate DESC, id DESC LIMIT 2000`,
    params,
  );
};

export const getExpensesSummaryFromDb = async (filters?: {
  from?: string;
  to?: string;
}) => {
  const where: string[] = [];
  const params: any[] = [];
  if (filters?.from) {
    where.push("date(expenseDate) >= date(?)");
    params.push(String(filters.from).slice(0, 10));
  }
  if (filters?.to) {
    where.push("date(expenseDate) <= date(?)");
    params.push(String(filters.to).slice(0, 10));
  }
  const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";
  const rows = await allAsync(
    `SELECT category, SUM(amount) as total FROM expenses ${whereSql} GROUP BY category`,
    params,
  );
  const totalRow = await getAsync(
    `SELECT SUM(amount) as total FROM expenses ${whereSql}`,
    params,
  );
  return { byCategory: rows || [], total: Number(totalRow?.total || 0) };
};

export type RecurringExpensePayload = {
  title: string;
  category: ExpenseCategory;
  amount: number;
  vendor?: string | null;
  notes?: string | null;
  dayOfMonth: number; // 1..31
  nextRunDate: string; // YYYY-MM-DD
  recurringType?: "monthly" | "installment" | string | null;
  totalInstallments?: number | null;
  paidInstallments?: number | null;
  isActive?: boolean;
};

export const addRecurringExpenseToDb = async (
  payload: RecurringExpensePayload,
  actor?: { userId?: number; username?: string },
) => {
  const title = String(payload.title || "").trim();
  if (!title) throw new Error("عنوان هزینه تکرارشونده خالی است.");
  const amount = Number(payload.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0)
    throw new Error("مبلغ نامعتبر است.");
  const category = String(payload.category || "").trim() as any;
  const allowed: ExpenseCategory[] = [
    "rent",
    "salary",
    "inventory",
    "marketing",
    "logistics",
    "utilities",
    "software",
    "repair",
    "tax",
    "loan",
    "overhead",
  ];
  if (!allowed.includes(category)) throw new Error("دسته‌بندی نامعتبر است.");
  const dayOfMonth = Math.floor(Number(payload.dayOfMonth));
  if (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31)
    throw new Error("روز ماه نامعتبر است.");
  const nextRunDate = String(payload.nextRunDate || "").trim();
  if (!nextRunDate) throw new Error("nextRunDate خالی است.");
  const recurringType =
    payload.recurringType === "installment" ? "installment" : "monthly";
  const totalInstallments =
    recurringType === "installment"
      ? Math.floor(Number(payload.totalInstallments || 0))
      : null;
  if (
    recurringType === "installment" &&
    (!totalInstallments || totalInstallments < 1)
  )
    throw new Error("تعداد اقساط نامعتبر است.");
  const paidInstallments = Math.max(
    0,
    Math.floor(Number(payload.paidInstallments || 0)),
  );

  const ins = await runAsync(
    `INSERT INTO recurring_expenses (title, category, amount, vendor, notes, dayOfMonth, nextRunDate, recurringType, totalInstallments, paidInstallments, isActive, createdByUserId, createdByUsername)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      title,
      category,
      Math.round(amount),
      payload.vendor ?? null,
      payload.notes ?? null,
      dayOfMonth,
      nextRunDate,
      recurringType,
      totalInstallments,
      paidInstallments,
      payload.isActive === false ? 0 : 1,
      actor?.userId ?? null,
      actor?.username ?? null,
    ],
  );

  return await getAsync(`SELECT * FROM recurring_expenses WHERE id = ?`, [
    ins.lastID,
  ]);
};

export const listRecurringExpensesFromDb = async () => {
  const rows: any[] = await allAsync(
    `SELECT
        r.*,
        COALESCE((
          SELECT SUM(p.amount)
          FROM recurring_expense_payments p
          WHERE p.recurringExpenseId = r.id
            AND p.runMonth = strftime('%Y-%m', r.nextRunDate)
        ), 0) AS currentCyclePaid,
        MAX(0, r.amount - COALESCE((
          SELECT SUM(p.amount)
          FROM recurring_expense_payments p
          WHERE p.recurringExpenseId = r.id
            AND p.runMonth = strftime('%Y-%m', r.nextRunDate)
        ), 0)) AS currentCycleRemaining,
        COALESCE((
          SELECT COUNT(*)
          FROM recurring_expense_payments p
          WHERE p.recurringExpenseId = r.id
            AND p.runMonth = strftime('%Y-%m', r.nextRunDate)
        ), 0) AS currentCyclePaymentCount,
        (
          SELECT p.paymentDate
          FROM recurring_expense_payments p
          WHERE p.recurringExpenseId = r.id
          ORDER BY p.paymentDate DESC, p.id DESC
          LIMIT 1
        ) AS lastPaymentDate,
        (
          SELECT p.amount
          FROM recurring_expense_payments p
          WHERE p.recurringExpenseId = r.id
          ORDER BY p.paymentDate DESC, p.id DESC
          LIMIT 1
        ) AS lastPaymentAmount
      FROM recurring_expenses r
      ORDER BY r.isActive DESC, r.nextRunDate ASC, r.id DESC`,
    [],
  );

  return await Promise.all(
    (rows || []).map(async (row: any) => {
      const runMonth = String(row.nextRunDate || '').slice(0, 7);
      const currentCyclePayments = runMonth
        ? await allAsync(
            `SELECT id, expenseId, runMonth, paymentDate, amount, paymentMethod, referenceNo, notes, createdAt, createdByUsername
               FROM recurring_expense_payments
              WHERE recurringExpenseId = ? AND runMonth = ?
              ORDER BY date(paymentDate) DESC, id DESC
              LIMIT 12`,
            [row.id, runMonth],
          )
        : [];
      const recentPayments = await allAsync(
        `SELECT id, expenseId, runMonth, paymentDate, amount, paymentMethod, referenceNo, notes, createdAt, createdByUsername
           FROM recurring_expense_payments
          WHERE recurringExpenseId = ?
          ORDER BY date(paymentDate) DESC, id DESC
          LIMIT 8`,
        [row.id],
      );
      return {
        ...row,
        currentCyclePayments: currentCyclePayments || [],
        recentPayments: recentPayments || [],
      };
    }),
  );
};

export const updateRecurringExpenseInDb = async (
  id: number,
  payload: Partial<RecurringExpensePayload>,
) => {
  const updates: string[] = [];
  const params: any[] = [];

  if (payload.title != null) {
    const t = String(payload.title || "").trim();
    if (!t) throw new Error("عنوان خالی است.");
    updates.push("title = ?");
    params.push(t);
  }
  if (payload.amount != null) {
    const a = Number(payload.amount);
    if (!Number.isFinite(a) || a <= 0) throw new Error("مبلغ نامعتبر است.");
    updates.push("amount = ?");
    params.push(Math.round(a));
  }
  if (payload.category != null) {
    const c = String(payload.category).trim() as any;
    const allowed: ExpenseCategory[] = [
      "rent",
      "salary",
      "inventory",
      "marketing",
      "logistics",
      "utilities",
      "software",
      "repair",
      "tax",
      "loan",
      "overhead",
    ];
    if (!allowed.includes(c)) throw new Error("دسته‌بندی نامعتبر است.");
    updates.push("category = ?");
    params.push(c);
  }
  if (payload.vendor !== undefined) {
    updates.push("vendor = ?");
    params.push(payload.vendor ?? null);
  }
  if (payload.notes !== undefined) {
    updates.push("notes = ?");
    params.push(payload.notes ?? null);
  }
  if (payload.dayOfMonth != null) {
    const d = Math.floor(Number(payload.dayOfMonth));
    if (!d || d < 1 || d > 31) throw new Error("روز ماه نامعتبر است.");
    updates.push("dayOfMonth = ?");
    params.push(d);
  }
  if (payload.nextRunDate != null) {
    const n = String(payload.nextRunDate || "").trim();
    if (!n) throw new Error("nextRunDate خالی است.");
    updates.push("nextRunDate = ?");
    params.push(n);
  }
  if (payload.recurringType != null) {
    const rt = payload.recurringType === "installment" ? "installment" : "monthly";
    updates.push("recurringType = ?");
    params.push(rt);
    if (rt === "monthly" && payload.totalInstallments === undefined) {
      updates.push("totalInstallments = ?");
      params.push(null);
    }
  }
  if (payload.totalInstallments !== undefined) {
    const total =
      payload.totalInstallments == null
        ? null
        : Math.floor(Number(payload.totalInstallments || 0));
    if (payload.recurringType === "installment" && (!total || total < 1)) {
      throw new Error("تعداد اقساط نامعتبر است.");
    }
    updates.push("totalInstallments = ?");
    params.push(total);
  }
  if (payload.paidInstallments !== undefined) {
    const paid = Math.max(0, Math.floor(Number(payload.paidInstallments || 0)));
    updates.push("paidInstallments = ?");
    params.push(paid);
  }
  if (payload.isActive != null) {
    updates.push("isActive = ?");
    params.push(payload.isActive ? 1 : 0);
  }

  if (!updates.length)
    return await getAsync(`SELECT * FROM recurring_expenses WHERE id = ?`, [
      id,
    ]);

  params.push(id);
  await runAsync(
    `UPDATE recurring_expenses SET ${updates.join(", ")} WHERE id = ?`,
    params,
  );
  return await getAsync(`SELECT * FROM recurring_expenses WHERE id = ?`, [id]);
};

export const deleteRecurringExpenseFromDb = async (id: number) => {
  await runAsync(`DELETE FROM recurring_expenses WHERE id = ?`, [id]);
};

export const getRecurringExpenseByIdFromDb = async (id: number) => {
  return await getAsync(`SELECT * FROM recurring_expenses WHERE id = ?`, [id]);
};

export const advanceRecurringExpenseNextRunDateInDb = async (
  id: number,
  nextRunDate: string,
) => {
  await runAsync(`UPDATE recurring_expenses SET nextRunDate = ? WHERE id = ?`, [
    nextRunDate,
    id,
  ]);
};

export const markRecurringExpenseRunInDb = async (
  recurringExpenseId: number,
  runMonth: string,
) => {
  const m = String(runMonth || "").trim();
  if (!m) throw new Error("runMonth خالی است.");
  try {
    await runAsync(
      `INSERT INTO recurring_expense_runs (recurringExpenseId, runMonth) VALUES (?, ?)`,
      [recurringExpenseId, m],
    );
    return { inserted: true };
  } catch (e: any) {
    // SQLite unique constraint
    return { inserted: false };
  }
};

export type RecurringExpensePaymentPayload = {
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  paymentMethod?: "cash" | "card" | "transfer" | string | null;
  referenceNo?: string | null;
  notes?: string | null;
};

export const addRecurringExpensePaymentToDb = async (
  recurringExpenseId: number,
  payload: RecurringExpensePaymentPayload,
  actor?: { userId?: number; username?: string },
) => {
  const row: any = await getAsync(`SELECT * FROM recurring_expenses WHERE id = ?`, [
    recurringExpenseId,
  ]);
  if (!row) throw new Error("هزینه تکرارشونده یافت نشد.");
  if (Number(row.isActive) !== 1) throw new Error("این مورد غیرفعال است.");

  const amount = Number(payload.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("مبلغ پرداخت نامعتبر است.");

  const paymentDate = String(payload.paymentDate || "").trim();
  if (!paymentDate) throw new Error("تاریخ پرداخت خالی است.");

  const runMonth = String(row.nextRunDate || "").slice(0, 7);
  if (!runMonth) throw new Error("دوره پرداخت نامعتبر است.");

  const currentPaidRow: any = await getAsync(
    `SELECT COALESCE(SUM(amount), 0) AS paid FROM recurring_expense_payments WHERE recurringExpenseId = ? AND runMonth = ?`,
    [recurringExpenseId, runMonth],
  );
  const paidBefore = Number(currentPaidRow?.paid || 0);
  const scheduledAmount = Math.max(0, Number(row.amount || 0));
  const paidAfter = paidBefore + Math.round(amount);
  const cycleCompleted = scheduledAmount > 0 && paidAfter >= scheduledAmount;

  const paymentLabel = cycleCompleted
    ? "پرداخت کامل"
    : paidBefore > 0
      ? "پرداخت جزئی"
      : "پرداخت / مساعده";
  const title = `${row.title} (${paymentLabel} ${runMonth})`;
  const createdExpense = await addExpenseToDb(
    {
      expenseDate: new Date(`${paymentDate}T23:59:59.000Z`).toISOString(),
      category: row.category,
      title,
      amount: Math.round(amount),
      vendor: row.vendor ?? null,
      notes: payload.notes ?? row.notes ?? null,
      paymentMethod: payload.paymentMethod || "cash",
      referenceNo: payload.referenceNo ?? null,
    } as any,
    actor as any,
  );

  const ins = await runAsync(
    `INSERT INTO recurring_expense_payments (recurringExpenseId, expenseId, runMonth, paymentDate, amount, paymentMethod, referenceNo, notes, createdByUserId, createdByUsername)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      recurringExpenseId,
      createdExpense?.id ?? null,
      runMonth,
      paymentDate,
      Math.round(amount),
      payload.paymentMethod || "cash",
      payload.referenceNo ?? null,
      payload.notes ?? null,
      actor?.userId ?? null,
      actor?.username ?? null,
    ],
  );

  let nextRunDate: string | null = null;
  let installmentProgress: any = null;

  if (cycleCompleted) {
    try {
      await runAsync(
        `INSERT OR IGNORE INTO recurring_expense_runs (recurringExpenseId, runMonth) VALUES (?, ?)`,
        [recurringExpenseId, runMonth],
      );
    } catch {}

    const dayOfMonth = Math.max(1, Math.min(31, Number(row.dayOfMonth || 1)));
    const next = moment(String(row.nextRunDate)).add(1, "month");
    const dim = next.daysInMonth();
    next.date(Math.min(dayOfMonth, dim));
    nextRunDate = next.format("YYYY-MM-DD");
    await advanceRecurringExpenseNextRunDateInDb(recurringExpenseId, nextRunDate);

    const isInstallment = row.recurringType === "installment";
    if (isInstallment) {
      const paidInstallmentsBefore = Math.max(0, Number(row.paidInstallments || 0));
      const totalInstallments = Math.max(0, Number(row.totalInstallments || 0));
      const paidInstallmentsAfter = paidInstallmentsBefore + 1;
      const completed = totalInstallments > 0 && paidInstallmentsAfter >= totalInstallments;
      await updateRecurringExpenseInDb(recurringExpenseId, {
        paidInstallments: paidInstallmentsAfter,
        isActive: !completed,
      } as any);
      installmentProgress = {
        paid: paidInstallmentsAfter,
        total: totalInstallments || null,
        completed,
      };
    }
  }

  const payment = await getAsync(`SELECT * FROM recurring_expense_payments WHERE id = ?`, [
    ins.lastID,
  ]);

  return {
    payment,
    createdExpense,
    runMonth,
    paidBefore,
    paidAfter,
    remaining: Math.max(0, scheduledAmount - paidAfter),
    cycleCompleted,
    nextRunDate,
    installmentProgress,
  };
};

