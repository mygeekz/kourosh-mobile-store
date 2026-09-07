import React from 'react';

function MetadataImportDashboardHeader() {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <span className="text-[11px] font-black tracking-[0.08em] text-sky-500">سوابق نتایج تحلیل مدل</span>
        <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">داشبورد و جزئیات Import بسته‌های کاندید</h3>
        <p className="mt-1 text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">این بخش سوابق نتایج ثبت‌شده مدل‌ها را نمایش می‌دهد و امکان مشاهده جزئیات هر نتیجه را فراهم می‌کند.</p>
      </div>
      <div className="mlwb-v212-kicker">
        فقط مشاهده · بدون تغییر خودکار اطلاعات فروشگاه
      </div>
    </div>
  );
}

export default React.memo(MetadataImportDashboardHeader);
