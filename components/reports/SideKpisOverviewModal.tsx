import { formatExactNumberText } from '../../utils/exactNumber';
import { SmartInsightModalPortal, useSmartInsightModalCssVars } from './SmartInsightModalShell';
import type { InsightSeverity, LocalizedNumberParser, NumberFormatter, PercentFormatter, ProfitSummaryLike, SeverityMetaMap, SmartInsightLearning, SmartInsightLike, SmartInsightPayload, SmartInsightSummary, SuspiciousAuditLike, CustomerIntelligenceCard, SalesAgentLeadRow } from './types/smartInsightContracts';

type SideKpisOverviewModalProps = {
  selected: SmartInsightLike;
  payload: SmartInsightPayload;
  profitSummary: ProfitSummaryLike | null;
  summary: SmartInsightSummary;
  suspiciousAudit: SuspiciousAuditLike[];
  insights: SmartInsightLike[];
  typeLabels: Record<string, string>;
  severityMeta: SeverityMetaMap;
  learning: SmartInsightLearning;
  customerIntelligence: CustomerIntelligenceCard[];
  salesAgentLeads: SalesAgentLeadRow[];
  parseLocalizedNumber: LocalizedNumberParser;
  num: NumberFormatter;
  percent: PercentFormatter;
  onClose: () => void;
};

type ExecutiveMetric = {
  label: string;
  value: string;
  helper: string;
  icon: string;
  tone: 'neutral' | 'good' | 'attention' | 'risk';
};

type TrendMetric = {
  label: string;
  value: string;
  helper: string;
  score: number;
  inverse?: boolean;
};

const alertDotClass = (severity: string) => {
  if (severity === 'critical') return 'side-kpi-modal-v217__alert-dot side-kpi-modal-v217__alert-dot--risk';
  if (severity === 'high') return 'side-kpi-modal-v217__alert-dot side-kpi-modal-v217__alert-dot--attention';
  if (severity === 'positive') return 'side-kpi-modal-v217__alert-dot side-kpi-modal-v217__alert-dot--good';
  return 'side-kpi-modal-v217__alert-dot side-kpi-modal-v217__alert-dot--neutral';
};

const metricToneClass = (tone: ExecutiveMetric['tone']) => `side-kpi-modal-v217__metric-icon side-kpi-modal-v217__metric-icon--${tone}`;

const clampScore = (value: number) => Math.min(100, Math.max(0, (Number.isFinite(value) ? value : 0)));

