import React from 'react';

type Props = {
  label?: string;
};

export default function AppLoadingScreen({ label = 'در حال آماده‌سازی داشبورد…' }: Props) {
  return (
    <div className="app-splash">
      <div className="app-splash__bg" aria-hidden />

      <div className="app-splash__content" role="status" aria-live="polite">
        <div className="app-splash__mark" aria-hidden>
          <div className="app-splash__ring" />
          <div className="app-splash__dot" />
        </div>

        <div className="mt-5 text-center">
          <div className="text-sm font-black text-gray-900 dark:text-gray-50">داشبورد کوروش</div>
          <div className="mt-1 text-[11px] text-gray-600 dark:text-gray-300">{label}</div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2" aria-hidden>
          <span className="app-splash__pulse" style={{ animationDelay: '0ms' }} />
          <span className="app-splash__pulse" style={{ animationDelay: '120ms' }} />
          <span className="app-splash__pulse" style={{ animationDelay: '240ms' }} />
        </div>
      </div>
    </div>
  );
}
