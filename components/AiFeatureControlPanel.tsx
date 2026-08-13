import React from 'react';
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

type AiFeatureAutoPause = {
  level?: 'ok' | 'watch' | 'pause' | 'off' | string;
  shouldSuggestPause?: boolean;
  title?: string;
  reason?: string;
  suggestedAction?: string;
  dismissedUntil?: string | null;
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
  autoPause?: AiFeatureAutoPause;
  configUpdatedAt?: string | null;
};

type AiFeatureRuntimePayload = {
  features?: AiFeatureRow[];
  generatedAt?: string | null;
  latestDataAt?: string | null;
  source?: string;
  permissions?: { canManage?: boolean };
  safety?: {
    advisoryOnly?: boolean;
    productionInferenceEnabled?: boolean;
    automaticDecisioningEnabled?: boolean;
    automaticBusinessMutationEnabled?: boolean;
  };
  sourceSummary?: {
    featureConfigs?: number;
    impactEvents?: number;
    decisionMemory?: number;
    activePauseReviews?: number;
  };
};

type Props = {
  onNotice?: (message: { type: 'success' | 'error' | 'info'; text: string }) => void;
};

const statusMeta: Record<string, { label: string; cls: string; dot: string; icon: string }> = {
  disabled: {
    label: 'خاموش',
    cls: 'border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
    dot: 'bg-slate-400',
    icon: 'fa-power-off',
  },
  insufficient: {
    label: 'داده ناکافی',
    cls: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200',
    dot: 'bg-rose-500',
    icon: 'fa-triangle-exclamation',
  },
  learning: {
    label: 'در حال تکمیل داده',
    cls: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
    dot: 'bg-amber-500',
    icon: 'fa-database',
  },
  ready: {
    label: 'آماده استفاده',
    cls: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
    dot: 'bg-emerald-500',
    icon: 'fa-circle-check',
  },
  excellent: {
    label: 'داده بالغ',
    cls: 'border-primary/20 bg-primary/5 text-primary',
    dot: 'bg-primary',
    icon: 'fa-gauge-high',
  },
};

const clamp = (value: unknown) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
const num = (value: unknown) => (Number.isFinite(Number(value)) ? Number(value) : 0);

