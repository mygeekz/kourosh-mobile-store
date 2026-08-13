import { IconGlyph, inferIconGlyphTone } from '@/components/ui';
import { formatExactNumberText, formatExactPercentText } from '../../utils/exactNumber';
import { SmartInsightModalPortal, useSmartInsightModalCssVars } from './SmartInsightModalShell';
import type { DecisionMemoryOverviewState, GetDecisionStatusMeta, NumberFormatter, ShamsiFormatter, SmartInsightLike, SmartInsightPayload } from './types/smartInsightContracts';

type DecisionMemoryOverviewModalProps = {
  selected: SmartInsightLike;
  payload: SmartInsightPayload;
  insights: SmartInsightLike[];
  typeLabels: Record<string, string>;
  getDecisionStatusMeta: GetDecisionStatusMeta;
  num: NumberFormatter;
  shamsi: ShamsiFormatter;
  onClose: () => void;
};

const toneClassByStatus = (statusKey: string) => {
  if (statusKey === 'done') return 'insight-overview-modal-v211__status insight-overview-modal-v211__status--success';
  if (statusKey === 'action') return 'insight-overview-modal-v211__status insight-overview-modal-v211__status--warning';
  return 'insight-overview-modal-v211__status insight-overview-modal-v211__status--info';
};

