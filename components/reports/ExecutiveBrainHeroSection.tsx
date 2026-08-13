import { formatExactNumberText } from '../../utils/exactNumber';
import React from 'react';
import type { DecisionMemoryOverviewState, SmartInsightSeverityFilter, BoardFocusArea, BoardKpiItem, ExecutiveActionOutcomeGuideFactory, LearningToneFactory, SparklinePointFactory, SmartInsightExecutiveBrain, SmartInsightLearning, SmartInsightLike, SmartInsightSummary, NumberFormatter, PercentFormatter, SeverityMetaMap } from './types/smartInsightContracts';
import { Link } from 'react-router-dom';
import ReportDatePresetChips from './ReportDatePresetChips';
import ReportFilterField from './ReportFilterField';
import ShamsiDatePicker from '../ShamsiDatePicker';

type ExecutiveBrainHeroSectionProps = {
  executiveBrain: SmartInsightExecutiveBrain;
  learning: SmartInsightLearning;
  summary: SmartInsightSummary;
  decisionMemory: DecisionMemoryOverviewState;
  topExecutiveAction?: SmartInsightLike | null;
  filtered: SmartInsightLike[];
  activeInsightCount: number;
  criticalCount: number;
  boardKpis: BoardKpiItem[];
  boardFocusAreas: BoardFocusArea[];
  openExecutiveActions: SmartInsightLike[];
  scoreValue: number;
  executiveTone: string;
  fromDate: Date | null;
  toDate: Date | null;
  loading: boolean;
  types: string[];
  typeLabels: Record<string, string>;
  activeType: string;
  severity: SmartInsightSeverityFilter;
  severityMeta: SeverityMetaMap;
  percent: PercentFormatter;
  num: NumberFormatter;
  learningTone: LearningToneFactory;
  getExecutiveActionOutcomeGuide: ExecutiveActionOutcomeGuideFactory;
  makeSparklinePoints: SparklinePointFactory;
  setFromDate: (value: Date | null) => void;
  setToDate: (value: Date | null) => void;
  fetchData: () => Promise<void> | void;
  resetLearning: () => Promise<void> | void;
  setActiveType: (value: string) => void;
  setSeverity: (value: SmartInsightSeverityFilter) => void;
  setSelected: (value: SmartInsightLike | null | Record<string, unknown>) => void;
};

