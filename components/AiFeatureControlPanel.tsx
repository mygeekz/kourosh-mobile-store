import { useEffect, useMemo, useState } from 'react';
import Button from './Button';
import { apiFetch } from '../utils/apiFetch';

type AiFeatureImpact = {
  usageCount?: number;
  successCount?: number;
  errorCount?: number;
  positiveCount?: number;
  negativeCount?: number;
  estimatedImpact?: number;
  lastUsedAt?: string | null;
  valueScore?: number;
  valueLabel?: string;
  recommendation?: string;
};

type AiFeatureRow = {
  key: string;
  title: string;
  description: string;
  icon?: string;
  enabled: boolean;
  requiresLearning?: boolean;
  progress?: number;
  status?: 'disabled' | 'insufficient' | 'learning' | 'ready' | 'excellent' | string;
  statusLabel?: string;
  progressLabel?: string;
  minimum?: number;
  signals?: { label: string; value: string | number }[];
  impact?: AiFeatureImpact;
  autoPause?: {
    level?: 'ok' | 'watch' | 'pause' | 'off' | string;
    shouldSuggestPause?: boolean;
    title?: string;
    reason?: string;
    suggestedAction?: string;
  };
};

type Props = {
  onNotice?: (message: { type: 'success' | 'error' | 'info'; text: string }) => void;
};

