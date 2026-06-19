import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/apiFetch';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';

type ApprovalRow = {
  id: number;
  customerId: number;
  customerName: string;
  grandTotal: number;
  subtotal: number;
  discount: number;
  transactionDate: string;
  notes: string;
  suggestedCreditLimit: number | null;
  remainingSuggestedCredit: number | null;
  customerTrustScore: number | null;
  customerTrustTier: string | null;
  projectedExposure: number;
  approvalMarker: string;
};

type ApprovalMeta = {
  totalCount: number;
  rawTotalCount?: number;
  riskyOnly?: boolean;
  totalAmount: number;
  overLimitCount: number;
  noLimitCount: number;
  averageTrustScore: number | null;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const formatMoney = (value: number) => formatCurrencyText(Number(value) || 0, readStoredCurrencyUnit());

const toFa = (value: unknown) => String(value ?? '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

const ManagerCreditApprovalsReport: React.FC = () => {
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [meta, setMeta] = useState<ApprovalMeta>({
    totalCount: 0,
    rawTotalCount: 0,
    riskyOnly: false,
    totalAmount: 0,
    overLimitCount: 0,
    noLimitCount: 0,
    averageTrustScore: null,
  });
  const [from, setFrom] = useState('');
  const [to, setTo] = useState(todayIso());
  const [riskyOnly, setRiskyOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const query = useMemo(() => {
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    if (riskyOnly) q.set('riskyOnly', '1');
    return q.toString();
  }, [from, to, riskyOnly]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await apiFetch(`/api/reports/manager-credit-approvals${query ? `?${query}` : ''}`);
        const json = await res.json();
        if (!res.ok || !json?.success) throw new Error(json?.message || 'خطا در دریافت گزارش تأییدهای مدیریتی.');
        if (cancelled) return;
        setRows(Array.isArray(json.data) ? json.data : []);
        setMeta({
          totalCount: Number(json?.meta?.totalCount || 0),
          rawTotalCount: Number(json?.meta?.rawTotalCount || json?.meta?.totalCount || 0),
          riskyOnly: Boolean(json?.meta?.riskyOnly),
          totalAmount: Number(json?.meta?.totalAmount || 0),
          overLimitCount: Number(json?.meta?.overLimitCount || 0),
          noLimitCount: Number(json?.meta?.noLimitCount || 0),
          averageTrustScore: typeof json?.meta?.averageTrustScore === 'number' ? json.meta.averageTrustScore : null,
        });
      } catch (error: any) {
        if (!cancelled) {
          setErr(error?.message || 'خطا در دریافت اطلاعات.');
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-3 pb-8 text-right" dir="rtl">
      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_24px_56px_-44px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              <i className="fa-solid fa-user-tie" />
              کنترل اعتبار مدیریتی
            </div>
            <h1 className="mt-4 text-[1.8rem] font-black tracking-tight text-slate-950 dark:text-slate-50">
              گزارش فروش‌های تأییدشده توسط مدیر
            </h1>
            <p className="mt-2 max-w-3xl text-[13px] leading-7 text-slate-500 dark:text-slate-400">
              این گزارش فقط فروش‌های اعتباری را نشان می‌دهد که به‌دلیل عبور از سقف اعتبار پیشنهادی مشتری، با تأیید مدیر یا ادمین ثبت شده‌اند.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-[11px] font-black text-slate-500 dark:text-slate-400">
              از تاریخ
              <input
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                placeholder="YYYY-MM-DD"
                className="mt-1 block h-10 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-right text-[12px] font-bold text-slate-800 outline-none  dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            <label className="text-[11px] font-black text-slate-500 dark:text-slate-400">
              تا تاریخ
              <input
                value={to}
                onChange={(event) => setTo(event.target.value)}
                placeholder="YYYY-MM-DD"
                className="mt-1 block h-10 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-right text-[12px] font-bold text-slate-800 outline-none  dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            <button
              type="button"
              onClick={() => setRiskyOnly((prev) => !prev)}
              className={`sm:col-span-2 mt-1 inline-flex h-10 items-center justify-center gap-2 rounded-2xl border px-4 text-[12px] font-black transition ${
                riskyOnly
                  ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              <i className={riskyOnly ? 'fa-solid fa-filter-circle-xmark' : 'fa-solid fa-filter'} />
              {riskyOnly ? 'نمایش فقط موارد هنوز پرریسک' : 'فیلتر موارد هنوز پرریسک'}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {[
          { label: 'تعداد تأییدها', value: toFa(meta.totalCount), icon: 'fa-solid fa-circle-check', tone: 'emerald' },
          { label: 'جمع مبلغ تأییدشده', value: formatMoney(meta.totalAmount), icon: 'fa-solid fa-wallet', tone: 'blue' },
          { label: 'عبور از سقف', value: toFa(meta.overLimitCount), icon: 'fa-solid fa-triangle-exclamation', tone: 'amber' },
          { label: 'میانگین اعتماد مشتری', value: meta.averageTrustScore == null ? '—' : `${toFa(meta.averageTrustScore)}٪`, icon: 'fa-solid fa-gauge-high', tone: 'violet' },
        ].map((card) => (
          <div key={card.label} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.3)] dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400">{card.label}</div>
                <div className="mt-2 text-[18px] font-black text-slate-950 dark:text-slate-50">{card.value}</div>
              </div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                <i className={card.icon} />
              </span>
            </div>
          </div>
        ))}
      </section>

      {riskyOnly ? (
        <section className="rounded-[22px] border border-amber-200 bg-amber-50/80 px-4 py-3 text-right text-[12px] font-bold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-200">
          <i className="fa-solid fa-triangle-exclamation ml-2" />
          فیلتر فعال است: فقط مواردی نمایش داده می‌شوند که همچنان از سقف اعتبار عبور کرده‌اند، سقف امن ندارند، یا امتیاز اعتماد مشتری کمتر از ۵۸ است.
          <span className="mr-2 font-black">({toFa(meta.totalCount)} از {toFa(meta.rawTotalCount ?? meta.totalCount)} مورد)</span>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_56px_-44px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-[15px] font-black text-slate-950 dark:text-slate-50">لیست فروش‌های نیازمند تأیید</h2>
            <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">فقط فاکتورهایی نمایش داده می‌شوند که نشانه تأیید مدیر در یادداشت آن‌ها ثبت شده باشد.</p>
          </div>
          {loading ? <span className="text-[12px] font-bold text-slate-500">در حال دریافت…</span> : null}
        </div>

        {err ? (
          <div className="m-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-[13px] font-bold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-rose-200">
            {err}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-900">
              <i className="fa-solid fa-circle-check text-2xl" />
            </div>
            <div className="mt-4 text-[15px] font-black text-slate-800 dark:text-slate-100">موردی ثبت نشده است</div>
            <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">در بازه انتخابی، فروش اعتباری تأییدشده توسط مدیر پیدا نشد.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-right text-[12px]">
              <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900/70 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-black">فاکتور</th>
                  <th className="px-4 py-3 font-black">مشتری</th>
                  <th className="px-4 py-3 font-black">تاریخ</th>
                  <th className="px-4 py-3 font-black">مبلغ فاکتور</th>
                  <th className="px-4 py-3 font-black">سقف پیشنهادی</th>
                  <th className="px-4 py-3 font-black">تعهد پس از ثبت</th>
                  <th className="px-4 py-3 font-black">اعتماد مشتری</th>
                  <th className="px-4 py-3 font-black">اقدام</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((row) => {
                  const over = Number(row.suggestedCreditLimit || 0) > 0 && Number(row.projectedExposure || 0) > Number(row.suggestedCreditLimit || 0);
                  const noSafeLimit = Number(row.suggestedCreditLimit || 0) <= 0;
                  const lowTrust = Number(row.customerTrustScore || 0) < 58;
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/45">
                      <td className="px-4 py-3 font-black text-slate-900 dark:text-slate-100">#{toFa(row.id)}</td>
                      <td className="px-4 py-3">
                        <div className="font-black text-slate-900 dark:text-slate-100">{row.customerName || 'مشتری'}</div>
                        <div className="mt-1 text-[11px] text-slate-400">شناسه مشتری: {toFa(row.customerId || '—')}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{toFa(row.transactionDate || '—')}</td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">{formatMoney(row.grandTotal)}</td>
                      <td className="px-4 py-3">{row.suggestedCreditLimit == null ? '—' : formatMoney(row.suggestedCreditLimit)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${over ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-200' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200'}`}>
                          {formatMoney(row.projectedExposure)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-black text-slate-900 dark:text-slate-100">{row.customerTrustScore == null ? '—' : `${toFa(row.customerTrustScore)}٪`}</div>
                        <div className="mt-1 text-[11px] text-slate-400">{row.customerTrustTier || 'نامشخص'}</div>
                        {(over || noSafeLimit || lowTrust) ? (
                          <div className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
                            {noSafeLimit ? 'بدون سقف امن' : over ? 'عبور از سقف' : 'اعتماد پایین'}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link to={`/invoices/${row.id}`} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                            فاکتور
                          </Link>
                          {row.customerId ? (
                            <Link to={`/customers/${row.customerId}`} className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-black text-blue-700 transition hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
                              پرونده مشتری
                            </Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default ManagerCreditApprovalsReport;
