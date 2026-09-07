import React from 'react';
import AiSalesAgentModal from './AiSalesAgentModal';
import SalesPerformanceModal from './SalesPerformanceModal';
import CustomerRiskModal from './CustomerRiskModal';
import StockReorderModal from './StockReorderModal';
import InvoiceAuditModal from './InvoiceAuditModal';
import CollectionRiskModal from './CollectionRiskModal';
import type {
  MoneyFormatter,
  NumberFormatter,
  PercentFormatter,
  SeverityMetaMap,
  ShamsiFormatter,
  SmartInsightLike,
} from './types/smartInsightContracts';

const BASIC_MODAL_TYPES = new Set([
  'ai_sales_agent',
  'sales_drop',
  'sales_growth',
  'customer_intelligence',
  'customer_risk',
  'stock_reorder',
  'invoice_audit',
  'collection_risk',
]);

export const isBasicInsightModalType = (type?: string) => BASIC_MODAL_TYPES.has(String(type || ''));

type BasicInsightModalBranchProps = {
  selected: SmartInsightLike;
  onClose: () => void;
  money: MoneyFormatter;
  percent: PercentFormatter;
  num: NumberFormatter;
  shamsi: ShamsiFormatter;
  severityMeta: SeverityMetaMap;
};

function BasicInsightModalBranch({
  selected,
  onClose,
  money,
  percent,
  num,
  shamsi,
  severityMeta,
}: BasicInsightModalBranchProps) {
  if (selected.type === 'ai_sales_agent') {
    return (
      <AiSalesAgentModal
        selected={selected}
        onClose={onClose}
        money={money}
        percent={percent}
        num={num}
        shamsi={shamsi}
        severityMeta={severityMeta}
      />
    );
  }

  if (selected.type === 'sales_drop' || selected.type === 'sales_growth') {
    return (
      <SalesPerformanceModal
        selected={selected}
        onClose={onClose}
        percent={percent}
        num={num}
        shamsi={shamsi}
        severityMeta={severityMeta}
      />
    );
  }

  if (selected.type === 'customer_intelligence' || selected.type === 'customer_risk') {
    return (
      <CustomerRiskModal
        selected={selected}
        onClose={onClose}
        percent={percent}
        num={num}
        shamsi={shamsi}
        severityMeta={severityMeta}
      />
    );
  }

  if (selected.type === 'stock_reorder') {
    return (
      <StockReorderModal
        selected={selected}
        onClose={onClose}
        money={money}
        num={num}
        shamsi={shamsi}
        severityMeta={severityMeta}
      />
    );
  }

  if (selected.type === 'invoice_audit') {
    return (
      <InvoiceAuditModal
        selected={selected}
        onClose={onClose}
        percent={percent}
        num={num}
        severityMeta={severityMeta}
      />
    );
  }

  if (selected.type === 'collection_risk') {
    return (
      <CollectionRiskModal
        selected={selected}
        onClose={onClose}
        money={money}
        num={num}
        shamsi={shamsi}
        severityMeta={severityMeta}
      />
    );
  }

  return null;
}

export default React.memo(BasicInsightModalBranch);
