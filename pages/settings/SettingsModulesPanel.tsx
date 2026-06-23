import React from 'react';
import type { SettingsModulesPanelProps } from './settingsPanelTypes';
import Button from '../../components/Button';
import ToggleSwitch from '../../components/ToggleSwitch';
import {
  ALL_FEATURE_FLAGS,
  COMMERCIAL_PLANS,
  FEATURE_CATEGORIES,
  FEATURE_FLAGS,
  getChildFeatureFlags,
  type CommercialPlanKey,
  type FeatureCategory,
} from '../../utils/featureFlags';
import { getSettingsFeatureImpactText } from '../../utils/settingsFeaturePolicy';


const SettingsModulesPanel: React.FC<SettingsModulesPanelProps> = ({
  infoChanged,
  isSaving,
  handleBusinessInfoSubmit,
  moduleRuntimeSummary,
  commercialPlanUiCopy,
  isFeatureSettingEnabled,
  applyCommercialPlan,
  getFeatureRuntimeBadges,
  setFeatureByKey,
}) => (
<div className="settings-modules-panel settings-panel-root space-y-5" data-ui-settings-panel="modules">
  <section className="module-hero-card settings-hero-card overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_18px_46px_-36px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/90">
    <div className="space-y-5 p-5 md:p-6">
      <div className="module-hero-row flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 max-w-3xl text-right">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-300">
            <i className="fa-solid fa-shield-halved" />
            کنترل ماژول‌های فروشگاه
          </div>
          <h2 className="text-[24px] font-black tracking-tight text-slate-950 dark:text-white">ماژول‌های تجاری</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
            تعیین کنید کدام بخش‌های برنامه فعال باشند. خاموش‌کردن هر ماژول، قسمت‌های وابسته را از منو، صفحه‌های تنظیمات و پردازش‌های غیرضروری خارج می‌کند تا محیط کار جمع‌وجورتر و سریع‌تر بماند.
          </p>
        </div>

        <div className="module-action-card w-full rounded-[26px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/40 xl:max-w-[360px]">
          <div className="flex items-start gap-3 text-right">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-emerald-700 dark:border-slate-800 dark:bg-slate-950 dark:text-emerald-300"><i className="fa-solid fa-floppy-disk" /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-black text-slate-900 dark:text-white">ذخیره تغییرات ماژول‌ها</div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${infoChanged ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'}`}>
                  <i className={`fa-solid ${infoChanged ? 'fa-pen' : 'fa-check'}`} />
                  {infoChanged ? 'نیازمند ذخیره' : 'همه تغییرات ذخیره شده'}
                </span>
              </div>
              <p className="mt-0.5 line-clamp-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">پس از ذخیره، منو و تب‌های وابسته بر اساس وضعیت جدید به‌روزرسانی می‌شوند.</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row xl:flex-col">
            <Button
              type="button"
              onClick={handleBusinessInfoSubmit}
              disabled={!infoChanged || isSaving}
              loading={isSaving}
              loadingText="در حال ذخیره…"
              variant="primary"
              className="w-full justify-center"
              leftIcon={<i className="fa-solid fa-floppy-disk" />}
            >
              ذخیره ماژول‌ها
            </Button>
            <div className="rounded-[18px] border border-slate-200 bg-white px-3 py-2 text-right text-[11px] leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-400">
              اگر بخشی پنهان شد، از همین صفحه دوباره ماژول مربوط را روشن کن.
            </div>
          </div>
        </div>
      </div>

      <div className="module-runtime-grid grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {moduleRuntimeSummary.map((item) => (
          <div key={item.label} className={`module-runtime-card rounded-[24px] border border-slate-200 bg-gradient-to-br ${item.tone} p-4 dark:border-slate-800`}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-current/10 bg-white/80 dark:bg-slate-950/70">
                <i className={`fa-solid ${item.icon}`} />
              </div>
              <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">{item.label}</div>
            </div>
            <div className="text-2xl font-black text-slate-950 dark:text-white">{item.value}</div>
            <div className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">{item.hint}</div>
          </div>
        ))}
      </div>
    </div>
  </section>

  <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 md:p-6">
    <div className="mb-4 flex flex-col gap-2 text-right md:flex-row md:items-end md:justify-between">
      <div>
        <div className="text-lg font-black text-slate-950 dark:text-white">پلن‌های آماده</div>
        <div className="mt-0.5 line-clamp-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">اگر بخواهی ترکیب رایج‌تری از ماژول‌ها فعال شود، یکی از پلن‌های زیر را اعمال کن.</div>
      </div>
      <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500">اعمال پلن، فقط وضعیت ماژول‌های همین بخش را تغییر می‌دهد.</div>
    </div>

    <div className="module-plan-grid grid grid-cols-1 gap-3 md:grid-cols-2">
      {(Object.keys(COMMERCIAL_PLANS) as CommercialPlanKey[]).map((planKey) => {
        const plan = COMMERCIAL_PLANS[planKey];
        const ui = commercialPlanUiCopy[planKey];
        const featureMap = new Map(ALL_FEATURE_FLAGS.map((feature) => [feature.key, feature]));
        const enabledOk = plan.enable.every((key) => {
          const feature = featureMap.get(key);
          return !feature || isFeatureSettingEnabled(feature);
        });
        const disabledOk = plan.disable.every((key) => {
          const feature = featureMap.get(key);
          return !feature || !isFeatureSettingEnabled(feature);
        });
        const isApplied = enabledOk && disabledOk;
        return (
          <div
            key={planKey}
            role="button"
            tabIndex={0}
            onClick={() => applyCommercialPlan(planKey)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                applyCommercialPlan(planKey);
              }
            }}
            className={`module-plan-card group flex min-h-[168px] w-full cursor-pointer flex-col rounded-[24px] border p-4 text-right transition hover:-translate-y-0.5 overflow-hidden     ${isApplied ? 'border-emerald-300 bg-emerald-50/80 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/20' : 'border-slate-200 bg-white/95 hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-950/70'}`}
          >
            <div className="flex w-full items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-lg font-black leading-7 text-slate-900 dark:text-white">{ui.titleFa}</div>
                <div className="mt-1 text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400">{ui.short}</div>
              </div>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${isApplied ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}><i className={plan.icon} /></span>
            </div>

            <div className="mt-4 text-[12px] leading-6 text-slate-600 dark:text-slate-300">{ui.audience}</div>

            <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-200/80 pt-3 dark:border-slate-800">
              <span className={`module-status-chip inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black whitespace-nowrap ${isApplied ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}>
                <i className={`fa-solid ${isApplied ? 'fa-check' : 'fa-wand-magic-sparkles'}`} />
                {isApplied ? 'فعال روی سیستم' : 'اعمال پلن'}
              </span>
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500">{plan.enable.length.toLocaleString('fa-IR')} ماژول کلیدی</span>
            </div>
          </div>
        );
      })}
    </div>
  </section>

  <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 md:p-6">
    <div className="mb-4 flex flex-col gap-2 text-right md:flex-row md:items-end md:justify-between">
      <div>
        <div className="text-lg font-black text-slate-950 dark:text-white">فهرست ماژول‌ها</div>
        <div className="mt-0.5 line-clamp-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">هر گروه را باز کن و فقط بخش‌هایی را روشن نگه دار که واقعاً در فروشگاه استفاده می‌شوند.</div>
      </div>
      <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500">نشان‌های پایین هر کارت مشخص می‌کنند ماژول روی منو، صفحه و درگاه اثر دارد یا نه.</div>
    </div>
  {(Object.keys(FEATURE_CATEGORIES) as FeatureCategory[]).map((categoryKey) => {
    const category = FEATURE_CATEGORIES[categoryKey];
    const items = FEATURE_FLAGS.filter((feature) => feature.category === categoryKey);
    if (!items.length) return null;
    const enabledCount = items.filter((feature) => isFeatureSettingEnabled(feature)).length;
    return (
      <details key={categoryKey} open className="group rounded-[24px] border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-right">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><i className={category.icon} /></span>
            <div className="min-w-0">
              <div className="text-sm font-black text-slate-900 dark:text-white">{category.title}</div>
              <div className="mt-0.5 text-[11px] leading-5 text-slate-500 dark:text-slate-400">{category.description}</div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">{enabledCount} / {items.length} فعال</span>
            <i className="fa-solid fa-chevron-down text-xs text-slate-400 transition group-open:rotate-180" />
          </div>
        </summary>

        <div className="module-feature-grid mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {items.map((feature) => {
            const enabled = isFeatureSettingEnabled(feature);
            const children = getChildFeatureFlags(feature.key);
            const runtimeBadges = getFeatureRuntimeBadges(feature);
            const impactText = getSettingsFeatureImpactText(feature);
            return (
              <div key={feature.key} className={`module-feature-card rounded-[22px] border p-4 transition ${enabled ? 'border-slate-200 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-900/55' : 'border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-950/40'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3 text-right">
                    <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${enabled ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300' : 'bg-slate-200/70 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}><i className={feature.icon} /></span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-black text-slate-900 dark:text-white">{feature.title}</span>
                        <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[9px] font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">{feature.tier}</span>
                        {!feature.optional && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">هسته</span>}
                      </div>
                      <p className="mt-1 text-[11px] leading-5 text-slate-600 dark:text-slate-300">{feature.description}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5" aria-label={`اثر ماژول ${feature.title}`}>
                        {runtimeBadges.map((badge) => (
                          <span key={badge.label} className={`module-status-chip inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black ${badge.active ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300' : 'border-slate-200 bg-white text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500'}`}>
                            <i className={`fa-solid ${badge.icon}`} />
                            {badge.label}
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 rounded-2xl border border-slate-200/70 bg-white/70 px-3 py-2 text-[10px] font-bold leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                        اثر خاموش/روشن شدن: {impactText}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`text-[11px] font-black ${enabled ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>{enabled ? 'فعال' : 'غیرفعال'}</span>
                    <ToggleSwitch
                      checked={enabled}
                      onCheckedChange={() => setFeatureByKey(feature, !enabled)}
                      disabled={!feature.optional}
                      ariaLabel={feature.optional ? (enabled ? 'غیرفعال کردن واقعی' : 'فعال کردن واقعی') : 'ماژول هسته‌ای قابل خاموش کردن نیست'}
                      size="sm"
                    />
                  </div>
                </div>

                {children.length > 0 && (
                  <details className="mt-3 rounded-[18px] border border-slate-200/80 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-[11px] font-black text-slate-700 dark:text-slate-200"><i className="fa-solid fa-sliders" /> قابلیت‌های جزئی</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                        {children.filter((child) => isFeatureSettingEnabled(child)).length} / {children.length} فعال
                      </span>
                    </summary>
                    <div className="mt-2 space-y-2">
                      {children.map((child) => {
                        const childRawEnabled = isFeatureSettingEnabled(child);
                        const childEnabled = enabled && childRawEnabled;
                        return (
                          <div key={child.key} className={`module-child-feature-card flex items-start justify-between gap-2 rounded-2xl border p-2.5 ${enabled ? 'border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/50' : 'border-slate-200 bg-slate-100/80 opacity-60 dark:border-slate-800 dark:bg-slate-900/40'}`}>
                            <div className="flex min-w-0 items-start gap-2 text-right">
                              <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${childEnabled ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200' : 'bg-slate-200 text-slate-500 dark:bg-slate-800'}`}><i className={child.icon} /></span>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[12px] font-black text-slate-900 dark:text-white">{child.title}</span>
                                  <span className="rounded-full border border-slate-200 px-1.5 py-0.5 text-[9px] font-black text-slate-500 dark:border-slate-700">{child.groupTitle || 'قابلیت'}</span>
                                </div>
                                <p className="mt-1 text-[10px] font-bold leading-5 text-slate-500 dark:text-slate-400">{child.description}</p>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className={`text-[10px] font-black ${childEnabled ? 'text-indigo-700 dark:text-indigo-200' : 'text-slate-500 dark:text-slate-400'}`}>{childEnabled ? 'فعال' : 'خاموش'}</span>
                              <ToggleSwitch
                                checked={childEnabled}
                                onCheckedChange={() => setFeatureByKey(child, !childRawEnabled)}
                                disabled={!enabled}
                                ariaLabel={!enabled ? 'اول ماژول اصلی را فعال کنید' : childEnabled ? 'غیرفعال کردن قابلیت' : 'فعال کردن قابلیت'}
                                size="sm"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      </details>
    );
  })}
  </section>
</div>
);

export default SettingsModulesPanel;
