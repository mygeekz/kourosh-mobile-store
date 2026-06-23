import { Link } from 'react-router-dom';
import type { GetDecisionActionState, GetDecisionStatusMeta, LocalizedNumberParser, MoneyFormatter, NumberFormatter, PercentFormatter, ProfitSignalMode, SeverityMetaMap, ShamsiFormatter, SmartInsightLike, SmartInsightMetric, UpdateDecisionMemory } from './types/smartInsightContracts';

type ProfitSignalModalProps = {
  mode: ProfitSignalMode;
  selected: SmartInsightLike;
  payload: Record<string, unknown>;
  actingInsightId: string | null;
  onClose: () => void;
  money: MoneyFormatter;
  percent: PercentFormatter;
  num: NumberFormatter;
  shamsi: ShamsiFormatter;
  parseLocalizedNumber: LocalizedNumberParser;
  severityMeta: SeverityMetaMap;
  getDecisionStatusMeta: GetDecisionStatusMeta;
  getDecisionActionState: GetDecisionActionState;
  updateDecisionMemory: UpdateDecisionMemory;
};

type ProfitCardItem = {
  label: string;
  value: string;
  tone: string;
  icon: string;
};

export default function ProfitSignalModal({
  mode,
  selected,
  payload,
  actingInsightId,
  onClose,
  money,
  percent,
  num,
  shamsi,
  severityMeta,
  parseLocalizedNumber,
  getDecisionStatusMeta,
  getDecisionActionState,
  updateDecisionMemory,
}: ProfitSignalModalProps) {
  const safeSeverityMeta = severityMeta || {};
  const metrics = Array.isArray(selected.metrics) ? selected.metrics : [];
  const reasons = Array.isArray(selected.reasons) ? selected.reasons : [];
  const actions = Array.isArray(selected.actions) ? selected.actions : [];
  const safePayload = payload || {};
  const supportedFallbackIcons = new Set([
    'fa-sack-dollar',
    'fa-coins',
    'fa-credit-card',
    'fa-chart-line',
    'fa-percent',
    'fa-triangle-exclamation',
    'fa-hourglass-half',
    'fa-shield-halved',
    'fa-chart-simple',
    'fa-chart-pie',
    'fa-circle-info',
    'fa-brain',
    'fa-route',
    'fa-calendar-days',
    'fa-rotate',
    'fa-clipboard-check',
    'fa-circle-nodes',
    'fa-wand-magic-sparkles',
    'fa-compass',
    'fa-database',
    'fa-ban',
    'fa-arrow-left',
    'fa-check',
  ]);
  const iconAliasMap: Record<string, string> = {
    'fa-sack-dollar': 'fa-sack-dollar',
    'fa-money-bill-trend-up': 'fa-sack-dollar',
    'fa-chart-mixed': 'fa-chart-line',
    'fa-chart-simple': 'fa-chart-line',
    'fa-chart-line': 'fa-chart-line',
    'fa-analytics': 'fa-chart-line',
    'fa-credit-card': 'fa-credit-card',
    'fa-money-check-dollar': 'fa-credit-card',
  };
  const normalizeFaIcon = (icon: unknown, fallback: string) => {
    const value = String(icon || '').trim();
    if (!value) return fallback;
    if (value === 'fa-sack-dollar' || value === 'fa-chart-line' || value === 'fa-compass-drafting') return fallback;
    return supportedFallbackIcons.has(value) || value.startsWith('fa-') ? value : fallback;
  };

  const normalizeMetricLabel = (value: string) => String(value || '').replace(/‌/g, ' ').replace(/\s+/g, ' ').trim();
  const metricMatches = (metric: SmartInsightMetric | undefined, matchers: string[]) => matchers.some((matcher) => normalizeMetricLabel(String(metric?.label || '')).includes(matcher));
  const findMetric = (matchers: string[]) => metrics.find((metric) => metricMatches(metric, matchers));

  const metricDisplay = (metric: SmartInsightMetric | undefined, kind: 'money' | 'percent' | 'plain' = 'plain') => {
    if (!metric) return kind === 'money' ? money(0) : '—';
    if (typeof metric.value === 'number') {
      if (kind === 'money') return money(metric.value);
      if (kind === 'percent') return percent(metric.value);
      return String(metric.value);
    }
    const raw = String(metric.value || '—');
    if (kind === 'money') {
      if (/تومان|ریال/.test(raw)) return raw;
      const parsed = parseLocalizedNumber(raw);
      return Number.isFinite(parsed) ? money(parsed) : raw;
    }
    if (kind === 'percent') {
      if (/%/.test(raw)) return raw;
      const parsed = parseLocalizedNumber(raw);
      return Number.isFinite(parsed) ? percent(parsed) : raw;
    }
    return raw;
  };

  const pickMetricIcon = (metric: SmartInsightMetric | undefined, fallback: string) => normalizeFaIcon(metric?.icon, fallback);
  const pickMetricLabel = (metric: SmartInsightMetric | undefined, fallback: string) => String(metric?.label || fallback);

  const realProfitMetric = findMetric(['سود واقعی', 'سود بازه']);
  const estimatedProfitMetric = findMetric(['سود کل', 'سود برآوردی', 'سود شناسایی']);
  const receivedProfitMetric = findMetric(['سود وصول‌شده', 'سود وصول شده']);
  const unreceivedProfitMetric = findMetric(['سود وصول‌نشده', 'سود وصول نشده']);
  const riskAmountMetric = findMetric(['در خطر', 'سود در خطر', 'سود/خطر', 'خطر/وصول‌نشده', 'خطر/وصول نشده']);
  const receivedRateMetric = findMetric(['نرخ سود وصول', 'نرخ وصول', 'نرخ سود وصول‌شده', 'نرخ سود وصول شده']);
  const marginMetric = findMetric(['حاشیه سود', 'حاشیه']);
  const qualityMetric = findMetric(['کیفیت سود']);

  const statusMeta = getDecisionStatusMeta(selected.decision);
  const repeatedCount = num(selected.decision?.occurrenceCount);
  const lastSeenAt = selected.decision?.lastGeneratedAt || selected.decision?.firstGeneratedAt || selected.createdAt || safePayload.generatedAt;
  const lastSeenLabel = shamsi(lastSeenAt);
  const actionableRoutes = actions.filter((action) => !!action.to).slice(0, 3);
  const profitActionState = getDecisionActionState(selected);

  const headerCopy = mode === 'real_profit'
    ? {
        kicker: 'REAL PROFIT ENGINE',
        kickerIcon: normalizeFaIcon(selected.icon, 'fa-sack-dollar'),
        category: selected.category || 'سود واقعی',
        title: selected.title || 'موتور سود واقعی، نقاط حساس سود را پیدا کرد',
        summary: selected.summary || 'سود واقعی بازه بعد از قیمت خرید، تخفیف و ریسک وصول محاسبه شده و نقاط حساس نیازمند بررسی شناسایی شده‌اند.',
        heroLabel: pickMetricLabel(realProfitMetric || estimatedProfitMetric, 'نمای اصلی سود'),
        heroIcon: pickMetricIcon(realProfitMetric || estimatedProfitMetric, 'fa-sack-dollar'),
        snapshotTitle: 'نقشه سود و ریسک',
        snapshotText: 'جمع‌بندی سریع از سود واقعی، مبلغ در خطر و حاشیه سود تا تصمیم مدیریتی دقیق‌تر انجام شود.',
        reasonsTitle: 'چرا این پیشنهاد؟',
        reasonsText: 'این دلایل مستقیم از بک‌اند برای همین Insight دریافت شده‌اند.',
        routesTitle: 'اقدام پیشنهادی',
        routesText: 'فقط مسیرهای واقعی ارسال‌شده از بک‌اند نمایش داده می‌شوند.',
      }
    : {
        kicker: 'PROFIT QUALITY ENGINE',
        kickerIcon: normalizeFaIcon(selected.icon, 'fa-chart-line'),
        category: selected.category || 'کیفیت سود',
        title: selected.title || 'کیفیت سود نیاز به کنترل دارد',
        summary: selected.summary || 'بخشی از سود این بازه هنوز وصول نشده و کیفیت سود برای تصمیم‌گیری مدیریتی نیازمند کنترل است.',
        heroLabel: pickMetricLabel(qualityMetric || marginMetric, 'وضعیت کیفی سود'),
        heroIcon: pickMetricIcon(qualityMetric || marginMetric, 'fa-chart-line'),
        snapshotTitle: 'تصویر مالی این هشدار',
        snapshotText: 'مرور سریع نسبت سود وصول‌شده، مبلغ معوق و کیفیت سود برای اینکه اقدام بعدی شفاف باشد.',
        reasonsTitle: 'چرا این پیشنهاد مهم است؟',
        reasonsText: 'این دلایل مستقیم از بک‌اند برای همین هشدار دریافت شده‌اند.',
        routesTitle: 'مسیر عملیاتی پیشنهادی',
        routesText: 'از مسیرهای واقعی داخل سیستم برای پیگیری این هشدار استفاده کن.',
      };

  const highlightCards: ProfitCardItem[] = mode === 'real_profit'
    ? [
        { label: pickMetricLabel(realProfitMetric || estimatedProfitMetric, 'سود واقعی'), value: metricDisplay(realProfitMetric || estimatedProfitMetric, 'money'), tone: 'emerald', icon: pickMetricIcon(realProfitMetric || estimatedProfitMetric, 'fa-sack-dollar') },
        { label: pickMetricLabel(estimatedProfitMetric || receivedProfitMetric, 'سود شناسایی‌شده'), value: metricDisplay(estimatedProfitMetric || receivedProfitMetric, 'money'), tone: 'sky', icon: pickMetricIcon(estimatedProfitMetric || receivedProfitMetric, 'fa-credit-card') },
        { label: pickMetricLabel(riskAmountMetric || unreceivedProfitMetric, 'سود در خطر'), value: metricDisplay(riskAmountMetric || unreceivedProfitMetric, 'money'), tone: 'amber', icon: pickMetricIcon(riskAmountMetric || unreceivedProfitMetric, 'fa-triangle-exclamation') },
        { label: pickMetricLabel(marginMetric || qualityMetric, 'حاشیه سود'), value: metricDisplay(marginMetric || qualityMetric, 'percent'), tone: 'violet', icon: pickMetricIcon(marginMetric || qualityMetric, 'fa-percent') },
      ]
    : [
        { label: pickMetricLabel(qualityMetric || marginMetric, 'کیفیت سود'), value: metricDisplay(qualityMetric || marginMetric, 'percent'), tone: 'violet', icon: pickMetricIcon(qualityMetric || marginMetric, 'fa-chart-line') },
        { label: pickMetricLabel(receivedProfitMetric, 'سود وصول‌شده'), value: metricDisplay(receivedProfitMetric, 'money'), tone: 'sky', icon: pickMetricIcon(receivedProfitMetric, 'fa-credit-card') },
        { label: pickMetricLabel(unreceivedProfitMetric || riskAmountMetric, 'سود وصول‌نشده'), value: metricDisplay(unreceivedProfitMetric || riskAmountMetric, 'money'), tone: 'amber', icon: pickMetricIcon(unreceivedProfitMetric || riskAmountMetric, 'fa-hourglass-half') },
        { label: pickMetricLabel(receivedRateMetric, 'نرخ سود وصول‌شده'), value: metricDisplay(receivedRateMetric, 'percent'), tone: 'emerald', icon: pickMetricIcon(receivedRateMetric, 'fa-percent') },
      ];

  const sidebarCards: ProfitCardItem[] = [
    { label: 'امتیاز', value: num(selected.score).toLocaleString('fa-IR'), icon: 'fa-chart-simple', tone: 'violet' },
    { label: 'اعتماد', value: percent(selected.confidence), icon: 'fa-shield-halved', tone: 'sky' },
    { label: 'دسته', value: headerCopy.category, icon: mode === 'real_profit' ? 'fa-sack-dollar' : 'fa-chart-line', tone: 'emerald' },
  ];

  const memoryCards = [
    { label: 'وضعیت', value: selected.decision?.statusLabel || statusMeta.label || 'باز', icon: 'fa-circle-nodes', tone: 'blue' },
    { label: 'تصمیم', value: selected.decision?.decisionLabel || 'در انتظار تصمیم', icon: 'fa-clipboard-check', tone: 'violet' },
    { label: 'دفعات تکرار', value: `${repeatedCount.toLocaleString('fa-IR')} بار`, icon: 'fa-rotate', tone: 'amber' },
    { label: 'آخرین شناسایی', value: lastSeenLabel, icon: 'fa-calendar-days', tone: 'emerald' },
  ];

  const featureMetrics = metrics.filter((metric) => ![
    realProfitMetric,
    estimatedProfitMetric,
    receivedProfitMetric,
    unreceivedProfitMetric,
    riskAmountMetric,
    receivedRateMetric,
    marginMetric,
    qualityMetric,
  ].includes(metric)).slice(0, 4);

  const numericSummaryCards = [
    ...(mode === 'real_profit'
      ? [
          { label: pickMetricLabel(realProfitMetric || estimatedProfitMetric, 'سود واقعی'), value: metricDisplay(realProfitMetric || estimatedProfitMetric, 'money'), icon: pickMetricIcon(realProfitMetric || estimatedProfitMetric, 'fa-sack-dollar') },
          { label: pickMetricLabel(riskAmountMetric || unreceivedProfitMetric, 'در خطر'), value: metricDisplay(riskAmountMetric || unreceivedProfitMetric, 'money'), icon: pickMetricIcon(riskAmountMetric || unreceivedProfitMetric, 'fa-triangle-exclamation') },
          { label: pickMetricLabel(qualityMetric || marginMetric, 'کیفیت سود'), value: metricDisplay(qualityMetric || marginMetric, 'percent'), icon: pickMetricIcon(qualityMetric || marginMetric, 'fa-chart-line') },
        ]
      : [
          { label: pickMetricLabel(receivedRateMetric, 'نرخ سود وصول‌شده'), value: metricDisplay(receivedRateMetric, 'percent'), icon: pickMetricIcon(receivedRateMetric, 'fa-percent') },
          { label: pickMetricLabel(receivedProfitMetric, 'سود وصول‌شده'), value: metricDisplay(receivedProfitMetric, 'money'), icon: pickMetricIcon(receivedProfitMetric, 'fa-credit-card') },
          { label: pickMetricLabel(unreceivedProfitMetric || riskAmountMetric, 'سود وصول‌نشده'), value: metricDisplay(unreceivedProfitMetric || riskAmountMetric, 'money'), icon: pickMetricIcon(unreceivedProfitMetric || riskAmountMetric, 'fa-hourglass-half') },
        ]),
    ...featureMetrics.map((metric, index) => ({
      label: String(metric.label || `شاخص ${index + 1}`),
      value: typeof metric.value === 'number' && /سود|مبلغ|خطر|فروش|بازه/.test(String(metric.label || '')) ? money(metric.value) : String(metric.value ?? '—'),
      icon: pickMetricIcon(metric, index === 0 ? 'fa-chart-column' : index === 1 ? 'fa-credit-card' : index === 2 ? 'fa-box-open' : 'fa-bolt'),
    })),
  ].slice(0, 6);

  const sectionHeads = {
    snapshot: { icon: 'fa-compass', title: headerCopy.snapshotTitle, text: headerCopy.snapshotText },
    numbers: { icon: 'fa-chart-pie', title: 'شاخص‌های عددی', text: 'مرور سریع عددهای اصلی با چیدمان افقی و خوانا.' },
    reasons: { icon: 'fa-circle-info', title: headerCopy.reasonsTitle, text: headerCopy.reasonsText },
    memory: { icon: 'fa-brain', title: 'حافظه تصمیم این پیشنهاد', text: 'سیستم نتیجه اجرای پیشنهاد را ثبت می‌کند تا یادگیری عملیاتی دقیق‌تر شود.' },
    routes: { icon: 'fa-route', title: headerCopy.routesTitle, text: headerCopy.routesText },
  };

  const selectedTarget = selected.target && typeof selected.target === 'object'
    ? selected.target as { name?: string; label?: string; productName?: string; customerName?: string }
    : {};

  return (
    <div className={`profit244-overlay profit244-overlay--${mode}`} onClick={() => onClose()}>
      <section className={`profit244-surface profit244-surface--${mode}`} onClick={(e) => e.stopPropagation()} dir="rtl">
        <header className="profit244-header">
          <div className="profit244-header__copy">
            <div className="profit244-header__eyebrow">
              <span className="profit244-header__kicker"><i className={`fa-solid ${headerCopy.kickerIcon}`} /> {headerCopy.kicker}</span>
              <span className={`profit244-severity profit244-severity--${selected.severity || 'medium'}`}><i className={`fa-solid ${normalizeFaIcon(safeSeverityMeta[selected.severity || 'medium']?.icon, 'fa-wand-magic-sparkles')}`} /> {safeSeverityMeta[selected.severity || 'medium']?.label || selected.severity || 'بینش'}</span>
            </div>
            <h2>{headerCopy.title}</h2>
            <p>{headerCopy.summary}</p>
          </div>
          <div className="profit244-header__hero-card">
            <span className="profit244-header__hero-icon"><i className={`fa-solid ${headerCopy.heroIcon}`} /></span>
            <small>{headerCopy.heroLabel}</small>
            <strong>{mode === 'real_profit' ? metricDisplay(realProfitMetric || estimatedProfitMetric, 'money') : metricDisplay(qualityMetric || marginMetric, 'percent')}</strong>
            <span>{selectedTarget.name || selectedTarget.label || selectedTarget.productName || selectedTarget.customerName || selected.category || 'Smart Insight'}</span>
          </div>
        </header>

        <div className="profit244-body">
          <main className="profit244-main">
            <section className="profit244-panel profit244-panel--hero">
              <div className="profit244-panel__head">
                <div className="profit244-panel__title-wrap">
                  <span className="profit244-panel__title-icon"><i className={`fa-solid ${sectionHeads.snapshot.icon}`} /></span>
                  <div>
                    <h3>{sectionHeads.snapshot.title}</h3>
                    <p>{sectionHeads.snapshot.text}</p>
                  </div>
                </div>
              </div>
              <div className="profit244-kpi-grid">
                {highlightCards.map((card) => (
                  <article key={card.label} className={`profit244-kpi profit244-kpi--${card.tone}`}>
                    <span className="profit244-kpi__icon"><i className={`fa-solid ${card.icon}`} /></span>
                    <small>{card.label}</small>
                    <strong>{card.value}</strong>
                  </article>
                ))}
              </div>
            </section>

            <section className="profit244-grid-2">
              <section className="profit244-panel">
                <div className="profit244-panel__head">
                  <div className="profit244-panel__title-wrap">
                    <span className="profit244-panel__title-icon"><i className={`fa-solid ${sectionHeads.numbers.icon}`} /></span>
                    <div>
                      <h3>{sectionHeads.numbers.title}</h3>
                      <p>{sectionHeads.numbers.text}</p>
                    </div>
                  </div>
                </div>
                <div className="profit244-stat-boxes">
                  {numericSummaryCards.map((item) => (
                    <article key={item.label} className="profit244-stat-box">
                      <span className="profit244-stat-box__icon"><i className={`fa-solid ${item.icon}`} /></span>
                      <small>{item.label}</small>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                </div>
              </section>

              <section className="profit244-panel">
                <div className="profit244-panel__head">
                  <div className="profit244-panel__title-wrap">
                    <span className="profit244-panel__title-icon"><i className={`fa-solid ${sectionHeads.reasons.icon}`} /></span>
                    <div>
                      <h3>{sectionHeads.reasons.title}</h3>
                      <p>{sectionHeads.reasons.text}</p>
                    </div>
                  </div>
                </div>
                <div className="profit244-reason-list">
                  {reasons.length ? (
                    reasons.slice(0, 5).map((reason, index) => (
                      <div key={`${reason}-${index}`} className="profit244-reason-item">
                        <span className="profit244-reason-item__icon"><i className="fa-solid fa-check" /></span>
                        <span>{reason}</span>
                      </div>
                    ))
                  ) : (
                    <div className="profit244-empty"><i className="fa-solid fa-database" /> برای این مورد دلیل تکمیلی از بک‌اند ثبت نشده است.</div>
                  )}
                </div>
              </section>
            </section>

            <section className="profit244-panel">
              <div className="profit244-panel__head">
                <div className="profit244-panel__title-wrap">
                  <span className="profit244-panel__title-icon"><i className={`fa-solid ${sectionHeads.routes.icon}`} /></span>
                  <div>
                    <h3>{sectionHeads.routes.title}</h3>
                    <p>{sectionHeads.routes.text}</p>
                  </div>
                </div>
              </div>
              <div className="profit244-route-list">
                {actionableRoutes.length ? actionableRoutes.map((action, index) => (
                  <Link key={`${action.label}-${index}`} to={action.to || '/reports'} className={index === 0 ? 'profit244-route profit244-route--primary' : 'profit244-route'}>
                    <i className={`fa-solid ${action.icon || 'fa-arrow-left'}`} />
                    <span>{action.label}</span>
                  </Link>
                )) : <div className="profit244-empty"><i className="fa-solid fa-database" /> مسیر واقعی برای این پیشنهاد از بک‌اند ارسال نشده است.</div>}
              </div>
              <div className="profit244-decision-row">
                <button type="button" disabled={profitActionState.isActing || profitActionState.isAccepted} onClick={() => void updateDecisionMemory(selected, { userDecision: 'accepted', status: 'open' })} className={`profit244-btn ${profitActionState.isAccepted ? 'profit244-btn--done' : 'profit244-btn--pending'}`}>
                  <i className={`fa-solid ${profitActionState.icon}`} />
                  {profitActionState.label}
                </button>
                <button type="button" disabled={actingInsightId === selected.id} onClick={() => void updateDecisionMemory(selected, { userDecision: 'rejected', status: 'dismissed' })} className="profit244-btn profit244-btn--ghost">
                  <i className="fa-solid fa-ban" />
                  رد شد
                </button>
              </div>
            </section>
          </main>

          <aside className="profit244-rail" aria-label="خلاصه مدیریتی">
            {sidebarCards.map((card) => (
              <article key={card.label} className={`profit244-rail-card profit244-rail-card--${card.tone}`}>
                <span className="profit244-rail-card__icon"><i className={`fa-solid ${card.icon}`} /></span>
                <small>{card.label}</small>
                <strong>{card.value}</strong>
              </article>
            ))}

            <section className="profit244-panel profit244-panel--rail-memory">
              <div className="profit244-panel__head">
                <div className="profit244-panel__title-wrap">
                  <span className="profit244-panel__title-icon"><i className={`fa-solid ${sectionHeads.memory.icon}`} /></span>
                  <div>
                    <h3>{sectionHeads.memory.title}</h3>
                    <p>{sectionHeads.memory.text}</p>
                  </div>
                </div>
              </div>
              <div className="profit244-memory-shell profit244-memory-shell--rail">
                <div className="profit244-memory-grid profit244-memory-grid--rail">
                  {memoryCards.map((card) => (
                    <article key={card.label} className={`profit244-memory-card profit244-memory-card--${card.tone}`}>
                      <span className="profit244-memory-card__icon"><i className={`fa-solid ${card.icon}`} /></span>
                      <small>{card.label}</small>
                      <strong>{card.value}</strong>
                    </article>
                  ))}
                </div>
                <div className="profit244-memory-note">
                  <p>وضعیت فعلی این Insight برابر با <strong>{selected.decision?.decisionLabel || 'در انتظار تصمیم'}</strong> است و در صورت ثبت نتیجه، در حافظه تصمیم فروشگاه ذخیره می‌شود.</p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </div>
  );
}
