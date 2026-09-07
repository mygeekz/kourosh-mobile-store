import React, { Suspense } from 'react';
import type { SettingsTelegramPanelProps } from './settingsPanelTypes';

const SettingsTelegramPanelImpl = React.lazy(() => import('./SettingsTelegramPanel'));

const TelegramPanelFallback = () => (
  <section className="settings-panel-root settings-ops-panel rounded-[28px] border border-slate-200 bg-white/95 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/85" dir="rtl">
    <div className="flex items-center gap-3 text-sm font-black text-slate-600 dark:text-slate-300">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 text-sky-600 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-200">
        <i className="fa-brands fa-telegram" />
      </span>
      <span>در حال آماده‌سازی پنل تلگرام...</span>
    </div>
  </section>
);

export default function LazySettingsTelegramPanel(props: SettingsTelegramPanelProps) {
  if (props.tab !== 'telegram') return null;

  return (
    <Suspense fallback={<TelegramPanelFallback />}>
      <SettingsTelegramPanelImpl {...props} />
    </Suspense>
  );
}
