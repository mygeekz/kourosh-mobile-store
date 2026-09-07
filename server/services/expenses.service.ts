import moment from 'jalali-moment';
import { expensesRepo } from '../repositories/expenses.repo';
import type { ExpenseActor, ExpenseDateFilters } from '../repositories/expenses.repo';

export type { ExpenseActor };

const categoryMeta = [
  {
    value: 'rent',
    label: 'اجاره و ملک',
    icon: 'fa-solid fa-house',
    chart: '#e11d48',
  },
  {
    value: 'salary',
    label: 'حقوق و دستمزد',
    icon: 'fa-solid fa-user-tie',
    chart: '#2563eb',
  },
  {
    value: 'inventory',
    label: 'خرید کالا',
    icon: 'fa-solid fa-boxes-stacked',
    chart: '#059669',
  },
  {
    value: 'marketing',
    label: 'بازاریابی',
    icon: 'fa-solid fa-bullhorn',
    chart: '#7c3aed',
  },
  {
    value: 'logistics',
    label: 'حمل و نقل',
    icon: 'fa-solid fa-truck-fast',
    chart: '#ea580c',
  },
  {
    value: 'utilities',
    label: 'قبوض و زیرساخت',
    icon: 'fa-solid fa-plug-circle-bolt',
    chart: '#0891b2',
  },
  {
    value: 'software',
    label: 'نرم‌افزار و اشتراک',
    icon: 'fa-solid fa-display',
    chart: '#4f46e5',
  },
  {
    value: 'repair',
    label: 'تعمیرات و تجهیزات',
    icon: 'fa-solid fa-screwdriver-wrench',
    chart: '#d97706',
  },
  {
    value: 'tax',
    label: 'مالیات و عوارض',
    icon: 'fa-solid fa-file-invoice-dollar',
    chart: '#475569',
  },
  {
    value: 'loan',
    label: 'وام و اقساط',
    icon: 'fa-solid fa-hand-holding-dollar',
    chart: '#9333ea',
  },
  {
    value: 'overhead',
    label: 'سایر هزینه‌ها',
    icon: 'fa-solid fa-receipt',
    chart: '#64748b',
  },
];

const metaFor = (category: string) =>
  categoryMeta.find((x) => x.value === category) ||
  categoryMeta[categoryMeta.length - 1];

