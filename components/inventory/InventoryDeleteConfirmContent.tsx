import React from 'react';

type InventoryDeleteConfirmContentProps = {
  itemName: string;
  itemType: 'product' | 'category' | 'supplier';
};

const TYPE_META: Record<InventoryDeleteConfirmContentProps['itemType'], {
  label: string;
  iconClass: string;
  summaryLabel: string;
  scopeLabel: string;
  effectText: string;
}> = {
  product: {
    label: 'کالا',
    iconClass: 'fa-solid fa-box-open',
    summaryLabel: 'نام کالا',
    scopeLabel: 'فهرست کالاهای انبار',
    effectText: 'این کالا از فهرست پایه انبار حذف می‌شود و برای بازگردانی باید دوباره ثبت شود.',
  },
  category: {
    label: 'دسته‌بندی',
    iconClass: 'fa-solid fa-layer-group',
    summaryLabel: 'نام دسته‌بندی',
    scopeLabel: 'فهرست دسته‌بندی‌های انبار',
    effectText: 'این دسته‌بندی از لیست پایه انبار حذف می‌شود و برای بازگردانی باید دوباره ساخته شود.',
  },
  supplier: {
    label: 'تأمین‌کننده',
    iconClass: 'fa-solid fa-building-user',
    summaryLabel: 'نام تأمین‌کننده',
    scopeLabel: 'فهرست تأمین‌کنندگان انبار',
    effectText: 'این تأمین‌کننده از لیست پایه انبار حذف می‌شود و برای بازگردانی باید دوباره ثبت شود.',
  },
};

const InventoryDeleteConfirmContent: React.FC<InventoryDeleteConfirmContentProps> = ({ itemName, itemType }) => {
  const meta = TYPE_META[itemType] || TYPE_META.product;

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-rose-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(255,241,242,0.96))] p-5 shadow-[0_20px_50px_-40px_rgba(225,29,72,0.55)] dark:border-rose-900/70 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.98),rgba(76,5,25,0.34))]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-lg text-white shadow-sm shadow-rose-200/60 dark:shadow-none" aria-hidden="true">
              <i className={meta.iconClass} />
            </span>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white/90 px-3 py-1 text-[11px] font-black text-rose-700 dark:border-rose-800 dark:bg-slate-950/60 dark:text-rose-200">
                <i className="fa-solid fa-shield-exclamation" aria-hidden="true" />
                عملیات غیرقابل بازگشت
              </div>
              <h3 className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50">آیا از حذف این مورد مطمئن هستید؟</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{meta.effectText}</p>
            </div>
          </div>
          <div className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            <i className="fa-solid fa-trash-can" aria-hidden="true" />
            حذف دائمی
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:border-slate-800 dark:bg-slate-950/65 dark:shadow-none">
            <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">{meta.summaryLabel}</div>
            <div className="mt-2 text-sm font-black text-slate-900 dark:text-slate-50" dir="rtl">{itemName}</div>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:border-slate-800 dark:bg-slate-950/65 dark:shadow-none">
            <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">نوع مورد</div>
            <div className="mt-2 text-sm font-black text-slate-900 dark:text-slate-50">{meta.label}</div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-slate-50">
            <i className="fa-solid fa-list-check text-slate-500" aria-hidden="true" />
            نتیجه این حذف
          </div>
          <ul className="mt-3 space-y-2 text-xs leading-6 text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-2"><i className="fa-solid fa-circle text-[8px] text-rose-500 mt-2" aria-hidden="true" /><span>مورد از <strong className="text-slate-800 dark:text-slate-100">{meta.scopeLabel}</strong> حذف می‌شود.</span></li>
            <li className="flex items-start gap-2"><i className="fa-solid fa-circle text-[8px] text-rose-500 mt-2" aria-hidden="true" /><span>برای استفاده دوباره باید مورد از ابتدا ثبت شود.</span></li>
          </ul>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 dark:border-amber-900/70 dark:bg-amber-950/30">
          <div className="flex items-center gap-2 text-sm font-black text-amber-900 dark:text-amber-100">
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
            قبل از تأیید بررسی کنید
          </div>
          <ul className="mt-3 space-y-2 text-xs leading-6 text-amber-900/80 dark:text-amber-100/85">
            <li className="flex items-start gap-2"><i className="fa-solid fa-check text-[10px] mt-1.5" aria-hidden="true" /><span>اگر هنوز به این مورد نیاز دارید، ابتدا عملیات را لغو کنید.</span></li>
            <li className="flex items-start gap-2"><i className="fa-solid fa-check text-[10px] mt-1.5" aria-hidden="true" /><span>این تأیید برای جلوگیری از حذف اشتباهی در عملیات انبار است.</span></li>
          </ul>
        </div>
      </section>
    </div>
  );
};

export default InventoryDeleteConfirmContent;
