import { useEffect, useId, useMemo, useRef, useState } from "react";
import moment from "jalali-moment";
import ShamsiDatePicker from "../components/ShamsiDatePicker";
import Notification from "../components/Notification";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/Button";
import Modal from "../components/Modal";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../utils/apiFetch";
import { formatCurrencyText, readStoredCurrencyUnit } from "../utils/currency";
import { cleanNumber, convertNumberToPersianWords, formatNumberWithCommas } from "../utils/numberUtils";
import type { NotificationMessage } from "../types";

const categoryOptions = [
  {
    value: "rent",
    label: "اجاره و ملک",
    icon: "fa-solid fa-house",
    tone: "text-rose-600 bg-rose-50 border-rose-100",
    chart: "#e11d48",
  },
  {
    value: "salary",
    label: "حقوق و دستمزد",
    icon: "fa-solid fa-user-tie",
    tone: "text-blue-600 bg-blue-50 border-blue-100",
    chart: "#2563eb",
  },
  {
    value: "inventory",
    label: "خرید کالا",
    icon: "fa-solid fa-boxes-stacked",
    tone: "text-emerald-600 bg-emerald-50 border-emerald-100",
    chart: "#059669",
  },
  {
    value: "marketing",
    label: "بازاریابی",
    icon: "fa-solid fa-bullhorn",
    tone: "text-violet-600 bg-violet-50 border-violet-100",
    chart: "#7c3aed",
  },
  {
    value: "logistics",
    label: "حمل و نقل",
    icon: "fa-solid fa-truck-fast",
    tone: "text-orange-600 bg-orange-50 border-orange-100",
    chart: "#ea580c",
  },
  {
    value: "utilities",
    label: "قبوض و زیرساخت",
    icon: "fa-solid fa-plug-circle-bolt",
    tone: "text-cyan-600 bg-cyan-50 border-cyan-100",
    chart: "#0891b2",
  },
  {
    value: "software",
    label: "نرم‌افزار و اشتراک",
    icon: "fa-solid fa-display",
    tone: "text-indigo-600 bg-indigo-50 border-indigo-100",
    chart: "#4f46e5",
  },
  {
    value: "repair",
    label: "تعمیرات و تجهیزات",
    icon: "fa-solid fa-screwdriver-wrench",
    tone: "text-amber-600 bg-amber-50 border-amber-100",
    chart: "#d97706",
  },
  {
    value: "tax",
    label: "مالیات و عوارض",
    icon: "fa-solid fa-file-invoice-dollar",
    tone: "text-slate-600 bg-slate-50 border-slate-100",
    chart: "#475569",
  },
  {
    value: "loan",
    label: "وام و اقساط",
    icon: "fa-solid fa-hand-holding-dollar",
    tone: "text-purple-600 bg-purple-50 border-purple-100",
    chart: "#9333ea",
  },
  {
    value: "overhead",
    label: "سایر هزینه‌ها",
    icon: "fa-solid fa-receipt",
    tone: "text-slate-600 bg-slate-50 border-slate-100",
    chart: "#64748b",
  },
] as const;


const expensePaymentMethodOptions = [
  { value: "cash", label: "نقدی", icon: "fa-solid fa-money-bill-wave" },
  { value: "card", label: "کارت", icon: "fa-regular fa-credit-card" },
  { value: "transfer", label: "انتقال", icon: "fa-solid fa-arrow-right-arrow-left" },
] as const;

type ExpenseCategory = (typeof categoryOptions)[number]["value"];
type ExpensePaymentMethod = (typeof expensePaymentMethodOptions)[number]["value"];
type ViewTab = "list" | "recurring" | "analytics";

type ExpenseCategoryMeta = {
  value: ExpenseCategory | string;
  label: string;
  icon?: string;
  chart?: string;
};

type Expense = {
  id: number;
  expenseDate: string;
  category: ExpenseCategory | string;
  title: string;
  amount: number;
  vendor?: string | null;
  notes?: string | null;
  createdByUsername?: string | null;
  createdAt?: string | null;
  paymentMethod?: ExpensePaymentMethod | string | null;
  referenceNo?: string | null;
};

type RecurringPaymentRecord = {
  id: number;
  expenseId?: number | null;
  runMonth?: string | null;
  paymentDate: string;
  amount: number;
  paymentMethod?: ExpensePaymentMethod | string | null;
  referenceNo?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  createdByUsername?: string | null;
};

type RecurringExpense = {
  id: number;
  title: string;
  category: ExpenseCategory | string;
  amount: number;
  vendor?: string | null;
  notes?: string | null;
  dayOfMonth: number;
  nextRunDate: string;
  isActive: number;
  recurringType?: "monthly" | "installment" | string | null;
  totalInstallments?: number | null;
  paidInstallments?: number | null;
  currentCyclePaid?: number | null;
  currentCycleRemaining?: number | null;
  currentCyclePaymentCount?: number | null;
  currentCyclePayments?: RecurringPaymentRecord[];
  recentPayments?: RecurringPaymentRecord[];
  lastPaymentDate?: string | null;
  lastPaymentAmount?: number | null;
  createdByUsername?: string | null;
};

type ExpenseSummary = {
  total: number;
  byCategory: { category: string; total: number }[];
};

type ExpenseDashboard = {
  categories?: ExpenseCategoryMeta[];
  range: { from: string; to: string; days: number };
  totals: {
    total: number;
    count: number;
    avgDaily: number;
    avgPerRecord: number;
    todayTotal: number;
    previousTotal: number;
    deltaPercent: number | null;
  };
  recurring: {
    activeCount: number;
    activeMonthlyTotal: number;
    overdueCount: number;
  };
  byCategory: Array<{
    category: string;
    label: string;
    total: number;
    count: number;
    percent: number;
    icon?: string;
    chart?: string;
  }>;
  trend: Array<{ key: string; label: string; total: number; count: number }>;
  upcomingRecurring: Array<
    RecurringExpense & { daysRemaining: number; isOverdue: boolean }
  >;
  importantExpenses: Expense[];
  topVendors: Array<{ vendor: string; total: number; count: number }>;
  recent: Expense[];
  insights: Array<{
    type: "success" | "warning" | "danger" | "info";
    title: string;
    description: string;
    value?: number | null;
  }>;
};

type ExpenseTitleOption = {
  title: string;
  category?: string | null;
  vendor?: string | null;
  lastDate?: string | null;
  count: number;
  total: number;
  lastAmount?: number | null;
  source?: string;
};

type ExpenseFormState = {
  expenseDate: Date | null;
  category: ExpenseCategory | string;
  title: string;
  amount: string;
  vendor: string;
  notes: string;
  paymentMethod: ExpensePaymentMethod;
  referenceNo: string;
};

type RecurringFormState = {
  title: string;
  category: ExpenseCategory | string;
  amount: string;
  vendor: string;
  notes: string;
  dayOfMonth: string;
  nextRunDate: Date | null;
  recurringType: "monthly" | "installment";
  totalInstallments: string;
  isActive: boolean;
};

type RecurringPaymentFormState = {
  recurringId: number | null;
  paymentDate: Date | null;
  amount: string;
  paymentMethod: ExpensePaymentMethod;
  referenceNo: string;
  notes: string;
};

const money = (n: number | null | undefined) =>
  formatCurrencyText(n ?? 0, readStoredCurrencyUnit());
const toPercent = (n: number | null | undefined) =>
  `${Math.abs(Number(n ?? 0)).toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪`;
const toFa = (n: number | null | undefined) =>
  Number(n ?? 0).toLocaleString("fa-IR");

const getCategoryMeta = (
  c: ExpenseCategory | string,
  source?: ExpenseCategoryMeta[],
) => {
  return (
    source?.find((x) => x.value === c) ||
    categoryOptions.find((x) => x.value === c) ||
    categoryOptions[categoryOptions.length - 1]
  );
};
const categoryLabel = (
  c: ExpenseCategory | string,
  source?: ExpenseCategoryMeta[],
) => getCategoryMeta(c, source).label;
const categoryIcon = (
  c: ExpenseCategory | string,
  source?: ExpenseCategoryMeta[],
) => getCategoryMeta(c, source).icon || "fa-solid fa-receipt";
const categoryChart = (
  c: ExpenseCategory | string,
  source?: ExpenseCategoryMeta[],
) => getCategoryMeta(c, source).chart || "#64748b";

const paymentMethodLabel = (value: string | null | undefined) =>
  expensePaymentMethodOptions.find((x) => x.value === value)?.label || "نقدی";
const paymentMethodIcon = (value: string | null | undefined) =>
  expensePaymentMethodOptions.find((x) => x.value === value)?.icon || "fa-solid fa-money-bill-wave";

const toShamsi = (value: string | Date | null | undefined) => {
  if (!value) return "—";
  const date = typeof value === "string" ? moment(value) : moment(value);
  return date.locale("fa").format("jYYYY/jMM/jDD");
};
const toIsoDate = (value: Date | null) =>
  value ? moment(value).endOf("day").toDate().toISOString() : "";
const rangeDaysBetween = (from: Date | null, to: Date | null) => {
  if (!from || !to) return 1;
  const diff =
    moment(to).startOf("day").diff(moment(from).startOf("day"), "days") + 1;
  return Math.max(1, diff);
};

const initialExpenseForm = (): ExpenseFormState => ({
  expenseDate: new Date(),
  category: "overhead",
  title: "",
  amount: "",
  vendor: "",
  notes: "",
  paymentMethod: "cash",
  referenceNo: "",
});

const initialRecurringForm = (): RecurringFormState => ({
  title: "",
  category: "rent",
  amount: "",
  vendor: "",
  notes: "",
  dayOfMonth: "1",
  nextRunDate: new Date(),
  recurringType: "monthly",
  totalInstallments: "",
  isActive: true,
});

const initialRecurringPaymentForm = (): RecurringPaymentFormState => ({
  recurringId: null,
  paymentDate: new Date(),
  amount: "",
  paymentMethod: "cash",
  referenceNo: "",
  notes: "",
});