export default function SideKpisOverviewModal({
  selected,
  payload,
  profitSummary,
  summary,
  suspiciousAudit,
  insights,
  typeLabels,
  severityMeta,
  learning,
  customerIntelligence,
  salesAgentLeads,
  parseLocalizedNumber,
  num,
  percent,
  onClose,
}: SideKpisOverviewModalProps) {
  const stockoutCount = num(payload.predictiveEngine?.risks?.stockout?.length);
  const collectionCount = num(payload.predictiveEngine?.risks?.collection?.overdueCount) + num(payload.predictiveEngine?.risks?.collection?.dueSoonCount);
  const auditRiskCount = num(summary.auditRiskCount || suspiciousAudit.length);
  const activeCollectionCount = num((insights || []).filter((insight) => insight.type === 'collection_risk').length);
  const actionNeededCustomers = num(customerIntelligence.length || salesAgentLeads.length);
  const confidence = learning.confidence || payload.predictiveEngine?.confidence || 0;
  const profitQuality = profitSummary?.qualityScore != null ? profitSummary.qualityScore : summary.profitQualityScore || 0;
  const confidenceScore = clampScore(parseLocalizedNumber(percent(confidence)));
  const profitQualityScore = clampScore(parseLocalizedNumber(percent(profitQuality)));

  const executiveMetrics: ExecutiveMetric[] = [
    {
      label: 'ریسک موجودی',
      value: formatExactNumberText(stockoutCount),
      helper: stockoutCount > 0 ? 'نیازمند پیگیری' : 'پایدار',
      icon: 'fa-cube',
      tone: stockoutCount > 0 ? 'risk' : 'good',
    },
    {
      label: 'کیفیت سود',
      value: percent(profitQuality),
      helper: 'وضعیت سود عملیاتی',
      icon: 'fa-arrow-trend-up',
      tone: 'good',
    },
    {
      label: 'اعتماد تحلیل',
      value: percent(confidence),
      helper: 'اتکاپذیری پیشنهادها',
      icon: 'fa-shield-halved',
      tone: confidenceScore >= 60 ? 'good' : 'attention',
    },
    {
      label: 'سررسید حساس',
      value: formatExactNumberText(collectionCount),
      helper: collectionCount > 0 ? 'قابل پیگیری' : 'بدون مورد جدی',
      icon: 'fa-calendar-days',
      tone: collectionCount > 0 ? 'attention' : 'good',
    },
    {
      label: 'مشتری نیازمند اقدام',
      value: formatExactNumberText(actionNeededCustomers),
      helper: actionNeededCustomers > 0 ? 'فرصت یا ریسک فعال' : 'بدون هشدار فعال',
      icon: 'fa-user-clock',
      tone: actionNeededCustomers > 0 ? 'attention' : 'good',
    },
  ];

  const dependentAlerts = [
    ...insights.slice(0, 4).map((insight) => ({
      title: insight.title,
      category: typeLabels[String(insight.type)] || insight.category,
      severity: insight.severity,
    })),
    ...(payload.predictiveEngine?.alerts || []).slice(0, 2).map((alert) => ({
      title: alert.title,
      category: 'پیش‌بینی',
      severity: (alert.severity || 'medium') as InsightSeverity,
    })),
  ].slice(0, 5);

  const trendMetrics: TrendMetric[] = [
    {
      label: 'کیفیت سود',
      value: percent(profitQuality),
      helper: 'سنجش سلامت سود در تصمیم‌های فعلی',
      score: profitQualityScore,
    },
    {
      label: 'اعتماد تحلیل',
      value: percent(confidence),
      helper: 'میزان اتکای سیستم به داده‌های فعلی',
      score: confidenceScore,
    },
    {
      label: 'ریسک اختلاف',
      value: formatExactNumberText(auditRiskCount),
      helper: 'هرچه کمتر باشد بهتر است',
      score: clampScore(auditRiskCount * 15),
      inverse: true,
    },
    {
      label: 'وصول فعال',
      value: formatExactNumberText(activeCollectionCount),
      helper: 'پرونده‌هایی که نیاز به پیگیری دارند',
      score: clampScore(activeCollectionCount * 18),
      inverse: true,
    },
  ];

  const modalStyle = useSmartInsightModalCssVars();

  const modal = (
    <div className="insight-overview-modal-v211 insight-overview-modal-v211--sidebar-safe side-kpi-modal-v217" style={modalStyle} onClick={onClose}>
      <div className="insight-overview-modal-v211__surface side-kpi-modal-v217__surface" onClick={(event) => event.stopPropagation()} dir="rtl">
        <header className="insight-overview-modal-v211__header side-kpi-modal-v217__header">
          <div className="insight-overview-modal-v211__header-icon side-kpi-modal-v217__header-icon" aria-hidden="true">
            <i className="fa-solid fa-chart-line" />
          </div>

          <div className="insight-overview-modal-v211__title side-kpi-modal-v217__title">
            <div className="insight-overview-modal-v211__eyebrow side-kpi-modal-v217__eyebrow">
              <span className="insight-overview-modal-v211__badge side-kpi-modal-v217__badge">
                <i className="fa-solid fa-chart-line" /> KPIهای جانبی
              </span>
              <span className="insight-overview-modal-v211__chip side-kpi-modal-v217__chip">
                نمای جمع‌وجور مرکز Insight
              </span>
            </div>
            <h2>شاخص‌های تکمیلی Insight Center</h2>
            <p>خلاصه‌ای از چند شاخص مکمل که کنار پیشنهاد اصلی کمک می‌کند وضعیت ریسک، سود، وصول و کیفیت تصمیم سریع‌تر دیده شود.</p>
          </div>

          <button type="button" className="insight-overview-modal-v211__close" onClick={onClose} aria-label="بستن مودال KPIهای جانبی">
            <i className="fa-solid fa-xmark" />
          </button>
        </header>

        <div className="side-kpi-modal-v217__body">
          <section className="side-kpi-modal-v217__topline" aria-label="خلاصه مدیریتی شاخص‌های جانبی">
            <article className="side-kpi-modal-v217__selected-card">
              <span>موضوع منتخب</span>
              <strong>{selected.title}</strong>
              <small>{severityMeta[selected.severity]?.label || selected.severity}</small>
            </article>

            <div className="side-kpi-modal-v217__metric-row">
              {executiveMetrics.map((metric) => (
                <article key={metric.label} className="side-kpi-modal-v217__metric-card">
                  <div className={metricToneClass(metric.tone)}>
                    <i className={`fa-solid ${metric.icon}`} />
                  </div>
                  <div className="side-kpi-modal-v217__metric-copy">
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                    <small>{metric.helper}</small>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="side-kpi-modal-v217__content" aria-label="جزئیات خلاصه شاخص‌های جانبی">
            <article className="side-kpi-modal-v217__panel side-kpi-modal-v217__panel--trend">
              <div className="side-kpi-modal-v217__panel-head">
                <h3>روند شاخص‌ها</h3>
                <span>خلاصه بدون اسکرول</span>
              </div>

              <div className="side-kpi-modal-v217__trend-grid">
                {trendMetrics.map((trend) => (
                  <article key={trend.label} className="side-kpi-modal-v217__trend-card">
                    <div className="side-kpi-modal-v217__trend-head">
                      <strong>{trend.label}</strong>
                      <span>{trend.value}</span>
                    </div>
                    <div className="side-kpi-modal-v217__progress" aria-hidden="true">
                      <span
                        className={trend.inverse ? 'side-kpi-modal-v217__progress-fill side-kpi-modal-v217__progress-fill--inverse' : 'side-kpi-modal-v217__progress-fill'}
                        style={{ width: `${trend.score}%` }}
                      />
                    </div>
                    <p>{trend.helper}</p>
                  </article>
                ))}
              </div>
            </article>

            <article className="side-kpi-modal-v217__panel side-kpi-modal-v217__panel--alerts">
              <div className="side-kpi-modal-v217__panel-head">
                <h3>هشدارهای وابسته</h3>
                <span>{formatExactNumberText(dependentAlerts.length)} مورد</span>
              </div>

              <div className="side-kpi-modal-v217__alert-list">
                {dependentAlerts.map((alert, index) => (
                  <div key={`${alert.title}-${index}`} className="side-kpi-modal-v217__alert-row">
                    <span className={alertDotClass(String(alert.severity))} />
                    <div className="side-kpi-modal-v217__alert-copy">
                      <strong>{alert.title}</strong>
                      <small>{alert.category}</small>
                    </div>
                    <em>{severityMeta[alert.severity]?.label || alert.severity}</em>
                  </div>
                ))}
                {!dependentAlerts.length ? <div className="side-kpi-modal-v217__empty">هشدار وابسته‌ای برای این بازه ثبت نشده است.</div> : null}
              </div>
            </article>
          </section>

          <footer className="side-kpi-modal-v217__footer">
            <strong>برداشت نهایی</strong>
            <p>این شاخص‌ها فقط لایه مکمل تصمیم هستند؛ هدفشان ساده‌کردن اولویت‌بندی است، نه نمایش جزئیات فنی برای کاربر.</p>
          </footer>
        </div>
      </div>
    </div>
  );

  return <SmartInsightModalPortal>{modal}</SmartInsightModalPortal>;
}
