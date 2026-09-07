import React from 'react';

function MetadataImportErrorState({ error }: { error?: string | null }) {
  if (!error) return null;
  return <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">{error}</p>;
}

export default React.memo(MetadataImportErrorState);