const normalizeRuntimeTimestamp = (value?: string | null) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)) return `${raw.replace(' ', 'T')}Z`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw}T12:00:00Z`;
  return raw;
};

const formatSmartDate = (value?: string | null, includeTime = false) => {
  const normalized = normalizeRuntimeTimestamp(value);
  if (!normalized) return 'ثبت نشده';
  const date = new Date(normalized);
  if (!Number.isFinite(date.getTime())) return 'تاریخ نامعتبر';
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
};

const learningGuideByFeature: Record<string, { title: string; body: string }> = {
  decision_memory: {
    title: 'حافظه تصمیمات',
    body: 'نتیجه اقدام‌های واقعی، تأییدها و ردها را نگه می‌دارد تا اولویت‌بندی‌های بعدی با رفتار فروشگاه هماهنگ‌تر شوند.',
  },
  today_actions: {
    title: 'اولویت روزانه',
    body: 'فروش، وصول، سود و کالاهای کم‌تحرک را از داده‌های ثبت‌شده مرتب می‌کند؛ درصد این کارت آمادگی داده است، نه دقت یک مدل.',
  },
  forecast: {
    title: 'پیش‌بینی فروش و خرید',
    body: 'تاریخچه فروش، روزهای فعال و تنوع کالاهای فروخته‌شده را برای سنجش آمادگی پیشنهاد خرید مجدد بررسی می‌کند.',
  },
  hidden_profit: {
    title: 'کشف سود پنهان',
    body: 'بهای خرید، فروش و ترکیب اقلام را برای یافتن فرصت‌های سودآور بررسی می‌کند و هیچ قیمت یا فاکتوری را خودکار تغییر نمی‌دهد.',
  },
  audit_radar: {
    title: 'کنترل قانون‌محور',
    body: 'بر اساس قواعد قطعی مانند فروش زیر قیمت خرید، سود منفی و تخفیف غیرعادی کار می‌کند و وابسته به آموزش مدل نیست.',
  },
  customer_intelligence: {
    title: 'شناخت مشتری',
    body: 'تعداد مشتری، سابقه خرید و روزهای فعالیت را برای آماده‌سازی تحلیل ریسک و ارزش مشتری استفاده می‌کند.',
  },
  auto_pricing: {
    title: 'قیمت‌گذاری مشاوره‌ای',
    body: 'فقط پیشنهاد ارائه می‌کند. اعمال قیمت نیازمند اقدام صریح کاربر است و production inference یا تغییر خودکار قیمت فعال نیست.',
  },
  sales_agent: {
    title: 'دستیار فروش',
    body: 'از مشتریان، فاکتورها و تصمیم‌های ثبت‌شده برای اولویت‌بندی پیگیری استفاده می‌کند؛ ارسال یا اقدام نهایی همچنان دستی است.',
  },
  profit_engine: {
    title: 'موتور سود واقعی',
    body: 'از بهای خرید و snapshotهای واقعی سود استفاده می‌کند. این بخش محاسبات تجاری موجود را نمایش می‌دهد و مدل ML جدیدی اجرا نمی‌کند.',
  },
};

const getLearningGuide = (feature: AiFeatureRow) =>
  learningGuideByFeature[feature.key] || {
    title: 'منطق محاسبه',
    body: feature.description || 'این قابلیت از داده‌های واقعی همان بخش استفاده می‌کند و خروجی آن صرفاً مشاوره‌ای است.',
  };

const sourceLabel = (source?: string) =>
  source === 'sqlite-business-records' ? 'داده واقعی SQLite' : 'منبع داده نامشخص';

const FeatureMetric: React.FC<{ label: string; value: React.ReactNode; icon: string }> = ({ label, value, icon }) => (
  <div className="min-w-0 rounded-[14px] border border-slate-200/75 bg-white/80 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-950/55">
    <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 dark:text-slate-400">
      <i className={`fa-solid ${icon} text-primary`} />
      {label}
    </div>
    <div className="mt-1 truncate text-[11px] font-black text-slate-900 dark:text-white">{value}</div>
  </div>
);

export default function AiFeatureControlPanel({ onNotice }: Props) {
  const [features, setFeatures] = React.useState<AiFeatureRow[]>([]);
  const [runtime, setRuntime] = React.useState<AiFeatureRuntimePayload>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [savingKey, setSavingKey] = React.useState<string | null>(null);

  const applyPayload = React.useCallback((payload: AiFeatureRuntimePayload) => {
    setFeatures(Array.isArray(payload.features) ? payload.features : []);
    setRuntime(payload || {});
  }, []);

  const load = React.useCallback(async (showNotice = false) => {
    setLoading(true);
    setError('');
    try {
      const response = await apiFetch('/api/ai/features', { cache: 'no-store' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.success === false) {
        throw new Error(result?.message || 'دریافت وضعیت هوشمندسازی انجام نشد.');
      }
      applyPayload(result?.data || {});
      if (showNotice) onNotice?.({ type: 'success', text: 'داده‌های هوشمندسازی از پایگاه داده به‌روزرسانی شد.' });
    } catch (caught: any) {
      const message = String(caught?.message || 'دریافت وضعیت هوشمندسازی انجام نشد.');
      setError(message);
      onNotice?.({ type: 'error', text: message });
    } finally {
      setLoading(false);
    }
  }, [applyPayload, onNotice]);

  React.useEffect(() => {
    void load(false);
  }, [load]);

  const enabledCount = React.useMemo(() => features.filter((feature) => feature.enabled).length, [features]);
  const dataDependentCount = React.useMemo(() => features.filter((feature) => feature.requiresLearning).length, [features]);
  const readyCount = React.useMemo(
    () => features.filter((feature) => feature.enabled && (!feature.requiresLearning || ['ready', 'excellent'].includes(String(feature.status)))).length,
    [features],
  );
  const measuredFeatures = React.useMemo(
    () => features.filter((feature) => num(feature.impact?.usageCount) > 0),
    [features],
  );
  const measuredImpactAverage = React.useMemo(
    () => measuredFeatures.length
      ? Math.round(measuredFeatures.reduce((sum, feature) => sum + clamp(feature.impact?.valueScore), 0) / measuredFeatures.length)
      : 0,
    [measuredFeatures],
  );
  const totalUsage = React.useMemo(
    () => features.reduce((sum, feature) => sum + num(feature.impact?.usageCount), 0),
    [features],
  );
  const canManage = runtime.permissions?.canManage === true;

  const dismissAutoPause = async (feature: AiFeatureRow) => {
    if (!canManage || savingKey) return;
    setSavingKey(feature.key);
    try {
      const response = await apiFetch('/api/ai/features/auto-pause/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: feature.key, days: 14 }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.success === false) throw new Error(result?.message || 'ثبت پایش انجام نشد.');
      applyPayload(result?.data || {});
      onNotice?.({ type: 'info', text: `پیشنهاد توقف «${feature.title}» برای ۱۴ روز پنهان شد.` });
    } catch (caught: any) {
      onNotice?.({ type: 'error', text: String(caught?.message || 'ثبت پایش انجام نشد.') });
    } finally {
      setSavingKey(null);
    }
  };

  const toggle = async (feature: AiFeatureRow) => {
    if (!canManage || savingKey) return;
    const nextEnabled = !feature.enabled;
    setSavingKey(feature.key);
    try {
      const response = await apiFetch('/api/ai/features/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: feature.key, enabled: nextEnabled }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.success === false) throw new Error(result?.message || 'ذخیره وضعیت انجام نشد.');
      applyPayload(result?.data || {});
      onNotice?.({
        type: 'success',
        text: nextEnabled
          ? `«${feature.title}» فعال شد.`
          : `«${feature.title}» خاموش شد و محاسبات آن متوقف می‌شود.`,
      });
      window.dispatchEvent(new CustomEvent('kourosh:ai-features-updated', {
        detail: { key: feature.key, enabled: nextEnabled },
      }));
    } catch (caught: any) {
      onNotice?.({ type: 'error', text: String(caught?.message || 'ذخیره تنظیمات هوشمندسازی انجام نشد.') });
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div
      dir="rtl"
      className="settings-smart-redesign-v2 space-y-4"
      data-ui-smart-redesign="v2"
      data-ui-smart-source={runtime.source || 'unknown'}
    >
      <section className="overflow-hidden rounded-[24px] border border-slate-200/85 bg-white/95 shadow-[0_18px_48px_-42px_rgba(15,23,42,0.32)] dark:border-slate-800 dark:bg-slate-950/82">
        <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start" data-ui-settings-grid="cards">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-grid h-11 w-11 shrink-0 place-items-center rounded-[16px] border border-primary/15 bg-primary/10 text-primary">
              <i className="fa-solid fa-microchip text-[15px]" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[20px] font-black tracking-[-0.02em] text-slate-950 dark:text-white">
                  مرکز هوشمندسازی فروشگاه
                </h2>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                  <i className="fa-solid fa-shield-halved" />
                  صرفاً مشاوره‌ای
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  <i className="fa-solid fa-database" />
                  {sourceLabel(runtime.source)}
                </span>
              </div>
              <p className="mt-1.5 max-w-3xl text-[12px] leading-6 text-slate-500 dark:text-slate-400">
                وضعیت ماژول‌های قانون‌محور و مشاوره‌ای بر اساس رکوردهای واقعی فروشگاه نمایش داده می‌شود. درصدها شاخص آمادگی داده هستند و به معنی دقت مدل ML نیستند.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                <span><i className="fa-solid fa-clock-rotate-left ml-1 text-primary" />آخرین همگام‌سازی: {formatSmartDate(runtime.generatedAt, true)}</span>
                <span><i className="fa-solid fa-layer-group ml-1 text-primary" />آخرین تغییر داده: {formatSmartDate(runtime.latestDataAt, true)}</span>
                <span><i className="fa-solid fa-user-shield ml-1 text-primary" />دسترسی: {canManage ? 'مدیریت و مشاهده' : 'فقط مشاهده'}</span>
              </div>
            </div>
          </div>

          <Button
            type="button"
            size="xs"
            variant="secondary"
            onClick={() => void load(true)}
            disabled={loading || Boolean(savingKey)}
            leftIcon={<i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''}`} />}
            className="settings-smart-action"
          >
            بروزرسانی داده
          </Button>
        </div>

        <div className="grid gap-2.5 border-t border-slate-200/75 bg-slate-50/55 p-4 dark:border-slate-800 dark:bg-slate-900/35 sm:grid-cols-2 xl:grid-cols-4 sm:p-5" data-ui-settings-grid="cards">
          <FeatureMetric label="ماژول فعال" value={`${enabledCount.toLocaleString('fa-IR')} از ${features.length.toLocaleString('fa-IR')}`} icon="fa-toggle-on" />
          <FeatureMetric label="آماده استفاده" value={readyCount.toLocaleString('fa-IR')} icon="fa-circle-check" />
          <FeatureMetric label="ماژول دارای شواهد" value={measuredFeatures.length.toLocaleString('fa-IR')} icon="fa-chart-simple" />
          <FeatureMetric label="میانگین ارزش سنجیده‌شده" value={measuredFeatures.length ? `${measuredImpactAverage.toLocaleString('fa-IR')}٪` : 'بدون داده'} icon="fa-gauge-high" />
        </div>

        <div className="border-t border-slate-200/75 px-4 py-3 dark:border-slate-800 sm:px-5">
          <div className="grid gap-2 text-[10px] leading-5 text-slate-600 dark:text-slate-300 md:grid-cols-3" data-ui-settings-grid="cards">
            <div className="flex items-start gap-2 rounded-[14px] border border-emerald-200 bg-emerald-50/75 px-3 py-2 dark:border-emerald-900/60 dark:bg-emerald-950/25">
              <i className="fa-solid fa-check mt-1 text-emerald-600" />
              <span>production inference، تصمیم‌گیری خودکار و تغییر خودکار داده‌های تجاری غیرفعال هستند.</span>
            </div>
            <div className="flex items-start gap-2 rounded-[14px] border border-slate-200 bg-slate-50/75 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/55">
              <i className="fa-solid fa-database mt-1 text-primary" />
              <span>{num(runtime.sourceSummary?.decisionMemory).toLocaleString('fa-IR')} تصمیم و {num(runtime.sourceSummary?.impactEvents).toLocaleString('fa-IR')} رویداد اثر از SQLite خوانده شد.</span>
            </div>
            <div className="flex items-start gap-2 rounded-[14px] border border-slate-200 bg-slate-50/75 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/55">
              <i className="fa-solid fa-circle-info mt-1 text-primary" />
              <span>{dataDependentCount.toLocaleString('fa-IR')} ماژول برای ارائه خروجی بهتر به داده بیشتر وابسته‌اند؛ این وضعیت آموزش مدل تولیدی نیست.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200/85 bg-white/95 p-4 shadow-[0_18px_48px_-42px_rgba(15,23,42,0.32)] dark:border-slate-800 dark:bg-slate-950/82 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[10px] font-black tracking-[0.14em] text-primary">SMART MODULES</div>
            <h3 className="mt-1 text-[16px] font-black text-slate-950 dark:text-white">ماژول‌های هوشمند و آمادگی داده</h3>
            <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">فعال یا خاموش‌کردن، فقط محاسبات و نمایش همان ماژول را کنترل می‌کند؛ هیچ فرایند ML جدیدی شروع نمی‌شود.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-black text-slate-500 dark:text-slate-400">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 dark:border-slate-700 dark:bg-slate-900">{totalUsage.toLocaleString('fa-IR')} شاهد/استفاده</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 dark:border-slate-700 dark:bg-slate-900">{num(runtime.sourceSummary?.activePauseReviews).toLocaleString('fa-IR')} پایش تعویق‌شده</span>
          </div>
        </div>

        {loading && features.length === 0 ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2" aria-label="در حال دریافت ماژول‌های هوشمندسازی" data-ui-settings-grid="cards">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-[220px] animate-pulse rounded-[20px] border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/55" />
            ))}
          </div>
        ) : error && features.length === 0 ? (
          <div className="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 p-4 text-center dark:border-rose-900/60 dark:bg-rose-950/25">
            <div className="text-[13px] font-black text-rose-700 dark:text-rose-300">داده‌های هوشمندسازی دریافت نشد</div>
            <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-300">{error}</p>
            <Button type="button" size="xs" variant="secondary" onClick={() => void load(false)} className="settings-smart-action mt-3" leftIcon={<i className="fa-solid fa-rotate" />}>
              تلاش دوباره
            </Button>
          </div>
        ) : features.length === 0 ? (
          <div className="mt-4 rounded-[18px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900/55">
            <i className="fa-solid fa-microchip text-2xl text-slate-400" />
            <p className="mt-3 text-[13px] font-black text-slate-700 dark:text-slate-200">ماژولی برای نمایش ثبت نشده است.</p>
          </div>
        ) : (
          <div className="mt-4 grid items-start gap-3 lg:grid-cols-2" data-ui-settings-grid="cards">
            {features.map((feature) => {
              const progress = clamp(feature.progress);
              const meta = statusMeta[feature.enabled ? String(feature.status || 'insufficient') : 'disabled'] || statusMeta.insufficient;
              const guide = getLearningGuide(feature);
              const impactUsage = num(feature.impact?.usageCount);
              const autoPauseLevel = String(feature.autoPause?.level || 'ok');
              const pauseTone = autoPauseLevel === 'pause'
                ? 'border-rose-200 bg-rose-50/75 dark:border-rose-900/60 dark:bg-rose-950/25'
                : autoPauseLevel === 'watch'
                  ? 'border-amber-200 bg-amber-50/75 dark:border-amber-900/60 dark:bg-amber-950/25'
                  : 'border-slate-200 bg-slate-50/72 dark:border-slate-800 dark:bg-slate-900/50';

              return (
                <article
                  key={feature.key}
                  className="settings-smart-feature-card min-w-0 rounded-[20px] border border-slate-200/80 bg-slate-50/45 p-3.5 dark:border-slate-800 dark:bg-slate-900/32 sm:p-4"
                  data-ui-smart-feature={feature.key}
                  data-enabled={feature.enabled ? 'true' : 'false'}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <span className={`inline-grid h-9 w-9 shrink-0 place-items-center rounded-[13px] border ${feature.enabled ? 'border-primary/15 bg-primary/10 text-primary' : 'border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800'}`}>
                        <i className={`fa-solid ${feature.icon || 'fa-microchip'} text-[13px]`} />
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-[14px] font-black text-slate-950 dark:text-white">{feature.title}</h4>
                        <p className="mt-1 text-[10.5px] leading-5 text-slate-500 dark:text-slate-400">{feature.description}</p>
                      </div>
                    </div>

                    {canManage ? (
                      <Button
                        type="button"
                        size="xs"
                        variant={feature.enabled ? 'primary' : 'secondary'}
                        onClick={() => void toggle(feature)}
                        disabled={savingKey === feature.key || Boolean(savingKey && savingKey !== feature.key)}
                        autoIcon={false}
                        className="settings-smart-toggle shrink-0"
                        aria-pressed={feature.enabled}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${feature.enabled ? 'bg-white' : 'bg-slate-400'}`} />
                          {savingKey === feature.key ? 'در حال ذخیره' : feature.enabled ? 'فعال' : 'خاموش'}
                        </span>
                      </Button>
                    ) : (
                      <span className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[9px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                        فقط مشاهده
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[9.5px] font-black ${meta.cls}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                      <i className={`fa-solid ${meta.icon}`} />
                      {feature.enabled ? meta.label : 'خاموش'}
                    </span>
                    <span className="inline-flex h-7 items-center rounded-full border border-slate-200 bg-white px-2.5 text-[9.5px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                      {feature.requiresLearning ? `حد شروع ${num(feature.minimum || 40).toLocaleString('fa-IR')}٪` : 'قانون‌محور'}
                    </span>
                    <span className="inline-flex h-7 items-center rounded-full border border-slate-200 bg-white px-2.5 text-[9.5px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                      بروزرسانی {formatSmartDate(feature.configUpdatedAt)}
                    </span>
                  </div>

                  <div className="mt-3 rounded-[16px] border border-slate-200/75 bg-white/75 p-3 dark:border-slate-800 dark:bg-slate-950/48">
                    <div className="flex items-center justify-between gap-3 text-[10px] font-black text-slate-600 dark:text-slate-300">
                      <span>{feature.requiresLearning ? (feature.progressLabel || 'آمادگی داده') : 'آمادگی اجرای قواعد'}</span>
                      <span className="text-primary">{progress.toLocaleString('fa-IR')}٪</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${progress}%` }} />
                    </div>
                    {(feature.signals || []).length ? (
                      <div className="mt-2.5 grid gap-2 sm:grid-cols-3" data-ui-settings-grid="cards">
                        {(feature.signals || []).slice(0, 3).map((signal, index) => (
                          <div key={`${feature.key}-${index}`} className="min-w-0 rounded-[12px] bg-slate-50 px-2.5 py-2 dark:bg-slate-900/75">
                            <div className="truncate text-[8.5px] font-black text-slate-400">{signal.label}</div>
                            <div className="mt-1 truncate text-[10.5px] font-black text-slate-800 dark:text-white">{String(signal.value)}</div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" data-ui-settings-grid="cards">
                    <FeatureMetric label="شاهد/استفاده" value={impactUsage.toLocaleString('fa-IR')} icon="fa-wave-pulse" />
                    <FeatureMetric label="موفق" value={num(feature.impact?.successCount).toLocaleString('fa-IR')} icon="fa-check" />
                    <FeatureMetric label="نتیجه مثبت" value={num(feature.impact?.positiveCount).toLocaleString('fa-IR')} icon="fa-thumbs-up" />
                    <FeatureMetric label="آخرین استفاده" value={formatSmartDate(feature.impact?.lastUsedAt)} icon="fa-calendar-day" />
                  </div>

                  <div className="mt-3 rounded-[15px] border border-primary/12 bg-primary/[0.035] px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <i className="fa-solid fa-circle-info mt-1 text-[10px] text-primary" />
                      <div className="min-w-0">
                        <div className="text-[10px] font-black text-slate-800 dark:text-slate-100">{guide.title}</div>
                        <p className="mt-0.5 text-[10px] leading-5 text-slate-500 dark:text-slate-400">{guide.body}</p>
                      </div>
                    </div>
                  </div>

                  <div className={`mt-3 rounded-[15px] border px-3 py-2.5 ${pauseTone}`}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="text-[9px] font-black text-slate-500 dark:text-slate-400">پایش توقف خودکار</div>
                        <div className="mt-0.5 text-[10.5px] font-black text-slate-900 dark:text-white">{feature.autoPause?.title || 'وضعیت پایش ثبت نشده'}</div>
                        <p className="mt-0.5 text-[9.5px] leading-5 text-slate-600 dark:text-slate-300">{feature.autoPause?.reason || 'هنوز سیگنال کافی برای ارزیابی توقف وجود ندارد.'}</p>
                        {feature.autoPause?.dismissedUntil ? (
                          <p className="mt-1 text-[9px] font-black text-amber-700 dark:text-amber-300">پنهان تا {formatSmartDate(feature.autoPause.dismissedUntil, true)}</p>
                        ) : null}
                      </div>
                      {feature.autoPause?.shouldSuggestPause && canManage ? (
                        <div className="flex shrink-0 flex-wrap gap-1.5">
                          <Button type="button" size="xs" variant="danger" onClick={() => void toggle(feature)} disabled={savingKey === feature.key} className="settings-smart-action" autoIcon={false}>
                            خاموش‌کردن
                          </Button>
                          <Button type="button" size="xs" variant="secondary" onClick={() => void dismissAutoPause(feature)} disabled={savingKey === feature.key} className="settings-smart-action" autoIcon={false}>
                            ۱۴ روز بعد
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {feature.impact?.recommendation ? (
                    <p className="mt-2 text-[9.5px] leading-5 text-slate-500 dark:text-slate-400">
                      <strong className="text-slate-700 dark:text-slate-200">نتیجه پایش:</strong> {feature.impact.recommendation}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