function ExecutiveBrainHeroSection({
  executiveBrain,
  learning,
  summary,
  decisionMemory,
  topExecutiveAction,
  filtered,
  activeInsightCount,
  criticalCount,
  boardKpis,
  boardFocusAreas,
  openExecutiveActions,
  scoreValue,
  executiveTone,
  fromDate,
  toDate,
  loading,
  types,
  typeLabels,
  activeType,
  severity,
  severityMeta,
  percent,
  num,
  learningTone,
  getExecutiveActionOutcomeGuide,
  makeSparklinePoints,
  setFromDate,
  setToDate,
  fetchData,
  resetLearning,
  setActiveType,
  setSeverity,
  setSelected,
}: ExecutiveBrainHeroSectionProps) {
  const safeExecutiveBrain = executiveBrain || {};
  const safeLearning = learning || { level: 'learning', confidence: 0, signals: [] };
  const safeSummary = summary || {};
  const safeDecisionMemory = decisionMemory || {};
  const safeFiltered = Array.isArray(filtered) ? filtered : [];
  const safeTypes = Array.isArray(types) && types.length ? types : ['all'];
  const safeTypeLabels = typeLabels || {};
  const safeBoardKpis = Array.isArray(boardKpis) ? boardKpis : [];
  const safeBoardFocusAreas = Array.isArray(boardFocusAreas) ? boardFocusAreas : [];
  const safeOpenExecutiveActions = Array.isArray(openExecutiveActions) ? openExecutiveActions : [];
  const primaryInsight = safeFiltered[0] || null;
  const primaryAction = topExecutiveAction || null;
  const scoreAvailable = safeExecutiveBrain.scoreAvailable === true && Number.isFinite(Number(safeExecutiveBrain.score));
  const scoreComponents = Array.isArray(safeExecutiveBrain.scoreComponents) ? safeExecutiveBrain.scoreComponents : [];
  const scoreEvidence = safeExecutiveBrain.scoreEvidence || {};
  const scoreStatus = String(safeExecutiveBrain.status || 'no_data');
  const scoreStatusIcon = scoreStatus === 'excellent' || scoreStatus === 'healthy'
    ? 'fa-check'
    : scoreStatus === 'watch'
      ? 'fa-eye'
      : scoreStatus === 'risk'
        ? 'fa-triangle-exclamation'
        : 'fa-database';

  return (
<>
<section className="smart-insights-hero-v153" aria-label="دستیار هوشمند مدیریت">
        <div className="smart-insights-hero-v153__left">
          <div className="smart-insights-hero-v153__kicker">
            <span />
            STORE INTELLIGENCE ENGINE
          </div>

          <div className="smart-insights-hero-v153__title-row">
            <div>
              <h1>دستیار هوشمند مدیریت</h1>
              <p>
                این صفحه فقط گزارش نمی‌دهد؛ فروش، موجودی، تخفیف، وصول، سود و حافظه تصمیمات را ترکیب می‌کند تا اقدام بعدی فروشگاه مشخص شود.
              </p>
            </div>
            <div className="smart-insights-hero-v153__status">
              <span>وضعیت</span>
              <strong>{safeExecutiveBrain.status === 'excellent' ? 'عالی' : safeExecutiveBrain.status === 'healthy' ? 'سالم' : safeExecutiveBrain.status === 'watch' ? 'در حال پایش' : 'نیازمند اقدام'}</strong>
            </div>
          </div>

          <div className="smart-insights-hero-v153__focus">
            <div className="smart-insights-hero-v153__focus-icon">
              <i className="fa-solid fa-bullseye" />
            </div>
            <div>
              <span>تمرکز مدیریتی امروز</span>
              <h2>{primaryAction?.title || primaryInsight?.title || 'فعلاً اقدام فوری برای امروز ثبت نشده است'}</h2>
              <p>{primaryAction?.summary || primaryInsight?.summary || 'با ثبت فروش، وصول، موجودی و تصمیم‌های بیشتر، دستیار پیشنهاد دقیق‌تری تولید می‌کند.'}</p>
            </div>
          </div>

          <div className="smart-insights-hero-v153__metric-grid">
            <div className="smart-insights-hero-v153__metric">
              <span>Insight فعال</span>
              <strong>{formatExactNumberText(activeInsightCount)}</strong>
              <small>سیگنال قابل بررسی</small>
            </div>
            <div className="smart-insights-hero-v153__metric is-hot">
              <span>فوری / مهم</span>
              <strong>{formatExactNumberText(criticalCount)}</strong>
              <small>نیازمند تصمیم</small>
            </div>
            <div className="smart-insights-hero-v153__metric is-good">
              <span>اعتماد تحلیل</span>
              <strong>{percent(safeExecutiveBrain.confidence ?? safeLearning.confidence)}</strong>
              <small>کیفیت سیگنال‌ها</small>
            </div>
            <div className="smart-insights-hero-v153__metric is-memory">
              <span>حافظه تصمیم</span>
              <strong>{formatExactNumberText(num(safeDecisionMemory.total))}</strong>
              <small>تصمیم ثبت‌شده</small>
            </div>
          </div>
        </div>

        <div className="smart-insights-hero-v153__right">
          <div className={`smart-insights-hero-v153__side-card smart-insights-hero-v153__side-card--learning ${learningTone(safeLearning.level)}`}>
            <div className="smart-insights-hero-v153__side-head">
              <i className="fa-solid fa-brain" />
              <span>LEARNING STATUS</span>
            </div>
            <h3>{safeLearning.level === 'trained' ? 'یادگیری فعال' : 'در حال یادگیری'}</h3>
            <p>سیستم هنوز در حال شناخت رفتار فروشگاه است و پیشنهادها محافظه‌کارانه ارائه می‌شوند.</p>
          </div>

          <div className="smart-insights-hero-v153__side-card smart-insights-hero-v153__side-card--actions">
            <div className="smart-insights-hero-v153__side-head">
              <i className="fa-solid fa-chart-simple" />
              <span>ACTION SUMMARY</span>
            </div>
            <h3>خلاصه اقدام‌ها</h3>
            <div className="smart-insights-hero-v153__side-stats">
              <div><strong>{formatExactNumberText(num(safeSummary.total || safeFiltered.length))}</strong><span>بینش</span></div>
              <div><strong>{formatExactNumberText(criticalCount)}</strong><span>فوری</span></div>
              <div><strong>{formatExactNumberText(num(safeSummary.positive))}</strong><span>مثبت</span></div>
            </div>
          </div>

          <div className="smart-insights-hero-v153__side-card smart-insights-hero-v153__side-card--memory">
            <div className="smart-insights-hero-v153__side-head">
              <i className="fa-solid fa-memory" />
              <span>DECISION MEMORY</span>
            </div>
            <h3>حافظه تصمیمات فروشگاه</h3>
            <div className="smart-insights-hero-v153__memory-grid">
              <div><strong>{formatExactNumberText(num(safeDecisionMemory.total))}</strong><span>کل</span></div>
              <div><strong>{formatExactNumberText(num(safeDecisionMemory.pending))}</strong><span>اقدام‌نشده</span></div>
              <div><strong>{formatExactNumberText(num(safeDecisionMemory.wins))}</strong><span>برد</span></div>
              <div><strong>{formatExactNumberText(num(safeDecisionMemory.losses))}</strong><span>رد</span></div>
            </div>
          </div>
        </div>

        <div className="smart-insights-control-dock" aria-label="فیلترهای دستیار هوشمند مدیریت">
          <ReportDatePresetChips
            fromDate={fromDate}
            toDate={toDate}
            onChange={({ from, to }) => { setFromDate(from); setToDate(to); }}
            className="smart-insights-date-presets"
          />

          <ReportFilterField label="از تاریخ" icon={<i className="fa-regular fa-calendar" />} minWidthClassName="smart-insights-filter-field smart-insights-filter-field--date">
            <ShamsiDatePicker selectedDate={fromDate} onDateChange={setFromDate} hideIcon />
          </ReportFilterField>

          <ReportFilterField label="تا تاریخ" icon={<i className="fa-regular fa-calendar-check" />} minWidthClassName="smart-insights-filter-field smart-insights-filter-field--date">
            <ShamsiDatePicker selectedDate={toDate} onDateChange={setToDate} hideIcon />
          </ReportFilterField>

          <button type="button" onClick={() => void fetchData()} className="smart-insights-refresh-button" disabled={loading}>
            <i className={`fa-solid ${loading ? 'fa-spinner fa-spin' : 'fa-rotate'}`} />
            به‌روزرسانی
          </button>

          <button type="button" onClick={() => void resetLearning()} className="smart-insights-reset-button">
            <i className="fa-solid fa-rotate-left" />
            ریست یادگیری
          </button>

          <div className="smart-insights-filter-group smart-insights-filter-group--wide" aria-label="نوع بینش">
            <div className="smart-insights-filter-group__label">نوع تحلیل</div>
            <div className="smart-insights-filter-chips">
              {safeTypes.map((t) => (
                <button key={t} type="button" onClick={() => setActiveType(t)} className={`smart-insights-filter-chip ${activeType === t ? 'is-active' : ''}`}>
                  {safeTypeLabels[t] || t}
                </button>
              ))}
            </div>
          </div>

          <div className="smart-insights-filter-group" aria-label="اهمیت">
            <div className="smart-insights-filter-group__label">اهمیت</div>
            <div className="smart-insights-filter-chips">
              {(['all', 'critical', 'high', 'medium', 'low', 'positive'] as const).map((s) => (
                <button key={s} type="button" onClick={() => setSeverity(s as SmartInsightSeverityFilter)} className={`smart-insights-filter-chip smart-insights-filter-chip--severity ${severity === s ? 'is-active' : ''}`}>
                  {s === 'all' ? 'همه' : severityMeta[s]?.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="smart-insights-command-center" aria-label="خلاصه اجرایی دستیار هوشمند">
        <div className="smart-insights-command-center__main">
          <div className="smart-insights-command-center__eyebrow">
            <span className={`smart-insights-command-center__pulse smart-insights-command-center__pulse--${executiveTone}`} />
            وضعیت مدیریتی لحظه‌ای
          </div>
          <h2>{safeExecutiveBrain.command || safeExecutiveBrain.narrative || 'دستیار هوشمند آماده تحلیل تصمیم‌های مدیریتی است.'}</h2>
          <p>این بخش خروجی عملیاتی سیستم را خلاصه می‌کند: چند Insight فعال داریم، چند مورد فوری است، حافظه تصمیمات چه وضعی دارد و اقدام بعدی پیشنهادی چیست.</p>

          <div className="smart-insights-command-center__metrics">
            <div>
              <span>Insight فعال</span>
              <strong>{formatExactNumberText(activeInsightCount)}</strong>
            </div>
            <div>
              <span>فوری/مهم</span>
              <strong>{formatExactNumberText(criticalCount)}</strong>
            </div>
            <div>
              <span>اعتماد تحلیل</span>
              <strong>{percent(safeExecutiveBrain.confidence ?? safeLearning.confidence)}</strong>
            </div>
            <div>
              <span>تصمیم‌های ثبت‌شده</span>
              <strong>{formatExactNumberText(num(safeDecisionMemory.total))}</strong>
            </div>
          </div>
        </div>

        <div className="smart-insights-command-center__action">
          <div className="smart-insights-command-center__action-head">
            <span><i className="fa-solid fa-bolt" /></span>
            اقدام بعدی پیشنهادی
          </div>
          <h3>{primaryAction?.title || (primaryInsight?.title || 'فعلاً اقدام فوری مشخصی وجود ندارد')}</h3>
          <p>{primaryAction?.summary || primaryInsight?.summary || 'با ثبت فروش، وصول، موجودی و تصمیم‌های بیشتر، سیستم پیشنهادهای دقیق‌تر تولید می‌کند.'}</p>
          <div className="smart-insights-command-center__action-footer">
            <small>اولویت {formatExactNumberText(num(primaryAction?.priority || primaryInsight?.score || 0))}</small>
            {primaryAction?.to ? (
              <Link to={primaryAction.to} className="smart-insights-command-center__button">
                {primaryAction.actionLabel || 'باز کردن'}
                <i className="fa-solid fa-arrow-left" />
              </Link>
            ) : primaryInsight ? (
              <button type="button" onClick={() => setSelected(primaryInsight)} className="smart-insights-command-center__button">
                چرا؟
                <i className="fa-solid fa-circle-question" />
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="smart-insights-signal-grid smart-insights-signal-grid-v154">
        {(safeLearning.signals || []).slice(0, 4).map((s, index) => (
          <div key={`${s.label}-${index}`} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/72">
            <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">{s.label}</div>
            <div className="mt-2 text-xl font-black text-slate-950 dark:text-white">{String(s.value)}</div>
          </div>
        ))}
      </section>


      {safeExecutiveBrain.score !== undefined ? (
        <section className="smart-orbital-board-v156" aria-label="مغز هوشمند مدیریت">
          <div className="smart-orbital-board-v156__actions">
            <div className="smart-orbital-board-v156__section-title">
              <i className="fa-solid fa-sparkles" />
              اقدام‌های پیشنهادی
            </div>

            <div className="smart-orbital-board-v156__action-list smart-orbital-board-v158__action-list smart-action-queue-v176">
              {safeOpenExecutiveActions.length ? safeOpenExecutiveActions.map((action, index) => {
                const guide = getExecutiveActionOutcomeGuide(action);
                const actionIcon = index === 0 ? 'fa-bolt' : index === 1 ? 'fa-chart-line' : index === 2 ? 'fa-cart-shopping' : 'fa-users';
                const isActionActive = String(action.id || index) === String(primaryAction?.id || 0);
                const actionClassName = `smart-action-row-v176 smart-action-row-v179${isActionActive ? ' is-active' : ''}`;
                const cardContent = (
                  <>
                    <div className="smart-action-row-v176__icon">
                      <i className={`fa-solid ${actionIcon}`} />
                    </div>

                    <div className="smart-action-row-v176__body">
                      <h4>{action.title}</h4>
                      <p>{action.summary || guide.metric}</p>
                    </div>

                    <div className="smart-action-row-v176__score">
                      {formatExactNumberText(num(action.priority))}
                    </div>
                  </>
                );

                return action.to ? (
                  <Link key={action.id || index} to={action.to} className={actionClassName}>
                    {cardContent}
                  </Link>
                ) : (
                  <button key={action.id || index} type="button" onClick={() => setSelected(action)} className={actionClassName}>
                    {cardContent}
                  </button>
                );
              }) : (
                <div className="smart-orbital-board-v156__empty-actions">
                  <i className="fa-solid fa-circle-check" />
                  <strong>اقدام فوری جدیدی وجود ندارد</strong>
                  <p>با تغییر بازه یا ثبت داده‌های تازه، پیشنهادهای مدیریتی اینجا نمایش داده می‌شوند.</p>
                </div>
              )}
            </div>


          </div>

          <div className="smart-orbital-board-v156__decision">
            <div className="smart-orbital-board-v156__decision-badge">NEXT BEST DECISION</div>
            <div className="smart-orbital-board-v156__target smart-center-target-v169">
              <span className="smart-center-target-v169__halo" />
              <span className="smart-center-target-v169__ring" />
              <svg className="smart-center-target-v170__svg smart-center-target-v171__svg" viewBox="0 0 72 72" aria-hidden="true">
                <g className="smart-center-target-v171__target">
                  <circle cx="31" cy="39" r="18" />
                  <circle cx="31" cy="39" r="10.5" />
                  <circle cx="31" cy="39" r="3.6" />
                </g>
                <g className="smart-center-target-v171__arrow">
                  <path d="M36.5 33.5 L55.5 14.5" />
                  <path d="M48.5 14.5 H55.5 V21.5" />
                  <path d="M46 24.5 H57.5" />
                  <path d="M46 24.5 V13" />
                </g>
              </svg>
            </div>
            <h2>{safeExecutiveBrain.command || 'سیستم در حال انتخاب اقدام اصلی است'}</h2>
            <p>{safeExecutiveBrain.narrative || 'دستیار هوشمند بر اساس فروش، وصول، موجودی و سود، اقدام بعدی فروشگاه را پیشنهاد می‌کند.'}</p>

            <div className="smart-orbital-board-v156__focus-grid">
              {safeBoardFocusAreas.map((area, index) => (
                <div key={area.key || index} className={`smart-orbital-board-v156__focus-card smart-orbital-board-v156__focus-card--${area.tone || 'neutral'}`}>
                  <span className="smart-orbital-board-v156__focus-icon">
                    <i className={`fa-solid ${index === 0 ? 'fa-box' : index === 1 ? 'fa-credit-card' : index === 2 ? 'fa-triangle-exclamation' : 'fa-chart-line'}`} />
                  </span>
                  <small>{area.label}</small>
                  <strong>{typeof area.value === 'number' ? formatExactNumberText(num(area.value)) : String(area.value)}</strong>
                  <em>{typeof area.value === 'number' && num(area.value) <= 100 ? 'شاخص' : 'مورد'}</em>
                </div>
              ))}
            </div>

            <div className="smart-orbital-board-v156__cta-row">
              {primaryAction?.to ? (
                <Link to={primaryAction.to} className="smart-orbital-board-v156__primary-cta">
                  بررسی کامل موضوع
                  <i className="fa-solid fa-arrow-left" />
                </Link>
              ) : primaryInsight ? (
                <button type="button" onClick={() => setSelected(primaryInsight)} className="smart-orbital-board-v156__primary-cta">
                  بررسی کامل موضوع
                  <i className="fa-solid fa-arrow-left" />
                </button>
              ) : null}
            </div>

          </div>

          <div className="smart-orbital-board-v156__engine">
            <div className="smart-orbital-board-v156__engine-head">
              <span><i className="fa-solid fa-brain" /></span>
              <strong>SMART INSIGHT ENGINE</strong>
            </div>

            <h3>امتیاز وضعیت مدیریتی</h3>

            <div
              className={`smart-management-score-v214 smart-management-score-v214--${scoreStatus}`}
              role={scoreAvailable ? 'meter' : 'status'}
              aria-label="امتیاز واقعی وضعیت مدیریتی"
              aria-valuemin={scoreAvailable ? 0 : undefined}
              aria-valuemax={scoreAvailable ? 100 : undefined}
              aria-valuenow={scoreAvailable ? scoreValue : undefined}
              aria-valuetext={scoreAvailable ? `${scoreValue} از ۱۰۰` : 'داده کافی برای محاسبه وجود ندارد'}
            >
              <svg className="smart-management-score-v214__ring" viewBox="0 0 144 144" aria-hidden="true">
                <circle className="smart-management-score-v214__track" cx="72" cy="72" r="56" pathLength="100" />
                <circle
                  className="smart-management-score-v214__progress"
                  cx="72"
                  cy="72"
                  r="56"
                  pathLength="100"
                  strokeDasharray={`${scoreAvailable ? scoreValue : 0} 100`}
                />
              </svg>
              <div className="smart-management-score-v214__value">
                <strong>{scoreAvailable ? formatExactNumberText(scoreValue) : '—'}</strong>
                <span>{scoreAvailable ? 'از ۱۰۰' : 'داده ناکافی'}</span>
              </div>
            </div>

            <div className={`smart-orbital-board-v156__status-chip is-${scoreStatus}`}>
              <i className={`fa-solid ${scoreStatusIcon}`} />
              {safeExecutiveBrain.statusLabel || 'در حال تحلیل'}
            </div>

            <p className="smart-management-score-v214__basis">
              {scoreAvailable
                ? `محاسبه‌شده از ${formatExactNumberText(scoreComponents.length)} شاخص واقعی و ${formatExactNumberText(num(scoreEvidence.ordersCount))} سند فروش`
                : 'با ثبت داده فروش کافی، امتیاز واقعی به‌صورت خودکار محاسبه می‌شود.'}
            </p>

            {scoreComponents.length ? (
              <ul className="smart-management-score-v214__breakdown" aria-label="جزئیات محاسبه امتیاز">
                {scoreComponents.map((component) => (
                  <li key={component.key}>
                    <div>
                      <span>{component.label}</span>
                      <strong>{formatExactNumberText(num(component.value))}</strong>
                    </div>
                    <span className="smart-management-score-v214__bar" aria-hidden="true">
                      <span style={{ inlineSize: `${Math.max(0, Math.min(100, num(component.value)))}%` }} />
                    </span>
                    <small>{component.evidence}</small>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="smart-orbital-board-v156__engine-note">
              <i className="fa-solid fa-microchip" />
              <p>مغز سیستم روی بهینه‌سازی سود، وصول و نقدینگی فروشگاه متمرکز است.</p>
            </div>
          </div>
        </section>
      ) : null}
      <section className="smart-kpi-reference-grid-v166" aria-label="شاخص‌های واقعی مغز هوشمند">
        {safeBoardKpis.map((kpi) => (
          <article key={kpi.key} className={`smart-kpi-reference-card-v166 smart-kpi-reference-card-v166--${kpi.tone}`}>
            <div className="smart-kpi-reference-card-v166__icon">
              <i className={`fa-solid ${kpi.icon}`} />
            </div>

            <div className="smart-kpi-reference-card-v166__content">
              <h3>{kpi.label}</h3>
              <strong>{formatExactNumberText(num(kpi.value))}</strong>
              <span className={`smart-kpi-reference-card-v166__delta is-${kpi.deltaTone || 'neutral'}`}>
                <i className={`fa-solid ${kpi.deltaTone === 'down' ? 'fa-arrow-down' : kpi.deltaTone === 'up' ? 'fa-arrow-up' : 'fa-minus'}`} />
                {String(kpi.delta ?? 'داده مقایسه‌ای ثبت نشده است')}
              </span>
            </div>

            {Array.isArray(kpi.trend) && kpi.trend.length > 1 ? (
              <svg className="smart-kpi-reference-card-v166__sparkline" viewBox="0 0 188 56" preserveAspectRatio="none" aria-hidden="true">
                <polyline points={makeSparklinePoints(kpi.trend)} />
              </svg>
            ) : null}
          </article>
        ))}
      </section>
</>
  );
}

export default React.memo(ExecutiveBrainHeroSection);
