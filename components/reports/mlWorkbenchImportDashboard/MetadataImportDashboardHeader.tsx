import React from 'react';

function MetadataImportDashboardHeader() {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <span className="text-[11px] font-black tracking-[0.08em] text-sky-500">فاز 11D · نتایج ذخیره‌شده Import متادیتا</span>
        <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">داشبورد و جزئیات Import بسته‌های کاندید</h3>
        <p className="mt-1 text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">این بخش تاریخچه نتایج ذخیره‌شده import متادیتا را نشان می‌دهد. Drawer جزئیات فقط خواندنی است و هیچ اجرای مدل، آموزش، فعال‌سازی یا اتصال به عملیات فروش، انبار و حسابداری انجام نمی‌دهد.</p>
      </div>
      <div className="mlwb-v212-kicker">
        فقط متادیتا · داشبورد خواندنی · بدون تغییر
      </div>
    </div>
  );
}

export default React.memo(MetadataImportDashboardHeader);
