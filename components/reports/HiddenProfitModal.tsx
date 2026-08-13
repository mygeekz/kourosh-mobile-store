import { formatExactNumberText } from '../../utils/exactNumber';
import { Link } from 'react-router-dom';
import { SmartInsightModalPortal, useSmartInsightModalCssVars } from './SmartInsightModalShell';
import type {
  GetDecisionActionState,
  NumberFormatter,
  PercentFormatter,
  SeverityMetaMap,
  ShamsiFormatter,
  SmartInsightLike,
  SmartInsightPayload,
  UpdateDecisionMemory,
} from './types/smartInsightContracts';

type HiddenProfitModalProps = {
  selected: SmartInsightLike;
  payload: SmartInsightPayload;
  actingInsightId: string | null;
  onClose: () => void;
  percent: PercentFormatter;
  num: NumberFormatter;
  shamsi: ShamsiFormatter;
  severityMeta: SeverityMetaMap;
  getDecisionActionState: GetDecisionActionState;
  updateDecisionMemory: UpdateDecisionMemory;
};

type Tone = 'emerald' | 'blue' | 'amber' | 'violet';

type CompactCard = {
  label: string;
  value: string;
  hint: string;
  icon: string;
  tone: Tone;
};

const toneClass = (tone: Tone) => `profitfull237__icon profitfull237__icon--${tone}`;

