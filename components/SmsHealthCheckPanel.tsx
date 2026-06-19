import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SmsPatternDef } from './SmsBulkCheckModal';
import Button from './Button';

type HealthItem = {
  key: string;
  label: string;
  category: string;
  configured: boolean;
  bodyId: number | null;
};

type HealthResponse = {
  success: boolean;
  provider?: string;
  credsOk?: boolean;
  message?: string;
  items?: HealthItem[];
};

type Props = {
  patterns: SmsPatternDef[];
  onOpenBulkCheck: (defaultSelectedKeys: string[]) => void;
};

const categoryIconMap: Record<string, string> = {
  'اقساط': 'fa-solid fa-wallet',
  'تعمیرات': 'fa-solid fa-screwdriver-wrench',
  'فاکتورها': 'fa-solid fa-file-invoice',
  'چک‌ها': 'fa-solid fa-money-check-dollar',
  'حساب': 'fa-solid fa-user-gear',
};

const categoryToneMap: Record<string, string> = {
  'اقساط': 'text-sky-700 bg-sky-50 border-sky-200 dark:text-sky-200 dark:bg-sky-950/30 dark:border-sky-900/40',
  'تعمیرات': 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-200 dark:bg-amber-950/30 dark:border-amber-900/40',
  'فاکتورها': 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/40',
  'چک‌ها': 'text-violet-700 bg-violet-50 border-violet-200 dark:text-violet-200 dark:bg-violet-950/30 dark:border-violet-900/40',
  'حساب': 'text-slate-700 bg-slate-50 border-slate-200 dark:text-slate-200 dark:bg-slate-900 dark:border-slate-700',
};

