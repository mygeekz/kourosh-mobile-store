import React from 'react';
import { Link } from 'react-router-dom';

export type SalesAgentLeadCardData = {
  id: string;
  customerId?: string | number;
  customerName: string;
  phoneNumber?: string;
  segment?: string;
  intent?: string;
  title: string;
  priority?: number;
  recommendedChannel?: string;
  targetProduct?: string;
  message?: string;
  reason?: string;
  expectedImpact?: string;
  ctaLabel?: string;
  to?: string;
};

type SalesAgentLeadCardProps = {
  lead: SalesAgentLeadCardData;
  priorityLabel: string;
  onSendMessage: (lead: SalesAgentLeadCardData) => void;
};

export default function SalesAgentLeadCard({
  lead,
  priorityLabel,
  onSendMessage,
}: SalesAgentLeadCardProps) {
  const customerProfileLink = lead.to || (lead.customerId ? `/customers/${lead.customerId}` : '');

  return (
    <article className="sales-agent258-card sales-agent260-card rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/55">
      <div className="sales-agent258-card__head sales-agent260-card__head flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="sales-agent258-card__identity sales-agent260-card__identity min-w-0">
          <div className="sales-agent258-card__chips sales-agent260-card__chips flex flex-wrap items-center gap-2">
            <span className="sales-agent258-card__chip sales-agent258-card__chip--segment sales-agent260-card__chip rounded-full bg-fuchsia-50 px-2.5 py-1 text-[11px] font-black text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-200">
              {lead.segment || 'عادی'}
            </span>
            <span className="sales-agent258-card__chip sales-agent260-card__chip rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              {lead.expectedImpact || 'افزایش فروش'}
            </span>
          </div>
          <h3 className="sales-agent258-card__name sales-agent260-card__name mt-3 text-base font-black text-slate-950 dark:text-white">{lead.customerName}</h3>
          <p className="sales-agent258-card__title sales-agent260-card__title mt-1 text-sm font-black text-slate-700 dark:text-slate-200">{lead.title}</p>
        </div>
        <div className="sales-agent258-card__priority sales-agent260-card__priority smart-neutral-chip shrink-0 rounded-2xl px-3 py-3 text-right text-[11px] font-black">
          <span className="block text-slate-500 dark:text-slate-400">اولویت</span>
          <strong className="mt-1 block text-sm font-black text-slate-950 dark:text-white">{priorityLabel}</strong>
        </div>
      </div>

      <div className="sales-agent258-card__message sales-agent260-card__message mt-4 rounded-[20px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
        <div className="sales-agent258-card__message-label sales-agent260-card__message-label mb-2 inline-flex items-center gap-2 text-[11px] font-black text-fuchsia-700 dark:text-fuchsia-200">
          <i className="fa-solid fa-message" />
          پیام آماده ارسال
        </div>
        <p className="sales-agent258-card__message-text sales-agent260-card__message-text text-sm font-bold leading-8 text-slate-700 dark:text-slate-200">
          {lead.message || 'برای این مشتری هنوز متن آماده تولید نشده است.'}
        </p>
      </div>

      <div className="sales-agent258-card__meta sales-agent260-card__meta mt-3 grid gap-2 md:grid-cols-3">
        <div className="sales-agent258-card__meta-item sales-agent260-card__meta-item rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="sales-agent258-card__meta-label sales-agent260-card__meta-label text-[10px] font-black text-slate-500"><i className="fa-solid fa-paper-plane" /> کانال</div>
          <div className="mt-1 text-xs font-black text-slate-900 dark:text-white">{lead.recommendedChannel || 'تماس'}</div>
        </div>
        <div className="sales-agent258-card__meta-item sales-agent260-card__meta-item rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="sales-agent258-card__meta-label sales-agent260-card__meta-label text-[10px] font-black text-slate-500"><i className="fa-solid fa-box" /> محصول هدف</div>
          <div className="mt-1 line-clamp-2 text-xs font-black text-slate-900 dark:text-white">{lead.targetProduct || '—'}</div>
        </div>
        <div className="sales-agent258-card__meta-item sales-agent260-card__meta-item rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="sales-agent258-card__meta-label sales-agent260-card__meta-label text-[10px] font-black text-slate-500"><i className="fa-solid fa-circle-info" /> دلیل</div>
          <div className="mt-1 line-clamp-2 text-xs font-black text-slate-900 dark:text-white">{lead.reason || 'سیگنال فروش فعال'}</div>
        </div>
      </div>

      <div className="sales-agent258-card__footer sales-agent260-card__footer mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <button
          type="button"
          onClick={() => onSendMessage(lead)}
          className="sales-agent258-card__action sales-agent258-card__action--primary sales-agent260-card__action sales-agent260-card__action--primary inline-flex min-h-[40px] items-center gap-2 rounded-[16px] bg-fuchsia-600 px-3 text-xs font-black text-white transition hover:-translate-y-0.5"
        >
          <i className="fa-solid fa-paper-plane" />
          ارسال پیام
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {customerProfileLink ? (
            <Link to={customerProfileLink} className="sales-agent258-card__action sales-agent258-card__action--secondary sales-agent260-card__action sales-agent260-card__action--secondary smart-action-link inline-flex min-h-[40px] items-center gap-2 rounded-[16px] px-3 text-xs font-black transition hover:-translate-y-0.5">
              <i className="fa-solid fa-user" />
              مشاهده پرونده
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
