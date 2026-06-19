import React from 'react';
import { Link } from 'react-router-dom';
import type {
  GetDecisionActionState,
  NumberFormatter,
  PercentFormatter,
  SeverityMetaMap,
  SmartInsightLike,
  UpdateDecisionMemory,
} from './types/smartInsightContracts';

type GenericSmartInsightModalProps = {
  selected: SmartInsightLike;
  actingInsightId: string | null;
  severityMeta: SeverityMetaMap;
  num: NumberFormatter;
  percent: PercentFormatter;
  getDecisionActionState: GetDecisionActionState;
  updateDecisionMemory: UpdateDecisionMemory;
  onClose: () => void;
};

function GenericSmartInsightModal({
  selected,
  actingInsightId,
  severityMeta,
  num,
  percent,
  getDecisionActionState,
  updateDecisionMemory,
  onClose,
}: GenericSmartInsightModalProps) {
  const genericActionState = getDecisionActionState(selected);

  return (
    <div className="smart-insight-modal-v185 fixed inset-0 z-[2200] flex items-center justify-center bg-slate-950/42 p-4 backdrop-blur-md lg:pr-[280px]" onClick={() => onClose()}>
      <div className="smart-insight-modal-v185__surface w-full overflow-hidden rounded-[30px] border border-slate-200/95 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950" onClick={(e) => e.stopPropagation()}>
        <div className="smart-insight-modal-v185__header flex items-start gap-4 border-b border-slate-100 p-6 dark:border-slate-800">
          <div className="smart-insight-modal-v186__title min-w-0">
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${severityMeta[selected.severity]?.badge || severityMeta.medium.badge}`}>{severityMeta[selected.severity]?.label || selected.severity}</div>
            <h2 className="mt-3 text-[1.55rem] font-black text-slate-950 dark:text-white">{selected.title}</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">{selected.summary}</p>
          </div>
        </div>
        <div className="smart-insight-modal-v185__body overflow-y-auto p-6">
          <div className="smart-insight-modal-v186__hero-grid grid gap-3 sm:grid-cols-3">
            <div className="rounded-[20px] border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-900"><div className="text-[11px] font-black text-slate-500">امتیاز</div><div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{num(selected.score).toLocaleString('fa-IR')}</div></div>
            <div className="rounded-[20px] border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-900"><div className="text-[11px] font-black text-slate-500">اعتماد</div><div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{percent(selected.confidence)}</div></div>
            <div className="rounded-[20px] border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-900"><div className="text-[11px] font-black text-slate-500">دسته</div><div className="mt-2 text-sm font-black text-slate-900 dark:text-white">{selected.category}</div></div>
          </div>

          <div className="smart-insight-modal-v186__content-grid mt-4 grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
            <section className="smart-insight-modal-v186__panel smart-insight-modal-v186__panel--reasons rounded-[24px] border border-slate-200 p-5 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">چرا این پیشنهاد؟</h3>
              <ul className="mt-3 space-y-3">
                {(selected.reasons || []).map((r, i) => <li key={i} className="flex items-start gap-2 text-sm font-bold leading-7 text-slate-600 dark:text-slate-300"><i className="fa-solid fa-check mt-1.5 text-emerald-500" /><span>{r}</span></li>)}
              </ul>
            </section>

            <section className="smart-insight-modal-v186__panel smart-insight-modal-v186__panel--metrics rounded-[24px] border border-slate-200 p-5 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">شاخص‌های عددی</h3>
              <div className="mt-3 grid gap-2">
                {(selected.metrics || []).map((m, i) => <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50/85 p-3 dark:border-slate-800 dark:bg-slate-900"><div className="text-[11px] font-black text-slate-500">{m.label}</div><div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{m.value}</div></div>)}
              </div>
            </section>

            <section className="smart-insight-modal-v186__panel smart-insight-modal-v186__panel--memory rounded-[24px] border border-indigo-200 bg-indigo-50/45 p-5 dark:border-indigo-500/25 dark:bg-indigo-500/10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">حافظه تصمیم این پیشنهاد</h3>
                  <p className="mt-1 text-xs font-bold leading-6 text-slate-500 dark:text-slate-300">سیستم وضعیت اجرای پیشنهاد و نتیجه آن را ثبت می‌کند تا مبنای یادگیری عملیاتی دقیق‌تری فراهم شود.</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-indigo-700 shadow-sm dark:bg-slate-950 dark:text-indigo-200">{selected.decision?.decisionLabel || 'در انتظار تصمیم'}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" disabled={genericActionState.isActing || genericActionState.isAccepted} onClick={() => void updateDecisionMemory(selected, { userDecision: 'accepted', status: 'open' })} className={`smart-decision-action-btn ${genericActionState.isAccepted ? 'smart-decision-action-btn--done' : 'smart-decision-action-btn--pending'}`}><i className={`fa-solid ${genericActionState.icon}`} /> {genericActionState.label}</button>
                <button type="button" disabled={actingInsightId === selected.id} onClick={() => void updateDecisionMemory(selected, { userDecision: 'rejected', status: 'dismissed' })} className="inline-flex min-h-[40px] items-center gap-2 rounded-[16px] border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 disabled:opacity-60"><i className="fa-solid fa-xmark" /> رد شد</button>
                <button type="button" disabled={actingInsightId === selected.id} onClick={() => void updateDecisionMemory(selected, { outcome: 'positive', status: 'closed' })} className="inline-flex min-h-[40px] items-center gap-2 rounded-[16px] bg-emerald-600 px-3 text-xs font-black text-white shadow-sm disabled:opacity-60"><i className="fa-solid fa-trophy" /> نتیجه مثبت</button>
                <button type="button" disabled={actingInsightId === selected.id} onClick={() => void updateDecisionMemory(selected, { outcome: 'negative', status: 'closed' })} className="inline-flex min-h-[40px] items-center gap-2 rounded-[16px] bg-rose-600 px-3 text-xs font-black text-white shadow-sm disabled:opacity-60"><i className="fa-solid fa-triangle-exclamation" /> نتیجه منفی</button>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/90 p-3 dark:bg-slate-950/70"><div className="text-[11px] font-black text-slate-500">دفعات تکرار</div><div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{num(selected.decision?.occurrenceCount).toLocaleString('fa-IR')}</div></div>
                <div className="rounded-2xl bg-white/90 p-3 dark:bg-slate-950/70"><div className="text-[11px] font-black text-slate-500">وضعیت</div><div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{selected.decision?.statusLabel || 'باز'}</div></div>
                <div className="rounded-2xl bg-white/90 p-3 dark:bg-slate-950/70"><div className="text-[11px] font-black text-slate-500">نتیجه</div><div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{selected.decision?.outcomeLabel || 'نتیجه ثبت نشده'}</div></div>
              </div>
            </section>

            {(selected.actions || []).length ? <section className="smart-insight-modal-v186__panel smart-insight-modal-v186__panel--actions rounded-[24px] border border-slate-200 p-5 dark:border-slate-800"><h3 className="text-sm font-black text-slate-900 dark:text-white">اقدام پیشنهادی</h3><div className="mt-3 flex flex-wrap gap-2">{selected.actions.map((a, i) => a.to ? <Link key={i} to={a.to} className="inline-flex min-h-[42px] items-center gap-2 rounded-[16px] bg-slate-950 px-4 text-sm font-black text-white dark:bg-white dark:text-slate-950"><i className={`fa-solid ${a.icon || 'fa-arrow-left'}`} />{a.label}</Link> : <span key={i} className="inline-flex min-h-[42px] items-center gap-2 rounded-[16px] border border-slate-200 px-4 text-sm font-black text-slate-700 dark:border-slate-800 dark:text-slate-200"><i className={`fa-solid ${a.icon || 'fa-circle-dot'}`} />{a.label}</span>)}</div></section> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(GenericSmartInsightModal);