export default function DecisionMemoryOverviewModal({
  selected,
  payload,
  insights,
  typeLabels,
  getDecisionStatusMeta,
  num,
  shamsi,
  onClose,
}: DecisionMemoryOverviewModalProps) {
  const decisionMemory = ((payload.summary?.decisionMemory || payload.decisionMemory || {}) as DecisionMemoryOverviewState);
  const memoryRows = insights
    .filter((insight) => insight.decision)
    .map((insight) => {
      const statusMeta = getDecisionStatusMeta(insight.decision);
      return {
        id: insight.id,
        title: insight.title,
        typeLabel: typeLabels[String(insight.type)] || insight.category || 'Insight',
        statusKey: statusMeta.key,
        statusLabel: statusMeta.label,
        occurrence: num(insight.decision?.occurrenceCount),
        date: insight.decision?.decidedAt || insight.decision?.lastGeneratedAt || insight.decision?.firstGeneratedAt || payload.generatedAt,
        outcome: insight.decision?.outcomeLabel || insight.decision?.decisionLabel || 'ثبت نشده',
      };
    })
    .sort((a, b) => num(b.occurrence) - num(a.occurrence));

  const memoryKpis = [
    { label: 'پیشنهادهای ثبت‌شده', value: formatExactNumberText(num(decisionMemory.total || memoryRows.length)), icon: 'fa-file-lines', tone: 'blue' },
    { label: 'در انتظار تصمیم', value: formatExactNumberText(num(decisionMemory.pending || memoryRows.filter((row) => row.statusKey !== 'done').length)), icon: 'fa-clock', tone: 'violet' },
    { label: 'نتیجه مثبت', value: formatExactNumberText(num(decisionMemory.outcome_positive || decisionMemory.positive)), icon: 'fa-check', tone: 'emerald' },
    { label: 'نتیجه منفی', value: formatExactNumberText(num(decisionMemory.outcome_negative || decisionMemory.negative)), icon: 'fa-circle-minus', tone: 'rose' },
  ];

  const avgRepeat = memoryRows.length ? (memoryRows.reduce((sum, row) => sum + num(row.occurrence), 0) / memoryRows.length) : 0;
  const latestUpdate = payload.generatedAt ? shamsi(payload.generatedAt) : 'ثبت نشده';
  const doneCount = memoryRows.filter((row) => row.statusKey === 'done').length;
  const completionRate = memoryRows.length ? ((doneCount / memoryRows.length) * 100) : 0;

  const modalStyle = useSmartInsightModalCssVars();

  const modal = (
    <div className="insight-overview-modal-v211 insight-overview-modal-v211--sidebar-safe" style={modalStyle} onClick={onClose}>
      <div className="insight-overview-modal-v211__surface" onClick={(e) => e.stopPropagation()} dir="rtl">
        <header className="insight-overview-modal-v211__header">
          <div className="insight-overview-modal-v211__header-icon" aria-hidden="true">
            <i className="fa-solid fa-brain" />
          </div>

          <div className="insight-overview-modal-v211__title">
            <div className="insight-overview-modal-v211__eyebrow">
              <span className="insight-overview-modal-v211__badge border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-200">
                <i className="fa-regular fa-clock" /> حافظه تصمیم
              </span>
              <span className="insight-overview-modal-v211__chip">
                <i className="fa-solid fa-layer-group" /> نمای راهبردی پیشنهادها
              </span>
            </div>
            <h2>حافظه تصمیم پیشنهادها</h2>
            <p>سوابق تصمیم‌های ثبت‌شده برای پیشنهادهای هوشمند، روند نتیجه‌ها و الگوی تکرار تصمیم‌ها در یک نمای افقی و اجرایی.</p>
          </div>

          <button type="button" className="insight-overview-modal-v211__close" onClick={onClose} aria-label="بستن مودال حافظه تصمیم">
            <i className="fa-solid fa-xmark" />
          </button>
        </header>

        <div className="insight-overview-modal-v211__body">
          <section className="insight-overview-modal-v211__main">
            <div className="insight-overview-modal-v211__hero-strip">
              <article className="insight-overview-modal-v211__hero-card">
                <div className="insight-overview-modal-v211__hero-label">میانگین تکرار تصمیم</div>
                <div className="insight-overview-modal-v211__hero-value">{formatExactNumberText(avgRepeat)} بار</div>
              </article>
              <article className="insight-overview-modal-v211__hero-card">
                <div className="insight-overview-modal-v211__hero-label">آخرین به‌روزرسانی</div>
                <div className="insight-overview-modal-v211__hero-value">{latestUpdate}</div>
              </article>
              <article className="insight-overview-modal-v211__hero-card">
                <div className="insight-overview-modal-v211__hero-label">نرخ تکمیل تصمیم‌ها</div>
                <div className="insight-overview-modal-v211__hero-value">{formatExactPercentText(completionRate)}</div>
              </article>
            </div>

            <article className="insight-overview-modal-v211__brief">
              <div className="insight-overview-modal-v211__brief-title">
                <i className="fa-solid fa-sparkles" /> برداشت اجرایی
              </div>
              <p className="insight-overview-modal-v211__brief-text">
                این نما نشان می‌دهد کدام Insightها بیشتر وارد چرخه تصمیم شده‌اند، چند مورد هنوز در انتظار اقدام هستند و کدام نتیجه‌ها بیشترین اثر را در یادگیری عملیاتی فروشگاه داشته‌اند.
              </p>
            </article>

            <div className="insight-overview-modal-v211__content-grid">
              <article className="insight-overview-modal-v211__panel">
                <div className="insight-overview-modal-v211__panel-head">
                  <h3 className="insight-overview-modal-v211__panel-title">آخرین تصمیم‌ها</h3>
                  <span className="insight-overview-modal-v211__panel-note">{formatExactNumberText(memoryRows.length)} مورد</span>
                </div>
                <div className="insight-overview-modal-v211__panel-body">
                  <div className="insight-overview-modal-v211__table-head" style={{ gridTemplateColumns: 'minmax(0,1.3fr) .7fr .55fr .7fr' }}>
                    <span>پیشنهاد</span>
                    <span>وضعیت</span>
                    <span>تکرار</span>
                    <span>نتیجه</span>
                  </div>
                  {memoryRows.slice(0, 8).map((row) => (
                    <div key={row.id} className="insight-overview-modal-v211__table-row" style={{ gridTemplateColumns: 'minmax(0,1.3fr) .7fr .55fr .7fr' }}>
                      <div className="insight-overview-modal-v211__cell-title">
                        <strong>{row.title}</strong>
                        <div className="insight-overview-modal-v211__cell-sub">{row.typeLabel} · {row.date ? shamsi(row.date) : '—'}</div>
                      </div>
                      <div><span className={toneClassByStatus(row.statusKey)}>{row.statusLabel}</span></div>
                      <div className="text-sm font-black text-slate-900 dark:text-white">{formatExactNumberText(row.occurrence)} بار</div>
                      <div className="text-xs font-black text-slate-500 dark:text-slate-300">{row.outcome}</div>
                    </div>
                  ))}
                  {!memoryRows.length ? <div className="insight-overview-modal-v211__empty">هنوز حافظه تصمیمی از بک‌اند برای این بازه ارسال نشده است.</div> : null}
                </div>
              </article>

              <article className="insight-overview-modal-v211__panel">
                <div className="insight-overview-modal-v211__panel-head">
                  <h3 className="insight-overview-modal-v211__panel-title">الگوی تصمیم</h3>
                  <span className="insight-overview-modal-v211__panel-note">مرکز Insight</span>
                </div>
                <div className="insight-overview-modal-v211__panel-body">
                  <div className="insight-overview-modal-v211__mini-grid">
                    <div className="insight-overview-modal-v211__mini-card">
                      <div className="insight-overview-modal-v211__mini-label">منبع داده</div>
                      <div className="insight-overview-modal-v211__mini-value">Smart Insight / Backend</div>
                    </div>
                    <div className="insight-overview-modal-v211__mini-card">
                      <div className="insight-overview-modal-v211__mini-label">موضوع فعال</div>
                      <div className="insight-overview-modal-v211__mini-value">{selected.title}</div>
                    </div>
                  </div>

                  <div className="insight-overview-modal-v211__stats-grid mt-3">
                    <div className="insight-overview-modal-v211__mini-card">
                      <div className="insight-overview-modal-v211__stat-label">تصمیم‌های تکمیل‌شده</div>
                      <div className="insight-overview-modal-v211__mini-value">{formatExactNumberText(doneCount)} مورد</div>
                      <div className="insight-overview-modal-v211__progress-track"><div className="insight-overview-modal-v211__progress-fill" style={{ width: `${completionRate}%` }} /></div>
                    </div>
                    <div className="insight-overview-modal-v211__mini-card">
                      <div className="insight-overview-modal-v211__stat-label">تصمیم‌های باز</div>
                      <div className="insight-overview-modal-v211__mini-value">{formatExactNumberText(memoryRows.filter((row) => row.statusKey !== 'done').length)} مورد</div>
                      <div className="mt-2 text-xs font-bold leading-6 text-slate-500 dark:text-slate-300">موارد باز باید نتیجه یا وضعیت نهایی بگیرند تا دقت پیشنهادهای بعدی افزایش یابد.</div>
                    </div>
                  </div>
                </div>
              </article>
            </div>

            <article className="insight-overview-modal-v211__footer-note">
              <div className="insight-overview-modal-v211__footer-title"><i className="fa-solid fa-brain" /> خلاصه یادگیری</div>
              <p className="insight-overview-modal-v211__footer-text">نتیجه تصمیم‌های ثبت‌شده برای اولویت‌بندی پیشنهادهای بعدی استفاده می‌شود و هر ثبت موفق، حافظه عملیاتی سیستم را دقیق‌تر می‌کند.</p>
            </article>
          </section>

          <aside className="insight-overview-modal-v211__aside">
            <div className="insight-overview-modal-v211__aside-grid">
              {memoryKpis.map((card) => (
                <article key={card.label} className="insight-overview-modal-v211__kpi-card">
                  <IconGlyph tone={inferIconGlyphTone(card.tone)} className="insight-overview-modal-v211__kpi-icon" aria-hidden="true">
                    <i className={`fa-solid ${card.icon}`} />
                  </IconGlyph>
                  <div className="insight-overview-modal-v211__kpi-copy">
                    <div className="insight-overview-modal-v211__kpi-label">{card.label}</div>
                    <div className="insight-overview-modal-v211__kpi-value">{card.value}</div>
                  </div>
                </article>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );

  return <SmartInsightModalPortal>{modal}</SmartInsightModalPortal>;
}