const SmsHealthCheckPanel: React.FC<Props> = ({ patterns, onOpenBulkCheck }) => {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<HealthResponse | null>(null);
  const [expanded, setExpanded] = useState(true);

  const load = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/sms/health-check', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      setData(json);
    } catch (e: any) {
      setData({ success: false, message: e?.message || 'ارتباط با سرور برای بررسی سلامت پیامک برقرار نشد.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const merged = useMemo(() => {
    const map = new Map<string, HealthItem>();
    (data?.items || []).forEach((x) => map.set(x.key, x));
    return patterns.map((p) => {
      const it = map.get(p.key);
      return {
        key: p.key,
        label: p.label,
        category: p.category,
        configured: it ? !!it.configured : false,
        bodyId: it?.bodyId ?? null,
      };
    });
  }, [data, patterns]);

  const grouped = useMemo(() => {
    const g: Record<string, HealthItem[]> = {};
    merged.forEach((x) => {
      g[x.category] = g[x.category] || [];
      g[x.category].push(x);
    });
    return g;
  }, [merged]);

  const categoryOrder = useMemo(() => Object.keys(grouped), [grouped]);
  const missingKeys = useMemo(() => merged.filter((x) => !x.configured).map((x) => x.key), [merged]);
  const okCount = merged.filter((x) => x.configured).length;
  const total = merged.length;
  const progress = total > 0 ? Math.round((okCount / total) * 100) : 0;
  const serviceLabel = (data?.provider || 'Pattern').replaceAll('_', ' ');

  return (
    <section className="ops-health-panel sms-health-panel rounded-[30px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-900/95" data-ui-ops-panel="sms-health" data-ui-ops-surface="health">
      <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-4 dark:border-slate-800 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
              <i className="fa-solid fa-shield-heart" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-50">مرکز سلامت پیامک</h3>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${missingKeys.length === 0 ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200'}`}>
                  <i className={`fa-solid ${missingKeys.length === 0 ? 'fa-circle-check' : 'fa-triangle-exclamation'}`} />
                  {missingKeys.length === 0 ? 'همه‌چیز آماده است' : `${missingKeys.length.toLocaleString('fa-IR')} مورد نیاز به تنظیم`}
                </span>
              </div>
              <p className="mt-1 text-sm leading-7 text-slate-500 dark:text-slate-400">
                وضعیت کلی پترن‌های پیامکی، دسته‌های ناقص و مسیر تست گروهی را از اینجا مدیریت کن.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            variant="secondary"
            size="sm"
            leftIcon={<i className={`fa-solid ${expanded ? 'fa-chevron-up' : 'fa-chevron-down'}`} />}
          >
            {expanded ? 'جمع کردن' : 'نمایش جزئیات'}
          </Button>
          <Button
            type="button"
            onClick={load}
            variant="ghost"
            size="sm"
            loading={isLoading}
            loadingText="در حال بررسی..."
            leftIcon={!isLoading ? <i className="fa-solid fa-rotate" /> : undefined}
          >
            بروزرسانی وضعیت
          </Button>
          <Button
            type="button"
            onClick={() => onOpenBulkCheck(missingKeys.length ? missingKeys : merged.map((x) => x.key))}
            variant="primary"
            size="sm"
            leftIcon={<i className="fa-solid fa-vials" />}
          >
            فقط اولویت‌بالاها
          </Button>
        </div>
      </div>

      {data && data.success === false ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
          {data.message || 'بررسی سلامت پیامک انجام نشد.'}
        </div>
      ) : null}

      {data && data.success && data.credsOk === false ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          <i className="fa-solid fa-triangle-exclamation ml-2" />
          نام کاربری یا رمز عبور سرویس پیامک هنوز کامل نشده است.
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { title: 'فعال', value: okCount.toLocaleString('fa-IR') },
          { title: 'کل قالب‌ها', value: total.toLocaleString('fa-IR') },
          { title: 'ناقص', value: missingKeys.length.toLocaleString('fa-IR') },
          { title: 'سرویس', value: serviceLabel },
        ].map((stat) => (
          <div key={stat.title} className="ops-metric-card rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{stat.title}</div>
            <div className="mt-1 text-lg font-black text-slate-900 dark:text-slate-50">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-slate-900 dark:text-slate-50">پیشرفت تنظیم قالب‌ها</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{okCount.toLocaleString('fa-IR')} از {total.toLocaleString('fa-IR')} قالب آماده است.</div>
          </div>
          <div className="text-sm font-black text-slate-900 dark:text-slate-50">{progress.toLocaleString('fa-IR')}٪</div>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full rounded-full bg-slate-900 transition-all dark:bg-slate-100" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {expanded ? (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {categoryOrder.map((cat) => {
            const items = grouped[cat];
            const ok = items.filter((x) => x.configured).length;
            const catProgress = items.length ? Math.round((ok / items.length) * 100) : 0;
            const toneClass = categoryToneMap[cat] || categoryToneMap['حساب'];
            const iconClass = categoryIconMap[cat] || 'fa-solid fa-layer-group';
            return (
              <div key={cat} className="ops-check-card rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.16)] dark:border-slate-800 dark:bg-slate-950/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex items-start gap-3">
                    <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${toneClass}`}>
                      <i className={iconClass} />
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-base font-black text-slate-900 dark:text-slate-50">{cat}</h4>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{ok.toLocaleString('fa-IR')} / {items.length.toLocaleString('fa-IR')} آماده</div>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    {catProgress.toLocaleString('fa-IR')}٪
                  </span>
                </div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-slate-900 dark:bg-slate-100" style={{ width: `${catProgress}%` }} />
                </div>

                <div className="mt-4 space-y-3">
                  {items.map((x) => (
                    <div key={x.key} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/60 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/40">
                      <div className="min-w-0 text-sm font-semibold leading-6 text-slate-800 dark:text-slate-100">{x.label}</div>
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${x.configured ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200'}`}>
                        <i className={`fa-solid ${x.configured ? 'fa-circle-check' : 'fa-circle-xmark'}`} />
                        {x.configured ? 'تنظیم شده' : 'تنظیم نشده'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
};

export default SmsHealthCheckPanel;