export default function HiddenProfitModal({
  selected,
  payload,
  actingInsightId,
  onClose,
  percent,
  num,
  shamsi,
  severityMeta,
  getDecisionActionState,
  updateDecisionMemory,
}: HiddenProfitModalProps) {
  const modalStyle = useSmartInsightModalCssVars();
  const hiddenActionState = getDecisionActionState(selected);
  const metrics = selected.metrics || [];
  const reasons = selected.reasons || [];
  const actions = (selected.actions || []).filter((action) => action.to);
  const primaryMetric = metrics[0];
  const heroValue = String(primaryMetric?.value || formatExactNumberText(num(selected.score)));
  const heroLabel = String(primaryMetric?.label || 'فرصت سود');
  const occurrenceCount = formatExactNumberText(num(selected.decision?.occurrenceCount));
  const lastSeen = selected.decision?.lastGeneratedAt
    ? shamsi(selected.decision.lastGeneratedAt)
    : shamsi(selected.createdAt || payload.generatedAt);

  const topCards: CompactCard[] = [
    {
      label: 'امتیاز فرصت',
      value: formatExactNumberText(num(selected.score)),
      hint: 'اولویت این پیشنهاد',
      icon: 'fa-sparkles',
      tone: 'emerald',
    },
    {
      label: 'اعتماد تحلیل',
      value: percent(selected.confidence),
      hint: 'اتکاپذیری داده‌ها',
      icon: 'fa-shield-halved',
      tone: 'blue',
    },
    {
      label: 'دفعات ثبت',
      value: `${occurrenceCount} بار`,
      hint: 'از حافظه تصمیم',
      icon: 'fa-rotate',
      tone: 'amber',
    },
  ];

  const memoryCards: CompactCard[] = [
    {
      label: 'وضعیت',
      value: selected.decision?.statusLabel || 'باز',
      hint: 'جریان فعلی',
      icon: 'fa-circle-dot',
      tone: 'blue',
    },
    {
      label: 'تصمیم ثبت‌شده',
      value: selected.decision?.decisionLabel || 'در انتظار تصمیم',
      hint: 'آخرین تصمیم کاربر',
      icon: 'fa-clipboard-check',
      tone: 'violet',
    },
    {
      label: 'آخرین شناسایی',
      value: lastSeen,
      hint: 'زمان آخرین ثبت',
      icon: 'fa-calendar-days',
      tone: 'amber',
    },
    {
      label: 'دسته فرصت',
      value: selected.category || 'فرصت سود',
      hint: 'نوع این پیشنهاد',
      icon: 'fa-seedling',
      tone: 'emerald',
    },
  ];

  const modal = (
    <div className="profitfull237" style={modalStyle} onClick={onClose}>
      <section className="profitfull237__dialog" onClick={(event) => event.stopPropagation()} dir="rtl">
        <header className="profitfull237__header">
          <div className="profitfull237__hero-grid">
            <div className="profitfull237__title-block">
              <div className="profitfull237__chips">
                <span className="profitfull237__chip profitfull237__chip--engine">
                  <i className="fa-solid fa-sack-dollar" /> HIDDEN PROFIT ENGINE
                </span>
                <span className={`profitfull237__chip profitfull237__chip--severity profitfull237__chip--${selected.severity || 'medium'}`}>
                  <i className={`fa-solid ${severityMeta[selected.severity]?.icon || 'fa-circle'}`} />
                  {severityMeta[selected.severity]?.label || selected.severity}
                </span>
              </div>
              <h2>{selected.title}</h2>
              <p>{selected.summary}</p>

              <div className="profitfull237__topcards">
                {topCards.map((card) => (
                  <article key={card.label} className="profitfull237__topcard">
                    <div className={toneClass(card.tone)}>
                      <i className={`fa-solid ${card.icon}`} />
                    </div>
                    <div className="profitfull237__topcard-copy">
                      <small>{card.label}</small>
                      <strong>{card.value}</strong>
                      <span>{card.hint}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <aside className="profitfull237__amount-card">
              <div className={toneClass('emerald')}>
                <i className="fa-solid fa-coins" />
              </div>
              <small>{heroLabel}</small>
              <strong>{heroValue}</strong>
              <span>{selected.category || 'فرصت سود'}</span>
              <div className="profitfull237__amount-meta">
                <b>مسیر فعال</b>
                <strong>{formatExactNumberText(actions.length)}</strong>
              </div>
            </aside>
          </div>
        </header>

        <main className="profitfull237__body">
          <section className="profitfull237__grid">
            <article className="profitfull237__panel profitfull237__panel--metrics">
              <div className="profitfull237__panel-head">
                <h3>نمای فرصت سود</h3>
                <p>خلاصه‌ای از مسیرهای اصلی و ارزش‌هایی که این پیشنهاد بر پایه آن‌ها شکل گرفته است.</p>
              </div>
              <div className="profitfull237__metric-grid">
                {metrics.length ? metrics.slice(0, 4).map((metric, index) => (
                  <article key={`${metric.label}-${index}`} className="profitfull237__metric-card">
                    <div className={toneClass(index % 4 === 0 ? 'emerald' : index % 4 === 1 ? 'blue' : index % 4 === 2 ? 'amber' : 'violet')}>
                      <i className={`fa-solid ${index % 4 === 0 ? 'fa-coins' : index % 4 === 1 ? 'fa-chart-simple' : index % 4 === 2 ? 'fa-box-open' : 'fa-bolt'}`} />
                    </div>
                    <div className="profitfull237__metric-copy">
                      <small>{metric.label}</small>
                      <strong>{String(metric.value ?? '—')}</strong>
                    </div>
                  </article>
                )) : (
                  <div className="profitfull237__empty">معیار تکمیلی برای این فرصت از بک‌اند ارسال نشده است.</div>
                )}
              </div>
            </article>

            <article className="profitfull237__panel">
              <div className="profitfull237__panel-head">
                <h3>چرا این فرصت مهم است؟</h3>
                <p>دلایل اصلی شناسایی این فرصت به‌صورت خلاصه و کاربردی نمایش داده شده‌اند.</p>
              </div>
              <div className="profitfull237__reason-list">
                {reasons.length ? reasons.slice(0, 5).map((reason, index) => (
                  <div key={`${reason}-${index}`} className="profitfull237__reason-row">
                    <span className="profitfull237__reason-icon"><i className="fa-solid fa-check" /></span>
                    <p>{reason}</p>
                  </div>
                )) : (
                  <div className="profitfull237__empty">دلیل قابل نمایش برای این پیشنهاد ارسال نشده است.</div>
                )}
              </div>
            </article>

            <article className="profitfull237__panel">
              <div className="profitfull237__panel-head">
                <h3>حافظه تصمیم</h3>
                <p>وضعیت ثبت و تاریخچه این فرصت برای تصمیم‌های بعدی نگه‌داری می‌شود.</p>
              </div>
              <div className="profitfull237__memory-grid">
                {memoryCards.map((card) => (
                  <article key={card.label} className="profitfull237__memory-card">
                    <div className={toneClass(card.tone)}>
                      <i className={`fa-solid ${card.icon}`} />
                    </div>
                    <div className="profitfull237__memory-copy">
                      <small>{card.label}</small>
                      <strong>{card.value}</strong>
                      <span>{card.hint}</span>
                    </div>
                  </article>
                ))}
              </div>
            </article>

            <article className="profitfull237__panel">
              <div className="profitfull237__panel-head">
                <h3>اقدام‌های پیشنهادی</h3>
                <p>فقط مسیرهای واقعی و قابل اقدام این فرصت در این بخش نمایش داده می‌شوند.</p>
              </div>
              <div className="profitfull237__action-list">
                {actions.length ? actions.slice(0, 3).map((action, index) => (
                  <Link
                    key={`${action.label}-${index}`}
                    to={action.to || '/reports'}
                    className={`profitfull237__route ${index === 0 ? 'profitfull237__route--primary' : ''}`}
                  >
                    <span>{action.label}</span>
                    <i className={`fa-solid ${action.icon || 'fa-arrow-left'}`} />
                  </Link>
                )) : (
                  <div className="profitfull237__empty">مسیر قابل اقدام برای این فرصت ثبت نشده است.</div>
                )}
              </div>

              <div className="profitfull237__decision-row">
                <button
                  type="button"
                  disabled={hiddenActionState.isActing || hiddenActionState.isAccepted}
                  onClick={() => void updateDecisionMemory(selected, { userDecision: 'accepted', status: 'open' })}
                  className={`profitfull237__decision-btn profitfull237__decision-btn--primary ${hiddenActionState.isAccepted ? 'profitfull237__decision-btn--done' : ''}`}
                >
                  <i className={`fa-solid ${hiddenActionState.icon}`} />
                  {hiddenActionState.label}
                </button>
                <button
                  type="button"
                  disabled={actingInsightId === selected.id}
                  onClick={() => void updateDecisionMemory(selected, { userDecision: 'rejected', status: 'dismissed' })}
                  className="profitfull237__decision-btn profitfull237__decision-btn--ghost"
                >
                  <i className="fa-solid fa-ban" />
                  رد پیشنهاد
                </button>
              </div>
            </article>
          </section>
        </main>
      </section>
    </div>
  );

  return <SmartInsightModalPortal>{modal}</SmartInsightModalPortal>;
}
