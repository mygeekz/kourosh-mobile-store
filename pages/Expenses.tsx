import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import moment from 'jalali-moment';
import ShamsiDatePicker from '../components/ShamsiDatePicker';
import Notification from '../components/Notification';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import TableToolbar from '../components/TableToolbar';
import Button from '../components/Button';
import Modal from '../components/Modal';
import ModalField from '../components/ModalField';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/apiFetch';
import { formatCurrencyText, readStoredCurrencyUnit } from '../utils/currency';
import type { NotificationMessage } from '../types';

const categoryOptions = [
  { value: 'rent', label: 'اجاره', icon: 'fa-solid fa-house' },
  { value: 'salary', label: 'حقوق', icon: 'fa-solid fa-user-tie' },
  { value: 'inventory', label: 'خرید کالا', icon: 'fa-solid fa-boxes-stacked' },
  { value: 'overhead', label: 'هزینه‌های جانبی', icon: 'fa-solid fa-receipt' },
] as const;

type ExpenseCategory = (typeof categoryOptions)[number]['value'];
type ViewTab = 'list' | 'recurring';

type Expense = {
  id: number;
  expenseDate: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  vendor?: string | null;
  notes?: string | null;
  createdByUsername?: string | null;
};

type RecurringExpense = {
  id: number;
  title: string;
  category: ExpenseCategory;
  amount: number;
  vendor?: string | null;
  notes?: string | null;
  dayOfMonth: number;
  nextRunDate: string;
  isActive: number;
  createdByUsername?: string | null;
};

type ExpenseSummary = { total: number; byCategory: { category: string; total: number }[] };

type ExpenseFormState = {
  expenseDate: Date | null;
  category: ExpenseCategory;
  title: string;
  amount: string;
  vendor: string;
  notes: string;
};

type RecurringFormState = {
  title: string;
  category: ExpenseCategory;
  amount: string;
  vendor: string;
  notes: string;
  dayOfMonth: string;
  nextRunDate: Date | null;
  isActive: boolean;
};

const money = (n: number | null | undefined) => formatCurrencyText(n ?? 0, readStoredCurrencyUnit());
const categoryLabel = (c: ExpenseCategory | string) => categoryOptions.find((x) => x.value === c)?.label ?? 'هزینه‌های جانبی';
const categoryIcon = (c: ExpenseCategory | string) => categoryOptions.find((x) => x.value === c)?.icon ?? 'fa-solid fa-receipt';
const toShamsi = (value: string | Date | null | undefined) => {
  if (!value) return '—';
  const date = typeof value === 'string' ? moment(value) : moment(value);
  return date.locale('fa').format('jYYYY/jMM/jDD');
};
const toIsoDate = (value: Date | null) => (value ? moment(value).endOf('day').toDate().toISOString() : '');
const rangeDaysBetween = (from: Date | null, to: Date | null) => {
  if (!from || !to) return 1;
  const diff = moment(to).startOf('day').diff(moment(from).startOf('day'), 'days') + 1;
  return Math.max(1, diff);
};

const initialExpenseForm = (): ExpenseFormState => ({
  expenseDate: new Date(),
  category: 'overhead',
  title: '',
  amount: '',
  vendor: '',
  notes: '',
});

const initialRecurringForm = (): RecurringFormState => ({
  title: '',
  category: 'rent',
  amount: '',
  vendor: '',
  notes: '',
  dayOfMonth: '1',
  nextRunDate: new Date(),
  isActive: true,
});

