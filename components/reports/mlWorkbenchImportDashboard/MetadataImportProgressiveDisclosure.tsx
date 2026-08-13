import React from 'react';
import type { Phase11LDisclosurePanelKey } from './metadataImportDashboardTypes';

type PanelSummary = {
  key: Phase11LDisclosurePanelKey;
  label: string;
  description: string;
  metric: string;
  status: string;
};

type Props = {
  panels: PanelSummary[];
  expandedMlPanels: Record<Phase11LDisclosurePanelKey, boolean>;
  toggleMlDisclosurePanel: (panelKey: Phase11LDisclosurePanelKey) => void;
};

function MetadataImportProgressiveDisclosure({ panels, expandedMlPanels, toggleMlDisclosurePanel }: Props) {
  return (
    <div className="mlwb-v212-shell mt-4 rounded-[24px] border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900" aria-label="کنترل نمایش مرحله‌ای پنل‌ها">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <span className="text-[11px] font-black tracking-[0.08em] text-violet-500">Phase 11L · کنترل نمایش مرحله‌ای</span>
          <h4 className="mt-1 text-sm font-black text-slate-950 dark:text-white">پنل‌های متادیتا را مرحله‌ای باز کن</h4>
          <p className="mt-1 text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">برای خلوت‌تر شدن Smart Insight Center، پنل‌های سنگین به‌صورت پیش‌فرض جمع هستند. باز و بسته کردن هر پنل فقط ظاهر UI را تغییر می‌دهد و هیچ اجرای مدل، API جدید، inference یا تغییر تجاری ایجاد نمی‌کند.</p>
        </div>
        <span className="mlwb-v212-kicker">حالت پیش‌فرض: فشرده · فقط متادیتا</span>
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-2 xl:grid-cols-3" aria-label="انتخاب‌گر پنل‌های مرحله‌ای">
        {panels.map((panel) => {
          const open = expandedMlPanels[panel.key];
          return (
            <button
              key={panel.key}
              type="button"
              className={`mlwb-v212-preview ${open ? 'border-violet-300 dark:border-violet-700' : ''}`}
              aria-expanded={open}
              aria-controls={`phase11l-${panel.key}-panel`}
              onClick={() => toggleMlDisclosurePanel(panel.key)}
            >
              <span className="mlwb-v212-preview__eyebrow text-violet-500">{open ? 'در حال نمایش' : 'جمع‌شده'}</span>
              <strong className="mlwb-v212-preview__title">{panel.label}</strong>
              <span className="mlwb-v212-preview__desc">{panel.description}</span>
              <span className="mlwb-v212-preview__meta">
                <em className="mlwb-v212-chip not-italic"><i className="fa-solid fa-chart-simple" /> {panel.metric}</em>
                <em className="mlwb-v212-chip not-italic"><i className="fa-solid fa-circle-info" /> وضعیت: {panel.status}</em>
                <em className="mlwb-v212-chip not-italic"><i className={`fa-solid ${open ? 'fa-chevron-up' : 'fa-chevron-down'}`} /> {open ? 'بستن پنل' : 'نمایش پنل'}</em>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default React.memo(MetadataImportProgressiveDisclosure);
