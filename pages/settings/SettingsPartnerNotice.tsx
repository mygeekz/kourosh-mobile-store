import React from 'react';
import { Link } from 'react-router-dom';
import type { PartnerShareStatus } from './settingsHelpers';

type SettingsPartnerNoticeProps = {
  visible: boolean;
  chipIcon: string;
  status: PartnerShareStatus;
};

const statusToneClass: Record<PartnerShareStatus['state'], string> = {
  loading: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
  ready: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
  empty: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
  error: 'bg-rose-500/10 text-rose-700 dark:text-rose-200',
};

const SettingsPartnerNotice: React.FC<SettingsPartnerNoticeProps> = ({
  visible,
  chipIcon,
  status,
}) => {
  if (!visible) return null;

  return (
    <Link
      to="/settings/store-ownership"
      className="grid min-h-16 grid-cols-[32px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-[20px] border border-amber-200/70 bg-amber-50/70 px-3.5 py-3 text-right text-slate-900 no-underline shadow-none transition-[transform,border-color,background-color] duration-150 hover:-translate-y-px hover:border-amber-300 hover:bg-amber-50 sm:grid-cols-[32px_minmax(0,1fr)_auto_auto] dark:border-amber-400/20 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:border-amber-300/30 dark:hover:bg-slate-900"
      data-ui-settings-card="attention"
    >
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center border-0 bg-transparent text-amber-600 shadow-none dark:text-amber-300" aria-hidden="true">
        <i className="fa-solid fa-handshake" />
      </span>

      <span className="grid min-w-0 gap-0.5">
        <strong className="text-[12px] font-black leading-5">ساختار مالکیت و تسهیم سود نیاز به تکمیل دارد</strong>
        <small className="text-[10.5px] font-medium leading-5 text-slate-600 dark:text-slate-400">برای محاسبه دقیق سود شرکا، جمع سهم‌ها و مالکیت موجودی را نهایی کن.</small>
      </span>

      <span
        className={`col-start-2 inline-flex w-fit items-center gap-1.5 rounded-full border-0 px-2.5 py-1 text-[10px] font-black shadow-none sm:col-start-auto ${statusToneClass[status.state]}`}
        title={status.hint}
      >
        <i className={`fa-solid ${chipIcon}`} />
        {status.label}
      </span>

      <span className="col-start-2 inline-flex items-center gap-1.5 border-0 bg-transparent text-[10.5px] font-black text-primary shadow-none sm:col-start-auto">
        تکمیل تنظیمات
        <i className="fa-solid fa-arrow-left" />
      </span>
    </Link>
  );
};

export default SettingsPartnerNotice;