const LineChart = ({ data }: { data: ExpenseDashboard["trend"] }) => {
  const values = data.map((x) => Number(x.total || 0));
  const max = Math.max(1, ...values);
  const points = data
    .map((row, index) => {
      const x =
        data.length === 1
          ? 50
          : 5 + (index * 90) / Math.max(1, data.length - 1);
      const y = 88 - (Number(row.total || 0) / max) * 62;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="h-full min-h-[260px] rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="text-right">
          <div className="text-sm font-black text-slate-950 dark:text-white">
            روند هزینه‌ها
          </div>
          <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            داده واقعی ثبت‌شده در بازه‌های ماهانه
          </div>
        </div>
        <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
          ۶ ماه اخیر
        </span>
      </div>
      <svg
        viewBox="0 0 100 100"
        className="h-[180px] w-full overflow-visible"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {[22, 40, 58, 76].map((y) => (
          <line
            key={y}
            x1="4"
            x2="96"
            y1={y}
            y2={y}
            stroke="currentColor"
            className="text-slate-100 dark:text-slate-800"
            strokeWidth="0.7"
          />
        ))}
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          className="text-emerald-600"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {data.map((row, index) => {
          const x =
            data.length === 1
              ? 50
              : 5 + (index * 90) / Math.max(1, data.length - 1);
          const y = 88 - (Number(row.total || 0) / max) * 62;
          return (
            <circle
              key={row.key || index}
              cx={x}
              cy={y}
              r="1.8"
              fill="white"
              stroke="currentColor"
              className="text-emerald-600"
              strokeWidth="1.4"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      <div className="grid grid-cols-6 gap-2 text-center text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        {data.map((row) => (
          <div key={row.key}>{row.label}</div>
        ))}
      </div>
    </div>
  );
};

const KpiCard = ({
  label,
  value,
  hint,
  icon,
  accent = "slate",
  delta,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: string;
  accent?: "emerald" | "rose" | "blue" | "violet" | "amber" | "slate";
  delta?: number | null;
}) => {
  const accentMap = {
    emerald:
      "text-emerald-700 bg-emerald-50 border-emerald-100 dark:text-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/60",
    rose: "text-rose-700 bg-rose-50 border-rose-100 dark:text-rose-200 dark:bg-rose-950/30 dark:border-rose-900/60",
    blue: "text-blue-700 bg-blue-50 border-blue-100 dark:text-blue-200 dark:bg-blue-950/30 dark:border-blue-900/60",
    violet:
      "text-violet-700 bg-violet-50 border-violet-100 dark:text-violet-200 dark:bg-violet-950/30 dark:border-violet-900/60",
    amber:
      "text-amber-700 bg-amber-50 border-amber-100 dark:text-amber-200 dark:bg-amber-950/30 dark:border-amber-900/60",
    slate:
      "text-slate-700 bg-slate-50 border-slate-100 dark:text-slate-200 dark:bg-slate-900 dark:border-slate-800",
  } as const;
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-right">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {label}
          </div>
          <div className="mt-2 text-xl font-black tracking-tight text-slate-950 dark:text-white md:text-2xl">
            {value}
          </div>
        </div>
        <div
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${accentMap[accent]}`}
        >
          <i className={icon} />
        </div>
      </div>
      <div className="mt-3 flex min-h-6 items-center justify-between gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <span>{hint || "بر اساس داده واقعی"}</span>
        {typeof delta === "number" && Number.isFinite(delta) ? (
          <span
            className={`rounded-full px-2 py-1 ${delta > 0 ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-200" : delta < 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200" : "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"}`}
          >
            {delta > 0 ? "▲" : delta < 0 ? "▼" : "—"} {toPercent(delta)}
          </span>
        ) : null}
      </div>
    </div>
  );
};

export default function ExpensesPage() {
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState<ViewTab>("list");
  const [fromDate, setFromDate] = useState<Date | null>(
    moment().startOf("month").toDate(),
  );
  const [toDate, setToDate] = useState<Date | null>(
    moment().endOf("month").toDate(),
  );
  const [categoryFilter, setCategoryFilter] = useState<"all" | string>("all");
  const [query, setQuery] = useState("");

  const [items, setItems] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary>({
    total: 0,
    byCategory: [],
  });
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [dashboard, setDashboard] = useState<ExpenseDashboard | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isRecurringLoading, setIsRecurringLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(
    null,
  );

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] =
    useState<ExpenseFormState>(initialExpenseForm());
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [expenseTitleOptions, setExpenseTitleOptions] = useState<ExpenseTitleOption[]>([]);
  const [isExpenseTitleMenuOpen, setIsExpenseTitleMenuOpen] = useState(false);
  const [expenseTitleCursor, setExpenseTitleCursor] = useState(0);
  const [expenseTitleHistory, setExpenseTitleHistory] = useState<ExpenseTitleOption | null>(null);
  const [isExpenseTitleHistoryLoading, setIsExpenseTitleHistoryLoading] = useState(false);
  const expenseTitleBoxRef = useRef<HTMLDivElement | null>(null);
  const expenseTitleInputRef = useRef<HTMLInputElement | null>(null);
  const expenseTitleListboxId = useId();

  const [recurringForm, setRecurringForm] = useState<RecurringFormState>(
    initialRecurringForm(),
  );
  const [editingRecurringId, setEditingRecurringId] = useState<number | null>(
    null,
  );
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [isRecurringPaymentModalOpen, setIsRecurringPaymentModalOpen] = useState(false);
  const [recurringPaymentTarget, setRecurringPaymentTarget] = useState<RecurringExpense | null>(null);
  const [recurringPaymentForm, setRecurringPaymentForm] = useState<RecurringPaymentFormState>(initialRecurringPaymentForm());

  const currentRangeDays = useMemo(
    () => rangeDaysBetween(fromDate, toDate),
    [fromDate, toDate],
  );
  const backendCategories = useMemo(() => {
    const raw = dashboard?.categories?.length
      ? dashboard.categories
      : categoryOptions;
    return raw.map((x) => ({ ...x, value: String(x.value) }));
  }, [dashboard?.categories]);

  const expenseAmountNumeric = useMemo(() => {
    const clean = cleanNumber(String(expenseForm.amount || ""));
    return clean ? Number(clean) : 0;
  }, [expenseForm.amount]);

  const expenseAmountWords = useMemo(() => {
    return expenseAmountNumeric > 0
      ? convertNumberToPersianWords(expenseAmountNumeric)
      : "";
  }, [expenseAmountNumeric]);

  const recurringAmountNumeric = useMemo(() => {
    const clean = cleanNumber(String(recurringForm.amount || ""));
    return clean ? Number(clean) : 0;
  }, [recurringForm.amount]);

  const recurringAmountWords = useMemo(() => {
    return recurringAmountNumeric > 0
      ? convertNumberToPersianWords(recurringAmountNumeric)
      : "";
  }, [recurringAmountNumeric]);

  const recurringPaymentAmountNumeric = useMemo(() => {
    const clean = cleanNumber(String(recurringPaymentForm.amount || ""));
    return clean ? Number(clean) : 0;
  }, [recurringPaymentForm.amount]);

  const recurringPaymentAmountWords = useMemo(() => {
    return recurringPaymentAmountNumeric > 0
      ? convertNumberToPersianWords(recurringPaymentAmountNumeric)
      : "";
  }, [recurringPaymentAmountNumeric]);

  const filteredExpenseTitleOptions = useMemo(() => {
    const q = expenseForm.title.trim().toLowerCase();
    const base = expenseTitleOptions.filter((item) => {
      const hay = [item.title, categoryLabel(item.category || "overhead", backendCategories)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return !q || hay.includes(q);
    });
    return base.slice(0, 8);
  }, [expenseTitleOptions, expenseForm.title, backendCategories]);

  const hasExactExpenseTitleOption = useMemo(() => {
    const t = expenseForm.title.trim();
    return Boolean(t && expenseTitleOptions.some((item) => item.title.trim() === t));
  }, [expenseForm.title, expenseTitleOptions]);

  const canCreateExpenseTitle = useMemo(() => {
    return Boolean(expenseForm.title.trim() && !hasExactExpenseTitleOption);
  }, [expenseForm.title, hasExactExpenseTitleOption]);

  const expenseTitleOptionCount = filteredExpenseTitleOptions.length + (canCreateExpenseTitle ? 1 : 0);

  const queryString = useMemo(() => {
    const qs = new URLSearchParams();
    if (fromDate)
      qs.set("from", moment(fromDate).startOf("day").toDate().toISOString());
    if (toDate)
      qs.set("to", moment(toDate).endOf("day").toDate().toISOString());
    if (categoryFilter !== "all") qs.set("category", categoryFilter);
    return qs.toString();
  }, [fromDate, toDate, categoryFilter]);

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (q) {
        const hay = [
          item.title,
          item.vendor,
          item.notes,
          item.createdByUsername,
          categoryLabel(item.category, backendCategories),
          String(item.amount ?? ""),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, query, backendCategories]);

  const loadExpenses = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [itemsRes, summaryRes, dashboardRes] = await Promise.all([
        apiFetch(`/api/expenses?${queryString}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiFetch(`/api/reports/expenses-summary?${queryString}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiFetch(`/api/expenses/dashboard?${queryString}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const itemsJson = await itemsRes.json();
      if (!itemsRes.ok || itemsJson?.success === false)
        throw new Error(itemsJson?.message || "خطا در دریافت هزینه‌ها");
      setItems(Array.isArray(itemsJson.data) ? itemsJson.data : []);

      const summaryJson = await summaryRes.json();
      if (!summaryRes.ok || summaryJson?.success === false)
        throw new Error(summaryJson?.message || "خطا در دریافت جمع هزینه‌ها");
      setSummary({
        total: Number(summaryJson?.data?.total ?? 0),
        byCategory: Array.isArray(summaryJson?.data?.byCategory)
          ? summaryJson.data.byCategory
          : [],
      });

      const dashboardJson = await dashboardRes.json();
      if (dashboardRes.ok && dashboardJson?.success !== false)
        setDashboard(dashboardJson.data || null);
    } catch (error: any) {
      setNotification({
        type: "error",
        text: error?.message || "خطا در دریافت هزینه‌ها",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecurring = async () => {
    if (!token) return;
    setIsRecurringLoading(true);
    try {
      const res = await apiFetch("/api/recurring-expenses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || json?.success === false)
        throw new Error(json?.message || "خطا در دریافت هزینه‌های تکرارشونده");
      setRecurring(Array.isArray(json.data) ? json.data : []);
    } catch (error: any) {
      setNotification({
        type: "error",
        text: error?.message || "خطا در دریافت هزینه‌های تکرارشونده",
      });
    } finally {
      setIsRecurringLoading(false);
    }
  };

  const loadExpenseTitleOptions = async () => {
    if (!token) return;
    try {
      const res = await apiFetch("/api/expenses/title-options", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok && json?.success !== false) {
        setExpenseTitleOptions(Array.isArray(json.data) ? json.data : []);
      }
    } catch {
      // non-blocking suggestion list
    }
  };

  const loadExpenseTitleHistory = async (title: string) => {
    if (!token) return;
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setExpenseTitleHistory(null);
      return;
    }
    setIsExpenseTitleHistoryLoading(true);
    try {
      const qs = new URLSearchParams({ title: cleanTitle });
      const res = await apiFetch(`/api/expenses/title-history?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok && json?.success !== false) {
        setExpenseTitleHistory(json.data || null);
      }
    } catch {
      setExpenseTitleHistory(null);
    } finally {
      setIsExpenseTitleHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    void loadExpenses();
    void loadRecurring();
    void loadExpenseTitleOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, queryString]);

  useEffect(() => {
    if (!isExpenseModalOpen) return;
    const title = expenseForm.title.trim();
    if (!title) {
      setExpenseTitleHistory(null);
      return;
    }
    const timer = window.setTimeout(() => {
      void loadExpenseTitleHistory(title);
    }, 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpenseModalOpen, expenseForm.title, token]);

  useEffect(() => {
    if (!isExpenseTitleMenuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (expenseTitleBoxRef.current?.contains(event.target as Node)) return;
      setIsExpenseTitleMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [isExpenseTitleMenuOpen]);

  useEffect(() => {
    if (!isExpenseTitleMenuOpen) return;
    setExpenseTitleCursor(0);
  }, [isExpenseTitleMenuOpen, expenseForm.title]);

  const selectExpenseTitle = (item: ExpenseTitleOption) => {
    setExpenseForm((p) => ({
      ...p,
      title: item.title,
      category: item.category || p.category,
    }));
    setIsExpenseTitleMenuOpen(false);
    requestAnimationFrame(() => expenseTitleInputRef.current?.focus());
  };

  const confirmNewExpenseTitle = () => {
    const title = expenseForm.title.trim();
    if (!title) return;
    setExpenseTitleOptions((prev) => {
      if (prev.some((item) => item.title.trim() === title)) return prev;
      return [
        {
          title,
          category: expenseForm.category,
          count: 0,
          total: 0,
          source: "manual",
        },
        ...prev,
      ];
    });
    setIsExpenseTitleMenuOpen(false);
    requestAnimationFrame(() => expenseTitleInputRef.current?.focus());
  };

  const handleExpenseTitleKeyDown = (event: any) => {
    if (!isExpenseTitleMenuOpen && ["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) {
      event.preventDefault();
      setIsExpenseTitleMenuOpen(true);
      setExpenseTitleCursor(0);
      return;
    }
    if (!isExpenseTitleMenuOpen) return;

    const maxIndex = Math.max(0, expenseTitleOptionCount - 1);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setExpenseTitleCursor((current) => Math.min(current + 1, maxIndex));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setExpenseTitleCursor((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (expenseTitleCursor < filteredExpenseTitleOptions.length) {
        const item = filteredExpenseTitleOptions[expenseTitleCursor];
        if (item) selectExpenseTitle(item);
      } else if (canCreateExpenseTitle) {
        confirmNewExpenseTitle();
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      setIsExpenseTitleMenuOpen(false);
    } else if (event.key === "Tab") {
      setIsExpenseTitleMenuOpen(false);
    }
  };

  const openCreateExpense = () => {
    setEditingExpenseId(null);
    setExpenseForm(initialExpenseForm());
    setIsExpenseModalOpen(true);
  };

  const openEditExpense = (row: Expense) => {
    setEditingExpenseId(row.id);
    setExpenseForm({
      expenseDate: row.expenseDate
        ? moment(row.expenseDate).toDate()
        : new Date(),
      category: row.category || "overhead",
      title: row.title || "",
      amount: String(row.amount || ""),
      vendor: row.vendor || "",
      notes: row.notes || "",
      paymentMethod: (row.paymentMethod as ExpensePaymentMethod) || "cash",
      referenceNo: row.referenceNo || "",
    });
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = async () => {
    if (!token) return;
    const title = expenseForm.title.trim();
    const amount = Number(expenseForm.amount);
    if (!title)
      return setNotification({
        type: "error",
        text: "نوع هزینه را وارد کنید.",
      });
    if (!Number.isFinite(amount) || amount <= 0)
      return setNotification({
        type: "error",
        text: "مبلغ هزینه نامعتبر است.",
      });
    if (!expenseForm.expenseDate)
      return setNotification({
        type: "error",
        text: "تاریخ هزینه را انتخاب کنید.",
      });

    try {
      const payload = {
        expenseDate: toIsoDate(expenseForm.expenseDate),
        category: expenseForm.category,
        title,
        amount,
        notes: expenseForm.notes.trim() || null,
        paymentMethod: expenseForm.paymentMethod,
        referenceNo: expenseForm.referenceNo.trim() || null,
      };
      const res = await apiFetch(
        editingExpenseId
          ? `/api/expenses/${editingExpenseId}`
          : "/api/expenses",
        {
          method: editingExpenseId ? "PATCH" : "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json();
      if (!res.ok || json?.success === false)
        throw new Error(json?.message || "خطا در ثبت هزینه");
      setNotification({
        type: "success",
        text: editingExpenseId ? "هزینه ویرایش شد." : "هزینه با موفقیت ثبت شد.",
      });
      setIsExpenseModalOpen(false);
      setEditingExpenseId(null);
      setExpenseForm(initialExpenseForm());
      await loadExpenses();
      await loadExpenseTitleOptions();
    } catch (error: any) {
      setNotification({
        type: "error",
        text: error?.message || "خطا در عملیات",
      });
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!token) return;
    try {
      const res = await apiFetch(`/api/expenses/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || json?.success === false)
        throw new Error(json?.message || "خطا در حذف هزینه");
      setNotification({ type: "success", text: "هزینه حذف شد." });
      await loadExpenses();
    } catch (error: any) {
      setNotification({
        type: "error",
        text: error?.message || "خطا در عملیات",
      });
    }
  };

  const handleSaveRecurring = async () => {
    if (!token) return;
    const title = recurringForm.title.trim();
    const amount = Number(recurringForm.amount);
    const dayOfMonth = Math.floor(Number(recurringForm.dayOfMonth));
    if (!title)
      return setNotification({
        type: "error",
        text: "عنوان هزینه تکرارشونده را وارد کنید.",
      });
    if (!Number.isFinite(amount) || amount <= 0)
      return setNotification({ type: "error", text: "مبلغ نامعتبر است." });
    if (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31)
      return setNotification({ type: "error", text: "روز ماه نامعتبر است." });
    if (!recurringForm.nextRunDate)
      return setNotification({
        type: "error",
        text: "تاریخ شروع را انتخاب کنید.",
      });
    const totalInstallments = Math.floor(Number(recurringForm.totalInstallments || 0));
    if (
      recurringForm.recurringType === "installment" &&
      (!totalInstallments || totalInstallments < 1)
    )
      return setNotification({
        type: "error",
        text: "برای هزینه قسطی، تعداد کل اقساط را وارد کنید.",
      });

    try {
      const payload = {
        title,
        category: recurringForm.category,
        amount,
        vendor: recurringForm.vendor.trim() || null,
        notes: recurringForm.notes.trim() || null,
        dayOfMonth,
        nextRunDate: moment(recurringForm.nextRunDate).format("YYYY-MM-DD"),
        recurringType: recurringForm.recurringType,
        totalInstallments:
          recurringForm.recurringType === "installment"
            ? totalInstallments
            : null,
        isActive: recurringForm.isActive,
      };
      const res = await apiFetch(
        editingRecurringId
          ? `/api/recurring-expenses/${editingRecurringId}`
          : "/api/recurring-expenses",
        {
          method: editingRecurringId ? "PATCH" : "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json();
      if (!res.ok || json?.success === false)
        throw new Error(json?.message || "خطا در ثبت هزینه تکرارشونده");
      setNotification({
        type: "success",
        text: editingRecurringId
          ? "هزینه تکرارشونده ویرایش شد."
          : "هزینه تکرارشونده ثبت شد.",
      });
      setEditingRecurringId(null);
      setRecurringForm(initialRecurringForm());
      setIsRecurringModalOpen(false);
      await loadRecurring();
      await loadExpenses();
    } catch (error: any) {
      setNotification({
        type: "error",
        text: error?.message || "خطا در عملیات",
      });
    }
  };

  const editRecurring = (row: RecurringExpense) => {
    setEditingRecurringId(row.id);
    setRecurringForm({
      title: row.title || "",
      category: row.category || "overhead",
      amount: String(row.amount || ""),
      vendor: row.vendor || "",
      notes: row.notes || "",
      dayOfMonth: String(row.dayOfMonth || 1),
      nextRunDate: row.nextRunDate
        ? moment(row.nextRunDate, "YYYY-MM-DD").toDate()
        : new Date(),
      recurringType:
        row.recurringType === "installment" ? "installment" : "monthly",
      totalInstallments:
        row.totalInstallments != null ? String(row.totalInstallments) : "",
      isActive: Number(row.isActive) === 1,
    });
    setActiveTab("recurring");
    setIsRecurringModalOpen(true);
  };

  const handleDeleteRecurring = async (id: number) => {
    if (!token) return;
    try {
      const res = await apiFetch(`/api/recurring-expenses/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || json?.success === false)
        throw new Error(json?.message || "خطا در حذف مورد");
      setNotification({ type: "success", text: "مورد حذف شد." });
      await loadRecurring();
      await loadExpenses();
    } catch (error: any) {
      setNotification({
        type: "error",
        text: error?.message || "خطا در عملیات",
      });
    }
  };

  const openRecurringPayment = (row: RecurringExpense) => {
    const scheduledAmount = Number(row.amount || 0);
    const paid = Number(row.currentCyclePaid || 0);
    const remaining = Math.max(0, scheduledAmount - paid);
    setRecurringPaymentTarget(row);
    setRecurringPaymentForm({
      recurringId: row.id,
      paymentDate: new Date(),
      amount: String(remaining > 0 ? remaining : scheduledAmount),
      paymentMethod: "cash",
      referenceNo: "",
      notes: "",
    });
    setIsRecurringPaymentModalOpen(true);
  };

  const handleSaveRecurringPayment = async () => {
    if (!token || !recurringPaymentTarget || !recurringPaymentForm.recurringId) return;
    const amount = Number(recurringPaymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return setNotification({ type: "error", text: "مبلغ پرداخت نامعتبر است." });
    }
    if (!recurringPaymentForm.paymentDate) {
      return setNotification({ type: "error", text: "تاریخ پرداخت را انتخاب کنید." });
    }
    try {
      const res = await apiFetch(`/api/recurring-expenses/${recurringPaymentForm.recurringId}/payment`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          amount,
          paymentDate: moment(recurringPaymentForm.paymentDate).format("YYYY-MM-DD"),
          paymentMethod: recurringPaymentForm.paymentMethod,
          referenceNo: recurringPaymentForm.referenceNo.trim() || null,
          notes: recurringPaymentForm.notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || json?.success === false)
        throw new Error(json?.message || "خطا در ثبت پرداخت");
      const completed = Boolean(json?.data?.cycleCompleted);
      setNotification({
        type: "success",
        text: completed
          ? "پرداخت کامل ثبت شد و سررسید بعدی به‌روزرسانی شد."
          : "پرداخت جزئی ثبت شد و مانده این دوره باقی ماند.",
      });
      setIsRecurringPaymentModalOpen(false);
      setRecurringPaymentTarget(null);
      setRecurringPaymentForm(initialRecurringPaymentForm());
      await loadExpenses();
      await loadRecurring();
    } catch (error: any) {
      setNotification({
        type: "error",
        text: error?.message || "خطا در عملیات",
      });
    }
  };

  const handleExportExpenses = async () => {
    if (!token) return;
    setIsExporting(true);
    try {
      const res = await apiFetch(`/api/exports/expenses.xlsx?${queryString}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("خطا در دریافت خروجی");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expenses_${moment().format("YYYY-MM-DD")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setNotification({ type: "success", text: "خروجی هزینه‌ها آماده شد." });
    } catch (error: any) {
      setNotification({
        type: "error",
        text: error?.message || "خطا در خروجی گزارش",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const totals = dashboard?.totals || {
    total: Number(summary.total || 0),
    count: items.length,
    avgDaily: Number(summary.total || 0) / Math.max(1, currentRangeDays),
    avgPerRecord: items.length ? Number(summary.total || 0) / items.length : 0,
    todayTotal: items
      .filter((x) => moment(x.expenseDate).isSame(moment(), "day"))
      .reduce((s, x) => s + Number(x.amount || 0), 0),
    previousTotal: 0,
    deltaPercent: null,
  };

  const donutSegments = (dashboard?.byCategory || []).filter(
    (x) => x.total > 0,
  );
  const donutBackground = donutSegments.length
    ? `conic-gradient(${donutSegments.map((x, i) => `${x.chart || categoryChart(x.category, backendCategories)} ${donutSegments.slice(0, i).reduce((s, y) => s + y.percent, 0)}% ${donutSegments.slice(0, i + 1).reduce((s, y) => s + y.percent, 0)}%`).join(", ")})`
    : "linear-gradient(135deg, #f1f5f9, #e2e8f0)";

  return (
    <div className="space-y-4" dir="rtl">
      <Notification
        message={notification}
        onClose={() => setNotification(null)}
      />

      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
        <div className="grid gap-0 xl:grid-cols-[1fr_360px]">
          <div className="p-5 md:p-6">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 text-right">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                  <i className="fa-solid fa-wallet" />
                  مرکز کنترل هزینه و سود خالص
                </div>
                <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white md:text-3xl">
                  ثبت و مدیریت هزینه‌ها
                </h1>
                <p className="mt-2 max-w-3xl text-sm font-medium leading-7 text-slate-500 dark:text-slate-400">
                  هر هزینه ثبت‌شده مستقیم از سود خالص کسر می‌شود؛ این صفحه برای
                  ثبت سریع، کنترل هزینه‌های تکرارشونده، تحلیل دسته‌بندی‌ها و
                  خروجی مدیریتی طراحی شده است.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <Button
                  onClick={handleExportExpenses}
                  loading={isExporting}
                  variant="secondary"
                  size="md"
                  leftIcon={<i className="fa-solid fa-download" />}
                  className="rounded-2xl"
                >
                  خروجی گزارش
                </Button>
                <Button
                  onClick={() => {
                    setEditingRecurringId(null);
                    setRecurringForm(initialRecurringForm());
                    setIsRecurringModalOpen(true);
                  }}
                  variant="secondary"
                  size="md"
                  leftIcon={<i className="fa-solid fa-arrows-rotate" />}
                  className="rounded-2xl"
                >
                  هزینه تکرارشونده
                </Button>
                <Button
                  onClick={openCreateExpense}
                  variant="primary"
                  size="md"
                  leftIcon={<i className="fa-solid fa-plus" />}
                  className="rounded-2xl px-5"
                >
                  ثبت هزینه
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="جمع هزینه بازه"
                value={money(totals.total)}
                hint={`${toFa(totals.count)} ثبت واقعی`}
                icon="fa-solid fa-receipt"
                accent="emerald"
                delta={totals.deltaPercent}
              />
              <KpiCard
                label="هزینه امروز"
                value={money(totals.todayTotal)}
                hint="ثبت‌شده تا همین لحظه"
                icon="fa-solid fa-clock"
                accent="rose"
              />
              <KpiCard
                label="میانگین روزانه"
                value={money(totals.avgDaily)}
                hint={`${toFa(currentRangeDays)} روز در بازه`}
                icon="fa-solid fa-chart-line"
                accent="blue"
              />
              <KpiCard
                label="تکرارشونده فعال"
                value={toFa(
                  dashboard?.recurring.activeCount ??
                    recurring.filter((x) => Number(x.isActive) === 1).length,
                )}
                hint={money(
                  dashboard?.recurring.activeMonthlyTotal ??
                    recurring
                      .filter((x) => Number(x.isActive) === 1)
                      .reduce((s, x) => s + Number(x.amount || 0), 0),
                )}
                icon="fa-solid fa-rotate"
                accent="violet"
              />
            </div>
          </div>

          <aside className="border-t border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/30 xl:border-r xl:border-t-0">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="text-sm font-black text-slate-950 dark:text-white">
                سررسیدهای نزدیک
              </div>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                {toFa(dashboard?.recurring.overdueCount ?? 0)} معوق
              </span>
            </div>
            <div className="space-y-2">
              {(dashboard?.upcomingRecurring || []).slice(0, 4).map((row) => (
                <div
                  key={row.id}
                  className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/70"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 text-right">
                      <div className="truncate text-sm font-black text-slate-900 dark:text-white">
                        {row.title}
                      </div>
                      <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                        {categoryLabel(row.category, backendCategories)} ·{" "}
                        {toShamsi(row.nextRunDate)}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-black ${row.isOverdue ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-200" : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-200"}`}
                    >
                      {row.isOverdue
                        ? `${toFa(Math.abs(row.daysRemaining))} روز دیرکرد`
                        : `${toFa(row.daysRemaining)} روز دیگر`}
                    </span>
                  </div>
                  <div className="mt-2 font-black text-slate-950 dark:text-white">
                    {money(row.amount)}
                  </div>
                </div>
              ))}
              {!dashboard?.upcomingRecurring?.length ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-4 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                  سررسید فعالی ثبت نشده است.
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr_330px]">
        <LineChart data={dashboard?.trend || []} />

        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0 text-right">
              <div className="text-sm font-black text-slate-950 dark:text-white">
                توزیع بر اساس دسته‌بندی
              </div>
              <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                جمع واقعی هزینه‌ها در بازه انتخابی
              </div>
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 min-w-[104px] rounded-2xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">همه</option>
              {backendCategories.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col items-center gap-4 min-[1380px]:flex-row min-[1380px]:items-center">
            <div
              className="grid h-36 w-36 shrink-0 place-items-center rounded-full"
              style={{ background: donutBackground }}
            >
              <div className="grid h-24 w-24 place-items-center rounded-full border border-slate-200 bg-white text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div>
                  <div className="text-sm font-black text-slate-950 dark:text-white">
                    {money(totals.total)}
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-slate-500">
                    کل
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full space-y-2">
              {(dashboard?.byCategory || []).slice(0, 6).map((row) => (
                <div
                  key={row.category}
                  title={`${row.label} - ${money(row.total)} - ${toPercent(row.percent)}`}
                  className="grid gap-1.5 rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 text-right dark:border-slate-800 dark:bg-slate-900/50"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          row.chart ||
                          categoryChart(row.category, backendCategories),
                      }}
                    />
                    <span className="min-w-0 text-xs font-black leading-6 text-slate-800 dark:text-slate-100">
                      {row.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pr-4 text-xs font-black">
                    <span className="text-slate-400">
                      {toPercent(row.percent)}
                    </span>
                    <span className="text-slate-950 dark:text-white">
                      {money(row.total)}
                    </span>
                  </div>
                </div>
              ))}
              {!dashboard?.byCategory?.length ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-sm font-semibold text-slate-500 dark:border-slate-800">
                  هنوز داده‌ای برای نمودار وجود ندارد.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <div className="mb-3 text-right">
            <div className="text-sm font-black text-slate-950 dark:text-white">
              پیشنهادهای مدیریتی
            </div>
            <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              خروجی تحلیلی ساخته‌شده از داده واقعی هزینه‌ها
            </div>
          </div>
          <div className="space-y-2">
            {(dashboard?.insights || []).slice(0, 5).map((item, idx) => {
              const tone =
                item.type === "danger"
                  ? "border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-rose-200"
                  : item.type === "warning"
                    ? "border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-200"
                    : item.type === "success"
                      ? "border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-200"
                      : "border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/25 dark:text-blue-200";
              return (
                <div
                  key={`${item.title}-${idx}`}
                  className={`rounded-2xl border p-3 ${tone}`}
                >
                  <div className="text-sm font-black">{item.title}</div>
                  <div className="mt-1 text-xs font-semibold leading-6 opacity-80">
                    {item.description}
                  </div>
                </div>
              );
            })}
            {!dashboard?.insights?.length ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-sm font-semibold text-slate-500 dark:border-slate-800">
                تحلیل مدیریتی بعد از ثبت هزینه نمایش داده می‌شود.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <section className="rounded-[26px] border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {[
              ["list", "هزینه‌های ثبت‌شده", "fa-solid fa-file-invoice"],
              [
                "recurring",
                "هزینه‌های تکرارشونده",
                "fa-solid fa-arrows-rotate",
              ],
              ["analytics", "تحلیل و طرف حساب‌ها", "fa-solid fa-chart-pie"],
            ].map(([tab, label, icon]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab as ViewTab)}
                className={`inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-black transition ${activeTab === tab ? "border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200" : "border border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"}`}
              >
                <i className={icon} />
                {label}
              </button>
            ))}
          </div>
          <div className="expenses-page-date-stable grid grid-cols-1 gap-2 md:grid-cols-[minmax(360px,1.6fr)_180px_180px] lg:min-w-[760px]">
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="جستجو در عنوان، طرف حساب، یادداشت یا مبلغ…"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white pr-10 pl-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-emerald-950/30"
              />
            </div>
            <ShamsiDatePicker
              selectedDate={fromDate}
              onDateChange={setFromDate}
              preview="از تاریخ"
              inputClassName="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900"
            />
            <ShamsiDatePicker
              selectedDate={toDate}
              onDateChange={setToDate}
              preview="تا تاریخ"
              inputClassName="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900"
            />
          </div>
        </div>

        {activeTab === "list" ? (
          <div className="pt-4">
            {isLoading ? (
              <Skeleton className="h-56 w-full" rounded="xl" />
            ) : visibleItems.length === 0 ? (
              <EmptyState
                title="هزینه‌ای ثبت نشده است"
                description="با ثبت اولین هزینه، این بخش پر می‌شود و در محاسبه سود خالص هم لحاظ خواهد شد."
                actionLabel="ثبت هزینه"
                onAction={openCreateExpense}
                icon="fa-solid fa-receipt"
              />
            ) : (
              <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900/70">
                      <tr className="text-right text-slate-600 dark:text-slate-300">
                        <th className="p-4 font-semibold">تاریخ</th>
                        <th className="p-4 font-semibold">دسته</th>
                        <th className="p-4 font-semibold">عنوان / طرف حساب</th>
                        <th className="p-4 font-semibold">مبلغ</th>
                        <th className="p-4 font-semibold">ثبت‌کننده</th>
                        <th className="p-4 text-center font-semibold">
                          عملیات
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {visibleItems.map((row) => (
                        <tr
                          key={row.id}
                          className="transition hover:bg-slate-50/80 dark:hover:bg-slate-900/60"
                        >
                          <td className="p-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                            {toShamsi(row.expenseDate)}
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                              <i
                                className={categoryIcon(
                                  row.category,
                                  backendCategories,
                                )}
                              />
                              {categoryLabel(row.category, backendCategories)}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="font-black text-slate-950 dark:text-white">
                              {row.title}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {row.vendor ? <span>{row.vendor}</span> : null}
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                <i className={paymentMethodIcon(row.paymentMethod)} />
                                {paymentMethodLabel(row.paymentMethod)}
                              </span>
                              {row.referenceNo ? <span>· مرجع: {row.referenceNo}</span> : null}
                              {row.notes ? <span>· {row.notes}</span> : null}
                            </div>
                          </td>
                          <td className="p-4 whitespace-nowrap font-black text-slate-950 dark:text-white">
                            {money(row.amount)}
                          </td>
                          <td className="p-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                            {row.createdByUsername || "—"}
                          </td>
                          <td className="p-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                onClick={() => openEditExpense(row)}
                                size="xs"
                                variant="secondary"
                                leftIcon={<i className="fa-solid fa-pen" />}
                              >
                                ویرایش
                              </Button>
                              <Button
                                onClick={() => handleDeleteExpense(row.id)}
                                size="xs"
                                variant="danger"
                                leftIcon={<i className="fa-solid fa-trash" />}
                              >
                                حذف
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {activeTab === "recurring" ? (
          <div className="pt-4">
            <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
                <div className="text-right">
                  <div className="text-sm font-black text-slate-950 dark:text-white">
                    لیست هزینه‌های تکرارشونده
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    اجاره، حقوق، قبوض و اقساط را از اینجا پیگیری کن؛ ثبت و ویرایش از داخل مودال انجام می‌شود.
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setEditingRecurringId(null);
                    setRecurringForm(initialRecurringForm());
                    setIsRecurringModalOpen(true);
                  }}
                  variant="primary"
                  size="md"
                  leftIcon={<i className="fa-solid fa-plus" />}
                  className="rounded-2xl"
                >
                  ثبت هزینه تکرارشونده
                </Button>
              </div>
              {isRecurringLoading ? (
                <div className="p-6">
                  <Skeleton className="h-28 w-full" rounded="xl" />
                </div>
              ) : recurring.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    title="هزینه تکرارشونده‌ای ثبت نشده است"
                    description="با دکمه ثبت هزینه تکرارشونده، اجاره، حقوق، قبوض یا قسط‌های ماهانه را اضافه کن."
                    actionLabel="ثبت هزینه تکرارشونده"
                    onAction={() => {
                      setEditingRecurringId(null);
                      setRecurringForm(initialRecurringForm());
                      setIsRecurringModalOpen(true);
                    }}
                    icon={
                      <i
                        className="fa-solid fa-arrows-rotate"
                        aria-hidden="true"
                      />
                    }
                  />
                </div>
              ) : (
                <div className="max-h-[640px] overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900/70">
                      <tr className="text-right text-slate-600 dark:text-slate-300">
                        <th className="p-4 font-semibold">عنوان</th>
                        <th className="p-4 font-semibold">نوع</th>
                        <th className="p-4 font-semibold">مبلغ</th>
                        <th className="p-4 font-semibold">سررسید</th>
                        <th className="p-4 font-semibold">وضعیت پرداخت</th>
                        <th className="p-4 text-center font-semibold">
                          عملیات
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {recurring.map((row) => {
                        const overdue =
                          row.nextRunDate < moment().format("YYYY-MM-DD") &&
                          Number(row.isActive) === 1;
                        const isInstallment = row.recurringType === "installment";
                        const total = Number(row.totalInstallments || 0);
                        const paid = Number(row.paidInstallments || 0);
                        const currentPaid = Number(row.currentCyclePaid || 0);
                        const currentRemaining = Math.max(0, Number(row.amount || 0) - currentPaid);
                        const paymentCount = Number(row.currentCyclePaymentCount || 0);
                        const cycleIsPaid = currentPaid >= Number(row.amount || 0) && Number(row.amount || 0) > 0;
                        const cycleIsPartial = currentPaid > 0 && !cycleIsPaid;
                        const currentCyclePayments = Array.isArray(row.currentCyclePayments)
                          ? row.currentCyclePayments
                          : [];
                        const recentPayments = Array.isArray(row.recentPayments)
                          ? row.recentPayments
                          : [];
                        const visiblePaymentHistory = (currentCyclePayments.length
                          ? currentCyclePayments
                          : recentPayments).slice(0, 3);
                        return (
                          <tr
                            key={row.id}
                            className={`transition hover:bg-slate-50/80 dark:hover:bg-slate-900/60 ${overdue ? "bg-rose-50/60 dark:bg-rose-950/20" : ""}`}
                          >
                            <td className="p-4">
                              <div className="font-black text-slate-950 dark:text-white">
                                {row.title}
                              </div>
                              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {categoryLabel(row.category, backendCategories)}
                                {row.vendor ? ` · ${row.vendor}` : ""}
                              </div>
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${isInstallment ? "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-200" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200"}`}>
                                <i className={`fa-solid ${isInstallment ? "fa-hand-holding-dollar" : "fa-calendar-days"}`} />
                                {isInstallment
                                  ? `قسطی ${toFa(paid)} از ${toFa(total)}`
                                  : "ماهانه نامحدود"}
                              </span>
                            </td>
                            <td className="p-4 whitespace-nowrap font-black text-slate-950 dark:text-white">
                              {money(row.amount)}
                            </td>
                            <td className="p-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                              <div className="font-black text-slate-800 dark:text-slate-100">
                                هر ماه روز {toFa(row.dayOfMonth)}
                              </div>
                              <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                سررسید بعدی: {toShamsi(row.nextRunDate)}
                              </div>
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              <div className="grid gap-1.5">
                                <span
                                  className={`inline-flex w-fit items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${Number(row.isActive) === 1 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200" : "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"}`}
                                >
                                  <i
                                    className={`fa-solid ${Number(row.isActive) === 1 ? "fa-circle-check" : "fa-circle-minus"}`}
                                  />
                                  {Number(row.isActive) === 1
                                    ? "فعال"
                                    : "غیرفعال"}
                                </span>
                                <span
                                  className={`inline-flex w-fit items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${cycleIsPaid ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200" : cycleIsPartial ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-200" : "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"}`}
                                >
                                  <i className={`fa-solid ${cycleIsPaid ? "fa-circle-check" : cycleIsPartial ? "fa-circle-half-stroke" : "fa-clock"}`} />
                                  {cycleIsPaid ? "پرداخت کامل" : cycleIsPartial ? "پرداخت جزئی" : "پرداخت نشده"}
                                </span>
                                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                  {paymentCount > 0
                                    ? `${money(currentPaid)} پرداخت · مانده ${money(currentRemaining)}`
                                    : row.lastPaymentDate
                                      ? `آخرین پرداخت: ${toShamsi(row.lastPaymentDate)} · ${money(row.lastPaymentAmount || 0)}`
                                      : "هنوز پرداختی ثبت نشده"}
                                </span>
                                {visiblePaymentHistory.length ? (
                                  <div className="recurring-expense-payment-history">
                                    {visiblePaymentHistory.map((payment) => (
                                      <div key={payment.id} className="recurring-expense-payment-history__row">
                                        <span className="recurring-expense-payment-history__date">
                                          {toShamsi(payment.paymentDate)}
                                        </span>
                                        <strong className="recurring-expense-payment-history__amount">
                                          {money(payment.amount)}
                                        </strong>
                                        <small className="recurring-expense-payment-history__method">
                                          {paymentMethodLabel(payment.paymentMethod)}
                                        </small>
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap items-center justify-center gap-2">
                                <Button
                                  onClick={() => openRecurringPayment(row)}
                                  size="xs"
                                  variant="primary"
                                  leftIcon={
                                    <i className="fa-solid fa-calendar-check" />
                                  }
                                >
                                  ثبت پرداخت
                                </Button>
                                <Button
                                  onClick={() => editRecurring(row)}
                                  size="xs"
                                  variant="secondary"
                                  leftIcon={<i className="fa-solid fa-pen" />}
                                >
                                  ویرایش
                                </Button>
                                <Button
                                  onClick={() => handleDeleteRecurring(row.id)}
                                  size="xs"
                                  variant="danger"
                                  leftIcon={<i className="fa-solid fa-trash" />}
                                >
                                  حذف
                                </Button>
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
        ) : null}

        {activeTab === "analytics" ? (
          <div className="grid grid-cols-1 gap-4 pt-4 xl:grid-cols-2">
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
              <div className="mb-3 text-sm font-black text-slate-950 dark:text-white">
                طرف حساب‌های پرتکرار/پرمبلغ
              </div>
              <div className="space-y-2">
                {(dashboard?.topVendors || []).map((row) => (
                  <div
                    key={row.vendor}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50"
                  >
                    <div className="font-black text-slate-700 dark:text-slate-200">
                      {row.vendor}
                    </div>
                    <div className="text-left text-sm font-black text-slate-950 dark:text-white">
                      {money(row.total)}{" "}
                      <span className="text-xs text-slate-400">
                        · {toFa(row.count)} مورد
                      </span>
                    </div>
                  </div>
                ))}
                {!dashboard?.topVendors?.length ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-sm font-semibold text-slate-500 dark:border-slate-800">
                    طرف حسابی ثبت نشده است.
                  </div>
                ) : null}
              </div>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
              <div className="mb-3 text-sm font-black text-slate-950 dark:text-white">
                هزینه‌های مهم بازه
              </div>
              <div className="space-y-2">
                {(dashboard?.importantExpenses || []).map((row) => (
                  <div
                    key={row.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-black text-slate-700 dark:text-slate-200">
                        {row.title}
                      </div>
                      <div className="font-black text-slate-950 dark:text-white">
                        {money(row.amount)}
                      </div>
                    </div>
                    <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {categoryLabel(row.category, backendCategories)} ·{" "}
                      {toShamsi(row.expenseDate)}
                    </div>
                  </div>
                ))}
                {!dashboard?.importantExpenses?.length ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-sm font-semibold text-slate-500 dark:border-slate-800">
                    هزینه مهمی در این بازه شناسایی نشده است.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {isRecurringModalOpen ? (
        <Modal
          title={editingRecurringId ? "ویرایش هزینه تکرارشونده" : "ثبت هزینه تکرارشونده"}
          onClose={() => {
            setIsRecurringModalOpen(false);
            setEditingRecurringId(null);
            setRecurringForm(initialRecurringForm());
          }}
          isOpen={isRecurringModalOpen}
          widthClass="max-w-5xl"
          iconClass="fa-solid fa-arrows-rotate"
          tone="success"
          variant="expansive"
          layout="split"
          bodyClassName="expense-modal87-body"
          panelClassName="expense-modal87-panel"
        >
          <div className="expense-modal87 recurring-expense-modal91" data-expense-modal="true" data-no-tooltip="true" dir="rtl">
            <section className="expense-modal87__main" aria-label="فرم هزینه تکرارشونده">
              <div className="mb-4 rounded-[22px] border border-emerald-100 bg-emerald-50/70 p-4 text-right dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2 text-sm font-black text-emerald-800 dark:text-emerald-200">
                  <i className="fa-solid fa-circle-info" />
                  تعریف پرداخت ماهانه یا قسطی
                </div>
                <p className="mt-2 text-xs font-semibold leading-6 text-emerald-700/80 dark:text-emerald-100/80">
                  برای اجاره، حقوق و قبض‌ها حالت ماهانه را انتخاب کن؛ برای وام یا خرید اقساطی، حالت قسطی را بزن و تعداد کل اقساط را مشخص کن.
                </p>
              </div>

              <div className="expense-modal87__grid">
                <div className="expense-modal87__field expense-modal87__field--full">
                  <label className="expense-modal87__label">
                    <span>نوع پرداخت تکرارشونده</span>
                    <span className="expense-modal87__required">*</span>
                  </label>
                  <div className="recurring-expense-modal91__typeGrid" role="radiogroup" aria-label="نوع پرداخت تکرارشونده">
                    <button
                      type="button"
                      onClick={() =>
                        setRecurringForm((p) => ({
                          ...p,
                          recurringType: "monthly",
                          totalInstallments: "",
                        }))
                      }
                      className={`recurring-expense-modal91__typeBtn ${recurringForm.recurringType === "monthly" ? "is-active" : ""}`}
                      aria-pressed={recurringForm.recurringType === "monthly"}
                    >
                      <i className="fa-solid fa-calendar-days" />
                      <span>
                        <strong>ماهانه نامحدود</strong>
                        <small>مثل اجاره، حقوق، آب، برق و اینترنت</small>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setRecurringForm((p) => ({
                          ...p,
                          recurringType: "installment",
                          category: p.category === "overhead" ? "loan" : p.category,
                        }))
                      }
                      className={`recurring-expense-modal91__typeBtn ${recurringForm.recurringType === "installment" ? "is-active" : ""}`}
                      aria-pressed={recurringForm.recurringType === "installment"}
                    >
                      <i className="fa-solid fa-hand-holding-dollar" />
                      <span>
                        <strong>قسطی / وام</strong>
                        <small>پرداخت ماهانه با تعداد قسط مشخص</small>
                      </span>
                    </button>
                  </div>
                </div>

                <div className="expense-modal87__field">
                  <label className="expense-modal87__label">
                    <span>عنوان</span>
                    <span className="expense-modal87__required">*</span>
                  </label>
                  <div className="expense-modal87__controlWrap">
                    <span className="expense-modal87__icon" aria-hidden="true">
                      <i className="fa-solid fa-pen-nib" />
                    </span>
                    <input
                      value={recurringForm.title}
                      onChange={(e) =>
                        setRecurringForm((p) => ({ ...p, title: e.target.value }))
                      }
                      className="expense-modal87__control"
                      placeholder="مثلاً اجاره مغازه، حقوق، قسط وام..."
                    />
                  </div>
                </div>

                <div className="expense-modal87__field">
                  <label className="expense-modal87__label">
                    <span>دسته‌بندی</span>
                    <span className="expense-modal87__required">*</span>
                  </label>
                  <div className="expense-modal87__controlWrap expense-modal87__selectWrap">
                    <span className="expense-modal87__icon" aria-hidden="true">
                      <i className={categoryIcon(recurringForm.category, backendCategories)} />
                    </span>
                    <select
                      value={recurringForm.category}
                      onChange={(e) =>
                        setRecurringForm((p) => ({
                          ...p,
                          category: e.target.value,
                        }))
                      }
                      className="expense-modal87__control expense-modal87__select"
                    >
                      {backendCategories.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <i className="fa-solid fa-chevron-down expense-modal87__selectArrow" aria-hidden="true" />
                  </div>
                </div>

                <div className="expense-modal87__field">
                  <label className="expense-modal87__label">
                    <span>مبلغ هر پرداخت</span>
                    <span className="expense-modal87__required">*</span>
                  </label>
                  <div className="expense-modal87__controlWrap expense-modal87__amountWrap">
                    <span className="expense-modal87__icon" aria-hidden="true">
                      <i className="fa-solid fa-sack-dollar" />
                    </span>
                    <input
                      value={recurringForm.amount ? formatNumberWithCommas(recurringForm.amount) : ""}
                      onChange={(e) =>
                        setRecurringForm((p) => ({
                          ...p,
                          amount: cleanNumber(e.target.value),
                        }))
                      }
                      inputMode="numeric"
                      className="expense-modal87__control"
                      placeholder="مبلغ هر پرداخت"
                    />
                    <span className="expense-modal87__suffix">تومان</span>
                  </div>
                  {recurringAmountWords ? (
                    <div className="expense-modal87__amountWords">{recurringAmountWords}</div>
                  ) : null}
                </div>

                <div className="expense-modal87__field">
                  <label className="expense-modal87__label">
                    <span>هر چندم ماه پرداخت شود؟</span>
                    <span className="expense-modal87__required">*</span>
                  </label>
                  <div className="expense-modal87__controlWrap">
                    <span className="expense-modal87__icon" aria-hidden="true">
                      <i className="fa-solid fa-calendar-day" />
                    </span>
                    <input
                      value={recurringForm.dayOfMonth}
                      onChange={(e) =>
                        setRecurringForm((p) => ({
                          ...p,
                          dayOfMonth: cleanNumber(e.target.value).slice(0, 2),
                        }))
                      }
                      inputMode="numeric"
                      className="expense-modal87__control"
                      placeholder="مثلاً ۱ یا ۵ یا ۳۰"
                    />
                  </div>
                </div>

                {recurringForm.recurringType === "installment" ? (
                  <div className="expense-modal87__field">
                    <label className="expense-modal87__label">
                      <span>تعداد کل اقساط</span>
                      <span className="expense-modal87__required">*</span>
                    </label>
                    <div className="expense-modal87__controlWrap">
                      <span className="expense-modal87__icon" aria-hidden="true">
                        <i className="fa-solid fa-list-ol" />
                      </span>
                      <input
                        value={recurringForm.totalInstallments}
                        onChange={(e) =>
                          setRecurringForm((p) => ({
                            ...p,
                            totalInstallments: cleanNumber(e.target.value).slice(0, 3),
                          }))
                        }
                        inputMode="numeric"
                        className="expense-modal87__control"
                        placeholder="مثلاً ۱۲"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="expense-modal87__field">
                    <label className="expense-modal87__label">تعداد پرداخت</label>
                    <div className="recurring-expense-modal91__readonlyBox">
                      <i className="fa-solid fa-infinity" />
                      <span>ماهانه و نامحدود تا زمانی که غیرفعال شود</span>
                    </div>
                  </div>
                )}

                <div className="expense-modal87__field expense-modal87__field--full expense-modal87__dateField">
                  <label className="expense-modal87__label">
                    <span>شروع / سررسید بعدی</span>
                    <span className="expense-modal87__required">*</span>
                  </label>
                  <ShamsiDatePicker
                    selectedDate={recurringForm.nextRunDate}
                    onDateChange={(d) =>
                      setRecurringForm((p) => ({ ...p, nextRunDate: d }))
                    }
                    preview="شروع (سررسید بعدی)"
                    inputClassName="expense-modal87__dateControl"
                  />
                </div>

                <div className="expense-modal87__field">
                  <label className="expense-modal87__label">طرف حساب</label>
                  <div className="expense-modal87__controlWrap">
                    <span className="expense-modal87__icon" aria-hidden="true">
                      <i className="fa-solid fa-user-tag" />
                    </span>
                    <input
                      value={recurringForm.vendor}
                      onChange={(e) =>
                        setRecurringForm((p) => ({
                          ...p,
                          vendor: e.target.value,
                        }))
                      }
                      className="expense-modal87__control"
                      placeholder="نام شخص، شرکت یا بانک"
                    />
                  </div>
                </div>

                <div className="expense-modal87__field">
                  <label className="expense-modal87__label">وضعیت</label>
                  <button
                    type="button"
                    className={`recurring-expense-modal91__statusToggle ${recurringForm.isActive ? "is-active" : ""}`}
                    onClick={() =>
                      setRecurringForm((p) => ({
                        ...p,
                        isActive: !p.isActive,
                      }))
                    }
                    aria-pressed={recurringForm.isActive}
                  >
                    <i className={`fa-solid ${recurringForm.isActive ? "fa-circle-check" : "fa-circle-minus"}`} />
                    {recurringForm.isActive ? "فعال باشد" : "غیرفعال باشد"}
                  </button>
                </div>

                <div className="expense-modal87__field expense-modal87__field--full">
                  <label className="expense-modal87__label">یادداشت</label>
                  <div className="expense-modal87__controlWrap expense-modal87__textareaWrap">
                    <span className="expense-modal87__icon expense-modal87__icon--top" aria-hidden="true">
                      <i className="fa-solid fa-note-sticky" />
                    </span>
                    <textarea
                      value={recurringForm.notes}
                      onChange={(e) =>
                        setRecurringForm((p) => ({ ...p, notes: e.target.value }))
                      }
                      rows={3}
                      className="expense-modal87__control expense-modal87__textarea"
                      placeholder="توضیح اختیاری برای این پرداخت تکرارشونده"
                    />
                  </div>
                </div>
              </div>
            </section>

            <aside className="expense-modal87__side" aria-label="خلاصه هزینه تکرارشونده">
              <div className="expense-modal87__summaryCard">
                <div className="expense-modal87__summaryIcon">
                  <i className="fa-solid fa-arrows-rotate" />
                </div>
                <div className="expense-modal87__summaryTitle">خلاصه برنامه پرداخت</div>
                <div className="expense-modal87__summaryAmount">
                  {money(recurringAmountNumeric)}
                </div>
                {recurringAmountWords ? (
                  <div className="expense-modal87__summaryWords">{recurringAmountWords}</div>
                ) : null}
                <div className="expense-modal87__summaryRows">
                  <div><span>نوع</span><strong>{recurringForm.recurringType === "installment" ? "قسطی / وام" : "ماهانه نامحدود"}</strong></div>
                  <div><span>دسته‌بندی</span><strong>{categoryLabel(recurringForm.category, backendCategories)}</strong></div>
                  <div><span>روز پرداخت</span><strong>روز {toFa(Number(recurringForm.dayOfMonth || 0))} هر ماه</strong></div>
                  <div><span>سررسید بعدی</span><strong>{toShamsi(recurringForm.nextRunDate)}</strong></div>
                  {recurringForm.recurringType === "installment" ? (
                    <div><span>تعداد اقساط</span><strong>{toFa(Number(recurringForm.totalInstallments || 0))} قسط</strong></div>
                  ) : null}
                </div>
              </div>

              <div className="expense-modal87__tips">
                <div className="expense-modal87__tipsTitle">
                  <i className="fa-solid fa-shield-halved" />
                  منطق ثبت
                </div>
                <ul>
                  <li>با «ثبت این ماه»، هزینه واقعی در لیست هزینه‌ها ایجاد می‌شود.</li>
                  <li>بعد از ثبت هر ماه، سررسید بعدی خودکار یک ماه جلو می‌رود.</li>
                  <li>در حالت قسطی، بعد از تکمیل اقساط، مورد به‌صورت خودکار غیرفعال می‌شود.</li>
                </ul>
              </div>
            </aside>
          </div>

          <div className="expense-modal87__actions">
            <Button
              type="button"
              onClick={() => {
                setIsRecurringModalOpen(false);
                setEditingRecurringId(null);
                setRecurringForm(initialRecurringForm());
              }}
              variant="secondary"
              size="md"
              leftIcon={<i className="fa-solid fa-xmark" />}
              className="expense-modal89__actionBtn expense-modal89__actionBtn--cancel"
            >
              انصراف
            </Button>
            <Button
              type="button"
              onClick={handleSaveRecurring}
              variant="primary"
              size="md"
              leftIcon={<i className="fa-solid fa-check" />}
              className="expense-modal89__actionBtn expense-modal89__actionBtn--submit"
            >
              {editingRecurringId ? "ذخیره تغییرات" : "ثبت هزینه تکرارشونده"}
            </Button>
          </div>
        </Modal>
      ) : null}

      {isRecurringPaymentModalOpen && recurringPaymentTarget ? (
        <Modal
          title="ثبت پرداخت هزینه تکرارشونده"
          onClose={() => {
            setIsRecurringPaymentModalOpen(false);
            setRecurringPaymentTarget(null);
            setRecurringPaymentForm(initialRecurringPaymentForm());
          }}
          isOpen={isRecurringPaymentModalOpen}
          widthClass="max-w-4xl"
          iconClass="fa-solid fa-money-check-dollar"
          tone="success"
          variant="expansive"
          layout="split"
          bodyClassName="expense-modal87-body"
          panelClassName="expense-modal87-panel recurring-payment-modal92-panel"
        >
          <div className="expense-modal87 recurring-payment-modal92" data-expense-modal="true" data-no-tooltip="true" dir="rtl">
            <section className="expense-modal87__main" aria-label="فرم ثبت پرداخت تکرارشونده">
              <div className="expense-modal87__grid">
                <div className="expense-modal87__field expense-modal87__dateField">
                  <label className="expense-modal87__label">
                    <span>تاریخ پرداخت واقعی</span>
                    <span className="expense-modal87__required">*</span>
                  </label>
                  <ShamsiDatePicker
                    selectedDate={recurringPaymentForm.paymentDate}
                    onDateChange={(d) =>
                      setRecurringPaymentForm((p) => ({ ...p, paymentDate: d }))
                    }
                    preview="تاریخ پرداخت"
                    inputClassName="expense-modal87__dateControl"
                  />
                </div>

                <div className="expense-modal87__field">
                  <label className="expense-modal87__label">
                    <span>مبلغ پرداختی</span>
                    <span className="expense-modal87__required">*</span>
                  </label>
                  <div className="expense-modal87__controlWrap expense-modal87__amountWrap">
                    <span className="expense-modal87__icon" aria-hidden="true">
                      <i className="fa-solid fa-sack-dollar" />
                    </span>
                    <input
                      value={recurringPaymentForm.amount ? formatNumberWithCommas(recurringPaymentForm.amount) : ""}
                      onChange={(e) =>
                        setRecurringPaymentForm((p) => ({
                          ...p,
                          amount: cleanNumber(e.target.value),
                        }))
                      }
                      inputMode="numeric"
                      className="expense-modal87__control"
                      placeholder="مبلغ پرداختی"
                    />
                    <span className="expense-modal87__suffix">تومان</span>
                  </div>
                  {recurringPaymentAmountWords ? (
                    <div className="expense-modal87__amountWords">{recurringPaymentAmountWords}</div>
                  ) : null}
                </div>

                <div className="expense-modal87__field">
                  <label className="expense-modal87__label">روش پرداخت</label>
                  <div className="expense-modal87__paymentGroup" role="radiogroup" aria-label="روش پرداخت">
                    {expensePaymentMethodOptions.map((method) => {
                      const checked = recurringPaymentForm.paymentMethod === method.value;
                      return (
                        <button
                          key={method.value}
                          type="button"
                          className={`expense-modal87__paymentBtn ${checked ? "expense-modal87__paymentBtn--active" : ""}`}
                          onClick={() =>
                            setRecurringPaymentForm((p) => ({ ...p, paymentMethod: method.value }))
                          }
                          aria-pressed={checked}
                        >
                          <i className={method.icon} aria-hidden="true" />
                          <span>{method.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="expense-modal87__field">
                  <label className="expense-modal87__label">مرجع / شماره سند</label>
                  <div className="expense-modal87__controlWrap">
                    <span className="expense-modal87__icon" aria-hidden="true">
                      <i className="fa-regular fa-file-lines" />
                    </span>
                    <input
                      value={recurringPaymentForm.referenceNo}
                      onChange={(e) =>
                        setRecurringPaymentForm((p) => ({ ...p, referenceNo: e.target.value }))
                      }
                      className="expense-modal87__control"
                      placeholder="شماره سند یا مرجع اختیاری"
                    />
                  </div>
                </div>

                <div className="expense-modal87__field expense-modal87__field--full">
                  <label className="expense-modal87__label">یادداشت پرداخت</label>
                  <div className="expense-modal87__controlWrap expense-modal87__textareaWrap">
                    <span className="expense-modal87__icon expense-modal87__icon--top" aria-hidden="true">
                      <i className="fa-solid fa-note-sticky" />
                    </span>
                    <textarea
                      value={recurringPaymentForm.notes}
                      onChange={(e) =>
                        setRecurringPaymentForm((p) => ({ ...p, notes: e.target.value }))
                      }
                      rows={3}
                      className="expense-modal87__control expense-modal87__textarea"
                      placeholder="مثلاً مساعده، پرداخت بخشی از حقوق، تسویه کامل…"
                    />
                  </div>
                </div>
              </div>
            </section>

            <aside className="expense-modal87__side" aria-label="خلاصه پرداخت">
              <div className="expense-modal87__summaryCard">
                <div className="expense-modal87__summaryIcon">
                  <i className="fa-solid fa-receipt" />
                </div>
                <div className="expense-modal87__summaryTitle">خلاصه پرداخت</div>
                <div className="expense-modal87__summaryAmount">
                  {money(recurringPaymentAmountNumeric)}
                </div>
                {recurringPaymentAmountWords ? (
                  <div className="expense-modal87__summaryWords">{recurringPaymentAmountWords}</div>
                ) : null}
                <div className="expense-modal87__summaryRows">
                  <div><span>عنوان</span><strong>{recurringPaymentTarget.title}</strong></div>
                  <div><span>بابت دوره</span><strong>{toShamsi(recurringPaymentTarget.nextRunDate)}</strong></div>
                  <div><span>مبلغ دوره</span><strong>{money(recurringPaymentTarget.amount)}</strong></div>
                  <div><span>پرداخت‌شده</span><strong>{money(recurringPaymentTarget.currentCyclePaid || 0)}</strong></div>
                  <div><span>مانده قبل از ثبت</span><strong>{money(Math.max(0, Number(recurringPaymentTarget.amount || 0) - Number(recurringPaymentTarget.currentCyclePaid || 0)))}</strong></div>
                  <div><span>مانده بعد از ثبت</span><strong>{money(Math.max(0, Number(recurringPaymentTarget.amount || 0) - Number(recurringPaymentTarget.currentCyclePaid || 0) - recurringPaymentAmountNumeric))}</strong></div>
                </div>
              </div>
            </aside>
          </div>

          <div className="expense-modal87__actions">
            <Button
              type="button"
              onClick={() => {
                setIsRecurringPaymentModalOpen(false);
                setRecurringPaymentTarget(null);
                setRecurringPaymentForm(initialRecurringPaymentForm());
              }}
              variant="secondary"
              size="md"
              leftIcon={<i className="fa-solid fa-xmark" />}
              className="expense-modal89__actionBtn expense-modal89__actionBtn--cancel"
            >
              انصراف
            </Button>
            <Button
              type="button"
              onClick={handleSaveRecurringPayment}
              variant="primary"
              size="md"
              leftIcon={<i className="fa-solid fa-check" />}
              className="expense-modal89__actionBtn expense-modal89__actionBtn--submit"
            >
              ثبت پرداخت
            </Button>
          </div>
        </Modal>
      ) : null}

      {isExpenseModalOpen ? (
        <Modal
          title={editingExpenseId ? "ویرایش هزینه" : "ثبت هزینه"}
          onClose={() => setIsExpenseModalOpen(false)}
          isOpen={isExpenseModalOpen}
          widthClass="max-w-5xl"
          iconClass="fa-solid fa-file-invoice-dollar"
          tone="success"
          variant="expansive"
          layout="split"
          bodyClassName="expense-modal87-body"
          panelClassName="expense-modal87-panel"
        >
          <div className="expense-modal87" data-expense-modal="true" data-no-tooltip="true" dir="rtl">
            <section className="expense-modal87__main" aria-label="فرم ثبت هزینه">
              <div className="expense-modal87__grid">
                <div className="expense-modal87__field expense-modal87__field--full expense-modal87__dateField">
                  <label className="expense-modal87__label">
                    <span>تاریخ هزینه</span>
                    <span className="expense-modal87__required">*</span>
                  </label>
                  <ShamsiDatePicker
                    selectedDate={expenseForm.expenseDate}
                    onDateChange={(d) =>
                      setExpenseForm((p) => ({ ...p, expenseDate: d }))
                    }
                    preview="تاریخ هزینه"
                    inputClassName="expense-modal87__dateControl"
                  />
                </div>

                <div className="expense-modal87__field">
                  <label className="expense-modal87__label">
                    <span>دسته‌بندی</span>
                    <span className="expense-modal87__required">*</span>
                  </label>
                  <div className="expense-modal87__controlWrap expense-modal87__selectWrap">
                    <span className="expense-modal87__icon" aria-hidden="true">
                      <i className={categoryIcon(expenseForm.category, backendCategories)} />
                    </span>
                    <select
                      value={expenseForm.category}
                      onChange={(e) =>
                        setExpenseForm((p) => ({ ...p, category: e.target.value }))
                      }
                      className="expense-modal87__control expense-modal87__select"
                    >
                      {backendCategories.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <i className="fa-solid fa-chevron-down expense-modal87__selectArrow" aria-hidden="true" />
                  </div>
                </div>

                <div className="expense-modal87__field">
                  <label className="expense-modal87__label">
                    <span>مبلغ</span>
                    <span className="expense-modal87__required">*</span>
                  </label>
                  <div className="expense-modal87__controlWrap expense-modal87__amountWrap">
                    <span className="expense-modal87__icon" aria-hidden="true">
                      <i className="fa-solid fa-sack-dollar" />
                    </span>
                    <input
                      value={expenseForm.amount ? formatNumberWithCommas(expenseForm.amount) : ""}
                      onChange={(e) =>
                        setExpenseForm((p) => ({ ...p, amount: cleanNumber(e.target.value) }))
                      }
                      inputMode="numeric"
                      className="expense-modal87__control"
                      placeholder="مبلغ را وارد کنید"
                    />
                    <span className="expense-modal87__suffix">تومان</span>
                  </div>
                  {expenseAmountWords ? (
                    <div className="expense-modal87__amountWords">{expenseAmountWords}</div>
                  ) : null}
                </div>

                <div className="expense-modal87__field expense-modal87__field--combo">
                  <label className="expense-modal87__label" htmlFor="expense-title-combobox">
                    <span>نوع هزینه</span>
                    <span className="expense-modal87__required">*</span>
                  </label>
                  <div
                    ref={expenseTitleBoxRef}
                    className="expense-modal89__combobox"
                    data-open={isExpenseTitleMenuOpen ? "true" : "false"}
                  >
                    <div className="expense-modal87__controlWrap expense-modal89__comboboxControl">
                      <span className="expense-modal87__icon" aria-hidden="true">
                        <i className="fa-solid fa-pen-nib" />
                      </span>
                      <input
                        id="expense-title-combobox"
                        ref={expenseTitleInputRef}
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded={isExpenseTitleMenuOpen}
                        aria-controls={isExpenseTitleMenuOpen ? expenseTitleListboxId : undefined}
                        aria-activedescendant={isExpenseTitleMenuOpen ? `${expenseTitleListboxId}-option-${expenseTitleCursor}` : undefined}
                        value={expenseForm.title}
                        onFocus={() => setIsExpenseTitleMenuOpen(true)}
                        onChange={(e) => {
                          setExpenseForm((p) => ({ ...p, title: e.target.value }));
                          setIsExpenseTitleMenuOpen(true);
                          setExpenseTitleCursor(0);
                        }}
                        onKeyDown={handleExpenseTitleKeyDown}
                        className="expense-modal87__control expense-modal89__comboboxInput"
                        placeholder="مثلاً قبض آب، اجاره مغازه، اینترنت، حقوق…"
                        autoComplete="off"
                      />
                      <span className="expense-modal89__comboboxChevron" aria-hidden="true">
                        <i className="fa-solid fa-chevron-down" />
                      </span>
                    </div>

                    {isExpenseTitleMenuOpen ? (
                      <div
                        id={expenseTitleListboxId}
                        role="listbox"
                        className="expense-modal89__comboboxMenu"
                      >
                        {filteredExpenseTitleOptions.map((item, index) => (
                          <button
                            key={`${item.source || "expense"}-${item.title}`}
                            id={`${expenseTitleListboxId}-option-${index}`}
                            role="option"
                            aria-selected={index === expenseTitleCursor}
                            data-active={index === expenseTitleCursor ? "true" : "false"}
                            type="button"
                            className="expense-modal89__comboboxItem"
                            onMouseEnter={() => setExpenseTitleCursor(index)}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectExpenseTitle(item)}
                          >
                            <span className="expense-modal89__comboText">
                              <strong>{item.title}</strong>
                              <small>{categoryLabel(item.category || "overhead", backendCategories)} · {toFa(item.count)} ثبت · {money(item.total)}</small>
                            </span>
                            <span className="expense-modal89__comboIcon" aria-hidden="true">
                              <i className="fa-solid fa-clock-rotate-left" />
                            </span>
                          </button>
                        ))}

                        {canCreateExpenseTitle ? (
                          <button
                            type="button"
                            id={`${expenseTitleListboxId}-option-${filteredExpenseTitleOptions.length}`}
                            role="option"
                            aria-selected={expenseTitleCursor === filteredExpenseTitleOptions.length}
                            data-active={expenseTitleCursor === filteredExpenseTitleOptions.length ? "true" : "false"}
                            className="expense-modal89__comboboxItem expense-modal89__comboboxItem--create"
                            onMouseEnter={() => setExpenseTitleCursor(filteredExpenseTitleOptions.length)}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={confirmNewExpenseTitle}
                          >
                            <span className="expense-modal89__comboText">
                              <strong>افزودن «{expenseForm.title.trim()}»</strong>
                              <small>بعد از ثبت، تاریخچه همین نوع هزینه قابل مشاهده است.</small>
                            </span>
                            <span className="expense-modal89__comboIcon" aria-hidden="true">
                              <i className="fa-solid fa-plus" />
                            </span>
                          </button>
                        ) : null}

                        {!filteredExpenseTitleOptions.length && !canCreateExpenseTitle ? (
                          <div className="expense-modal89__comboboxEmpty">نوع هزینه‌ای ثبت نشده؛ یک عنوان جدید بنویس.</div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="expense-modal87__field">
                  <label className="expense-modal87__label">روش پرداخت</label>
                  <div className="expense-modal87__paymentGroup" role="radiogroup" aria-label="روش پرداخت هزینه">
                    {expensePaymentMethodOptions.map((method) => {
                      const checked = expenseForm.paymentMethod === method.value;
                      return (
                        <button
                          key={method.value}
                          type="button"
                          className={`expense-modal87__paymentBtn ${checked ? "expense-modal87__paymentBtn--active" : ""}`}
                          onClick={() =>
                            setExpenseForm((p) => ({
                              ...p,
                              paymentMethod: method.value,
                            }))
                          }
                          aria-pressed={checked}
                        >
                          <i className={method.icon} aria-hidden="true" />
                          <span>{method.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="expense-modal87__field">
                  <label className="expense-modal87__label">مرجع / شماره سند</label>
                  <div className="expense-modal87__controlWrap">
                    <span className="expense-modal87__icon" aria-hidden="true">
                      <i className="fa-regular fa-file-lines" />
                    </span>
                    <input
                      value={expenseForm.referenceNo}
                      onChange={(e) =>
                        setExpenseForm((p) => ({ ...p, referenceNo: e.target.value }))
                      }
                      className="expense-modal87__control"
                      placeholder="شماره سند یا مرجع اختیاری"
                    />
                  </div>
                </div>

                <div className="expense-modal87__field expense-modal87__field--full">
                  <label className="expense-modal87__label">یادداشت</label>
                  <div className="expense-modal87__controlWrap expense-modal87__textareaWrap">
                    <span className="expense-modal87__icon expense-modal87__icon--top" aria-hidden="true">
                      <i className="fa-solid fa-note-sticky" />
                    </span>
                    <textarea
                      value={expenseForm.notes}
                      onChange={(e) =>
                        setExpenseForm((p) => ({ ...p, notes: e.target.value }))
                      }
                      rows={3}
                      className="expense-modal87__control expense-modal87__textarea"
                      placeholder="یادداشت خود را وارد کنید (اختیاری)"
                    />
                  </div>
                </div>
              </div>

              <div className="expense-modal87__notice">
                <i className="fa-solid fa-circle-info" aria-hidden="true" />
                <span>این هزینه در گزارش‌های مالی و سود خالص لحاظ می‌شود و از درآمد کسر می‌گردد.</span>
              </div>
            </section>

            <aside className="expense-modal87__side" aria-label="خلاصه هزینه">
              <div className="expense-modal87__summaryCard">
                <div className="expense-modal87__summaryIcon">
                  <i className="fa-solid fa-calculator" />
                </div>
                <div className="expense-modal87__summaryTitle">خلاصه ثبت</div>
                <div className="expense-modal87__summaryAmount">
                  {money(expenseAmountNumeric)}
                </div>
                {expenseAmountWords ? (
                  <div className="expense-modal87__summaryWords">{expenseAmountWords}</div>
                ) : null}
                <div className="expense-modal87__summaryRows">
                  <div><span>دسته‌بندی</span><strong>{categoryLabel(expenseForm.category, backendCategories)}</strong></div>
                  <div><span>روش پرداخت</span><strong>{paymentMethodLabel(expenseForm.paymentMethod)}</strong></div>
                  <div><span>تاریخ</span><strong>{toShamsi(expenseForm.expenseDate)}</strong></div>
                </div>
              </div>

              <div className="expense-modal87__history">
                <div className="expense-modal87__tipsTitle">
                  <i className="fa-solid fa-clock-rotate-left" />
                  تاریخچه همین نوع هزینه
                </div>
                {isExpenseTitleHistoryLoading ? (
                  <div className="expense-modal87__historyEmpty">در حال بررسی تاریخچه...</div>
                ) : expenseTitleHistory ? (
                  <>
                    <div className="expense-modal87__historyStats">
                      <span>{toFa(expenseTitleHistory.count)} ثبت</span>
                      <strong>{money(expenseTitleHistory.total)}</strong>
                    </div>
                    <div className="expense-modal87__historyMeta">
                      آخرین ثبت: {toShamsi(expenseTitleHistory.lastDate)}
                    </div>
                    {Array.isArray((expenseTitleHistory as any).items) ? (
                      <div className="expense-modal87__historyList">
                        {((expenseTitleHistory as any).items || []).slice(0, 3).map((row: Expense) => (
                          <div key={row.id}>
                            <span>{toShamsi(row.expenseDate)}</span>
                            <strong>{money(row.amount)}</strong>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="expense-modal87__historyEmpty">با انتخاب یا نوشتن نوع هزینه، سابقه اجاره، آب، برق و هزینه‌های مشابه اینجا نمایش داده می‌شود.</div>
                )}
              </div>

              <div className="expense-modal87__tips">
                <div className="expense-modal87__tipsTitle">
                  <i className="fa-solid fa-shield-halved" />
                  کنترل قبل از ثبت
                </div>
                <ul>
                  <li>مبلغ و دسته‌بندی در گزارش هزینه‌ها ذخیره می‌شود.</li>
                  <li>مرجع پرداخت برای پیگیری حسابداری نگهداری می‌شود.</li>
                  <li>این ثبت روی سود خالص بازه تأثیر مستقیم دارد.</li>
                </ul>
              </div>
            </aside>
          </div>

          <div className="expense-modal87__actions">
            <Button
              type="button"
              onClick={() => setIsExpenseModalOpen(false)}
              variant="secondary"
              size="md"
              leftIcon={<i className="fa-solid fa-xmark" />}
              className="expense-modal89__actionBtn expense-modal89__actionBtn--cancel"
            >
              انصراف
            </Button>
            <Button
              type="button"
              onClick={handleSaveExpense}
              variant="primary"
              size="md"
              leftIcon={<i className="fa-solid fa-check" />}
              className="expense-modal89__actionBtn expense-modal89__actionBtn--submit"
            >
              {editingExpenseId ? "ذخیره تغییرات" : "ثبت هزینه"}
            </Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
