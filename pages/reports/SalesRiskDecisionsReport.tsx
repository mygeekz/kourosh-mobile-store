import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/apiFetch';

type RiskDecisionLog = {
  id: number;
  userId: number | null;
  username: string | null;
  role: string | null;
  action: string;
  entityType: string | null;
  entityId: number | null;
  description: string | null;
  createdAt: string;
};

type RiskDecisionMeta = {
  totalCount: number;
  cashSwitchCount: number;
  creditReturnCount: number;
  uniqueCustomers: number;
};

const toFa = (value: unknown) => String(value ?? '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return toFa(value);
  }
};

const getDecisionTone = (description?: string | null) => {
  const text = String(description || '');
  if (text.includes('به نقدی')) return {
    label: 'ریسک کنترل شد',
    icon: 'fa-solid fa-circle-check',
    shell: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200',
  };
  if (text.includes('به اعتباری')) return {
    label: 'بازگشت به اعتبار',
    icon: 'fa-solid fa-triangle-exclamation',
    shell: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-200',
  };
  return {
    label: 'تصمیم ریسک',
    icon: 'fa-solid fa-shield-halved',
    shell: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200',
  };
};

const SalesRiskDecisionsReport: React.FC = () => {
  const [rows, setRows] = useState<RiskDecisionLog[]>([]);
  const [meta, setMeta] = useState<RiskDecisionMeta>({
    totalCount: 0,
    cashSwitchCount: 0,
    creditReturnCount: 0,
    uniqueCustomers: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'cash' | 'credit'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchRows = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '150' });
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      const res = await apiFetch(`/api/reports/sales-risk-decisions?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || json?.success === false) throw new Error(json?.message || 'خطا در دریافت لاگ تصمیم‌های ریسک فروش');
      setRows(Array.isArray(json?.data) ? json.data : []);
      setMeta({
        totalCount: Number(json?.meta?.totalCount || 0),
        cashSwitchCount: Number(json?.meta?.cashSwitchCount || 0),
        creditReturnCount: Number(json?.meta?.creditReturnCount || 0),
        uniqueCustomers: Number(json?.meta?.uniqueCustomers || 0),
      });
    } catch (err: any) {
      setError(err?.message || 'خطا در دریافت گزارش');
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [dateFrom, dateTo]);

  const filteredRows = useMemo(() => {
    if (filter === 'cash') return rows.filter((row) => String(row.description || '').includes('به نقدی'));
    if (filter === 'credit') return rows.filter((row) => String(row.description || '').includes('به اعتباری'));
    return rows;
  }, [rows, filter]);

  return (
    <div className="space-y-5" dir="rtl">
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_46px_-38px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-700 dark:border-amber-900/55 dark:bg-amber-950/25 dark:text-amber-200">
              <i className="fa-solid fa-shield-halved" />
              کنترل تصمیم‌های ریسک فروش
            </div>
            <h1 className="mt-3 text-2xl font-black text-slate-950 dark:text-slate-50">لاگ تصمیم‌های ریسک فروش</h1>
            <p className="mt-2 max-w-3xl text-[13px] leading-7 text-slate-500 dark:text-slate-400">
              این گزارش فقط تصمیم‌هایی را نشان می‌دهد که هنگام فروش به مشتری پرریسک برای تغییر روش پرداخت ثبت شده‌اند؛ مثل تغییر اعتباری به نقدی یا بازگشت دستی به اعتباری.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchRows}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[12px] font-black text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <i className="fa-solid fa-rotate-right" />
            به‌روزرسانی
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {[
            { label: 'کل تصمیم‌ها', value: meta.totalCount, icon: 'fa-solid fa-list-check' },
            { label: 'تغییر به نقدی', value: meta.cashSwitchCount, icon: 'fa-solid fa-money-bill-wave' },
            { label: 'بازگشت به اعتباری', value: meta.creditReturnCount, icon: 'fa-solid fa-file-invoice-dollar' },
            { label: 'مشتری درگیر', value: meta.uniqueCustomers, icon: 'fa-solid fa-users' },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{item.label}</span>
                <i className={`${item.icon} text-slate-400`} />
              </div>
              <div className="mt-2 text-xl font-black text-slate-950 dark:text-slate-50">{item.value.toLocaleString('fa-IR')}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-3 flex items-center gap-2 text-[13px] font-black text-slate-900 dark:text-slate-50">
          <i className="fa-regular fa-calendar-days text-slate-400" />
          فیلتر بازه تاریخ
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-slate-500 dark:text-slate-400">از تاریخ</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-[13px] font-bold text-slate-800 outline-none transition   dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 "
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-slate-500 dark:text-slate-400">تا تاریخ</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-[13px] font-bold text-slate-800 outline-none transition   dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 "
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setDateFrom('');
              setDateTo('');
            }}
            className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[12px] font-black text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            حذف فیلتر تاریخ
          </button>
        </div>
        {(dateFrom || dateTo) ? (
          <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/25 dark:text-blue-200">
            بازه فعال: {dateFrom ? toFa(dateFrom) : 'ابتدا'} تا {dateTo ? toFa(dateTo) : 'امروز'}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: 'all', label: 'همه تصمیم‌ها' },
          { key: 'cash', label: 'فقط تغییر به نقدی' },
          { key: 'credit', label: 'فقط بازگشت به اعتباری' },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key as any)}
            className={`rounded-2xl border px-3 py-2 text-[12px] font-black transition ${
              filter === item.key
                ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        {isLoading ? (
          <div className="p-8 text-center text-sm font-bold text-slate-500 dark:text-slate-400">در حال دریافت گزارش...</div>
        ) : error ? (
          <div className="p-8 text-center text-sm font-bold text-rose-600 dark:text-rose-300">{error}</div>
        ) : filteredRows.length === 0 ? (
          <div className="p-8 text-center text-sm font-bold text-slate-500 dark:text-slate-400">برای این فیلتر لاگی ثبت نشده است.</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredRows.map((row) => {
              const tone = getDecisionTone(row.description);
              return (
                <div key={row.id} className="grid gap-3 p-4 lg:grid-cols-[220px_1fr_160px] lg:items-center">
                  <div className="space-y-2">
                    <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-black ${tone.shell}`}>
                      <i className={tone.icon} />
                      {tone.label}
                    </span>
                    <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500">{formatDate(row.createdAt)}</div>
                  </div>
                  <div>
                    <div className="text-[12px] font-black text-slate-900 dark:text-slate-100">
                      {row.username || 'کاربر نامشخص'} {row.role ? <span className="font-bold text-slate-400">· {row.role}</span> : null}
                    </div>
                    <p className="mt-1 text-[12px] leading-6 text-slate-600 dark:text-slate-300">{row.description || '—'}</p>
                  </div>
                  <div className="flex lg:justify-end">
                    {row.entityId ? (
                      <Link
                        to={`/customers/${row.entityId}`}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        پرونده مشتری
                        <i className="fa-solid fa-arrow-left" />
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesRiskDecisionsReport;