export default function ExpensesPage() {
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState<ViewTab>('list');
  const [fromDate, setFromDate] = useState<Date | null>(moment().startOf('month').toDate());
  const [toDate, setToDate] = useState<Date | null>(moment().endOf('month').toDate());
  const [categoryFilter, setCategoryFilter] = useState<'all' | ExpenseCategory>('all');
  const [query, setQuery] = useState('');

  const [items, setItems] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary>({ total: 0, byCategory: [] });
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isRecurringLoading, setIsRecurringLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>(initialExpenseForm());
  const [recurringForm, setRecurringForm] = useState<RecurringFormState>(initialRecurringForm());

  const currentRangeDays = useMemo(() => rangeDaysBetween(fromDate, toDate), [fromDate, toDate]);

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (q) {
        const hay = [item.title, item.vendor, item.notes, item.createdByUsername, categoryLabel(item.category), String(item.amount ?? '')]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      return true;
    });
  }, [items, query, categoryFilter]);

  const cardSummary = useMemo(() => {
    const filteredTotal = items.reduce((s, x) => s + Number(x.amount || 0), 0);
    const summaryTotal = Number(summary.total || 0);
    const total = categoryFilter === 'all' ? (summaryTotal > 0 ? summaryTotal : filteredTotal) : filteredTotal;
    const count = items.length;
    const avgDaily = total / Math.max(1, currentRangeDays);
    const recurringActive = recurring.filter((x) => Number(x.isActive) === 1).length;
    return { total, count, avgDaily, recurringActive };
  }, [summary.total, items, currentRangeDays, recurring, categoryFilter]);

  const loadExpenses = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const qs = new URLSearchParams();
      if (fromDate) qs.set('from', moment(fromDate).startOf('day').toDate().toISOString());
      if (toDate) qs.set('to', moment(toDate).endOf('day').toDate().toISOString());
      if (categoryFilter !== 'all') qs.set('category', categoryFilter);

      const [itemsRes, summaryRes] = await Promise.all([
        apiFetch(`/api/expenses?${qs.toString()}`, { headers: { Authorization: `Bearer ${token}` } }),
        apiFetch(`/api/reports/expenses-summary?${qs.toString()}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const itemsJson = await itemsRes.json();
      if (!itemsRes.ok || itemsJson?.success === false) throw new Error(itemsJson?.message || 'خطا در دریافت هزینه‌ها');
      setItems(Array.isArray(itemsJson.data) ? itemsJson.data : []);

      const summaryJson = await summaryRes.json();
      if (!summaryRes.ok || summaryJson?.success === false) throw new Error(summaryJson?.message || 'خطا در دریافت جمع هزینه‌ها');
      setSummary({
        total: Number(summaryJson?.data?.total ?? 0),
        byCategory: Array.isArray(summaryJson?.data?.byCategory) ? summaryJson.data.byCategory : [],
      });
    } catch (error: any) {
      setNotification({ type: 'error', text: error?.message || 'خطا در دریافت هزینه‌ها' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecurring = async () => {
    if (!token) return;
    setIsRecurringLoading(true);
    try {
      const res = await apiFetch('/api/recurring-expenses', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok || json?.success === false) throw new Error(json?.message || 'خطا در دریافت هزینه‌های تکرارشونده');
      setRecurring(Array.isArray(json.data) ? json.data : []);
    } catch (error: any) {
      setNotification({ type: 'error', text: error?.message || 'خطا در دریافت هزینه‌های تکرارشونده' });
    } finally {
      setIsRecurringLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    void loadExpenses();
    void loadRecurring();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, fromDate, toDate, categoryFilter]);

  const handleCreateExpense = async () => {
    if (!token) return;
    const title = expenseForm.title.trim();
    const amount = Number(expenseForm.amount);
    if (!title) return setNotification({ type: 'error', text: 'عنوان هزینه را وارد کنید.' });
    if (!Number.isFinite(amount) || amount <= 0) return setNotification({ type: 'error', text: 'مبلغ هزینه نامعتبر است.' });
    if (!expenseForm.expenseDate) return setNotification({ type: 'error', text: 'تاریخ هزینه را انتخاب کنید.' });

    try {
      const payload = {
        expenseDate: toIsoDate(expenseForm.expenseDate),
        category: expenseForm.category,
        title,
        amount,
        vendor: expenseForm.vendor.trim() || null,
        notes: expenseForm.notes.trim() || null,
      };
      const res = await apiFetch('/api/expenses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) throw new Error(json?.message || 'خطا در ثبت هزینه');
      setNotification({ type: 'success', text: 'هزینه با موفقیت ثبت شد.' });
      setIsExpenseModalOpen(false);
      setExpenseForm(initialExpenseForm());
      await loadExpenses();
    } catch (error: any) {
      setNotification({ type: 'error', text: error?.message || 'خطا در عملیات' });
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!token) return;
    try {
      const res = await apiFetch(`/api/expenses/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok || json?.success === false) throw new Error(json?.message || 'خطا در حذف هزینه');
      setNotification({ type: 'success', text: 'هزینه حذف شد.' });
      await loadExpenses();
    } catch (error: any) {
      setNotification({ type: 'error', text: error?.message || 'خطا در عملیات' });
    }
  };

  const handleCreateRecurring = async () => {
    if (!token) return;
    const title = recurringForm.title.trim();
    const amount = Number(recurringForm.amount);
    const dayOfMonth = Math.floor(Number(recurringForm.dayOfMonth));
    if (!title) return setNotification({ type: 'error', text: 'عنوان هزینه تکرارشونده را وارد کنید.' });
    if (!Number.isFinite(amount) || amount <= 0) return setNotification({ type: 'error', text: 'مبلغ نامعتبر است.' });
    if (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31) return setNotification({ type: 'error', text: 'روز ماه نامعتبر است.' });
    if (!recurringForm.nextRunDate) return setNotification({ type: 'error', text: 'تاریخ شروع را انتخاب کنید.' });

    try {
      const payload = {
        title,
        category: recurringForm.category,
        amount,
        vendor: recurringForm.vendor.trim() || null,
        notes: recurringForm.notes.trim() || null,
        dayOfMonth,
        nextRunDate: moment(recurringForm.nextRunDate).format('YYYY-MM-DD'),
        isActive: recurringForm.isActive,
      };
      const res = await apiFetch('/api/recurring-expenses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) throw new Error(json?.message || 'خطا در ثبت هزینه تکرارشونده');
      setNotification({ type: 'success', text: 'هزینه تکرارشونده ثبت شد.' });
      setRecurringForm(initialRecurringForm());
      await loadRecurring();
    } catch (error: any) {
      setNotification({ type: 'error', text: error?.message || 'خطا در عملیات' });
    }
  };

  const handleDeleteRecurring = async (id: number) => {
    if (!token) return;
    try {
      const res = await apiFetch(`/api/recurring-expenses/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok || json?.success === false) throw new Error(json?.message || 'خطا در حذف مورد');
      setNotification({ type: 'success', text: 'مورد حذف شد.' });
      await loadRecurring();
    } catch (error: any) {
      setNotification({ type: 'error', text: error?.message || 'خطا در عملیات' });
    }
  };

  const handleRunRecurring = async (id: number) => {
    if (!token) return;
    try {
      const res = await apiFetch(`/api/recurring-expenses/${id}/run`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok || json?.success === false) throw new Error(json?.message || 'خطا در ثبت هزینه این ماه');
      setNotification({ type: 'success', text: 'هزینه این ماه ثبت شد.' });
      await loadExpenses();
      await loadRecurring();
    } catch (error: any) {
      setNotification({ type: 'error', text: error?.message || 'خطا در عملیات' });
    }
  };

  const heroCards = [
    { label: 'جمع هزینه‌ها', value: money(cardSummary.total), icon: 'fa-solid fa-receipt' },
    { label: 'تعداد ثبت‌ها', value: cardSummary.count.toLocaleString('fa-IR'), icon: 'fa-solid fa-layer-group' },
    { label: 'میانگین روزانه', value: money(cardSummary.avgDaily), icon: 'fa-solid fa-chart-line' },
    { label: 'هزینه‌های تکرارشونده فعال', value: cardSummary.recurringActive.toLocaleString('fa-IR'), icon: 'fa-solid fa-rotate' },
  ];

  return (
    <div className="space-y-4" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <section className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-3 text-right">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <i className="fa-solid fa-wallet" />
              زیرمجموعه فروش
            </div>
            <div className="flex items-center justify-end gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                <i className="fa-solid fa-receipt text-lg" />
              </div>
              <div className="min-w-0 text-right">
                <h1 className="text-xl font-black tracking-tight text-slate-950 dark:text-white md:text-2xl">ثبت و مدیریت هزینه‌ها</h1>
                <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                  ثبت هر هزینه مستقیماً در محاسبه سود خالص لحاظ می‌شود؛ یعنی درآمد منهای همه هزینه‌های واقعی.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 dark:border-slate-800 dark:bg-slate-900">سود خالص = درآمد − هزینه‌ها</span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 dark:border-slate-800 dark:bg-slate-900">بدون شلوغی، با modal ثبت سریع</span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Link
              to="/reports/financial-overview"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <i className="fa-solid fa-chart-pie" />
              نمای مالی
            </Link>
            <Button
              onClick={() => setIsExpenseModalOpen(true)}
              variant="primary"
              size="md"
              leftIcon={<i className="fa-solid fa-plus" />}
              className="rounded-2xl px-5"
            >
              ثبت هزینه
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {heroCards.map((card) => (
          <div key={card.label} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{card.label}</div>
                <div className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{card.value}</div>
              </div>
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                <i className={card.icon} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[26px] border border-slate-200 bg-white/90 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 md:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${activeTab === 'list' ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-950' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'}`}
            >
              هزینه‌های ثبت‌شده
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('recurring')}
              className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${activeTab === 'recurring' ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-950' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'}`}
            >
              هزینه‌های تکرارشونده
            </button>
          </div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {activeTab === 'list' ? 'اول ثبت هزینه، بعد جست‌وجو و فیلتر' : 'ثبت هزینه‌های ثابت ماهانه و دوره‌ای'}
          </div>
        </div>

        {activeTab === 'list' ? (
          <>
            <TableToolbar
              title="هزینه‌های ثبت‌شده"
              search={query}
              onSearchChange={setQuery}
              searchPlaceholder="جستجو در عنوان، طرف حساب یا یادداشت…"
              actions={
                <>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as 'all' | ExpenseCategory)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <option value="all">همه دسته‌ها</option>
                    {categoryOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ShamsiDatePicker
                    selectedDate={fromDate}
                    onDateChange={setFromDate}
                    preview="از تاریخ"
                    inputClassName="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  />
                  <ShamsiDatePicker
                    selectedDate={toDate}
                    onDateChange={setToDate}
                    preview="تا تاریخ"
                    inputClassName="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  />
                </>
              }
              secondaryRow={
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 dark:border-slate-800 dark:bg-slate-900">بازه فعلی: {toShamsi(fromDate)} تا {toShamsi(toDate)}</span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 dark:border-slate-800 dark:bg-slate-900">مبلغ‌ها در سود خالص کسر می‌شوند</span>
                </div>
              }
            />

            <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
              {isLoading ? (
                <div className="p-6">
                  <Skeleton className="h-24 w-full" rounded="xl" />
                </div>
              ) : visibleItems.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    title="هزینه‌ای ثبت نشده است"
                    description="با ثبت اولین هزینه، این بخش پر می‌شود و در محاسبه سود خالص هم لحاظ خواهد شد."
                    actionLabel="ثبت هزینه"
                    onAction={() => setIsExpenseModalOpen(true)}
                    icon="fa-solid fa-receipt"
                  />
                </div>
              ) : (
                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900/70">
                      <tr className="text-right text-slate-600 dark:text-slate-300">
                        <th className="p-4 font-semibold">تاریخ</th>
                        <th className="p-4 font-semibold">دسته</th>
                        <th className="p-4 font-semibold">عنوان</th>
                        <th className="p-4 font-semibold">مبلغ</th>
                        <th className="p-4 font-semibold">ثبت‌کننده</th>
                        <th className="p-4 text-center font-semibold">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {visibleItems.map((row) => (
                        <tr key={row.id} className="transition hover:bg-slate-50/80 dark:hover:bg-slate-900/60">
                          <td className="p-4 whitespace-nowrap text-slate-600 dark:text-slate-300">{toShamsi(row.expenseDate)}</td>
                          <td className="p-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                              <i className={categoryIcon(row.category)} />
                              {categoryLabel(row.category)}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="font-semibold text-slate-950 dark:text-white">{row.title}</div>
                            {row.vendor ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{row.vendor}</div> : null}
                            {row.notes ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{row.notes}</div> : null}
                          </td>
                          <td className="p-4 whitespace-nowrap font-black text-slate-950 dark:text-white">{money(row.amount)}</td>
                          <td className="p-4 whitespace-nowrap text-slate-600 dark:text-slate-300">{row.createdByUsername || '—'}</td>
                          <td className="p-4 whitespace-nowrap text-center">
                            <Button
                              onClick={() => handleDeleteExpense(row.id)}
                              size="xs"
                              variant="danger"
                              leftIcon={<i className="fa-solid fa-trash" />}
                            >
                              حذف
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-start gap-3 text-right">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                  <i className="fa-solid fa-arrows-rotate" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-950 dark:text-white">هزینه‌های تکرارشونده</div>
                  <div className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    برای اجاره، حقوق و هزینه‌های ثابت ماهانه. این موارد هنگام سررسید در نوتیفیکیشن‌ها هم قابل پیگیری هستند.
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.08fr_0.92fr]">
              <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div className="text-sm font-bold text-slate-950 dark:text-white">ثبت هزینه تکرارشونده</div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    {cardSummary.recurringActive.toLocaleString('fa-IR')} فعال
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <ModalField label="عنوان" iconClass="fa-solid fa-pen-nib" required>
                    <input value={recurringForm.title} onChange={(e) => setRecurringForm((p) => ({ ...p, title: e.target.value }))} />
                  </ModalField>
                  <ModalField label="دسته‌بندی" iconClass="fa-solid fa-tags" required>
                    <select value={recurringForm.category} onChange={(e) => setRecurringForm((p) => ({ ...p, category: e.target.value as ExpenseCategory }))}>
                      {categoryOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </ModalField>
                  <ModalField label="مبلغ" iconClass="fa-solid fa-sack-dollar" required>
                    <input value={recurringForm.amount} onChange={(e) => setRecurringForm((p) => ({ ...p, amount: e.target.value }))} inputMode="numeric" />
                  </ModalField>
                  <ModalField label="روز ماه" iconClass="fa-solid fa-calendar-day" required>
                    <input value={recurringForm.dayOfMonth} onChange={(e) => setRecurringForm((p) => ({ ...p, dayOfMonth: e.target.value }))} inputMode="numeric" />
                  </ModalField>
                  <div className="md:col-span-2">
                    <div className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">شروع / سررسید بعدی</div>
                    <ShamsiDatePicker
                      selectedDate={recurringForm.nextRunDate}
                      onDateChange={(d) => setRecurringForm((p) => ({ ...p, nextRunDate: d }))}
                      preview="شروع (سررسید بعدی)"
                      inputClassName="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900"
                    />
                  </div>
                  <ModalField label="طرف حساب" iconClass="fa-solid fa-user-tag">
                    <input value={recurringForm.vendor} onChange={(e) => setRecurringForm((p) => ({ ...p, vendor: e.target.value }))} />
                  </ModalField>
                  <ModalField label="یادداشت" iconClass="fa-solid fa-note-sticky">
                    <input value={recurringForm.notes} onChange={(e) => setRecurringForm((p) => ({ ...p, notes: e.target.value }))} />
                  </ModalField>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <input type="checkbox" checked={recurringForm.isActive} onChange={(e) => setRecurringForm((p) => ({ ...p, isActive: e.target.checked }))} />
                    فعال باشد
                  </label>
                  <Button onClick={handleCreateRecurring} variant="primary" size="md" leftIcon={<i className="fa-solid fa-plus" />}>
                    ثبت هزینه تکرارشونده
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
                <div className="border-b border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 dark:border-slate-800 dark:text-white">لیست هزینه‌های تکرارشونده</div>
                {isRecurringLoading ? (
                  <div className="p-6"><Skeleton className="h-28 w-full" rounded="xl" /></div>
                ) : recurring.length === 0 ? (
                  <div className="p-6">
                    <EmptyState title="هزینه تکرارشونده‌ای ثبت نشده است" description="اولین مورد را ثبت کنید تا سررسیدها و پیگیری ماهانه فعال شوند." icon="fa-solid fa-arrows-rotate" />
                  </div>
                ) : (
                  <div className="max-h-[640px] overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-900/70">
                        <tr className="text-right text-slate-600 dark:text-slate-300">
                          <th className="p-4 font-semibold">عنوان</th>
                          <th className="p-4 font-semibold">مبلغ</th>
                          <th className="p-4 font-semibold">سررسید</th>
                          <th className="p-4 font-semibold">وضعیت</th>
                          <th className="p-4 text-center font-semibold">عملیات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {recurring.map((row) => {
                          const overdue = row.nextRunDate < moment().format('YYYY-MM-DD') && Number(row.isActive) === 1;
                          return (
                            <tr key={row.id} className={`transition hover:bg-slate-50/80 dark:hover:bg-slate-900/60 ${overdue ? 'bg-rose-50/60 dark:bg-rose-950/20' : ''}`}>
                              <td className="p-4">
                                <div className="font-semibold text-slate-950 dark:text-white">{row.title}</div>
                                {row.vendor ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{row.vendor}</div> : null}
                              </td>
                              <td className="p-4 whitespace-nowrap font-black text-slate-950 dark:text-white">{money(row.amount)}</td>
                              <td className="p-4 whitespace-nowrap text-slate-600 dark:text-slate-300">{row.nextRunDate}</td>
                              <td className="p-4 whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${Number(row.isActive) === 1 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300'}`}>
                                  <i className={`fa-solid ${Number(row.isActive) === 1 ? 'fa-circle-check' : 'fa-circle-minus'}`} />
                                  {Number(row.isActive) === 1 ? 'فعال' : 'غیرفعال'}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="flex flex-wrap items-center justify-center gap-2">
                                  <Button onClick={() => handleRunRecurring(row.id)} size="xs" variant="primary" leftIcon={<i className="fa-solid fa-calendar-check" />}>ثبت این ماه</Button>
                                  <Button onClick={() => handleDeleteRecurring(row.id)} size="xs" variant="danger" leftIcon={<i className="fa-solid fa-trash" />}>حذف</Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {isExpenseModalOpen ? (
        <Modal
          title="ثبت هزینه"
          onClose={() => setIsExpenseModalOpen(false)}
          isOpen={isExpenseModalOpen}
          widthClass="max-w-3xl"
        >
          <div className="space-y-4 p-1 text-right">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <div className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">تاریخ هزینه</div>
                <ShamsiDatePicker
                  selectedDate={expenseForm.expenseDate}
                  onDateChange={(d) => setExpenseForm((p) => ({ ...p, expenseDate: d }))}
                  preview="تاریخ هزینه"
                  inputClassName="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900"
                />
              </div>
              <ModalField label="دسته‌بندی" iconClass="fa-solid fa-tags" required>
                <select value={expenseForm.category} onChange={(e) => setExpenseForm((p) => ({ ...p, category: e.target.value as ExpenseCategory }))}>
                  {categoryOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </ModalField>
              <ModalField label="مبلغ" iconClass="fa-solid fa-sack-dollar" required>
                <input value={expenseForm.amount} onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))} inputMode="numeric" />
              </ModalField>
              <ModalField label="عنوان" iconClass="fa-solid fa-pen-nib" required>
                <input value={expenseForm.title} onChange={(e) => setExpenseForm((p) => ({ ...p, title: e.target.value }))} />
              </ModalField>
              <ModalField label="طرف حساب" iconClass="fa-solid fa-user-tag">
                <input value={expenseForm.vendor} onChange={(e) => setExpenseForm((p) => ({ ...p, vendor: e.target.value }))} />
              </ModalField>
              <div className="md:col-span-2">
                <ModalField label="یادداشت" iconClass="fa-solid fa-note-sticky">
                  <textarea value={expenseForm.notes} onChange={(e) => setExpenseForm((p) => ({ ...p, notes: e.target.value }))} rows={4} />
                </ModalField>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              این هزینه در گزارش‌های مالی و سود خالص لحاظ می‌شود و از درآمد کسر می‌گردد.
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
              <Button onClick={() => setIsExpenseModalOpen(false)} variant="secondary" size="md" leftIcon={<i className="fa-solid fa-xmark" />}>
                انصراف
              </Button>
              <Button onClick={handleCreateExpense} variant="primary" size="md" leftIcon={<i className="fa-solid fa-plus" />}>
                ثبت هزینه
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
