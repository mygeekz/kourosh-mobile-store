import React from 'react';
import type { DailyBriefItem } from './types/smartInsightContracts';

type DailyBriefSectionProps = {
  dailyBrief: DailyBriefItem[];
};

function DailyBriefSection({
  dailyBrief,
}: DailyBriefSectionProps) {
  if (!dailyBrief.length) return null;

  return (

        <section className="sic230-brief rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/72">
          <div className="sic230-brief__head mb-3 flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
            <span className="sic230-brief__head-icon"><i className="fa-solid fa-wand-magic-sparkles" /></span>
            <span>خلاصه هوشمند بازه</span>
          </div>
          <div className="sic230-brief__grid grid gap-2 md:grid-cols-3">
            {dailyBrief.map((line, i) => (
              <div key={i} className="sic230-brief__item rounded-2xl bg-slate-50 px-3 py-3 text-sm font-bold leading-7 text-slate-600 dark:bg-slate-950/60 dark:text-slate-300">
                <span className="sic230-brief__item-icon"><i className={`fa-solid ${i === 0 ? 'fa-coins' : i === 1 ? 'fa-arrow-trend-down' : i === 2 ? 'fa-bolt' : 'fa-circle-info'}`} /></span>
                <span className="sic230-brief__item-text">{line}</span>
              </div>
            ))}
          </div>
        </section>
  );
}

export default React.memo(DailyBriefSection);
