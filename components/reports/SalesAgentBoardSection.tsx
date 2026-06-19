import React from 'react';
import SalesAgentLeadCard from './SalesAgentLeadCard';
import type { SalesAgentLeadCardData } from './SalesAgentLeadCard';
import type { PercentFormatter } from './types/smartInsightContracts';

type SalesAgentBoardSectionProps = {
  salesAgentLeads: SalesAgentLeadCardData[];
  percent: PercentFormatter;
  onSendMessage: (lead: SalesAgentLeadCardData) => void;
};

function SalesAgentBoardSection({
  salesAgentLeads,
  percent,
  onSendMessage,
}: SalesAgentBoardSectionProps) {
  if (!salesAgentLeads.length) return null;

  return (

        <section className="sales-agent258-board overflow-hidden rounded-[28px] border border-fuchsia-200 bg-white shadow-sm dark:border-fuchsia-500/25 dark:bg-slate-900/72">
          <div className="sales-agent258-board__header flex flex-col gap-3 border-b border-fuchsia-100 bg-gradient-to-l from-fuchsia-50 to-white p-4 dark:border-fuchsia-500/20 dark:from-fuchsia-500/10 dark:to-slate-950/60 md:flex-row md:items-center md:justify-between">
            <div className="sales-agent258-board__copy">
              <div className="sales-agent258-board__kicker inline-flex items-center gap-2 rounded-full bg-fuchsia-100 px-3 py-1 text-[11px] font-black text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-200">
                <i className="fa-solid fa-headset" />
                AI SALES AGENT
              </div>
              <h2 className="mt-2 text-lg font-black text-slate-950 dark:text-white">دستیار فروش فعال و پیام آماده مشتری</h2>
              <p className="mt-1 text-xs font-bold leading-6 text-slate-500 dark:text-slate-300">سیستم از شخصیت مشتری، آخرین خرید، ریسک وصول و فرصت سود استفاده می‌کند تا اقدام فروش بعدی با یک ساختار یکپارچه، سریع و قابل ارسال آماده شود.</p>
            </div>
            <span className="sales-agent258-board__count inline-flex min-h-[38px] items-center justify-center rounded-2xl border border-fuchsia-200 bg-white px-3 text-xs font-black text-fuchsia-700 dark:border-fuchsia-500/25 dark:bg-slate-950 dark:text-fuchsia-200">
              {salesAgentLeads.length.toLocaleString('fa-IR')} لید فعال
            </span>
          </div>
          <div className="sales-agent258-board__grid grid gap-3 p-4 xl:grid-cols-2">
            {salesAgentLeads.slice(0, 4).map((lead) => (
              <SalesAgentLeadCard
                key={lead.id}
                lead={lead}
                priorityLabel={percent(lead.priority)}
                onSendMessage={onSendMessage}
              />
            ))}
          </div>
        </section>
  );
}

export default React.memo(SalesAgentBoardSection);
