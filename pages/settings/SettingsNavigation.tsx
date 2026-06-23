import React from 'react';
import { Link } from 'react-router-dom';
import type { PartnerShareStatus, TabKey } from './settingsHelpers';

type SettingsNavigationProps = {
  tab: TabKey;
  setTab: (tab: TabKey) => void;
  isAdmin: boolean;
  isSettingsTabRuntimeEnabled: (tab: TabKey) => boolean;
  canManageStoreOwnership: boolean;
  partnerSetupNeedsAttention: boolean;
  partnerShareChipClass: string;
  partnerShareChipIcon: string;
  partnerShareStatus: PartnerShareStatus;
};

const SettingsNavigation: React.FC<SettingsNavigationProps> = ({
  tab,
  setTab,
  isAdmin,
  isSettingsTabRuntimeEnabled,
  canManageStoreOwnership,
  partnerSetupNeedsAttention,
  partnerShareChipClass,
  partnerShareChipIcon,
  partnerShareStatus,
}) => (
<>
{/* Mobile quick tabs */}
<div className="settings-mobile-tabs-shell lg:hidden -mx-4 px-4 pt-4 pb-2 overflow-x-auto print:hidden" data-ui-settings-mobile-tabs="true">
  <div className="flex gap-2 min-w-max">
    {([
      { k: 'account', icon: 'fa-solid fa-user-shield', text: 'حساب' },
      { k: 'business', icon: 'fa-solid fa-store', text: 'کسب‌وکار' },
      { k: 'modules', icon: 'fa-solid fa-toggle-on', text: 'ماژول‌ها' },
      { k: 'local', icon: 'fa-solid fa-network-wired', text: 'دامنه محلی' },
      { k: 'pricing', icon: 'fa-solid fa-tags', text: 'هوش قیمت' },
      { k: 'smart', icon: 'fa-solid fa-microchip', text: 'هوشمندسازی' },
      { k: 'sms', icon: 'fa-solid fa-message', text: 'پیامک' },
      { k: 'telegram', icon: 'fa-brands fa-telegram', text: 'تلگرام' },
      { k: 'reminders', icon: 'fa-solid fa-bell', text: 'قوانین اعلان' },
      { k: 'style', icon: 'fa-solid fa-wand-magic-sparkles', text: 'استایل' },
      { k: 'users', icon: 'fa-solid fa-users', text: 'کاربران' },
      { k: 'data', icon: 'fa-solid fa-database', text: 'داده‌ها' },
    ] as { k: TabKey; icon: string; text: string }[]).filter(({ k }) => (isAdmin || k === 'account') && isSettingsTabRuntimeEnabled(k)).map(({ k, icon, text }) => (
      <button
        key={k}
        onClick={() => setTab(k)}
        data-ui-settings-tab={k}
        className={`settings-mobile-tab group inline-flex flex-row items-center justify-start gap-2 px-3 py-2 rounded-full text-sm border transition ${
          tab === k
            ? 'bg-primary text-white border-primary'
            : 'bg-surface text-text border-primary/10 hover:bg-primary/5 hover:text-primary'
        }`}
      >
        <i className={`${icon} text-[13px] transition-colors ${tab === k ? 'text-white' : 'text-primary/75 group-hover:text-primary'}`} />
        {text}
      </button>
    ))}
    {canManageStoreOwnership && (
      <Link
        to="/settings/store-ownership"
        data-ui-settings-tab="store-ownership"
        className="settings-mobile-tab group inline-flex flex-row items-center justify-start gap-2 rounded-full border border-primary/10 bg-surface px-3 py-2 text-sm text-text transition hover:bg-primary/5 hover:text-primary"
      >
        <i className="fa-solid fa-handshake text-[13px] text-primary/75 transition-colors group-hover:text-primary" />
        <span>شرکا</span>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black ${partnerShareChipClass}`} title={partnerShareStatus.hint}>
          <i className={`fa-solid ${partnerShareChipIcon}`} />
          {partnerShareStatus.label}
        </span>
      </Link>
    )}
  </div>
</div>

{canManageStoreOwnership && partnerSetupNeedsAttention && (
  <Link
    to="/settings/store-ownership"
    className="settings-attention-card group flex flex-col gap-3 rounded-[24px] border border-slate-200/80 bg-white/95 p-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_24px_60px_-44px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-slate-950/80 md:flex-row md:items-center md:justify-between" data-ui-settings-card="attention"
  >
    <div className="flex min-w-0 items-start gap-3">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--sidebar-hover-border)] bg-[var(--sidebar-hover-bg)] text-[var(--sidebar-hover-fg)] transition group-hover:bg-[var(--sidebar-hover-bg-strong)] dark:text-[var(--sidebar-hover-fg-dark)]">
        <i className="fa-solid fa-handshake" />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-start gap-2">
          <span className="text-sm font-black text-slate-900 dark:text-white">تکمیل ساختار مالکیت و تسهیم سود</span>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black ${partnerShareChipClass}`} title={partnerShareStatus.hint}>
            <i className={`fa-solid ${partnerShareChipIcon}`} />
            {partnerShareStatus.label}
          </span>
        </div>
        <div className="mt-0.5 line-clamp-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
          برای فعال شدن گزارش سود شرکا، جمع سهم‌ها، مالکیت موجودی و اتصال همکاران قدیمی را نهایی کن. بعد از تکمیل، این هشدار از تنظیمات حذف می‌شود.
        </div>
      </div>
    </div>
    <span className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-xs font-black text-white transition group-hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:group-hover:bg-slate-100">
      تکمیل تنظیمات شرکا
      <i className="fa-solid fa-arrow-up-right-from-square" />
    </span>
  </Link>
)}
</>
);

export default SettingsNavigation;
