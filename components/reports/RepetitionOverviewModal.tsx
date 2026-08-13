import { IconGlyph, inferIconGlyphTone } from '@/components/ui';
import { formatExactNumberText, formatExactPercentText } from '../../utils/exactNumber';
import { SmartInsightModalPortal, useSmartInsightModalCssVars } from './SmartInsightModalShell';
import type { GetDecisionStatusMeta, NumberFormatter, ShamsiFormatter, SmartInsightLike, SmartInsightPayload } from './types/smartInsightContracts';

type RepetitionOverviewModalProps = {
  selected: SmartInsightLike;
  payload: SmartInsightPayload;
  insights: SmartInsightLike[];
  typeLabels: Record<string, string>;
  getDecisionStatusMeta: GetDecisionStatusMeta;
  num: NumberFormatter;
  shamsi: ShamsiFormatter;
  onClose: () => void;
};

const rowToneClass = (statusKey: string) => {
  if (statusKey === 'done') return 'insight-overview-modal-v211__status insight-overview-modal-v211__status--success';
  if (statusKey === 'action') return 'insight-overview-modal-v211__status insight-overview-modal-v211__status--warning';
  return 'insight-overview-modal-v211__status insight-overview-modal-v211__status--info';
};

export default function RepetitionOverviewModal({
  selected,
  payload,
  insights,
  typeLabels,
  getDecisionStatusMeta,
  num,
  shamsi,
  onClose,
}: RepetitionOverviewModalProps) {
  const repetitionRows = insights
    .map((insight) => ({
      id: insight.id,
      title: insight.title,
      typeLabel: typeLabels[String(insight.type)] || insight.category || 'Insight',
      count: num(insight.decision?.occurrenceCount),
      last: insight.decision?.lastGeneratedAt || insight.decision?.firstGeneratedAt || payload.generatedAt,
      status: getDecisionStatusMeta(insight.decision).label,
      statusKey: getDecisionStatusMeta(insight.decision).key,
    }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);

  const maxRepeat = repetitionRows[0]?.count || 0;
  const openRepeat = repetitionRows.filter((row) => row.statusKey !== 'done').length;
  const doneRepeat = repetitionRows.filter((row) => row.statusKey === 'done').length;
  const avgGap = repetitionRows.length ? Math.max(1, (7 / Math.max(1, repetitionRows.length))) : 0;
  const successRate = repetitionRows.length ? ((doneRepeat / repetitionRows.length) * 100) : 0;
  const pendingRate = repetitionRows.length ? ((openRepeat / repetitionRows.length) * 100) : 0;

  const repetitionKpis = [
    { label: 'بیشترین تکرار', value: maxRepeat ? `${formatExactNumberText(maxRepeat)} بار` : 'ثبت نشده', icon: 'fa-chart-simple', tone: 'violet' },
    { label: 'اقدام‌های باز', value: formatExactNumberText(openRepeat), icon: 'fa-clock', tone: 'orange' },
    { label: 'اقدام‌های تکمیل‌شده', value: formatExactNumberText(doneRepeat), icon: 'fa-calendar-check', tone: 'emerald' },
    { label: 'میانگین فاصله تکرار', value: avgGap ? `${formatExactNumberText(avgGap)} روز` : 'ثبت نشده', icon: 'fa-rotate', tone: 'blue' },
  ];

  const modalStyle = useSmartInsightModalCssVars();

  const modal = (
    <div className="insight-overview-modal-v211 insight-overview-modal-v211--sidebar-safe" style={modalStyle} onClick={onClose}>
      <div className="insight-overview-modal-v211__surface" onClick={(e) => e.stopPropagation()} dir="rtl">
        <header className="insight-overview-modal-v211__header">
          <div className="insight-overview-modal-v211__header-icon" aria-hidden="true">
            <i className="fa-solid fa-repeat" />
          </div>

          <div className="insight-overview-modal-v211__title">
            <div className="insight-overview-modal-v211__eyebrow">
              <span className="insight-overview-modal-v211__badge border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/25 dark:bg-violet-500/10 dark:text-violet-200">
                <i className="fa-solid fa-chart-simple" /> دفعات تکرار
              </span>
              <span className="insight-overview-modal-v211__chip">
                <i className="fa-solid fa-wave-square" /> تحلیل چرخه اقدام
              </span>
            </div>
            <h2>ردیابی دفعات تکرار پیشنهاد</h2>
            <p>بررسی الگوی تکرار پیشنهادها، فاصله زمانی بین اجراها و وضعیت اقدام‌ها در یک چیدمان افقی و منظم.</p>
          </div>

          <button type="button" className="insight-overview-modal-v211__close" onClick={onClose} aria-label="بستن مودال دفعات تکرار">
            <i className="fa-solid fa-xmark" />
          </button>
        </header>

        <div className="insight-overview-modal-v211__body">
          <section className="insight-overview-modal-v211__main">
            <div className="insight-overview-modal-v211__hero-strip">
              <article className="insight-overview-modal-v211__hero-card">
                <div className="insight-overview-modal-v211__hero-label">پیشنهاد منتخب</div>
                <div className="insight-overview-modal-v211__hero-value">{selected.title}</div>
              </article>
              <article className="insight-overview-modal-v211__hero-card">
                <div className="insight-overview-modal-v211__hero-label">آخرین بازه مرجع</div>
                <div className="insight-overview-modal-v211__hero-value">{payload.generatedAt ? shamsi(payload.generatedAt) : 'ثبت نشده'}</div>
              </article>
              <article className="insight-overview-modal-v211__hero-card">
                <div className="insight-overview-modal-v211__hero-label">نرخ تکرار موفق</div>
                <div className="insight-overview-modal-v211__hero-value">{formatExactPercentText(successRate)}</div>
              </article>
            </div>

            <article className="insight-overview-modal-v211__brief">
              <div className="insight-overview-modal-v211__brief-title">
                <i className="fa-solid fa-route" /> جمع‌بندی رفتاری
              </div>
              <p className="insight-overview-modal-v211__brief-text">
                این مودال مشخص می‌کند کدام پیشنهادها بیشتر تکرار شده‌اند، چند مورد هنوز باز هستند و چرخه تکرار آن‌ها با چه فاصله‌ای در عملیات فروشگاه ظاهر می‌شود.
              </p>
            </article>

            <div className="insight-overview-modal-v211__content-grid">
              <article className="insight-overview-modal-v211__panel">
                <div className="insight-overview-modal-v211__panel-head">
                  <h3 className="insight-overview-modal-v211__panel-title">فهرست پیشنهادهای پرتکرار</h3>
                  <span className="insight-overview-modal-v211__panel-note">{formatExactNumberText(repetitionRows.length)} ردیف</span>
                </div>
                <div className="insight-overview-modal-v211__panel-body">
                  <div className="insight-overview-modal-v211__table-head" style={{ gridTemplateColumns: 'minmax(0,1.25fr) .45fr .75fr .65fr' }}>
                    <span>پیشنهاد</span>
                    <span>دفعات</span>
                    <span>آخرین اجرا</span>
                    <span>وضعیت</span>
                  </div>
                  {repetitionRows.slice(0, 10).map((row) => (
                    <div key={row.id} className="insight-overview-modal-v211__table-row" style={{ gridTemplateColumns: 'minmax(0,1.25fr) .45fr .75fr .65fr' }}>
                      <div className="insight-overview-modal-v211__cell-title">
                        <strong>{row.title}</strong>
                        <div className="insight-overview-modal-v211__cell-sub">{row.typeLabel}</div>
                      </div>
                      <div className="text-sm font-black text-slate-900 dark:text-white">{formatExactNumberText(row.count)} بار</div>
                      <div className="text-xs font-black text-slate-500 dark:text-slate-300">{row.last ? shamsi(row.last) : '—'}</div>
                      <div><span className={rowToneClass(row.statusKey)}>{row.status}</span></div>
                    </div>
                  ))}
                  {!repetitionRows.length ? <div className="insight-overview-modal-v211__empty">پیشنهاد پرتکراری در حافظه تصمیمات این بازه ثبت نشده است.</div> : null}
                </div>
              </article>

              <article className="insight-overview-modal-v211__panel">
                <div className="insight-overview-modal-v211__panel-head">
                  <h3 className="insight-overview-modal-v211__panel-title">چرخه تکرار</h3>
                  <span className="insight-overview-modal-v211__panel-note">تحلیل فشرده</span>
                </div>
                <div className="insight-overview-modal-v211__panel-body">
                  <div className="insight-overview-modal-v211__mini-grid">
                    <div className="insight-overview-modal-v211__mini-card">
                      <div className="insight-overview-modal-v211__mini-label">بیشترین تکرار در ۷ روز</div>
                      <div className="insight-overview-modal-v211__mini-value">{formatExactNumberText(maxRepeat)}</div>
                    </div>
                    <div className="insight-overview-modal-v211__mini-card">
                      <div className="insight-overview-modal-v211__mini-label">تکرار موفق</div>
                      <div className="insight-overview-modal-v211__mini-value">{formatExactPercentText(successRate)}</div>
                    </div>
                    <div className="insight-overview-modal-v211__mini-card">
                      <div className="insight-overview-modal-v211__mini-label">بدون نتیجه</div>
                      <div className="insight-overview-modal-v211__mini-value">{formatExactPercentText(pendingRate)}</div>
                    </div>
                    <div className="insight-overview-modal-v211__mini-card">
                      <div className="insight-overview-modal-v211__mini-label">فاصله تقریبی تکرار</div>
                      <div className="insight-overview-modal-v211__mini-value">{formatExactNumberText(avgGap)} روز</div>
                    </div>
                  </div>

                  <div className="insight-overview-modal-v211__stats-grid mt-3">
                    <div className="insight-overview-modal-v211__mini-card">
                      <div className="insight-overview-modal-v211__stat-label">اقدام‌های باز</div>
                      <div className="insight-overview-modal-v211__mini-value">{formatExactNumberText(openRepeat)} مورد</div>
                      <div className="mt-2 text-xs font-bold leading-6 text-slate-500 dark:text-slate-300">این موارد هنوز بسته نشده‌اند و باید به نتیجه مشخص برسند تا نرخ یادگیری بهبود یابد.</div>
                    </div>
                  </div>
                </div>
              </article>
            </div>

            <article className="insight-overview-modal-v211__footer-note">
              <div className="insight-overview-modal-v211__footer-title"><i className="fa-solid fa-rotate" /> جمع‌بندی اجرایی</div>
              <p className="insight-overview-modal-v211__footer-text">تکرار زیاد یک پیشنهاد نشانه حساسیت عملیاتی آن موضوع است. ثبت نتیجه برای موارد پرتکرار کمک می‌کند سیستم پیشنهادهای بعدی را دقیق‌تر و کم‌نویزتر ارائه کند.</p>
            </article>
          </section>

          <aside className="insight-overview-modal-v211__aside">
            <div className="insight-overview-modal-v211__aside-grid">
              {repetitionKpis.map((card) => (
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
