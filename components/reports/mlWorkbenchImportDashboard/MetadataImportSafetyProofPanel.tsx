import React from 'react';

function MetadataImportSafetyProofPanel() {
  return (
    <div className="mt-3 grid gap-2 text-xs font-bold text-slate-500 md:grid-cols-3 dark:text-slate-400">
      <span><i className="fa-solid fa-ban ml-1" /> Execution: off</span>
      <span><i className="fa-solid fa-shield-halved ml-1" /> Inference/activation: off</span>
      <span><i className="fa-solid fa-lock ml-1" /> Business mutation: off</span>
    </div>
  );
}

export default React.memo(MetadataImportSafetyProofPanel);
