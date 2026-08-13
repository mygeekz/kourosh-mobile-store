import {
  addExpenseToDb,
  addRecurringExpensePaymentToDb,
  addRecurringExpenseToDb,
  allAsync,
  deleteExpenseFromDb,
  deleteRecurringExpenseFromDb,
  getAsync,
  getExpensesSummaryFromDb,
  getRecurringExpenseByIdFromDb,
  listExpensesFromDb,
  listRecurringExpensesFromDb,
  updateExpenseInDb,
  updateRecurringExpenseInDb,
} from '../database';

export type ExpenseDateFilters = {
  from?: string;
  to?: string;
  category?: string;
};

export type ExpenseActor = {
  userId: number;
  username: string;
};

export const expensesRepo = {
  listExpenses: (filters: ExpenseDateFilters) => listExpensesFromDb(filters),

  createExpense: (payload: any, actor?: ExpenseActor) =>
    addExpenseToDb(payload, actor),

  updateExpense: (id: number, payload: any) => updateExpenseInDb(id, payload),

  deleteExpense: (id: number) => deleteExpenseFromDb(id),

  getExpensesSummary: (filters: { from?: string; to?: string }) =>
    getExpensesSummaryFromDb(filters),

  listExpenseTitleOptionRows: () =>
    allAsync(
      `SELECT
           title,
           category,
           COALESCE(NULLIF(TRIM(vendor), ''), '') as vendor,
           COUNT(*) as count,
           COALESCE(SUM(amount),0) as total,
           MAX(expenseDate) as lastDate,
           MAX(amount) as lastAmount,
           'expense' as source
         FROM expenses
         WHERE TRIM(title) <> ''
         GROUP BY TRIM(title)
         ORDER BY date(lastDate) DESC, count DESC
         LIMIT 250`,
      [],
    ),

  listRecurringTitleOptionRows: () =>
    allAsync(
      `SELECT
           title,
           category,
           COALESCE(NULLIF(TRIM(vendor), ''), '') as vendor,
           0 as count,
           COALESCE(amount,0) as total,
           nextRunDate as lastDate,
           amount as lastAmount,
           'recurring' as source
         FROM recurring_expenses
         WHERE TRIM(title) <> ''
         ORDER BY isActive DESC, date(nextRunDate) ASC, id DESC
         LIMIT 250`,
      [],
    ),

  listExpenseTitleHistoryExact: (title: string) =>
    allAsync(
      `SELECT * FROM expenses WHERE TRIM(title) = TRIM(?) ORDER BY date(expenseDate) DESC, id DESC LIMIT 24`,
      [title],
    ),

  listExpenseTitleHistoryLike: (title: string) =>
    allAsync(
      `SELECT * FROM expenses WHERE title LIKE ? ORDER BY date(expenseDate) DESC, id DESC LIMIT 24`,
      [`%${title}%`],
    ),

  getExpenseTitleExactStats: (title: string) =>
    getAsync(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total, MAX(expenseDate) as lastDate, MAX(amount) as lastAmount
         FROM expenses WHERE TRIM(title) = TRIM(?)`,
      [title],
    ),

  listRecurringByTitle: (title: string) =>
    allAsync(
      `SELECT * FROM recurring_expenses WHERE TRIM(title) = TRIM(?) ORDER BY isActive DESC, date(nextRunDate) ASC, id DESC LIMIT 8`,
      [title],
    ),

  getExpenseDashboardTotal: (whereSql: string, params: any[]) =>
    getAsync(
      `SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count, COALESCE(AVG(amount),0) as avgPerRecord FROM expenses ${whereSql}`,
      params,
    ),

  getExpenseDashboardTodayTotal: (todayWhere: string, params: any[]) =>
    getAsync(
      `SELECT COALESCE(SUM(amount),0) as total FROM expenses ${todayWhere}`,
      params,
    ),

  getExpenseDashboardPreviousTotal: (prevWhere: string[], params: any[]) =>
    getAsync(
      `SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE ${prevWhere.join(' AND ')}`,
      params,
    ),

  listExpenseDashboardByCategory: (whereSql: string, params: any[]) =>
    allAsync(
      `SELECT category, COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM expenses ${whereSql} GROUP BY category ORDER BY total DESC`,
      params,
    ),

  listExpenseDashboardTrend: (
    category: string,
    trendStartKey: string,
    toKey: string,
  ) =>
    allAsync(
      `SELECT substr(expenseDate, 1, 7) as monthKey, COALESCE(SUM(amount),0) as total, COUNT(*) as count
       FROM expenses
       WHERE date(expenseDate) >= date(?) AND date(expenseDate) <= date(?) ${category && category !== 'all' ? 'AND category = ?' : ''}
       GROUP BY monthKey`,
      category && category !== 'all'
        ? [trendStartKey, toKey, category]
        : [trendStartKey, toKey],
    ),

  listRecurringForDashboard: () =>
    allAsync(
      `SELECT * FROM recurring_expenses ORDER BY isActive DESC, nextRunDate ASC, id DESC LIMIT 1000`,
      [],
    ),

  listImportantExpenses: (whereSql: string, params: any[], threshold: number) =>
    allAsync(
      `SELECT * FROM expenses ${whereSql} AND amount >= ? ORDER BY amount DESC, expenseDate DESC LIMIT 6`,
      [...params, threshold],
    ),

  listFallbackImportantExpenses: (whereSql: string, params: any[]) =>
    allAsync(
      `SELECT * FROM expenses ${whereSql} ORDER BY amount DESC, expenseDate DESC LIMIT 4`,
      params,
    ),

  listTopVendors: (whereSql: string, params: any[]) =>
    allAsync(
      `SELECT COALESCE(NULLIF(TRIM(vendor), ''), 'بدون طرف حساب') as vendor, COALESCE(SUM(amount),0) as total, COUNT(*) as count
       FROM expenses ${whereSql}
       GROUP BY COALESCE(NULLIF(TRIM(vendor), ''), 'بدون طرف حساب')
       ORDER BY total DESC
       LIMIT 6`,
      params,
    ),

  listRecentExpenses: (whereSql: string, params: any[]) =>
    allAsync(
      `SELECT * FROM expenses ${whereSql} ORDER BY expenseDate DESC, id DESC LIMIT 6`,
      params,
    ),

  listRecurringExpenses: () => listRecurringExpensesFromDb(),

  createRecurringExpense: (payload: any, actor?: ExpenseActor) =>
    addRecurringExpenseToDb(payload, actor),

  updateRecurringExpense: (id: number, payload: any) =>
    updateRecurringExpenseInDb(id, payload),

  deleteRecurringExpense: (id: number) => deleteRecurringExpenseFromDb(id),

  getRecurringExpense: (id: number) => getRecurringExpenseByIdFromDb(id),

  addRecurringExpensePayment: (
    id: number,
    payload: any,
    actor?: ExpenseActor,
  ) => addRecurringExpensePaymentToDb(id, payload, actor),
};
