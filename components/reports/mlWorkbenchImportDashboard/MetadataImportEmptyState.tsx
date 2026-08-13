import React from 'react';

function MetadataImportEmptyState({ loading }: { loading: boolean }) {
  if (loading) return null;
  return <p className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">هنوز metadata import result persisted برای نمایش history وجود ندارد. مسیر امن: ابتدا فقط payload متادیتا validate/import شود؛ اجرای مدل، inference، activation و business mutation همچنان خاموش است.</p>;
}

export default React.memo(MetadataImportEmptyState);
