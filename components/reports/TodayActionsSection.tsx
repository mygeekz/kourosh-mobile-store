import React from 'react';
import type { GetDecisionActionState, NumberFormatter, SmartInsightExecutiveBrain, SmartInsightLearning, SmartInsightLike, SmartInsightPayload, TodayActionItem, UpdateDecisionMemory } from './types/smartInsightContracts';

import { Link } from 'react-router-dom';

type TodayActionsSectionProps = {
  payload: SmartInsightPayload;
  insights: SmartInsightLike[];
  alertManagementItems: TodayActionItem[];
  executiveBrain: SmartInsightExecutiveBrain;
  learning: SmartInsightLearning;
  getDecisionActionState: GetDecisionActionState;
  updateDecisionMemory: UpdateDecisionMemory;
  setAlertsBoardFilter: (value: unknown) => void;
  setAlertsBoardSelectedId: (value: string | null) => void;
  setSelected: (value: SmartInsightLike | TodayActionItem | null) => void;
  num: NumberFormatter;
};

function TodayActionsSection({
  payload,
  insights,
  alertManagementItems,
  executiveBrain,
  learning,
  getDecisionActionState,
  updateDecisionMemory,
  setAlertsBoardFilter,
  setAlertsBoardSelectedId,
  setSelected,
  num,
}: TodayActionsSectionProps) {
  if (!(payload.todayActions || []).length) return null;

  return (

        <section className="smart-today-v183">
          <div className="smart-today-v183__header">
            <button
              type="button"
              className="smart-today-v183__count"
              onClick={() => {
                setAlertsBoardFilter('all');
                setAlertsBoardSelectedId(alertManagementItems[0]?.id || null);
                setSelected({
                  id: 'alert-management-board',
                  type: 'alert_management',
                  category: 'dashboard',
                  title: 'مدیریت هشدارها و پیشنهادات فوری',
                  summary: 'داشبورد متمرکز برای اولویت‌بندی، بررسی و اقدام روی هشدارها و پیشنهادهای فوری.',
                  severity: 'high',
                  score: alertManagementItems.length,
                  confidence: num(payload.predictiveEngine?.confidence || executiveBrain.confidence || learning.confidence),
                  reasons: [],
                  metrics: [],
                  actions: [],
                });
              }}
            >
              <i className="fa-solid fa-list-check" />
              {Math.min(3, num(payload.todayActions?.length)).toLocaleString('fa-IR')} اقدام پیشنهادی
            </button>
            <div className="smart-today-v183__heading">
              <div className="smart-today-v183__eyebrow"><i className="fa-solid fa-list-check smart-today-v185__eyebrow-icon" /> TODAY COMMANDS</div>
              <h2>امروز چه کار کنم؟</h2>
              <p>سه اقدام مهم‌تر بر اساس ریسک، اثر مالی و حافظه تصمیمات فروشگاه.</p>
            </div>
          </div>

          <div className="smart-today-v183__grid">
            {(payload.todayActions || []).slice(0, 3).map((action, index) => {
              const linkedInsight = insights.find((x) => x.id === action.insightId);
              const linkedActionState = linkedInsight ? getDecisionActionState(linkedInsight) : null;
              const accentClass = action.severity === 'critical'
                ? 'smart-today-v183__card--critical'
                : action.severity === 'high'
                  ? 'smart-today-v183__card--high'
                  : 'smart-today-v183__card--info';
              const cardIcon = action.icon || (action.severity === 'critical' ? 'fa-arrow-trend-down' : action.severity === 'high' ? 'fa-cart-shopping' : 'fa-shield-halved');
              return (
                <article key={action.id} className={`smart-today-v183__card ${accentClass}`}>
                  <div className="smart-today-v183__card-top">
                    <div className="smart-today-v183__meta-row">
                      <span className="smart-today-v183__score-pill">امتیاز {num(action.priority).toLocaleString('fa-IR')}</span>
                      <span className={`smart-today-v183__priority-pill smart-today-v183__priority-pill--${action.severity === 'critical' ? 'critical' : action.severity === 'high' ? 'high' : 'info'}`}>
                        <span className="smart-today-v183__priority-dot" />
                        اولویت {(index + 1).toLocaleString('fa-IR')}
                      </span>
                    </div>
                    <span className="smart-today-v183__icon-bubble" aria-hidden="true">
                      <i className={`fa-solid ${cardIcon}`} />
                    </span>
                  </div>

                  <h3>{action.title}</h3>
                  <p>{action.summary}</p>

                  <div className="smart-today-v183__divider" />

                  {action.to ? (
                    <Link to={action.to} className="smart-today-v183__cta">
                      <span>{action.actionLabel || 'ورود به بخش مرتبط'}</span>
                      <i className="fa-solid fa-arrow-left" />
                    </Link>
                  ) : (
                    <button type="button" className="smart-today-v183__cta" onClick={() => linkedInsight ? setSelected(linkedInsight) : undefined}>
                      <span>{action.actionLabel || 'بررسی جزئیات'}</span>
                      <i className="fa-solid fa-arrow-left" />
                    </button>
                  )}

                  <div className="smart-today-v183__footer-actions">
                    {linkedInsight ? (
                      <button
                        type="button"
                        disabled={Boolean(linkedActionState?.isActing || linkedActionState?.isAccepted)}
                        onClick={() => void updateDecisionMemory(linkedInsight, { userDecision: 'accepted', status: 'open', actionLabel: action.actionLabel || linkedInsight.actions?.[0]?.label || '' })}
                        className={`smart-today-v183__sub-btn ${linkedActionState?.isAccepted ? 'smart-today-v183__sub-btn--done' : 'smart-today-v183__sub-btn--pending'}`}
                      >
                        <i className={`fa-solid ${linkedActionState?.icon || 'fa-check'}`} />
                        {linkedActionState?.label || 'اقدام شود'}
                      </button>
                    ) : <span />}
                    {linkedInsight ? (
                      <button type="button" onClick={() => setSelected(linkedInsight)} className="smart-today-v183__sub-btn smart-today-v183__sub-btn--ghost">
                        <i className="fa-solid fa-circle-question" />
                        چرا؟
                      </button>
                    ) : <span />}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
  );
}

export default React.memo(TodayActionsSection);
