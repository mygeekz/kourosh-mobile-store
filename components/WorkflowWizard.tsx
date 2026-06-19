import React, { useEffect, useMemo } from 'react';

export type WizardStep = {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  anchorId?: string;
};

type Props = {
  steps: WizardStep[];
  stepIndex: number;
  onStepChange: (i: number) => void;
  className?: string;
  sticky?: boolean;
  showBottomBar?: boolean;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const scrollToAnchor = (anchorId?: string) => {
  if (!anchorId || typeof document === 'undefined') return;
  const el = document.getElementById(anchorId);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export const WorkflowWizard: React.FC<Props> = ({
  steps,
  stepIndex,
  onStepChange,
  className,
  sticky = true,
  showBottomBar = true,
}) => {
  const max = steps.length - 1;
  const current = steps[clamp(stepIndex, 0, max)];
  const canPrev = stepIndex > 0;
  const canNext = stepIndex < max;

  const progress = useMemo(() => {
    if (steps.length <= 1) return 100;
    return Math.round(((stepIndex + 1) / steps.length) * 100);
  }, [stepIndex, steps.length]);

  useEffect(() => {
    scrollToAnchor(current?.anchorId);
  }, [current?.anchorId]);

  return (
    <div className={[className ?? '', sticky ? 'sticky top-2 z-20' : ''].join(' ')}>
      <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white/95 shadow-[0_22px_52px_-42px_rgba(15,23,42,0.24)] backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/92" data-ui-workflow-wizard="true">
        <div className="border-b border-slate-100 px-3.5 py-3 dark:border-slate-800 md:px-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2.5">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-[0_16px_34px_-24px_rgba(15,23,42,0.48)] dark:bg-white dark:text-slate-900">
                  <i className={current?.icon ?? 'fa-solid fa-wand-magic-sparkles'} />
                </span>
                <div className="min-w-0 text-right">
                  <div className="text-[10px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    جریان فروش مرحله‌ای
                  </div>
                  <div className="mt-0.5 text-[15px] font-black text-slate-900 dark:text-slate-100 md:text-base">
                    {current?.title}
                  </div>
                  {current?.description ? (
                    <div className="mt-0.5 text-[11px] leading-5 text-slate-500 dark:text-slate-400 md:text-[12px]">
                      {current.description}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col gap-1.5 lg:max-w-[250px]">
              <div className="flex items-center justify-between text-[11px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400">
                <span>مرحله {stepIndex + 1} از {steps.length}</span>
                <span>{progress.toLocaleString('fa-IR')}٪</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-violet-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-2.5 p-3.5 md:grid-cols-3 md:p-4" data-skip-global-buttons="true">
          {steps.map((s, i) => {
            const active = i === stepIndex;
            const done = i < stepIndex;
            const stateTone = active
              ? 'border-slate-900 bg-slate-900 text-white shadow-[0_20px_44px_-28px_rgba(15,23,42,0.50)] dark:border-white dark:bg-white dark:text-slate-900'
              : done
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200'
                : 'border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200';
            const iconTone = active
              ? 'bg-white/12 text-white dark:bg-slate-900/10 dark:text-slate-900'
              : done
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300';

            return (
              <button
                key={s.id}
                type="button"
                data-skip-global-button="true"
                data-ui-workflow-step={active ? 'active' : done ? 'done' : 'idle'}
                onClick={() => onStepChange(i)}
                title={s.title}
                className={`group flex min-w-0 items-start gap-2.5 rounded-[18px] border px-3 py-3 text-right transition-all duration-200 hover:-translate-y-0.5 ${stateTone}`} 
              >
                <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconTone}`} >
                  <i className={done ? 'fa-solid fa-check' : s.icon ?? 'fa-solid fa-circle'} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-black md:text-[14px]">{s.title}</span>
                    <span className={`inline-flex h-5 min-w-[1.35rem] items-center justify-center rounded-full px-1.5 text-[9px] font-black ${active ? 'bg-white/12 text-white dark:bg-slate-900/10 dark:text-slate-900' : done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200' : 'bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400'}`}>
                      {(i + 1).toLocaleString('fa-IR')}
                    </span>
                  </span>
                  {s.description ? (
                    <span className={`mt-0.5 block whitespace-normal text-[11px] leading-5 ${active ? 'text-white/80 dark:text-slate-700' : 'text-slate-500 dark:text-slate-400'}`}>
                      {s.description}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {showBottomBar ? (
        <div data-ui-workflow-actions="true" className="mt-2.5 flex items-center justify-between gap-2.5 rounded-[20px] border border-slate-200 bg-white/95 px-3 py-2.5 shadow-[0_18px_42px_-38px_rgba(15,23,42,0.24)] dark:border-slate-800 dark:bg-slate-950/92">
          <button
            type="button"
            data-skip-global-button="true"
            className={`inline-flex min-h-[38px] items-center gap-2 rounded-full px-3 text-[13px] font-black transition ${canPrev ? 'border border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600' : 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600'}`}
            onClick={() => canPrev && onStepChange(stepIndex - 1)}
            disabled={!canPrev}
          >
            <i className="fa-solid fa-arrow-right text-[12px]" />
            قبلی
          </button>

          <div className="text-center text-[10px] font-black tracking-[0.1em] text-slate-500 dark:text-slate-400">
            برای جابجایی مستقیم، روی کارت هر مرحله هم می‌توانی کلیک کنی
          </div>

          <button
            type="button"
            data-skip-global-button="true"
            className={`inline-flex min-h-[38px] items-center gap-2 rounded-full px-3 text-[13px] font-black transition ${canNext ? 'bg-emerald-500 text-white hover:-translate-y-0.5 hover:bg-emerald-600 shadow-[0_20px_36px_-24px_rgba(16,185,129,0.48)]' : 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600'}`}
            onClick={() => canNext && onStepChange(stepIndex + 1)}
            disabled={!canNext}
          >
            بعدی
            <i className="fa-solid fa-arrow-left text-[12px]" />
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default WorkflowWizard;
