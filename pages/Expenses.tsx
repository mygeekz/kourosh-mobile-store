import { Table, AppSearchField, DataTableShell, Dialog as Modal, DialogActions, FilterChipGroup, FormGrid, FormGridItem, ModalField, PanelCard, SelectField, TableActionGroup, TextareaField, TextField, compactValidationErrors, integerRangeError, positiveNumberError, requiredSelectionError, requiredTextError } from '@/components/ui';
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ModalTemplateForm, ModalTemplateSide, ModalTemplateMain, ModalTemplateSection, ModalTemplateSectionHeader, ModalTemplateSummary, ModalTemplateMetricList, ModalTemplateMetric } from "../components/modals";
import moment from "jalali-moment";
import ShamsiDatePicker from "../components/ShamsiDatePicker";
import Notification from "../components/Notification";
import FormErrorSummary, { type FormErrors } from "../components/FormErrorSummary";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/Button";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../utils/apiFetch";
import { formatCurrencyText, readStoredCurrencyUnit } from "../utils/currency";
import { cleanNumber, convertNumberToPersianWords, formatNumberWithCommas } from "../utils/numberUtils";
import type { NotificationMessage } from "../types";
import { focusErrorsSoon } from "../utils/formBehavior";

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

  const [isLoading, setIsLoading] = useState(true);
  const [isRecurringLoading, setIsRecurringLoading] = useState(false);
  const [financialDataError, setFinancialDataError] = useState<string | null>(null);
  const [recurringDataError, setRecurringDataError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(
    null,
  );

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] =
    useState<ExpenseFormState>(initialExpenseForm());
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [expenseFormErrors, setExpenseFormErrors] = useState<FormErrors>({});
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
  const [recurringFormErrors, setRecurringFormErrors] = useState<FormErrors>({});
  const [isRecurringPaymentModalOpen, setIsRecurringPaymentModalOpen] = useState(false);
  const [recurringPaymentTarget, setRecurringPaymentTarget] = useState<RecurringExpense | null>(null);
  const [recurringPaymentForm, setRecurringPaymentForm] = useState<RecurringPaymentFormState>(initialRecurringPaymentForm());
  const [recurringPaymentFormErrors, setRecurringPaymentFormErrors] = useState<FormErrors>({});

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

  const expensePaymentMethodLabel = useMemo(() => {
    return expensePaymentMethodOptions.find((item) => item.value === expenseForm.paymentMethod)?.label || 'ثبت نشده';
  }, [expenseForm.paymentMethod]);

  const recurringInstallmentCountNumeric = useMemo(() => {
    const clean = cleanNumber(String(recurringForm.totalInstallments || ''));
    return clean ? Number(clean) : 0;
  }, [recurringForm.totalInstallments]);

  const recurringProjectedTotal = useMemo(() => {
    if (recurringForm.recurringType !== 'installment' || recurringAmountNumeric <= 0 || recurringInstallmentCountNumeric <= 0) return 0;
    return recurringAmountNumeric * recurringInstallmentCountNumeric;
  }, [recurringForm.recurringType, recurringAmountNumeric, recurringInstallmentCountNumeric]);

  const recurringPlanLabel = recurringForm.recurringType === 'installment'
    ? recurringInstallmentCountNumeric > 0
      ? `${recurringInstallmentCountNumeric.toLocaleString('fa-IR')} قسط`
      : 'قسطی / وام'
    : 'ماهانه نامحدود';

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
    setFinancialDataError(null);
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

      const [itemsJson, summaryJson, dashboardJson] = await Promise.all([
        itemsRes.json().catch(() => null),
        summaryRes.json().catch(() => null),
        dashboardRes.json().catch(() => null),
      ]);
      if (!itemsRes.ok || itemsJson?.success === false)
        throw new Error(itemsJson?.message || "خطا در دریافت هزینه‌ها");
      if (!summaryRes.ok || summaryJson?.success === false)
        throw new Error(summaryJson?.message || "خطا در دریافت جمع هزینه‌ها");
      if (!dashboardRes.ok || dashboardJson?.success === false)
        throw new Error(dashboardJson?.message || "خطا در دریافت داشبورد هزینه‌ها");
      if (!Array.isArray(itemsJson?.data))
        throw new Error("ساختار لیست هزینه‌ها نامعتبر است.");
      if (!summaryJson?.data || !Array.isArray(summaryJson.data.byCategory))
        throw new Error("ساختار جمع هزینه‌ها نامعتبر است.");
      if (!dashboardJson?.data || typeof dashboardJson.data !== "object")
        throw new Error("ساختار داشبورد هزینه‌ها نامعتبر است.");

      const nextTotal = Number(summaryJson.data.total);
      if (!Number.isFinite(nextTotal))
        throw new Error("مقدار جمع هزینه‌ها نامعتبر است.");

      setItems(itemsJson.data);
      setSummary({ total: nextTotal, byCategory: summaryJson.data.byCategory });
      setDashboard(dashboardJson.data);
    } catch (error: any) {
      const message = error?.message || "خطا در دریافت هزینه‌ها";
      setItems([]);
      setSummary({ total: 0, byCategory: [] });
      setDashboard(null);
      setFinancialDataError(message);
      setNotification({
        type: "error",
        text: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecurring = async () => {
    if (!token) return;
    setIsRecurringLoading(true);
    setRecurringDataError(null);
    try {
      const res = await apiFetch("/api/recurring-expenses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || json?.success === false)
        throw new Error(json?.message || "خطا در دریافت هزینه‌های تکرارشونده");
      setRecurring(Array.isArray(json.data) ? json.data : []);
    } catch (error: any) {
      const message = error?.message || "خطا در دریافت هزینه‌های تکرارشونده";
      setRecurring([]);
      setRecurringDataError(message);
      setNotification({
        type: "error",
        text: message,
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
      if (!res.ok || json?.success === false) throw new Error();
      setExpenseTitleOptions(Array.isArray(json.data) ? json.data : []);
    } catch {
      setExpenseTitleOptions([]);
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
      if (!res.ok || json?.success === false) throw new Error();
      setExpenseTitleHistory(json.data || null);
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

  const expenseFieldIds = { expenseDate: 'expense-date', title: 'expense-title-combobox', amount: 'expense-amount' } as const;
  const recurringFieldIds = { title: 'recurring-title', amount: 'recurring-amount', dayOfMonth: 'recurring-day-of-month', nextRunDate: 'recurring-next-run-date', totalInstallments: 'recurring-total-installments' } as const;
  const recurringPaymentFieldIds = { paymentDate: 'recurring-payment-date', amount: 'recurring-payment-amount' } as const;

  const validateExpenseForm = () => {
    const errors = compactValidationErrors({
      expenseDate: requiredSelectionError(expenseForm.expenseDate, 'تاریخ هزینه'),
      title: requiredTextError(expenseForm.title, 'نوع هزینه'),
      amount: positiveNumberError(expenseForm.amount, 'مبلغ هزینه'),
    });
    setExpenseFormErrors(errors);
    if (Object.keys(errors).length) focusErrorsSoon(errors, expenseFieldIds);
    return errors;
  };

  const validateRecurringForm = () => {
    const day = Math.floor(Number(cleanNumber(recurringForm.dayOfMonth)));
    const installmentCount = Math.floor(Number(cleanNumber(recurringForm.totalInstallments || '0')));
    const errors = compactValidationErrors({
      title: requiredTextError(recurringForm.title, 'عنوان هزینه تکرارشونده'),
      amount: positiveNumberError(recurringForm.amount, 'مبلغ هر پرداخت'),
      dayOfMonth: integerRangeError(day || '', 'روز پرداخت', 1, 31),
      nextRunDate: requiredSelectionError(recurringForm.nextRunDate, 'تاریخ شروع'),
      totalInstallments: recurringForm.recurringType === 'installment' && (!installmentCount || installmentCount < 1)
        ? 'تعداد کل اقساط باید عدد صحیح مثبت باشد.'
        : undefined,
    });
    setRecurringFormErrors(errors);
    if (Object.keys(errors).length) focusErrorsSoon(errors, recurringFieldIds);
    return errors;
  };

  const validateRecurringPaymentForm = () => {
    const errors = compactValidationErrors({
      paymentDate: requiredSelectionError(recurringPaymentForm.paymentDate, 'تاریخ پرداخت'),
      amount: positiveNumberError(recurringPaymentForm.amount, 'مبلغ پرداخت'),
    });
    setRecurringPaymentFormErrors(errors);
    if (Object.keys(errors).length) focusErrorsSoon(errors, recurringPaymentFieldIds);
    return errors;
  };

  const openCreateExpense = () => {
    setEditingExpenseId(null);
    setExpenseForm(initialExpenseForm());
    setExpenseFormErrors({});
    setIsExpenseModalOpen(true);
  };

  const openEditExpense = (row: Expense) => {
    setEditingExpenseId(row.id);
    setExpenseFormErrors({});
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
    const validationErrors = validateExpenseForm();
    if (Object.keys(validationErrors).length) return;
    const title = expenseForm.title.trim();
    const amount = Number(cleanNumber(expenseForm.amount));

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
    const validationErrors = validateRecurringForm();
    if (Object.keys(validationErrors).length) return;
    const title = recurringForm.title.trim();
    const amount = Number(cleanNumber(recurringForm.amount));
    const dayOfMonth = Math.floor(Number(cleanNumber(recurringForm.dayOfMonth)));
    const totalInstallments = Math.floor(Number(cleanNumber(recurringForm.totalInstallments || '0')));

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
    setRecurringFormErrors({});
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
    setRecurringPaymentFormErrors({});
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
    const validationErrors = validateRecurringPaymentForm();
    if (Object.keys(validationErrors).length) return;
    const amount = Number(cleanNumber(recurringPaymentForm.amount));
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

      {isLoading ? (
        <Skeleton className="h-[520px] w-full" rounded="xl" />
      ) : financialDataError ? (
        <EmptyState
          title="داده هزینه‌ها قابل دریافت نیست"
          description={`${financialDataError} برای جلوگیری از نمایش عدد صفر یا اطلاعات قدیمی، محتوای مالی این صفحه پنهان شده است.`}
          actionLabel="تلاش مجدد"
          onAction={() => void loadExpenses()}
          icon={<i className="fa-solid fa-circle-exclamation" aria-hidden="true" />}
          tone="warning"
        />
      ) : (
        <>
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
                  loadingText="در حال آماده‌سازی خروجی…"
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)_minmax(20rem,0.95fr)] 2xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)_minmax(22rem,0.95fr)]">
        <LineChart data={dashboard?.trend || []} />

        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 text-right">
              <div className="text-sm font-black text-slate-950 dark:text-white">
                توزیع بر اساس دسته‌بندی
              </div>
              <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                جمع واقعی هزینه‌ها در بازه انتخابی
              </div>
            </div>
            <SelectField controlOnly size="sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full min-w-[9rem] sm:w-[9.5rem] shrink-0"
            >
              <option value="all">همه</option>
              {backendCategories.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </SelectField>
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
          <div className="grid min-w-0 w-full grid-cols-1 gap-2 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] xl:min-w-[760px] xl:w-auto">
            <AppSearchField
              value={query}
              onChange={setQuery}
              placeholder="جستجو در عنوان، طرف حساب، یادداشت یا مبلغ…"
              ariaLabel="جستجو در هزینه‌ها"
              size="md"
              clearable
            />
            <ShamsiDatePicker
              selectedDate={fromDate}
              onDateChange={setFromDate}
              preview="از تاریخ"
              size="compact"
            />
            <ShamsiDatePicker
              selectedDate={toDate}
              onDateChange={setToDate}
              preview="تا تاریخ"
              size="compact"
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
                icon={<i className="fa-solid fa-receipt" aria-hidden="true" />}
              />
            ) : (
              <DataTableShell data-ui-expenses-table="standard">
                  <Table layout="managed" density="comfortable" className="min-w-full text-sm">
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
                            <TableActionGroup
                              ariaLabel={`عملیات هزینه ${row.title}`}
                              collapseBelow="md"
                              actions={[
                                {
                                  key: `edit-expense-${row.id}`,
                                  kind: "button",
                                  label: "ویرایش هزینه",
                                  tooltip: "ویرایش هزینه",
                                  variant: "warning",
                                  icon: <i className="fa-solid fa-pen-to-square" />,
                                  onClick: () => openEditExpense(row),
                                },
                                {
                                  key: `delete-expense-${row.id}`,
                                  kind: "button",
                                  label: "حذف هزینه",
                                  tooltip: "حذف هزینه",
                                  variant: "danger",
                                  icon: <i className="fa-solid fa-trash" />,
                                  onClick: () => handleDeleteExpense(row.id),
                                },
                              ]}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
              </DataTableShell>
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
              {recurringDataError ? (
                <div className="p-6">
                  <EmptyState
                    title="هزینه‌های تکرارشونده قابل دریافت نیست"
                    description={`${recurringDataError} هیچ لیست خالی مصنوعی نمایش داده نشده است.`}
                    actionLabel="تلاش مجدد"
                    onAction={() => void loadRecurring()}
                    icon={<i className="fa-solid fa-circle-exclamation" aria-hidden="true" />}
                    tone="warning"
                  />
                </div>
              ) : isRecurringLoading ? (
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
                <DataTableShell className="max-h-[640px]" data-ui-expenses-table="recurring">
                  <Table layout="managed" density="comfortable" className="min-w-full text-sm">
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
                                  <div className="mt-2 grid gap-2" aria-label="تاریخچه پرداخت‌های اخیر">
                                    {visiblePaymentHistory.map((payment) => (
                                      <div
                                        key={payment.id}
                                        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950/70"
                                      >
                                        <span className="whitespace-nowrap font-semibold text-slate-500 dark:text-slate-400">
                                          {toShamsi(payment.paymentDate)}
                                        </span>
                                        <strong className="min-w-0 text-center font-black text-slate-900 dark:text-white">
                                          {money(payment.amount)}
                                        </strong>
                                        <small className="whitespace-nowrap font-bold text-slate-500 dark:text-slate-400">
                                          {paymentMethodLabel(payment.paymentMethod)}
                                        </small>
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <TableActionGroup
                                ariaLabel={`عملیات هزینه تکرارشونده ${row.title}`}
                                collapseBelow="md"
                                actions={[
                                  {
                                    key: `pay-recurring-${row.id}`,
                                    kind: "button",
                                    label: "ثبت پرداخت",
                                    tooltip: "ثبت پرداخت هزینه تکرارشونده",
                                    variant: "success",
                                    icon: <i className="fa-solid fa-calendar-check" />,
                                    onClick: () => openRecurringPayment(row),
                                  },
                                  {
                                    key: `edit-recurring-${row.id}`,
                                    kind: "button",
                                    label: "ویرایش",
                                    tooltip: "ویرایش هزینه تکرارشونده",
                                    variant: "warning",
                                    icon: <i className="fa-solid fa-pen-to-square" />,
                                    onClick: () => editRecurring(row),
                                  },
                                  {
                                    key: `delete-recurring-${row.id}`,
                                    kind: "button",
                                    label: "حذف",
                                    tooltip: "حذف هزینه تکرارشونده",
                                    variant: "danger",
                                    icon: <i className="fa-solid fa-trash" />,
                                    onClick: () => handleDeleteRecurring(row.id),
                                  },
                                ]}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </DataTableShell>
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
        </>
      )}

      {isRecurringModalOpen ? (
        <Modal
          title={editingRecurringId ? "ویرایش هزینه تکرارشونده" : "ثبت هزینه تکرارشونده"}
          onClose={() => {
            setIsRecurringModalOpen(false);
            setEditingRecurringId(null);
            setRecurringForm(initialRecurringForm());
          }}
          isOpen={isRecurringModalOpen}
          widthClass="max-w-4xl"
          iconClass="fa-solid fa-arrows-rotate"
          tone="success"
          size="wide"
          variant="operational"
          layout="horizontal"
          bodyClassName="!p-0"
        >
          <div className="min-w-0 p-4 md:p-5" data-expense-modal="true" data-expense-modal-layout="compact-horizontal-v300" data-expense-modal-design="recurring-saas-v301" data-no-tooltip="true" dir="rtl">
            <FormErrorSummary
              errors={recurringFormErrors}
              labels={{ title: 'عنوان', amount: 'مبلغ هر پرداخت', dayOfMonth: 'روز پرداخت', nextRunDate: 'تاریخ شروع', totalInstallments: 'تعداد کل اقساط' }}
              fieldIdMap={recurringFieldIds}
              className="mb-3"
            />

            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
              <FilterChipGroup
                value={recurringForm.recurringType}
                onValueChange={(value) => setRecurringForm((prev) => ({
                  ...prev,
                  recurringType: value as 'monthly' | 'installment',
                  totalInstallments: value === 'monthly' ? '' : prev.totalInstallments,
                  category: value === 'installment' && prev.category === 'overhead' ? 'loan' : prev.category,
                }))}
                ariaLabel="نوع پرداخت تکرارشونده"
                label="نوع پرداخت"
                size="xs"
                showIcons
                options={[
                  { value: 'monthly', label: 'ماهانه نامحدود', icon: <i className="fa-solid fa-calendar-days" aria-hidden="true" /> },
                  { value: 'installment', label: 'قسطی / وام', icon: <i className="fa-solid fa-hand-holding-dollar" aria-hidden="true" /> },
                ]}
              />
              <FilterChipGroup
                value={recurringForm.isActive ? 'active' : 'inactive'}
                onValueChange={(value) => setRecurringForm((prev) => ({ ...prev, isActive: value === 'active' }))}
                ariaLabel="وضعیت هزینه تکرارشونده"
                label="وضعیت"
                size="xs"
                showIcons
                options={[
                  { value: 'active', label: 'فعال', icon: <i className="fa-solid fa-circle-check" aria-hidden="true" /> },
                  { value: 'inactive', label: 'غیرفعال', icon: <i className="fa-solid fa-circle-pause" aria-hidden="true" /> },
                ]}
              />
            </div>

            <FormGrid columns={3} gap="sm" align="start">
              <FormGridItem span={2}>
                <ModalField label="عنوان" required iconClass="fa-solid fa-pen-nib">
                  <TextField
                    id={recurringFieldIds.title}
                    value={recurringForm.title}
                    error={recurringFormErrors.title}
                    onChange={(e) => setRecurringForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="مثلاً اجاره مغازه، حقوق یا قسط وام"
                  />
                </ModalField>
              </FormGridItem>

              <ModalField label="دسته‌بندی" required iconClass={categoryIcon(recurringForm.category, backendCategories)}>
                <SelectField value={recurringForm.category} onChange={(e) => setRecurringForm((prev) => ({ ...prev, category: e.target.value }))}>
                  {backendCategories.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </SelectField>
              </ModalField>

              <ModalField label="مبلغ هر پرداخت" required iconClass="fa-solid fa-sack-dollar" hint={recurringAmountWords || undefined}>
                <TextField
                  id={recurringFieldIds.amount}
                  value={recurringForm.amount ? formatNumberWithCommas(recurringForm.amount) : ''}
                  error={recurringFormErrors.amount}
                  valueKind="currency"
                  onChange={(e) => setRecurringForm((prev) => ({ ...prev, amount: cleanNumber(e.target.value) }))}
                  inputMode="numeric"
                  placeholder="مبلغ هر پرداخت"
                  trailingAction={<span className="text-xs font-black text-slate-500">تومان</span>}
                />
              </ModalField>

              <ModalField label="روز پرداخت ماه" required iconClass="fa-solid fa-calendar-day">
                <TextField
                  id={recurringFieldIds.dayOfMonth}
                  value={recurringForm.dayOfMonth}
                  error={recurringFormErrors.dayOfMonth}
                  valueKind="number"
                  onChange={(e) => setRecurringForm((prev) => ({ ...prev, dayOfMonth: cleanNumber(e.target.value).slice(0, 2) }))}
                  inputMode="numeric"
                  placeholder="مثلاً ۵"
                />
              </ModalField>

              {recurringForm.recurringType === 'installment' ? (
                <ModalField label="تعداد کل اقساط" required iconClass="fa-solid fa-list-ol">
                  <TextField
                    id={recurringFieldIds.totalInstallments}
                    value={recurringForm.totalInstallments}
                    error={recurringFormErrors.totalInstallments}
                    valueKind="number"
                    onChange={(e) => setRecurringForm((prev) => ({ ...prev, totalInstallments: cleanNumber(e.target.value).slice(0, 3) }))}
                    inputMode="numeric"
                    placeholder="مثلاً ۱۲"
                  />
                </ModalField>
              ) : (
                <ModalField label="تعداد پرداخت" iconClass="fa-solid fa-infinity">
                  <TextField value="نامحدود" disabled readOnly />
                </ModalField>
              )}

              <ModalField label="شروع / سررسید بعدی" required iconClass="fa-regular fa-calendar">
                <ShamsiDatePicker
                  id={recurringFieldIds.nextRunDate}
                  selectedDate={recurringForm.nextRunDate}
                  error={recurringFormErrors.nextRunDate}
                  onDateChange={(date) => {
                    setRecurringForm((prev) => ({ ...prev, nextRunDate: date }));
                    if (recurringFormErrors.nextRunDate) setRecurringFormErrors((prev) => ({ ...prev, nextRunDate: undefined }));
                  }}
                  preview="سررسید بعدی"
                  className="w-full"
                  size="compact"
                />
              </ModalField>

              <ModalField label="طرف حساب" iconClass="fa-solid fa-user-tag">
                <TextField value={recurringForm.vendor} onChange={(e) => setRecurringForm((prev) => ({ ...prev, vendor: e.target.value }))} placeholder="شخص، شرکت یا بانک" />
              </ModalField>

              <FormGridItem span={2}>
                <ModalField label="یادداشت" iconClass="fa-solid fa-note-sticky">
                  <TextareaField value={recurringForm.notes} onChange={(e) => setRecurringForm((prev) => ({ ...prev, notes: e.target.value }))} rows={2} placeholder="توضیح اختیاری" />
                </ModalField>
              </FormGridItem>
            </FormGrid>

            <PanelCard
              title="خلاصه نهایی برنامه پرداخت"
              subtitle="پیش‌نمایش نتیجه‌ای که با ثبت این برنامه در سیستم ذخیره می‌شود."
              icon={<i className="fa-solid fa-clipboard-check" aria-hidden="true" />}
              density="compact"
              tone="accent"
              className="mt-3"
              bodyClassName="space-y-3"
            >
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400"><i className="fa-solid fa-repeat" aria-hidden="true" /> نوع برنامه</div>
                  <div className="mt-1 truncate text-sm font-black text-slate-900 dark:text-slate-50">{recurringPlanLabel}</div>
                </div>
                <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400"><i className="fa-solid fa-sack-dollar" aria-hidden="true" /> مبلغ هر پرداخت</div>
                  <div className="mt-1 whitespace-nowrap text-sm font-black tabular-nums text-slate-900 dark:text-slate-50">{recurringAmountNumeric > 0 ? money(recurringAmountNumeric) : 'ثبت نشده'}</div>
                </div>
                <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400"><i className="fa-solid fa-calculator" aria-hidden="true" /> جمع تعهد</div>
                  <div className="mt-1 whitespace-nowrap text-sm font-black tabular-nums text-slate-900 dark:text-slate-50">{recurringProjectedTotal > 0 ? money(recurringProjectedTotal) : recurringForm.recurringType === 'monthly' ? 'نامحدود' : 'پس از تعیین اقساط'}</div>
                </div>
                <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400"><i className={`fa-solid ${recurringForm.isActive ? 'fa-circle-check' : 'fa-circle-pause'}`} aria-hidden="true" /> وضعیت</div>
                  <div className={`mt-1 text-sm font-black ${recurringForm.isActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-300'}`}>{recurringForm.isActive ? 'فعال' : 'غیرفعال'}</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200 pt-2 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <span><i className="fa-regular fa-calendar me-1.5" aria-hidden="true" />سررسید بعدی: <strong className="text-slate-800 dark:text-slate-200">{recurringForm.nextRunDate ? toShamsi(recurringForm.nextRunDate) : 'ثبت نشده'}</strong></span>
                <span><i className="fa-solid fa-calendar-day me-1.5" aria-hidden="true" />روز پرداخت: <strong className="text-slate-800 dark:text-slate-200">{recurringForm.dayOfMonth || '—'}</strong></span>
                <span><i className={`${categoryIcon(recurringForm.category, backendCategories)} me-1.5`} aria-hidden="true" />دسته: <strong className="text-slate-800 dark:text-slate-200">{categoryLabel(recurringForm.category, backendCategories)}</strong></span>
                {recurringForm.vendor ? <span><i className="fa-solid fa-user-tag me-1.5" aria-hidden="true" />طرف حساب: <strong className="text-slate-800 dark:text-slate-200">{recurringForm.vendor}</strong></span> : null}
              </div>
            </PanelCard>
          </div>

          <DialogActions
            onCancel={() => {
              setIsRecurringModalOpen(false);
              setEditingRecurringId(null);
              setRecurringForm(initialRecurringForm());
            }}
            onSubmitClick={handleSaveRecurring}
            submitText={editingRecurringId ? "ذخیره تغییرات" : "ثبت هزینه تکرارشونده"}
          />
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
          bodyClassName="!p-0"
        >
          <div className="grid min-w-0 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_16rem]" data-expense-modal="true" data-no-tooltip="true" dir="rtl">
            <section className="expense-entry-modal__content min-w-0 p-5 md:p-6" aria-label="فرم ثبت پرداخت تکرارشونده">
              <FormErrorSummary
                errors={recurringPaymentFormErrors}
                labels={{ paymentDate: 'تاریخ پرداخت', amount: 'مبلغ پرداختی' }}
                fieldIdMap={recurringPaymentFieldIds}
                className="mb-4"
              />
              <FormGrid columns={2} gap="md">
                <FormGridItem className="space-y-2">
                  <div className="flex items-center gap-1 text-sm font-black text-slate-800 dark:text-slate-100"><span>تاریخ پرداخت واقعی</span><span className="text-rose-600" aria-hidden="true">*</span></div>
                  <ShamsiDatePicker
                    id={recurringPaymentFieldIds.paymentDate}
                    selectedDate={recurringPaymentForm.paymentDate}
                    error={recurringPaymentFormErrors.paymentDate}
                    onDateChange={(d) => { setRecurringPaymentForm((p) => ({ ...p, paymentDate: d })); if (recurringPaymentFormErrors.paymentDate) setRecurringPaymentFormErrors((prev) => ({ ...prev, paymentDate: undefined })); }}
                    preview="تاریخ پرداخت"
                    className="w-full"
                  />
                </FormGridItem>

                <ModalField label="مبلغ پرداختی" required iconClass="fa-solid fa-sack-dollar" hint={recurringPaymentAmountWords || undefined}>
                  <TextField
                    id={recurringPaymentFieldIds.amount}
                    value={recurringPaymentForm.amount ? formatNumberWithCommas(recurringPaymentForm.amount) : ""}
                    error={recurringPaymentFormErrors.amount}
                    valueKind="currency"
                    onChange={(e) => setRecurringPaymentForm((p) => ({ ...p, amount: cleanNumber(e.target.value) }))}
                    inputMode="numeric"
                    placeholder="مبلغ پرداختی"
                    trailingAction={<span className="text-xs font-black text-slate-500">تومان</span>}
                  />
                </ModalField>

                <div className="space-y-2">
                  <div className="text-sm font-black text-slate-800 dark:text-slate-100">روش پرداخت</div>
                  <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="روش پرداخت">
                    {expensePaymentMethodOptions.map((method) => {
                      const checked = recurringPaymentForm.paymentMethod === method.value;
                      return (
                        <Button
                          key={method.value}
                          type="button"
                          variant={checked ? "primary" : "secondary"}
                          size="sm"
                          className="w-full justify-center"
                          onClick={() => setRecurringPaymentForm((p) => ({ ...p, paymentMethod: method.value }))}
                          aria-pressed={checked}
                          leftIcon={<i className={method.icon} aria-hidden="true" />}
                        >
                          {method.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <ModalField label="مرجع / شماره سند" iconClass="fa-regular fa-file-lines">
                  <TextField
                    value={recurringPaymentForm.referenceNo}
                    onChange={(e) => setRecurringPaymentForm((p) => ({ ...p, referenceNo: e.target.value }))}
                    placeholder="شماره سند یا مرجع اختیاری"
                  />
                </ModalField>

                <FormGridItem span="full">
                  <ModalField label="یادداشت پرداخت" iconClass="fa-solid fa-note-sticky">
                  <TextareaField
                    value={recurringPaymentForm.notes}
                    onChange={(e) => setRecurringPaymentForm((p) => ({ ...p, notes: e.target.value }))}
                    rows={3}
                    placeholder="مثلاً مساعده، پرداخت بخشی از حقوق، تسویه کامل…"
                  />
                  </ModalField>
                </FormGridItem>
              </FormGrid>
            </section>

            <aside className="min-w-0 border-t border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/30 lg:border-r lg:border-t-0" aria-label="خلاصه پرداخت">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300"><i className="fa-solid fa-receipt" aria-hidden="true" /></div>
                <div className="text-sm font-black text-slate-700 dark:text-slate-200">خلاصه پرداخت</div>
                <div className="mt-2 text-xl font-black text-slate-950 dark:text-white">{money(recurringPaymentAmountNumeric)}</div>
                {recurringPaymentAmountWords ? <div className="mt-1 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">{recurringPaymentAmountWords}</div> : null}
                <dl className="mt-4 grid gap-2 text-xs">
                  <div className="flex items-start justify-between gap-3"><dt className="text-slate-500">عنوان</dt><dd className="text-end font-black text-slate-800 dark:text-slate-100">{recurringPaymentTarget.title}</dd></div>
                  <div className="flex items-start justify-between gap-3"><dt className="text-slate-500">بابت دوره</dt><dd className="text-end font-black text-slate-800 dark:text-slate-100">{toShamsi(recurringPaymentTarget.nextRunDate)}</dd></div>
                  <div className="flex items-start justify-between gap-3"><dt className="text-slate-500">مبلغ دوره</dt><dd className="text-end font-black text-slate-800 dark:text-slate-100">{money(recurringPaymentTarget.amount)}</dd></div>
                  <div className="flex items-start justify-between gap-3"><dt className="text-slate-500">پرداخت‌شده</dt><dd className="text-end font-black text-slate-800 dark:text-slate-100">{money(recurringPaymentTarget.currentCyclePaid || 0)}</dd></div>
                  <div className="flex items-start justify-between gap-3"><dt className="text-slate-500">مانده قبل از ثبت</dt><dd className="text-end font-black text-slate-800 dark:text-slate-100">{money(Math.max(0, Number(recurringPaymentTarget.amount || 0) - Number(recurringPaymentTarget.currentCyclePaid || 0)))}</dd></div>
                  <div className="flex items-start justify-between gap-3"><dt className="text-slate-500">مانده بعد از ثبت</dt><dd className="text-end font-black text-slate-800 dark:text-slate-100">{money(Math.max(0, Number(recurringPaymentTarget.amount || 0) - Number(recurringPaymentTarget.currentCyclePaid || 0) - recurringPaymentAmountNumeric))}</dd></div>
                </dl>
              </div>
            </aside>
          </div>

          <DialogActions
            onCancel={() => {
              setIsRecurringPaymentModalOpen(false);
              setRecurringPaymentTarget(null);
              setRecurringPaymentForm(initialRecurringPaymentForm());
            }}
            onSubmitClick={handleSaveRecurringPayment}
            submitText="ثبت پرداخت"
          />
        </Modal>
      ) : null}

      {isExpenseModalOpen ? (
        <Modal
          title={editingExpenseId ? "ویرایش هزینه" : "ثبت هزینه"}
          onClose={() => setIsExpenseModalOpen(false)}
          isOpen={isExpenseModalOpen}
          widthClass="max-w-5xl"
          panelClassName="expense-entry-modal"
          iconClass="fa-solid fa-file-invoice-dollar"
          tone="success"
          size="full"
          variant="operational"
          layout="horizontal"
          bodyClassName="!p-0"
          hideCloseButton
        >
          <div
            data-expense-modal="true"
            data-expense-modal-layout="reference-split-v304"
            data-expense-modal-design="approved-v304"
            data-expense-modal-canonical="v309"
            data-ui-financial-modal="v317"
            className="expense-entry-modal__content financial-entry-modal__content min-w-0 p-5 md:p-6"
            data-no-tooltip="true"
            dir="rtl"
          >
            <FormErrorSummary
              errors={expenseFormErrors}
              labels={{ expenseDate: 'تاریخ هزینه', title: 'نوع هزینه', amount: 'مبلغ' }}
              fieldIdMap={expenseFieldIds}
              className="mb-4"
            />

            <ModalTemplateForm dir="ltr" data-expense-modal-columns="summary-left-form-right">
              <ModalTemplateSide aria-label="خلاصه ثبت هزینه">
                <ModalTemplateSummary
                  title="خلاصه ثبت"
                  subtitle="پیش‌نمایش سند قبل از ذخیره"
                  icon={<i className="fa-solid fa-file-circle-check" />}
                  note="پس از ثبت، سند در گزارش‌های مالی ذخیره می‌شود."
                  noteIcon={<i className="fa-solid fa-shield-halved" />}
                >
                  <ModalTemplateMetricList>
                    <ModalTemplateMetric
                      label="مبلغ سند"
                      value={expenseAmountNumeric > 0 ? money(expenseAmountNumeric) : '۰ تومان'}
                      icon={<i className="fa-solid fa-sack-dollar" />}
                    />
                    <ModalTemplateMetric
                      label="دسته‌بندی"
                      value={categoryLabel(expenseForm.category, backendCategories)}
                      icon={<i className={categoryIcon(expenseForm.category, backendCategories)} />}
                    />
                    <ModalTemplateMetric
                      label="روش پرداخت"
                      value={expensePaymentMethodLabel}
                      icon={<i className={paymentMethodIcon(expenseForm.paymentMethod)} />}
                    />
                    <ModalTemplateMetric
                      label="تاریخ"
                      value={expenseForm.expenseDate ? toShamsi(expenseForm.expenseDate) : 'ثبت نشده'}
                      icon={<i className="fa-regular fa-calendar" />}
                    />
                    <ModalTemplateMetric
                      label="عنوان"
                      value={expenseForm.title.trim() || 'ثبت نشده'}
                      icon={<i className="fa-regular fa-file-lines" />}
                    />
                  </ModalTemplateMetricList>
                </ModalTemplateSummary>
              </ModalTemplateSide>

              <ModalTemplateMain>
                <ModalTemplateSection aria-labelledby="expense-core-section-title">
                  <ModalTemplateSectionHeader
                    titleId="expense-core-section-title"
                    title="اطلاعات هزینه"
                    subtitle="عنوان، مبلغ، دسته‌بندی و تاریخ سند"
                    icon={<i className="fa-regular fa-clipboard" />}
                    tone="accent"
                  />

                  <FormGrid columns={3} gap="md" align="start">
                    <FormGridItem span={2} className="relative">
                      <ModalField label="نوع هزینه" required iconClass="fa-solid fa-pen-nib" error={expenseFormErrors.title} className="relative">
                        <TextField
                          id="expense-title-combobox"
                          ref={expenseTitleInputRef}
                          role="combobox"
                          aria-autocomplete="list"
                          aria-expanded={isExpenseTitleMenuOpen}
                          aria-controls={isExpenseTitleMenuOpen ? expenseTitleListboxId : undefined}
                          aria-activedescendant={isExpenseTitleMenuOpen ? `${expenseTitleListboxId}-option-${expenseTitleCursor}` : undefined}
                          value={expenseForm.title}
                          error={expenseFormErrors.title}
                          onFocus={() => setIsExpenseTitleMenuOpen(true)}
                          onChange={(e) => {
                            setExpenseForm((prev) => ({ ...prev, title: e.target.value }));
                            if (expenseFormErrors.title) setExpenseFormErrors((prev) => ({ ...prev, title: undefined }));
                            setIsExpenseTitleMenuOpen(true);
                            setExpenseTitleCursor(0);
                          }}
                          onKeyDown={handleExpenseTitleKeyDown}
                          placeholder="مثلاً قبض آب، اجاره مغازه، اینترنت یا حقوق"
                          autoComplete="off"
                          trailingAction={<i className={`fa-solid fa-chevron-down text-slate-400 transition ${isExpenseTitleMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />}
                        />

                        {isExpenseTitleMenuOpen ? (
                          <div
                            id={expenseTitleListboxId}
                            role="listbox"
                            className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-40 max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-950"
                          >
                            {filteredExpenseTitleOptions.map((item, index) => (
                              <Button
                                key={`${item.source || 'expense'}-${item.title}`}
                                id={`${expenseTitleListboxId}-option-${index}`}
                                role="option"
                                aria-selected={index === expenseTitleCursor}
                                type="button"
                                variant="ghost"
                                size="sm"
                                autoIcon={false}
                                className="!h-auto !w-full !justify-between !px-3 !py-2 text-right"
                                onMouseEnter={() => setExpenseTitleCursor(index)}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => selectExpenseTitle(item)}
                                rightIcon={<i className="fa-solid fa-clock-rotate-left shrink-0 opacity-60" aria-hidden="true" />}
                              >
                                <span className="grid min-w-0 gap-0.5 text-right">
                                  <strong className="truncate text-sm font-black">{item.title}</strong>
                                  <small className="truncate text-[11px] font-semibold opacity-70">{categoryLabel(item.category || 'overhead', backendCategories)} · {toFa(item.count)} ثبت · {money(item.total)}</small>
                                </span>
                              </Button>
                            ))}

                            {canCreateExpenseTitle ? (
                              <Button
                                type="button"
                                id={`${expenseTitleListboxId}-option-${filteredExpenseTitleOptions.length}`}
                                role="option"
                                aria-selected={expenseTitleCursor === filteredExpenseTitleOptions.length}
                                variant="ghost"
                                size="sm"
                                autoIcon={false}
                                className="!h-auto !w-full !justify-between !px-3 !py-2 text-right"
                                onMouseEnter={() => setExpenseTitleCursor(filteredExpenseTitleOptions.length)}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={confirmNewExpenseTitle}
                                rightIcon={<i className="fa-solid fa-plus shrink-0 opacity-60" aria-hidden="true" />}
                              >
                                <span className="grid min-w-0 gap-0.5 text-right">
                                  <strong className="truncate text-sm font-black">افزودن «{expenseForm.title.trim()}»</strong>
                                  <small className="truncate text-[11px] font-semibold opacity-70">این عنوان بعد از ثبت در پیشنهادهای بعدی نمایش داده می‌شود.</small>
                                </span>
                              </Button>
                            ) : null}

                            {!filteredExpenseTitleOptions.length && !canCreateExpenseTitle ? (
                              <div className="px-3 py-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">نوع هزینه‌ای ثبت نشده؛ یک عنوان جدید بنویس.</div>
                            ) : null}
                          </div>
                        ) : null}
                      </ModalField>
                    </FormGridItem>

                    <ModalField label="مبلغ" required iconClass="fa-solid fa-sack-dollar" hint={expenseAmountWords || undefined} error={expenseFormErrors.amount}>
                      <TextField
                        id={expenseFieldIds.amount}
                        value={expenseForm.amount ? formatNumberWithCommas(expenseForm.amount) : ''}
                        error={expenseFormErrors.amount}
                        valueKind="currency"
                        onChange={(e) => {
                          setExpenseForm((prev) => ({ ...prev, amount: cleanNumber(e.target.value) }));
                          if (expenseFormErrors.amount) setExpenseFormErrors((prev) => ({ ...prev, amount: undefined }));
                        }}
                        inputMode="numeric"
                        placeholder="مبلغ"
                      />
                    </ModalField>

                    <FormGridItem span={2}>
                      <ModalField label="دسته‌بندی" required iconClass={categoryIcon(expenseForm.category, backendCategories)}>
                        <SelectField value={expenseForm.category} onChange={(e) => setExpenseForm((prev) => ({ ...prev, category: e.target.value }))}>
                          {backendCategories.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </SelectField>
                      </ModalField>
                    </FormGridItem>

                    <ModalField label="تاریخ هزینه" required iconClass="fa-regular fa-calendar" error={expenseFormErrors.expenseDate}>
                      <ShamsiDatePicker
                        id={expenseFieldIds.expenseDate}
                        selectedDate={expenseForm.expenseDate}
                        error={expenseFormErrors.expenseDate}
                        onDateChange={(date) => {
                          setExpenseForm((prev) => ({ ...prev, expenseDate: date }));
                          if (expenseFormErrors.expenseDate) setExpenseFormErrors((prev) => ({ ...prev, expenseDate: undefined }));
                        }}
                        preview="تاریخ هزینه"
                        className="w-full"
                        size="compact"
                        hideIcon
                      />
                    </ModalField>

                    <FormGridItem span={3}>
                      <ModalField label="مرجع / شماره سند" iconClass="fa-regular fa-file-lines">
                        <TextField
                          value={expenseForm.referenceNo}
                          onChange={(e) => setExpenseForm((prev) => ({ ...prev, referenceNo: e.target.value }))}
                          placeholder="اختیاری"
                        />
                      </ModalField>
                    </FormGridItem>
                  </FormGrid>
                </ModalTemplateSection>

                <ModalTemplateSection aria-labelledby="expense-payment-section-title">
                  <ModalTemplateSectionHeader
                    titleId="expense-payment-section-title"
                    title="پرداخت و توضیحات"
                    subtitle="روش پرداخت و یادداشت داخلی سند"
                    icon={<i className="fa-solid fa-wallet" />}
                    tone="accent"
                  />

                  <FilterChipGroup
                    value={expenseForm.paymentMethod}
                    onValueChange={(value) => setExpenseForm((prev) => ({ ...prev, paymentMethod: value as ExpensePaymentMethod }))}
                    ariaLabel="روش پرداخت هزینه"
                    label="روش پرداخت"
                    size="sm"
                    showIcons
                    appearance="segmented"
                    fullWidth
                    options={expensePaymentMethodOptions.map((method) => ({ value: method.value, label: method.label, icon: <i className={method.icon} aria-hidden="true" /> }))}
                  />

                  <ModalField label="یادداشت" iconClass="fa-solid fa-note-sticky">
                    <TextareaField
                      value={expenseForm.notes}
                      onChange={(e) => setExpenseForm((prev) => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      placeholder="یادداشت خود را وارد کنید (اختیاری)"
                    />
                  </ModalField>
                </ModalTemplateSection>
              </ModalTemplateMain>
            </ModalTemplateForm>
          </div>

          <DialogActions
            onCancel={() => setIsExpenseModalOpen(false)}
            onSubmitClick={handleSaveExpense}
            submitText={editingExpenseId ? "ذخیره تغییرات" : "ثبت هزینه"}
            align="end"
            className="expense-entry-modal__actions"
            cancelButtonProps={{ leftIcon: false }}
          />
        </Modal>
      ) : null}
    </div>
  );
}
