import React from 'react';
import PhoneMarketEvidencePanel from './PhoneMarketEvidencePanel';

type Props = {
  ctx: Record<string, any>;
};

const PhoneMarketEvidenceWorkspace: React.FC<Props> = ({ ctx }) => {
  const {
    approveSupplierFeed,
    canRecordMarketSnapshot,
    createSupplierFeed,
    formatPrice,
    phoneComparablePriceEstimateEnabled,
    phonePriceEstimate,
    recordMarketSnapshot,
  } = ctx;

  if (!phoneComparablePriceEstimateEnabled || !phonePriceEstimate?.marketEvidence) return null;

  return (
    <div className="mt-3" aria-label="مرجع قیمت تأمین‌کنندگان">
      <PhoneMarketEvidencePanel
        evidence={phonePriceEstimate.marketEvidence}
        canRecord={canRecordMarketSnapshot}
        formatPrice={formatPrice}
        onRecord={recordMarketSnapshot}
        onCreateSupplierFeed={createSupplierFeed}
        onApproveSupplierFeed={approveSupplierFeed}
      />
    </div>
  );
};

export default PhoneMarketEvidenceWorkspace;
