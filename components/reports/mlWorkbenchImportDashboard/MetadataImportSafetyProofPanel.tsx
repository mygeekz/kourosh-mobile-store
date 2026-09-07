import React from 'react';

function MetadataImportSafetyProofPanel() {
  return (
    <div className="mt-3 grid gap-2 text-xs font-bold text-slate-500 md:grid-cols-3 dark:text-slate-400">
      <span><i className="fa-solid fa-ban ml-1" /> تغییر خودکار اطلاعات: غیرفعال</span>
      <span><i className="fa-solid fa-shield-halved ml-1" /> اجرای خودکار تحلیل: غیرفعال</span>
      <span><i className="fa-solid fa-lock ml-1" /> تغییر اطلاعات کسب‌وکار: غیرفعال</span>
    </div>
  );
}

export default React.memo(MetadataImportSafetyProofPanel);