export const expensesService = {
  listExpenses: (filters: ExpenseDateFilters) => expensesRepo.listExpenses(filters),

  createExpense: (payload: any, actor?: ExpenseActor) =>
    expensesRepo.createExpense(payload, actor),

  updateExpense: (id: number, payload: any) =>
    expensesRepo.updateExpense(id, payload),

  deleteExpense: (id: number) => expensesRepo.deleteExpense(id),

  getExpensesSummary: (filters: { from?: string; to?: string }) =>
    expensesRepo.getExpensesSummary(filters),

  async getTitleOptions() {
    const expenseRows: any[] = await expensesRepo.listExpenseTitleOptionRows();
    const recurringRows: any[] = await expensesRepo.listRecurringTitleOptionRows();
    const map = new Map<string, any>();
    for (const row of [...expenseRows, ...recurringRows]) {
      const title = String(row.title || '').trim();
      if (!title) continue;
      const key = title.toLowerCase();
      const current = map.get(key);
      if (!current) {
        map.set(key, {
          title,
          category: row.category || 'overhead',
          vendor: row.vendor || null,
          count: Number(row.count || 0),
          total: Number(row.total || 0),
          lastDate: row.lastDate || null,
          lastAmount: Number(row.lastAmount || 0),
          source: row.source || 'expense',
        });
      } else {
        current.count += Number(row.count || 0);
        current.total += Number(row.total || 0);
        if (!current.vendor && row.vendor) current.vendor = row.vendor;
        if (!current.category && row.category) current.category = row.category;
        if (!current.lastDate || String(row.lastDate || '') > String(current.lastDate || '')) {
          current.lastDate = row.lastDate;
          current.lastAmount = Number(row.lastAmount || current.lastAmount || 0);
        }
      }
    }
    return Array.from(map.values())
      .sort((a, b) => String(b.lastDate || '').localeCompare(String(a.lastDate || '')) || Number(b.count || 0) - Number(a.count || 0))
      .slice(0, 120);
  },

  async getTitleHistory(title: string) {
    if (!title) return null;
    let rows: any[] = await expensesRepo.listExpenseTitleHistoryExact(title);
    if (!rows.length) {
      rows = await expensesRepo.listExpenseTitleHistoryLike(title);
    }
    const exactStats: any = await expensesRepo.getExpenseTitleExactStats(title);
    const stats = Number(exactStats?.count || 0) > 0
      ? exactStats
      : {
          count: rows.length,
          total: rows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
          lastDate: rows[0]?.expenseDate || null,
          lastAmount: rows[0]?.amount || 0,
        };
    const recurringRows: any[] = await expensesRepo.listRecurringByTitle(title);
    const first = rows[0] || recurringRows[0] || {};
    return {
      title,
      category: first.category || 'overhead',
      vendor: first.vendor || null,
      count: Number(stats?.count || 0),
      total: Number(stats?.total || 0),
      lastDate: stats?.lastDate || first.nextRunDate || null,
      lastAmount: Number(stats?.lastAmount || first.amount || 0),
      items: rows,
      recurring: recurringRows,
    };
  },

  async getDashboard(query: any) {
    const fromQ = String(query.from || '');
    const toQ = String(query.to || '');
    const category = String(query.category || 'all');
    const from = fromQ
      ? moment(fromQ).startOf('day')
      : moment().startOf('month');
    const to = toQ ? moment(toQ).endOf('day') : moment().endOf('day');
    const fromKey = from.format('YYYY-MM-DD');
    const toKey = to.format('YYYY-MM-DD');
    const days = Math.max(
      1,
      to.clone().startOf('day').diff(from.clone().startOf('day'), 'days') + 1,
    );

    const where: string[] = [
      'date(expenseDate) >= date(?)',
      'date(expenseDate) <= date(?)',
    ];
    const params: any[] = [fromKey, toKey];
    if (category && category !== 'all') {
      where.push('category = ?');
      params.push(category);
    }
    const whereSql = `WHERE ${where.join(' AND ')}`;

    const totalRow: any = await expensesRepo.getExpenseDashboardTotal(whereSql, params);
    const todayParams = [moment().format('YYYY-MM-DD')];
    const todayWhere =
      category && category !== 'all'
        ? 'WHERE date(expenseDate) = date(?) AND category = ?'
        : 'WHERE date(expenseDate) = date(?)';
    const todayRow: any = await expensesRepo.getExpenseDashboardTodayTotal(
      todayWhere,
      category && category !== 'all'
        ? [...todayParams, category]
        : todayParams,
    );

    const prevTo = from.clone().subtract(1, 'day').endOf('day');
    const prevFrom = prevTo
      .clone()
      .subtract(days - 1, 'days')
      .startOf('day');
    const prevWhere: string[] = [
      'date(expenseDate) >= date(?)',
      'date(expenseDate) <= date(?)',
    ];
    const prevParams: any[] = [
      prevFrom.format('YYYY-MM-DD'),
      prevTo.format('YYYY-MM-DD'),
    ];
    if (category && category !== 'all') {
      prevWhere.push('category = ?');
      prevParams.push(category);
    }
    const prevRow: any = await expensesRepo.getExpenseDashboardPreviousTotal(prevWhere, prevParams);

    const byCategoryRows: any[] = await expensesRepo.listExpenseDashboardByCategory(whereSql, params);
    const grandTotal = Number(totalRow?.total || 0);
    const byCategory = (byCategoryRows || []).map((row: any) => {
      const meta = metaFor(String(row.category || 'overhead'));
      return {
        category: String(row.category || 'overhead'),
        label: meta.label,
        icon: meta.icon,
        chart: meta.chart,
        total: Number(row.total || 0),
        count: Number(row.count || 0),
        percent:
          grandTotal > 0 ? (Number(row.total || 0) * 100) / grandTotal : 0,
      };
    });

    const trendStart = to.clone().startOf('month').subtract(5, 'months');
    const trendRows: any[] = await expensesRepo.listExpenseDashboardTrend(
      category,
      trendStart.format('YYYY-MM-DD'),
      toKey,
    );
    const trendMap = new Map(
      (trendRows || []).map((row: any) => [String(row.monthKey), row]),
    );
    const trend = Array.from({ length: 6 }, (_, index) => {
      const d = trendStart.clone().add(index, 'months');
      const key = d.format('YYYY-MM');
      const row: any = trendMap.get(key);
      return {
        key,
        label: d.locale('fa').format('jMMM'),
        total: Number(row?.total || 0),
        count: Number(row?.count || 0),
      };
    });

    const recurringRows: any[] = await expensesRepo.listRecurringForDashboard();
    const activeRecurring = (recurringRows || []).filter(
      (row: any) => Number(row.isActive) === 1,
    );
    const todayKey = moment().format('YYYY-MM-DD');
    const upcomingRecurring = activeRecurring.slice(0, 5).map((row: any) => {
      const daysRemaining = moment(String(row.nextRunDate), 'YYYY-MM-DD')
        .startOf('day')
        .diff(moment().startOf('day'), 'days');
      return { ...row, daysRemaining, isOverdue: daysRemaining < 0 };
    });

    const threshold = Math.max(5_000_000, grandTotal * 0.15);
    const importantExpenses: any[] = await expensesRepo.listImportantExpenses(
      whereSql,
      params,
      threshold,
    );
    const fallbackImportant: any[] = importantExpenses.length
      ? importantExpenses
      : await expensesRepo.listFallbackImportantExpenses(whereSql, params);

    const topVendors: any[] = await expensesRepo.listTopVendors(whereSql, params);
    const recent: any[] = await expensesRepo.listRecentExpenses(whereSql, params);

    const previousTotal = Number(prevRow?.total || 0);
    const deltaPercent =
      previousTotal > 0
        ? ((grandTotal - previousTotal) / previousTotal) * 100
        : null;
    const topCategory = byCategory[0];
    const overdueCount = activeRecurring.filter(
      (row: any) => String(row.nextRunDate) < todayKey,
    ).length;
    const insights: any[] = [];
    if (typeof deltaPercent === 'number') {
      if (deltaPercent > 15)
        insights.push({
          type: 'warning',
          title: 'افزایش هزینه نسبت به بازه قبل',
          description: `هزینه‌ها حدود ${Math.abs(deltaPercent).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪ بیشتر شده‌اند.`,
          value: grandTotal,
        });
      else if (deltaPercent < -10)
        insights.push({
          type: 'success',
          title: 'کاهش هزینه نسبت به بازه قبل',
          description: `هزینه‌ها حدود ${Math.abs(deltaPercent).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪ کمتر شده‌اند.`,
          value: grandTotal,
        });
    }
    if (topCategory)
      insights.push({
        type: 'info',
        title: 'بیشترین سهم هزینه',
        description: `${topCategory.label} با سهم ${topCategory.percent.toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪ بیشترین بخش هزینه‌هاست.`,
        value: topCategory.total,
      });
    if (overdueCount > 0)
      insights.push({
        type: 'danger',
        title: 'سررسید تکرارشونده عقب‌افتاده',
        description: `${overdueCount.toLocaleString('fa-IR')} مورد هزینه تکرارشونده از سررسید گذشته است.`,
        value: overdueCount,
      });
    if (!insights.length)
      insights.push({
        type: 'success',
        title: 'وضعیت هزینه‌ها پایدار است',
        description: 'با داده‌های فعلی هشدار جدی برای این بازه دیده نمی‌شود.',
        value: grandTotal,
      });

    return {
      categories: categoryMeta,
      range: { from: fromKey, to: toKey, days },
      totals: {
        total: grandTotal,
        count: Number(totalRow?.count || 0),
        avgDaily: grandTotal / Math.max(1, days),
        avgPerRecord: Number(totalRow?.avgPerRecord || 0),
        todayTotal: Number(todayRow?.total || 0),
        previousTotal,
        deltaPercent,
      },
      recurring: {
        activeCount: activeRecurring.length,
        activeMonthlyTotal: activeRecurring.reduce(
          (sum: number, row: any) => sum + Number(row.amount || 0),
          0,
        ),
        overdueCount,
      },
      byCategory,
      trend,
      upcomingRecurring,
      importantExpenses: fallbackImportant || [],
      topVendors: topVendors || [],
      recent: recent || [],
      insights,
    };
  },

  listRecurringExpenses: () => expensesRepo.listRecurringExpenses(),

  createRecurringExpense: (payload: any, actor?: ExpenseActor) =>
    expensesRepo.createRecurringExpense(payload, actor),

  updateRecurringExpense: (id: number, payload: any) =>
    expensesRepo.updateRecurringExpense(id, payload),

  deleteRecurringExpense: (id: number) => expensesRepo.deleteRecurringExpense(id),

  getRecurringExpense: (id: number) => expensesRepo.getRecurringExpense(id),

  addRecurringExpensePayment: (
    id: number,
    payload: any,
    actor?: ExpenseActor,
  ) => expensesRepo.addRecurringExpensePayment(id, payload, actor),
};