const statusMeta: Record<string, { label: string; cls: string; dot: string; icon: string }> = {
  disabled: { label: 'خاموش', cls: 'border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300', dot: 'bg-slate-400', icon: 'fa-power-off' },
  insufficient: { label: 'داده ناکافی', cls: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200', dot: 'bg-rose-500', icon: 'fa-triangle-exclamation' },
  learning: { label: 'در حال یادگیری', cls: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200', dot: 'bg-amber-500', icon: 'fa-graduation-cap' },
  ready: { label: 'آماده', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200', dot: 'bg-emerald-500', icon: 'fa-circle-check' },
  excellent: { label: 'دقیق', cls: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200', dot: 'bg-indigo-500', icon: 'fa-gauge-high' },
};

const clamp = (v: any) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const money = (v: any) => `${Math.round(num(v)).toLocaleString('fa-IR')} تومان`;
const shortDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString('fa-IR') : '—');

const learningGuideByFeature: Record<string, { title: string; body: string }> = {
  decision_memory: { title: 'حافظه تصمیمات', body: 'از نتیجه اقدام‌های واقعی یاد می‌گیرد؛ هر تأیید، رد یا بی‌اثر بودن یک پیشنهاد، دقت پیشنهادهای بعدی را بهتر می‌کند.' },
  today_actions: { title: 'اقدام‌های روزانه', body: 'فروش اخیر، وصول‌ها، هشدارهای سود و کالاهای کم‌تحرک را اولویت‌بندی می‌کند تا فقط کارهای مهم روز نمایش داده شوند.' },
  forecast: { title: 'پیش‌بینی فروش و خرید', body: 'با تاریخچه فروش، سرعت خروج کالا و موجودی باقی‌مانده کار می‌کند تا خرید مجدد و ریسک خواب سرمایه دقیق‌تر شود.' },
  hidden_profit: { title: 'کشف سود پنهان', body: 'حاشیه سود، تخفیف‌ها، بهای خرید و کالاهای مکمل را تحلیل می‌کند تا فرصت‌های فروش سودآور مشخص شوند.' },
  audit_radar: { title: 'کنترل خطای فاکتور', body: 'بیشتر قانون‌محور است و فروش زیر قیمت خرید، تخفیف غیرعادی و سود منفی را قبل از ثبت نهایی هشدار می‌دهد.' },
  customer_intelligence: { title: 'شناخت مشتری', body: 'از دفعات خرید، سودآوری، دیرکرد پرداخت و فاصله آخرین خرید برای تشخیص مشتری ارزشمند یا پرریسک استفاده می‌کند.' },
  auto_pricing: { title: 'هوش قیمت‌گذاری', body: 'از قیمت خرید، قیمت فروش نهایی، مدل گوشی و اصلاح دستی مدیر یاد می‌گیرد؛ قبول یا تغییر پیشنهاد، سیگنال مستقیم آموزشی است.' },
  sales_agent: { title: 'دستیار فروش', body: 'پیگیری مشتری، وصول اقساط، پیشنهاد کالا و نتیجه پیام‌ها را بررسی می‌کند تا پیشنهادهای فروش کاربردی‌تر شوند.' },
  profit_engine: { title: 'موتور سود واقعی', body: 'با بهای خرید، تخفیف ردیفی/کلی، FIFO و پرداخت‌های نقدی یا اقساطی کار می‌کند تا سود واقعی قابل اتکا باشد.' },
};

const getLearningGuide = (feature: AiFeatureRow) => learningGuideByFeature[feature.key] || { title: 'منطق یادگیری', body: feature.description || 'این قابلیت از داده‌های همان بخش و نتیجه اقدام‌های واقعی یاد می‌گیرد و تا رسیدن به حد شروع، محافظه‌کارانه عمل می‌کند.' };

export default function AiFeatureControlPanel({ onNotice }: Props) {
  const [features, setFeatures] = useState<AiFeatureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/ai/features');
      const js = await res.json().catch(() => ({}));
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در دریافت تنظیمات هوشمندسازی');
      setFeatures(Array.isArray(js?.data?.features) ? js.data.features : []);
    } catch (e: any) {
      onNotice?.({ type: 'error', text: e?.message || 'خطا در دریافت تنظیمات هوشمندسازی' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const enabledCount = useMemo(() => features.filter((f) => f.enabled).length, [features]);
  const learningCount = useMemo(() => features.filter((f) => f.requiresLearning).length, [features]);
  const impactAverage = useMemo(() => features.length ? Math.round(features.reduce((sum, f) => sum + clamp(f.impact?.valueScore), 0) / features.length) : 0, [features]);
  const totalUsage = useMemo(() => features.reduce((sum, f) => sum + num(f.impact?.usageCount), 0), [features]);

  const dismissAutoPause = async (feature: AiFeatureRow) => {
    setSavingKey(feature.key);
    try {
      const res = await apiFetch('/api/ai/features/auto-pause/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: feature.key, days: 14 }),
      });
      const js = await res.json().catch(() => ({}));
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در ثبت پایش');
      setFeatures(Array.isArray(js?.data?.features) ? js.data.features : []);
      onNotice?.({ type: 'info', text: `پیشنهاد توقف ${feature.title} برای ۱۴ روز پنهان شد.` });
    } catch (e: any) {
      onNotice?.({ type: 'error', text: e?.message || 'خطا در ثبت پایش Auto Pause' });
    } finally {
      setSavingKey(null);
    }
  };

  const toggle = async (feature: AiFeatureRow) => {
    const next = !feature.enabled;
    setSavingKey(feature.key);
    setFeatures((prev) => prev.map((f) => f.key === feature.key ? { ...f, enabled: next, status: next ? f.status : 'disabled' } : f));
    try {
      const res = await apiFetch('/api/ai/features/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: feature.key, enabled: next }),
      });
      const js = await res.json().catch(() => ({}));
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در ذخیره وضعیت');
      setFeatures(Array.isArray(js?.data?.features) ? js.data.features : []);
      onNotice?.({ type: 'success', text: next ? `${feature.title} فعال شد.` : `${feature.title} خاموش شد و دیگر محاسبه نمی‌شود.` });
      window.dispatchEvent(new CustomEvent('kourosh:ai-features-updated', { detail: { key: feature.key, enabled: next } }));
    } catch (e: any) {
      setFeatures((prev) => prev.map((f) => f.key === feature.key ? { ...f, enabled: feature.enabled } : f));
      onNotice?.({ type: 'error', text: e?.message || 'خطا در ذخیره تنظیمات هوشمندسازی' });
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <section dir="rtl" className="settings-smart-brain-panel overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-900/85">
      <div className="smart-ai-header border-b border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/25 lg:p-5">
        <div className="smart-ai-header-row flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3 text-right">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-700 dark:border-indigo-500/25 dark:bg-indigo-500/10 dark:text-indigo-200">
              <i className="fa-solid fa-microchip" />
            </span>
            <div className="min-w-0">
              <h3 className="text-lg font-black text-slate-950 dark:text-white">هوشمندسازی فروشگاه</h3>
              <p className="mt-1 max-w-3xl text-xs font-bold leading-6 text-slate-500 dark:text-slate-300">
                هر قابلیت را فقط وقتی روشن نگه دار که برای فروشگاه استفاده می‌شود؛ با خاموش شدن، نمایش و محاسبات همان قابلیت متوقف می‌شود.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-[11px] font-black text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"><i className="fa-solid fa-circle-check" />{enabledCount.toLocaleString('fa-IR')} فعال</span>
            <span className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 text-[11px] font-black text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"><i className="fa-solid fa-graduation-cap" />{learningCount.toLocaleString('fa-IR')} آموزشی</span>
            <span className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><i className="fa-solid fa-chart-line" />اثر {impactAverage.toLocaleString('fa-IR')}٪</span>
            <span className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><i className="fa-solid fa-database" />{totalUsage.toLocaleString('fa-IR')}</span>
            <Button type="button" variant="ghost" size="xs" onClick={() => void load()} leftIcon={<i className="fa-solid fa-rotate" />} disabled={loading}>به‌روزرسانی</Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="smart-ai-grid grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3 lg:p-5">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-[22px] bg-slate-100 dark:bg-slate-800" />)}
        </div>
      ) : (
        <div className="smart-ai-grid grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3 lg:p-5">
          {features.map((feature) => {
            const progress = clamp(feature.progress);
            const meta = statusMeta[feature.enabled ? String(feature.status || 'learning') : 'disabled'] || statusMeta.learning;
            const learningGuide = getLearningGuide(feature);
            return (
              <article key={feature.key} className={`smart-ai-card rounded-[24px] border p-3.5 text-right transition ${feature.enabled ? 'border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/75' : 'border-slate-200 bg-slate-50/85 opacity-80 dark:border-slate-800 dark:bg-slate-950/60'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border ${feature.enabled ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/25 dark:bg-indigo-500/10 dark:text-indigo-200' : 'border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900'}`}>
                      <i className={`fa-solid ${feature.icon || 'fa-brain'}`} />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-slate-950 dark:text-white">{feature.title}</div>
                      <p className="mt-1 line-clamp-2 text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400">{feature.description}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void toggle(feature)}
                    disabled={savingKey === feature.key}
                    aria-pressed={feature.enabled}
                    className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-[11px] font-black transition disabled:cursor-wait disabled:opacity-60 ${feature.enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200' : 'border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
                    title={feature.enabled ? 'خاموش کردن' : 'روشن کردن'}
                  >
                    <i className={`fa-solid ${savingKey === feature.key ? 'fa-spinner fa-spin' : feature.enabled ? 'fa-toggle-on' : 'fa-toggle-off'}`} />
                    {feature.enabled ? 'فعال' : 'خاموش'}
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={`smart-ai-status-chip inline-flex h-7 items-center gap-1.5 rounded-xl border px-2.5 text-[10px] font-black ${meta.cls}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                    <i className={`fa-solid ${meta.icon}`} />
                    {feature.enabled ? (feature.statusLabel || meta.label) : 'خاموش'}
                  </span>
                  <span className="inline-flex h-7 items-center rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-[10px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                    {feature.requiresLearning ? `شروع از ${Number(feature.minimum || 40).toLocaleString('fa-IR')}٪` : 'بدون آموزش سنگین'}
                  </span>
                </div>

                {feature.requiresLearning ? (
                  <div className="mt-3 rounded-[20px] border border-slate-200/80 bg-slate-50/75 p-3 dark:border-slate-800 dark:bg-slate-950/45">
                    <div className="mb-2 flex items-center justify-between text-[11px] font-black text-slate-600 dark:text-slate-300">
                      <span>{feature.progressLabel || 'پیشرفت یادگیری'}</span>
                      <span>{progress.toLocaleString('fa-IR')}٪</span>
                    </div>
                    <div className="smart-ai-progress-track h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div className="smart-ai-progress-fill h-full rounded-full bg-gradient-to-l from-indigo-500 to-emerald-500 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    {(feature.signals || []).length ? (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {(feature.signals || []).slice(0, 4).map((s, i) => (
                          <div key={`${feature.key}-${i}`} className="smart-ai-signal-card rounded-xl border border-white/70 bg-white px-2.5 py-2 text-[10px] font-black dark:border-slate-800 dark:bg-slate-900">
                            <div className="text-slate-400">{s.label}</div>
                            <div className="mt-1 truncate text-slate-800 dark:text-white">{String(s.value)}</div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="smart-ai-guide mt-3 rounded-[20px] border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-200">
                      <i className="fa-solid fa-circle-info" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-[11px] font-black text-slate-800 dark:text-slate-100">{learningGuide.title}</div>
                      <p className="mt-1 text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400">{learningGuide.body}</p>
                    </div>
                  </div>
                </div>

                {feature.impact ? (
                  <div className="mt-3 rounded-[20px] border border-slate-200/80 bg-slate-50/75 p-3 dark:border-slate-800 dark:bg-slate-950/45">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-black text-slate-400">شاخص اثر</div>
                        <div className="mt-1 text-xs font-black text-slate-800 dark:text-white">{feature.impact.valueLabel || 'در حال سنجش'}</div>
                      </div>
                      <span className="inline-flex h-8 items-center rounded-xl bg-slate-950 px-3 text-xs font-black text-white dark:bg-white dark:text-slate-950">{clamp(feature.impact.valueScore).toLocaleString('fa-IR')}٪</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] font-black">
                      <div className="rounded-xl bg-white px-2.5 py-2 dark:bg-slate-900"><div className="text-slate-400">استفاده</div><div className="mt-1 text-slate-900 dark:text-white">{num(feature.impact.usageCount).toLocaleString('fa-IR')}</div></div>
                      <div className="rounded-xl bg-white px-2.5 py-2 dark:bg-slate-900"><div className="text-slate-400">اثر تخمینی</div><div className={num(feature.impact.estimatedImpact) >= 0 ? 'mt-1 text-emerald-700 dark:text-emerald-300' : 'mt-1 text-rose-700 dark:text-rose-300'}>{money(feature.impact.estimatedImpact)}</div></div>
                      <div className="rounded-xl bg-white px-2.5 py-2 dark:bg-slate-900"><div className="text-slate-400">نتیجه مثبت</div><div className="mt-1 text-slate-900 dark:text-white">{num(feature.impact.positiveCount).toLocaleString('fa-IR')}</div></div>
                      <div className="rounded-xl bg-white px-2.5 py-2 dark:bg-slate-900"><div className="text-slate-400">آخرین استفاده</div><div className="mt-1 text-slate-900 dark:text-white">{shortDate(feature.impact.lastUsedAt)}</div></div>
                    </div>
                    {feature.impact.recommendation ? <p className="mt-2 text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400">{feature.impact.recommendation}</p> : null}
                  </div>
                ) : null}

                {feature.autoPause ? (
                  <div className={`mt-3 rounded-[20px] border p-3 ${feature.autoPause.level === 'pause' ? 'border-rose-200 bg-rose-50/80 dark:border-rose-500/30 dark:bg-rose-500/10' : feature.autoPause.level === 'watch' ? 'border-amber-200 bg-amber-50/80 dark:border-amber-500/30 dark:bg-amber-500/10' : 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/25 dark:bg-emerald-500/10'}`}>
                    <div className="text-[11px] font-black text-slate-800 dark:text-slate-100"><i className="fa-solid fa-circle-pause ml-1" />Auto Pause</div>
                    <div className="mt-1 text-xs font-black text-slate-900 dark:text-white">{feature.autoPause.title}</div>
                    <p className="mt-1 text-[11px] font-bold leading-5 text-slate-600 dark:text-slate-300">{feature.autoPause.reason}</p>
                    {feature.autoPause.shouldSuggestPause ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button type="button" size="xs" variant="danger" onClick={() => void toggle(feature)} disabled={savingKey === feature.key} leftIcon={<i className="fa-solid fa-power-off" />}>خاموش کن</Button>
                        <Button type="button" size="xs" variant="ghost" onClick={() => void dismissAutoPause(feature)} disabled={savingKey === feature.key} leftIcon={<i className="fa-solid fa-clock" />}>فعلاً نه</Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
