import type { MlOperatorOverviewResult } from '../../../services/mlOperatorOverviewApi';

type SafetyRow = {
  label: string;
  ok: boolean;
};

export function MlOperatorSafetyPanel({ safety }: { safety: MlOperatorOverviewResult['safety'] }) {
  const rows: SafetyRow[] = [
    { label: 'فقط فراداده خوانده می‌شود', ok: safety.metadataOnly },
    { label: 'صفحه فقط خواندنی است', ok: safety.readOnly },
    { label: 'اجرای مدل غیرفعال است', ok: !safety.modelExecutionAllowed },
    { label: 'فراخوانی عملیاتی غیرفعال است', ok: !safety.runtimeInvocationAllowed },
    { label: 'نقطه پیش‌بینی زنده ندارد', ok: !safety.inferenceEndpointExposed },
    { label: 'فعال‌سازی آرتیفکت ندارد', ok: !safety.artifactActivationAllowed },
    { label: 'تصمیم خودکار ندارد', ok: !safety.decisionAutomationAllowed },
    { label: 'رکوردهای کسب‌وکار تغییر نمی‌کنند', ok: !safety.canMutateBusinessRecords },
  ];

  return (
    <section className="rounded-[28px] border border-emerald-200 bg-emerald-50/70 p-5 shadow-[0_18px_44px_-40px_rgba(15,118,110,0.42)] dark:border-emerald-900/70 dark:bg-emerald-950/20">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-base font-black text-emerald-950 dark:text-emerald-100">
            <i className="fa-solid fa-shield-halved" />
            مرز ایمنی سامانه
          </div>
          <p className="mt-2 text-sm leading-7 text-emerald-800/80 dark:text-emerald-100/70">
            این نما برای پایش داخلی است و هیچ عملیات اجرایی یا تغییر تجاری انجام نمی‌دهد.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black text-emerald-700 ring-1 ring-emerald-200 dark:bg-slate-950/60 dark:text-emerald-200 dark:ring-emerald-800">
          <i className="fa-solid fa-eye" />
          فقط خواندنی
        </span>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-2 rounded-2xl bg-white/80 px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-emerald-100 dark:bg-slate-950/35 dark:text-slate-200 dark:ring-emerald-900/70">
            <i className={`fa-solid ${row.ok ? 'fa-circle-check text-emerald-600 dark:text-emerald-300' : 'fa-circle-exclamation text-rose-600 dark:text-rose-300'}`} />
            {row.label}
          </div>
        ))}
      </div>
    </section>
  );
}
