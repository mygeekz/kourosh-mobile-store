import {
  getLedgerSystemId,
  getLedgerSystemKind,
  getPurchaseSystemId,
  getPhoneSettlementStatusMeta,
  num,
  type PhoneSettlementStatusKey,
} from './partnerDetailControllerSupport';

export const filterPartnerTelegramConversationItems = (
  items: any[],
  searchQuery: string,
  directionFilter: 'all' | 'in' | 'out' | 'failed' | string
) => {
  const query = searchQuery.trim().toLowerCase();
  return items.filter((item) => {
    const directionOk =
      directionFilter === 'all' ||
      (directionFilter === 'in' && item.direction === 'in') ||
      (directionFilter === 'out' && item.direction === 'out') ||
      (directionFilter === 'failed' && item.direction === 'out' && String(item.status || '') === 'failed');
    if (!directionOk) return false;
    if (!query) return true;
    return [item.text, item.status, item.errorCategory, item.lastError, item.createdAt]
      .map((value) => String(value || '').toLowerCase())
      .some((value) => value.includes(query));
  });
};

export const buildPurchaseHistoryBySystemId = (purchaseHistory: any[]) => {
  const map = new Map<string, any>();
  for (const item of purchaseHistory) {
    const systemId = String(item?.systemId || getPurchaseSystemId(item)).trim();
    map.set(systemId, item);
  }
  return map;
};

export const buildLedgerSystemOptions = (ledger: any[], purchaseHistory: any[]) => {
  const relatedPurchaseBySystemId = new Map<string, any>();
  for (const item of purchaseHistory) {
    const systemId = String(item?.systemId || getPurchaseSystemId(item)).trim();
    if (systemId && !relatedPurchaseBySystemId.has(systemId)) relatedPurchaseBySystemId.set(systemId, item);
  }

  const map = new Map<string, { id: string; label: string; count: number }>();
  ledger.forEach((entry) => {
    const id = getLedgerSystemId(entry);
    if (!map.has(id)) {
      const relatedPurchase = relatedPurchaseBySystemId.get(id);
      const relatedName = String(relatedPurchase?.name || relatedPurchase?.model || relatedPurchase?.title || '').trim();
      const kind = getLedgerSystemKind(entry);
      const fallbackLabel = kind === 'phone'
        ? 'گوشی'
        : kind === 'product'
          ? 'محصول'
          : String(entry?.referenceType || '').includes('payment') || String(entry?.referenceType || '').includes('settlement')
            ? 'حسابداری'
            : 'رکورد';
      const kindLabel = kind === 'phone' ? 'گوشی' : kind === 'product' ? 'محصول' : fallbackLabel;
      map.set(id, {
        id,
        label: relatedName ? `${id} · ${relatedName} · ${kindLabel}` : `${id} · ${kindLabel}`,
        count: 0,
      });
    }
    map.get(id)!.count += 1;
  });
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, 'fa'));
};

export const dedupePurchaseHistoryRows = (rows: any[]) => {
  const seen = new Map<string, any>();
  for (const row of rows) {
    const assetKey = String(row?.assetKey || `${row?.type || 'item'}-${row?.id || 'unknown'}`).trim();
    if (!seen.has(assetKey)) seen.set(assetKey, row);
  }
  return Array.from(seen.values());
};

export const buildPurchaseHistoryVisible = (purchaseHistory: any[], purchaseHistoryFilter: 'all' | 'phone' | 'product') => {
  const rows = purchaseHistory.filter((item: any) => {
    if (purchaseHistoryFilter === 'phone') return item?.type === 'phone';
    if (purchaseHistoryFilter === 'product') return item?.type === 'product';
    return item?.type === 'phone' || item?.type === 'product';
  });
  const sorted = rows.sort((a: any, b: any) => String(b?.purchaseDate || b?.soldAt || '').localeCompare(String(a?.purchaseDate || a?.soldAt || '')) || Number(b?.id || 0) - Number(a?.id || 0));
  return dedupePurchaseHistoryRows(sorted);
};

export const buildPurchaseHistoryCounts = (purchaseHistory: any[]) => ({
  all: dedupePurchaseHistoryRows(purchaseHistory.filter((item: any) => item?.type === 'phone' || item?.type === 'product')).length,
  phone: dedupePurchaseHistoryRows(purchaseHistory.filter((item: any) => item?.type === 'phone')).length,
  product: dedupePurchaseHistoryRows(purchaseHistory.filter((item: any) => item?.type === 'product')).length,
});

export const buildSoldPhoneDailyPriceRows = (purchaseHistory: any[]) => {
  const rows = purchaseHistory
    .filter((item: any) => item?.type === 'phone' && String(item?.status || '').includes('فروخته'))
    .map((item: any) => {
      const initialPurchasePrice = num(item?.initialPurchasePrice ?? item?.purchasePrice);
      const settlementPurchasePrice = num(item?.settlementPurchasePrice ?? item?.soldDailyPurchasePrice ?? item?.purchasePrice ?? item?.currentPurchasePrice ?? item?.initialPurchasePrice);
      const saleTotalPrice = num(item?.saleTotalPrice ?? item?.saleUnitPrice ?? 0);
      const manualSettlementPaidAmount = num(item?.phoneSettlementManualPaidAmount ?? item?.phoneSettlementPaidAmount ?? 0);
      const sourceType = String(item?.saleSourceType || item?.settlementPriceSource || '').trim();
      const statusText = String(item?.status || '').trim();
      const paymentMethodText = String(item?.salePaymentMethod || '').trim().toLowerCase();
      const isInstallmentSale = sourceType === 'installment_sale' || statusText.includes('قسطی') || paymentMethodText.includes('installment');
      const isCashSale = !isInstallmentSale && (sourceType === 'sales_order' || sourceType === 'legacy_sale') && !paymentMethodText.includes('credit') && !paymentMethodText.includes('اعتبار');
      const installmentActualTotal = num(item?.installmentSaleActualTotal || saleTotalPrice || item?.installmentSaleScheduledAmount || 0);
      const installmentDownPayment = num(item?.installmentSaleDownPayment || 0);
      const installmentTransactionPaid = num(item?.installmentSaleTransactionPaidAmount || 0);
      const installmentCheckPaid = num(item?.installmentSaleCheckPaidAmount || 0);
      const installmentCollectedAmount = Math.max(0, installmentDownPayment + installmentTransactionPaid + installmentCheckPaid);
      const rawInstallmentOpenPaymentsCount = num(item?.installmentSaleOpenPaymentsCount || 0);
      const rawInstallmentOpenChecksCount = num(item?.installmentSaleOpenChecksCount || 0);
      const installmentCustomerRemainingAmount = isInstallmentSale ? Math.max(0, installmentActualTotal - installmentCollectedAmount) : 0;
      const installmentOpenPaymentsCount = installmentCustomerRemainingAmount <= 0.00001 ? 0 : rawInstallmentOpenPaymentsCount;
      const installmentOpenChecksCount = installmentCustomerRemainingAmount <= 0.00001 ? 0 : rawInstallmentOpenChecksCount;
      const installmentCollectionRatio = isInstallmentSale && installmentActualTotal > 0 ? Math.min(1, installmentCollectedAmount / installmentActualTotal) : 0;
      const autoRecognizedPaidAmount = isInstallmentSale
        ? Math.min(settlementPurchasePrice, installmentCollectedAmount)
        : isCashSale
          ? settlementPurchasePrice
          : 0;
      const phoneSettlementPaidAmount = Math.min(settlementPurchasePrice, Math.max(manualSettlementPaidAmount, autoRecognizedPaidAmount));
      const phoneSettlementBalance = Math.max(0, settlementPurchasePrice - phoneSettlementPaidAmount);
      return {
        ...item,
        initialPurchasePrice,
        settlementPurchasePrice,
        phoneSettlementPaidAmount,
        phoneSettlementManualPaidAmount: manualSettlementPaidAmount,
        phoneSettlementAutoPaidAmount: autoRecognizedPaidAmount,
        phoneSettlementBalance,
        phoneSettlementManagedBySale: isInstallmentSale || isCashSale,
        phoneSettlementManagementLabel: isInstallmentSale ? '' : isCashSale ? 'فروش نقدی؛ تسویه خودکار' : '',
        installmentCollectedAmount,
        installmentTransactionPaidAmount: installmentTransactionPaid,
        installmentCheckPaidAmount: installmentCheckPaid,
        installmentOpenPaymentsCount,
        installmentOpenChecksCount,
        installmentCustomerRemainingAmount,
        installmentCollectionRatio,
        dailyPriceDelta: settlementPurchasePrice - initialPurchasePrice,
        saleTotalPrice,
      };
    })
    .sort((a: any, b: any) => String(b?.soldAt || b?.purchaseDate || '').localeCompare(String(a?.soldAt || a?.purchaseDate || '')) || Number(b?.id || 0) - Number(a?.id || 0));
  return dedupePurchaseHistoryRows(rows);
};

export const buildSoldPhoneSettlementFilterCounts = (soldPhoneDailyPriceRows: any[]) => ({
  all: soldPhoneDailyPriceRows.length,
  open: soldPhoneDailyPriceRows.filter((item: any) => Number(item?.phoneSettlementBalance || 0) > 0).length,
  settled: soldPhoneDailyPriceRows.filter((item: any) => Number(item?.phoneSettlementBalance || 0) <= 0).length,
});

export const buildSoldPhoneSettlementStatusCounts = (soldPhoneDailyPriceRows: any[]) => {
  return soldPhoneDailyPriceRows.reduce((acc: Record<PhoneSettlementStatusKey, number>, item: any) => {
    const meta = getPhoneSettlementStatusMeta(item?.phoneSettlementPaidAmount, item?.phoneSettlementBalance, item?.settlementPurchasePrice);
    acc[meta.key] = (acc[meta.key] || 0) + 1;
    return acc;
  }, { settled: 0, partial: 0, unpaid: 0, unknown: 0 });
};

export const filterSoldPhoneDailyPriceRows = (
  soldPhoneDailyPriceRows: any[],
  soldPhoneSettlementFilter: 'all' | 'open' | 'settled' | string,
  soldPhoneCapitalSearch: string,
  soldPhoneCapitalSort: 'newest' | 'highestBalance' | 'highestCapital' | string
) => {
  let rows = soldPhoneDailyPriceRows;
  if (soldPhoneSettlementFilter === 'open') rows = rows.filter((item: any) => Number(item?.phoneSettlementBalance || 0) > 0);
  else if (soldPhoneSettlementFilter === 'settled') rows = rows.filter((item: any) => Number(item?.phoneSettlementBalance || 0) <= 0);

  const query = soldPhoneCapitalSearch.trim().toLowerCase();
  if (query) {
    rows = rows.filter((item: any) => {
      const sourceLabel = String(item?.settlementPriceSourceLabel || item?.saleReferenceLabel || 'ثبت مستقیم گوشی');
      return [item?.name, item?.identifier, item?.status, item?.soldAt, sourceLabel, item?.saleReferenceLabel]
        .some((value) => String(value || '').toLowerCase().includes(query));
    });
  }

  const sortedRows = [...rows];
  sortedRows.sort((a: any, b: any) => {
    if (soldPhoneCapitalSort === 'highestBalance') return Number(b?.phoneSettlementBalance || 0) - Number(a?.phoneSettlementBalance || 0);
    if (soldPhoneCapitalSort === 'highestCapital') return Number(b?.settlementPurchasePrice || 0) - Number(a?.settlementPurchasePrice || 0);
    return String(b?.soldAt || b?.purchaseDate || '').localeCompare(String(a?.soldAt || a?.purchaseDate || '')) || Number(b?.id || 0) - Number(a?.id || 0);
  });
  return sortedRows;
};

export const buildFilteredSoldPhoneDailyPriceTotals = (rows: any[]) => {
  const total = rows.reduce((sum: number, item: any) => sum + Number(item?.settlementPurchasePrice || 0), 0);
  const initialTotal = rows.reduce((sum: number, item: any) => sum + Number(item?.initialPurchasePrice || 0), 0);
  const paidTotal = rows.reduce((sum: number, item: any) => sum + Number(item?.phoneSettlementPaidAmount || 0), 0);
  const balanceTotal = rows.reduce((sum: number, item: any) => sum + Number(item?.phoneSettlementBalance || 0), 0);
  return {
    total,
    initialTotal,
    deltaTotal: total - initialTotal,
    paidTotal,
    balanceTotal,
  };
};

export type PartnerBusinessValueStatus = 'known' | 'missing-data';

export type PartnerBusinessValue = {
  label: string;
  value: number | null;
  status: PartnerBusinessValueStatus;
  reason?: string;
};

export type PartnerSettlementReadinessStatus =
  | 'ready-for-review'
  | 'missing-product-data'
  | 'missing-partner-share'
  | 'missing-current-purchase-price'
  | 'manager-review-required'
  | 'no-settleable-transaction';

export type PartnerSettlementReviewStep = {
  label: string;
  status: 'ready' | 'needs-review' | 'missing-data';
  detail: string;
};

export type PartnerSettlementReviewCandidate = {
  id: number;
  label: string;
  identifier: string | null;
  balance: number | null;
  settlementPurchasePrice: number | null;
  paidAmount: number | null;
  soldAt: string | null;
  sourceLabel: string | null;
  hasSource: boolean;
  hasCurrentPurchasePrice: boolean;
};

export type PartnerSettlementReviewFlow = {
  statusLabel: string;
  tone: 'success' | 'warning' | 'danger' | 'neutral';
  locked: true;
  managerConfirmationRequired: true;
  automaticExecutionAllowed: false;
  candidateCount: number;
  candidateAmount: number | null;
  candidates: PartnerSettlementReviewCandidate[];
  steps: PartnerSettlementReviewStep[];
  actionHints: string[];
  missingDataReasons: string[];
};

export type PartnerSettlementConfirmationDraftLine = {
  readonly id: number;
  readonly label: string;
  readonly identifier: string | null;
  readonly amount: number | null;
  readonly costBasis: number | null;
  readonly paidAmount: number | null;
  readonly sourceLabel: string | null;
  readonly sourceReady: boolean;
  readonly priceReady: boolean;
  readonly managerReviewRequired: boolean;
};

export type PartnerSettlementConfirmationDraft = {
  readonly statusLabel: string;
  readonly tone: 'success' | 'warning' | 'danger' | 'neutral';
  readonly readonlyDraft: true;
  readonly managerReviewedRequired: true;
  readonly automaticLedgerMutationAllowed: false;
  readonly automaticInventoryMutationAllowed: false;
  readonly automaticAccountingMutationAllowed: false;
  readonly canSubmit: false;
  readonly draftAmount: number | null;
  readonly draftLineCount: number;
  readonly draftLines: PartnerSettlementConfirmationDraftLine[];
  readonly confirmationChecks: PartnerSettlementReviewStep[];
  readonly blockingReasons: string[];
  readonly summaryNote: string;
};

export type PartnerSettlementManualConfirmation = {
  readonly statusLabel: string;
  readonly tone: 'success' | 'warning' | 'danger' | 'neutral';
  readonly managerOnly: true;
  readonly managerRoleRequired: true;
  readonly modalOnly: true;
  readonly readonlyPreview: true;
  readonly automaticSubmissionAllowed: false;
  readonly automaticLedgerMutationAllowed: false;
  readonly automaticInventoryMutationAllowed: false;
  readonly automaticAccountingMutationAllowed: false;
  readonly routeMutationAllowed: false;
  readonly apiCallAllowed: false;
  readonly canOpenModal: boolean;
  readonly canOpenExistingManualWorkspace: boolean;
  readonly confirmationAmount: number | null;
  readonly confirmationLineCount: number;
  readonly confirmationLines: PartnerSettlementConfirmationDraftLine[];
  readonly blockingReasons: string[];
  readonly safeguards: string[];
  readonly managerOnlyReason: string;
};

export type PartnerSettlementAuditTrailPreviewLine = {
  readonly id: number;
  readonly label: string;
  readonly amount: number | null;
  readonly sourceLabel: string | null;
  readonly ledgerReferenceType: 'phone_settlement_payment';
  readonly traceNote: string;
  readonly missingFields: string[];
  readonly readyForManualAudit: boolean;
};

export type PartnerSettlementAuditTrailPreview = {
  readonly statusLabel: string;
  readonly tone: 'success' | 'warning' | 'danger' | 'neutral';
  readonly readonlyPreview: true;
  readonly generatedFrom: 'manual-confirmation-read-model';
  readonly persistenceAllowed: false;
  readonly apiCallAllowed: false;
  readonly ledgerMutationAllowed: false;
  readonly inventoryMutationAllowed: false;
  readonly accountingMutationAllowed: false;
  readonly pricingMutationAllowed: false;
  readonly automaticAuditCreationAllowed: false;
  readonly previewAmount: number | null;
  readonly previewLineCount: number;
  readonly trailLines: PartnerSettlementAuditTrailPreviewLine[];
  readonly checklist: PartnerSettlementReviewStep[];
  readonly blockingReasons: string[];
  readonly expectedLedgerNote: string;
  readonly retentionNote: string;
  readonly sourceSummary: string;
};

export type PartnerSettlementExecutionDraftLine = {
  readonly id: number;
  readonly label: string;
  readonly identifier: string | null;
  readonly amount: number | null;
  readonly sourceLabel: string | null;
  readonly ledgerReferenceType: 'phone_settlement_payment';
  readonly manualEntryRequired: true;
  readonly readyForManagerControl: boolean;
};

export type PartnerSettlementExecutionDraft = {
  readonly statusLabel: string;
  readonly tone: 'success' | 'warning' | 'danger' | 'neutral';
  readonly readonlyDraft: true;
  readonly managerControlled: true;
  readonly managerRoleRequired: true;
  readonly existingManualWorkspaceRequired: true;
  readonly automaticExecutionAllowed: false;
  readonly automaticLedgerMutationAllowed: false;
  readonly automaticInventoryMutationAllowed: false;
  readonly automaticAccountingMutationAllowed: false;
  readonly routeMutationAllowed: false;
  readonly apiCallAllowed: false;
  readonly canOpenManualConfirmation: boolean;
  readonly executionAmount: number | null;
  readonly executionLineCount: number;
  readonly executionLines: PartnerSettlementExecutionDraftLine[];
  readonly checklist: PartnerSettlementReviewStep[];
  readonly blockingReasons: string[];
  readonly safeguards: string[];
  readonly nextActionLabel: string;
  readonly summaryNote: string;
};


export type PartnerSettlementGuardedSubmitRequirement = {
  readonly label: string;
  readonly status: 'ready' | 'needs-review' | 'blocked';
  readonly detail: string;
};

export type PartnerSettlementGuardedSubmitDesign = {
  readonly statusLabel: string;
  readonly tone: 'success' | 'warning' | 'danger' | 'neutral';
  readonly readonlyDesign: true;
  readonly managerControlled: true;
  readonly managerRoleRequired: true;
  readonly explicitManagerConfirmationRequired: true;
  readonly existingManualWorkspaceRequired: true;
  readonly submitImplementationAllowed: false;
  readonly submitButtonEnabled: false;
  readonly automaticSettlementAllowed: false;
  readonly automaticLedgerMutationAllowed: false;
  readonly automaticInventoryMutationAllowed: false;
  readonly automaticAccountingMutationAllowed: false;
  readonly automaticPricingMutationAllowed: false;
  readonly routeMutationAllowed: false;
  readonly apiCallAllowed: false;
  readonly directSubmitHandlerAllowed: false;
  readonly rollbackPlanRequired: true;
  readonly auditTrailRequired: true;
  readonly idempotencyRequired: true;
  readonly designedAmount: number | null;
  readonly designedLineCount: number;
  readonly preSubmitRequirements: PartnerSettlementGuardedSubmitRequirement[];
  readonly rollbackPlan: string[];
  readonly errorHandlingPlan: string[];
  readonly mutationLocks: string[];
  readonly blockingReasons: string[];
  readonly nextSafeStepLabel: string;
  readonly summaryNote: string;
};


export type PartnerSettlementAtomicSubmitStep = {
  readonly label: string;
  readonly status: 'ready' | 'needs-review' | 'blocked';
  readonly detail: string;
};

export type PartnerSettlementAtomicSubmitContract = {
  readonly statusLabel: string;
  readonly tone: 'success' | 'warning' | 'danger' | 'neutral';
  readonly readonlyContract: true;
  readonly managerControlled: true;
  readonly managerRoleRequired: true;
  readonly explicitManagerConfirmationRequired: true;
  readonly existingManualWorkspaceRequired: true;
  readonly submitImplementationAllowed: false;
  readonly submitButtonEnabled: false;
  readonly routeMutationAllowed: false;
  readonly apiCallAllowed: false;
  readonly directSubmitHandlerAllowed: false;
  readonly transactionRequired: true;
  readonly atomicWriteRequired: true;
  readonly noPartialMutationAllowed: true;
  readonly rollbackRequired: true;
  readonly idempotencyKeyRequired: true;
  readonly duplicateSubmitBlocked: true;
  readonly preflightValidationRequired: true;
  readonly auditTrailRequired: true;
  readonly automaticSettlementAllowed: false;
  readonly automaticLedgerMutationAllowed: false;
  readonly automaticInventoryMutationAllowed: false;
  readonly automaticAccountingMutationAllowed: false;
  readonly automaticPricingMutationAllowed: false;
  readonly contractAmount: number | null;
  readonly contractLineCount: number;
  readonly idempotencySourceFields: string[];
  readonly transactionBoundary: string[];
  readonly preflightChecks: PartnerSettlementAtomicSubmitStep[];
  readonly rollbackContract: string[];
  readonly failureModes: string[];
  readonly mutationLocks: string[];
  readonly blockingReasons: string[];
  readonly nextSafeStepLabel: string;
  readonly summaryNote: string;
};


export type PartnerSettlementAtomicSubmitDryRunStep = {
  readonly label: string;
  readonly status: 'pass' | 'review' | 'blocked';
  readonly detail: string;
};

export type PartnerSettlementAtomicSubmitDryRunHarness = {
  readonly statusLabel: string;
  readonly tone: 'success' | 'warning' | 'danger' | 'neutral';
  readonly readonlyHarness: true;
  readonly dryRunOnly: true;
  readonly managerControlled: true;
  readonly managerRoleRequired: true;
  readonly explicitManagerConfirmationRequired: true;
  readonly existingManualWorkspaceRequired: true;
  readonly submitImplementationAllowed: false;
  readonly submitButtonEnabled: false;
  readonly routeMutationAllowed: false;
  readonly apiCallAllowed: false;
  readonly directSubmitHandlerAllowed: false;
  readonly persistenceAllowed: false;
  readonly storageMutationAllowed: false;
  readonly ledgerMutationAllowed: false;
  readonly inventoryMutationAllowed: false;
  readonly accountingMutationAllowed: false;
  readonly pricingMutationAllowed: false;
  readonly transactionSimulationOnly: true;
  readonly atomicWriteRequired: true;
  readonly noPartialMutationAllowed: true;
  readonly rollbackPreviewRequired: true;
  readonly idempotencyPreviewRequired: true;
  readonly duplicateSubmitBlocked: true;
  readonly dryRunAmount: number | null;
  readonly dryRunLineCount: number;
  readonly deterministicPreviewKey: string;
  readonly dryRunId: string;
  readonly settlementDraftId: string;
  readonly confirmedLineIds: number[];
  readonly simulationSteps: PartnerSettlementAtomicSubmitDryRunStep[];
  readonly idempotencyPreview: string[];
  readonly rollbackPreview: string[];
  readonly noPartialMutationChecks: string[];
  readonly blockedExecutionReasons: string[];
  readonly mutationLocks: string[];
  readonly nextSafeStepLabel: string;
  readonly summaryNote: string;
};

export type PartnerBusinessReadModel = {
  kpis: PartnerBusinessValue[];
  relatedProducts: {
    totalItems: number;
    phoneItems: number;
    productItems: number;
    soldPhoneItems: number;
    openSettlementItems: number;
    missingCurrentPurchasePriceItems: number;
    missingSourceItems: number;
    inventoryValue: PartnerBusinessValue;
    shareValue: PartnerBusinessValue;
  };
  ledgerPreview: {
    id: number;
    date: string | null;
    typeLabel: string;
    amount: number;
    direction: 'debit' | 'credit' | 'neutral';
    description: string;
    balance: number | null;
    sourceLabel: string | null;
    sourceUrl: string | null;
  }[];
  settlementReadiness: {
    status: PartnerSettlementReadinessStatus;
    label: string;
    tone: 'success' | 'warning' | 'danger' | 'neutral';
    reasons: string[];
    reviewableAmount: number | null;
  };
  reviewFlow: PartnerSettlementReviewFlow;
  confirmationDraft: PartnerSettlementConfirmationDraft;
  manualConfirmation: PartnerSettlementManualConfirmation;
  auditTrailPreview: PartnerSettlementAuditTrailPreview;
  executionDraft: PartnerSettlementExecutionDraft;
  guardedSubmitDesign: PartnerSettlementGuardedSubmitDesign;
  atomicSubmitContract: PartnerSettlementAtomicSubmitContract;
  atomicSubmitDryRunHarness: PartnerSettlementAtomicSubmitDryRunHarness;
  warnings: string[];
};

const toNumberOrNull = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const sumSafe = (rows: any[], selector: (row: any) => unknown): number =>
  rows.reduce((sum, row) => sum + Math.max(0, Number(selector(row) || 0)), 0);

const buildKnownValue = (label: string, value: unknown, reason: string): PartnerBusinessValue => {
  const numeric = toNumberOrNull(value);
  return numeric == null
    ? { label, value: null, status: 'missing-data', reason }
    : { label, value: numeric, status: 'known' };
};

const buildMissingValue = (label: string, reason: string): PartnerBusinessValue => ({
  label,
  value: null,
  status: 'missing-data',
  reason,
});

const mapLedgerSource = (entry: any): { sourceLabel: string | null; sourceUrl: string | null } => {
  const referenceType = String(entry?.referenceType || '').trim();
  const referenceId = Number(entry?.referenceId || 0);
  if (!referenceType || !referenceId) return { sourceLabel: null, sourceUrl: null };
  if (referenceType.includes('phone')) {
    return { sourceLabel: `گوشی #${referenceId.toLocaleString('fa-IR')}`, sourceUrl: `/mobile-phones?phoneId=${referenceId}` };
  }
  if (referenceType.includes('product')) {
    return { sourceLabel: `کالا #${referenceId.toLocaleString('fa-IR')}`, sourceUrl: `/products?productId=${referenceId}` };
  }
  if (referenceType.includes('installment')) {
    return { sourceLabel: `فروش اقساطی #${referenceId.toLocaleString('fa-IR')}`, sourceUrl: `/installment-sales/${referenceId}` };
  }
  if (referenceType.includes('invoice') || referenceType.includes('sales_order')) {
    return { sourceLabel: `فاکتور فروش #${referenceId.toLocaleString('fa-IR')}`, sourceUrl: `/invoices/${referenceId}` };
  }
  return { sourceLabel: null, sourceUrl: null };
};

const mapLedgerTypeLabel = (entry: any): string => {
  const type = String(entry?.referenceType || '').toLowerCase();
  const description = String(entry?.description || '').toLowerCase();
  if (type.includes('installment')) return 'فروش اقساطی';
  if (type.includes('cash') || type.includes('invoice') || type.includes('sales_order')) return 'فروش نقدی';
  if (type.includes('settlement')) return 'تسویه';
  if (type.includes('payment') || Number(entry?.debit || 0) > 0) return 'پرداخت';
  if (type.includes('adjust') || description.includes('اصلاح')) return 'اصلاحیه';
  if (type.includes('purchase') || type.includes('product') || type.includes('phone')) return 'ورود کالا';
  if (Number(entry?.credit || 0) > 0) return 'سهم شریک';
  return 'تراکنش دفتر';
};

export const buildPartnerBusinessReadModel = ({
  profile,
  ledger,
  purchaseHistory,
  soldPhoneDailyPriceRows,
  unsoldInventoryAmount,
  soldPhonesProductSettlementBalance,
  soldPhonesCurrentPurchaseAmount,
  soldPhonesCurrentPurchaseDelta,
  totalCredits,
  totalDebits,
  purchaseSummary,
  ledgerSummary,
  settlementSummary,
}: {
  profile: any;
  ledger: any[];
  purchaseHistory: any[];
  soldPhoneDailyPriceRows: any[];
  unsoldInventoryAmount: number;
  soldPhonesProductSettlementBalance: number;
  soldPhonesCurrentPurchaseAmount: number;
  soldPhonesCurrentPurchaseDelta: number;
  totalCredits: number;
  totalDebits: number;
  purchaseSummary?: { all?: number; phone?: number; product?: number; totalValue?: number } | null;
  ledgerSummary?: { total?: number; totalDebit?: number; totalCredit?: number; latestBalance?: number } | null;
  settlementSummary?: { total?: number; open?: number; missingCurrentPurchasePriceItems?: number; missingSourceItems?: number } | null;
}): PartnerBusinessReadModel => {
  const safeLedger = Array.isArray(ledger) ? ledger : [];
  const safePurchaseHistory = Array.isArray(purchaseHistory) ? purchaseHistory : [];
  const safeSoldPhones = Array.isArray(soldPhoneDailyPriceRows) ? soldPhoneDailyPriceRows : [];
  const phoneItems = Number(purchaseSummary?.phone ?? safePurchaseHistory.filter((item) => item?.type === 'phone').length);
  const productItems = Number(purchaseSummary?.product ?? safePurchaseHistory.filter((item) => item?.type === 'product').length);
  const purchaseItemCount = Number(purchaseSummary?.all ?? (phoneItems + productItems));
  const ledgerItemCount = Number(ledgerSummary?.total ?? safeLedger.length);
  const soldPhoneItemCount = Number(settlementSummary?.total ?? safeSoldPhones.length);
  const openSettlementItems = Number(settlementSummary?.open ?? safeSoldPhones.filter((item) => Number(item?.phoneSettlementBalance || 0) > 0).length);
  const missingCurrentPurchasePriceItems = Number(settlementSummary?.missingCurrentPurchasePriceItems ?? safeSoldPhones.filter((item) => Number(item?.settlementPurchasePrice || 0) <= 0).length);
  const missingSourceItems = Number(settlementSummary?.missingSourceItems ?? safeSoldPhones.filter((item) => !item?.saleSourceType && !item?.saleReferenceLabel).length);
  const relatedShareTotal = purchaseSummary?.totalValue != null
    ? Number(purchaseSummary.totalValue || 0)
    : sumSafe(safePurchaseHistory, (item) => Number(item?.totalPrice ?? item?.settlementPurchasePrice ?? item?.purchasePrice ?? 0));
  const shareValue = purchaseItemCount > 0
    ? buildKnownValue('کل سهم شریک', relatedShareTotal, 'مبلغ سهم از کالاهای مرتبط قابل محاسبه نبود.')
    : buildMissingValue('کل سهم شریک', 'هیچ کالای مرتبط با این همکار در read-model موجود نیست.');
  const inventoryValue = (phoneItems + productItems) > 0
    ? buildKnownValue('ارزش موجودی مرتبط', unsoldInventoryAmount, 'ارزش موجودی مرتبط از داده‌های کالا/گوشی قابل محاسبه نبود.')
    : buildMissingValue('ارزش موجودی مرتبط', 'کالای مرتبطی برای ارزش‌گذاری موجودی یافت نشد.');
  const reviewableProfitValue = soldPhoneItemCount > 0
    ? buildKnownValue('سود/زیان قابل بررسی', soldPhonesCurrentPurchaseDelta, 'اختلاف قیمت خرید روز و قیمت خرید اولیه قابل محاسبه نبود.')
    : buildMissingValue('سود/زیان قابل بررسی', 'برای محاسبه سود/زیان قابل بررسی، فروش گوشی مرتبط لازم است.');

  const ledgerPreview = safeLedger.slice(0, 6).map((entry) => {
    const source = mapLedgerSource(entry);
    const debit = Number(entry?.debit || 0);
    const credit = Number(entry?.credit || 0);
    const amount = Math.max(debit, credit, 0);
    return {
      id: Number(entry?.id || 0),
      date: entry?.transactionDate || entry?.createdAt || null,
      typeLabel: mapLedgerTypeLabel(entry),
      amount,
      direction: debit > 0 ? 'debit' as const : credit > 0 ? 'credit' as const : 'neutral' as const,
      description: String(entry?.description || 'بدون شرح'),
      balance: toNumberOrNull(entry?.balance),
      sourceLabel: source.sourceLabel,
      sourceUrl: source.sourceUrl,
    };
  });

  const warnings: string[] = [];
  if (purchaseItemCount === 0) warnings.push('برای این همکار کالای مرتبط ثبت نشده یا read-model آن خالی است.');
  if (missingCurrentPurchasePriceItems > 0) warnings.push('برای بخشی از کالاهای فروخته‌شده قیمت خرید روز یا مبنای تسویه کامل نیست.');
  if (missingSourceItems > 0) warnings.push('برای بخشی از فروش‌ها لینک منبع فروش قابل تشخیص نیست.');
  if (ledgerItemCount === 0) warnings.push('دفتر حساب همکار خالی است و سابقه تراکنش قابل نمایش وجود ندارد.');

  let status: PartnerSettlementReadinessStatus = 'no-settleable-transaction';
  const reasons: string[] = [];
  const reviewableAmount = openSettlementItems > 0 ? Math.max(0, Number(soldPhonesProductSettlementBalance || 0)) : null;

  if (purchaseItemCount === 0 && ledgerItemCount === 0) {
    status = 'no-settleable-transaction';
    reasons.push('نه کالای مرتبط و نه تراکنش دفتر برای بررسی تسویه وجود دارد.');
  } else if (purchaseItemCount === 0) {
    status = 'missing-product-data';
    reasons.push('برای بررسی محصول‌محور، ابتدا باید کالای مرتبط با همکار کامل باشد.');
  } else if (missingCurrentPurchasePriceItems > 0) {
    status = 'missing-current-purchase-price';
    reasons.push('قیمت خرید روز یا مبنای تسویه بعضی کالاهای فروخته‌شده ناقص است.');
  } else if (openSettlementItems > 0 && reviewableAmount !== null && reviewableAmount > 0) {
    status = missingSourceItems > 0 ? 'manager-review-required' : 'ready-for-review';
    reasons.push(missingSourceItems > 0
      ? 'بعضی ردیف‌ها منبع فروش کامل ندارند و قبل از تسویه نیازمند بررسی مدیر هستند.'
      : 'مانده محصول‌محور قابل بررسی است و اجرای تسویه همچنان دستی/مدیریتی می‌ماند.');
  } else if (purchaseItemCount > 0 && soldPhoneItemCount === 0) {
    status = 'no-settleable-transaction';
    reasons.push('کالای مرتبط وجود دارد، اما فروش قابل تسویه برای این همکار پیدا نشد.');
  } else {
    status = 'no-settleable-transaction';
    reasons.push('مانده باز محصول‌محور برای تسویه وجود ندارد.');
  }

  const statusMeta: Record<PartnerSettlementReadinessStatus, { label: string; tone: PartnerBusinessReadModel['settlementReadiness']['tone'] }> = {
    'ready-for-review': { label: 'آماده بررسی', tone: 'success' },
    'missing-product-data': { label: 'نیازمند تکمیل اطلاعات کالا', tone: 'warning' },
    'missing-partner-share': { label: 'نیازمند تکمیل سهم شریک', tone: 'warning' },
    'missing-current-purchase-price': { label: 'نیازمند تکمیل قیمت خرید روز', tone: 'danger' },
    'manager-review-required': { label: 'نیازمند بررسی مدیر', tone: 'warning' },
    'no-settleable-transaction': { label: 'فاقد تراکنش قابل تسویه', tone: 'neutral' },
  };

  const reviewCandidates: PartnerSettlementReviewCandidate[] = safeSoldPhones
    .filter((item) => Number(item?.phoneSettlementBalance || 0) > 0)
    .map((item) => {
      const sourceLabel = String(item?.settlementPriceSourceLabel || item?.saleReferenceLabel || '').trim();
      const settlementPurchasePrice = toNumberOrNull(item?.settlementPurchasePrice);
      return {
        id: Number(item?.id || 0),
        label: String(item?.name || item?.model || 'کالای فروخته‌شده'),
        identifier: item?.identifier ? String(item.identifier) : null,
        balance: toNumberOrNull(item?.phoneSettlementBalance),
        settlementPurchasePrice,
        paidAmount: toNumberOrNull(item?.phoneSettlementPaidAmount),
        soldAt: item?.soldAt || item?.purchaseDate || null,
        sourceLabel: sourceLabel || null,
        hasSource: Boolean(sourceLabel || item?.saleSourceType),
        hasCurrentPurchasePrice: Number(settlementPurchasePrice || 0) > 0,
      };
    });

  const reviewSteps: PartnerSettlementReviewStep[] = [
    {
      label: 'تطبیق کالاهای مرتبط',
      status: purchaseItemCount > 0 ? 'ready' : 'missing-data',
      detail: purchaseItemCount > 0
        ? 'کالا یا گوشی مرتبط برای مرور محصول‌محور در دسترس است.'
        : 'برای مرور تسویه، ابتدا باید کالا یا گوشی مرتبط با همکار کامل شود.',
    },
    {
      label: 'تکمیل مبنای قیمت خرید روز',
      status: missingCurrentPurchasePriceItems === 0 ? 'ready' : 'missing-data',
      detail: missingCurrentPurchasePriceItems === 0
        ? 'برای ردیف‌های قابل بررسی، مبنای قیمت خرید روز ناقص دیده نشد.'
        : 'بخشی از ردیف‌ها بدون مبنای قیمت خرید روز قابل اتکا هستند.',
    },
    {
      label: 'تشخیص منبع فروش',
      status: missingSourceItems === 0 ? 'ready' : 'needs-review',
      detail: missingSourceItems === 0
        ? 'منبع فروش ردیف‌های قابل مرور قابل تشخیص است.'
        : 'بعضی ردیف‌ها منبع فروش کامل ندارند و باید توسط مدیر بررسی شوند.',
    },
    {
      label: 'مرور دفتر حساب همکار',
      status: ledgerItemCount > 0 ? 'ready' : 'needs-review',
      detail: ledgerItemCount > 0
        ? 'دفتر حساب همکار برای تطبیق مانده در دسترس است.'
        : 'دفتر حساب خالی است؛ قبل از ثبت هر پرداخت، مدیر باید این موضوع را بررسی کند.',
    },
    {
      label: 'تایید نهایی مدیر',
      status: status === 'ready-for-review' ? 'needs-review' : 'missing-data',
      detail: status === 'ready-for-review'
        ? 'مرور آماده است، اما ثبت تسویه فقط با اقدام دستی و تایید مدیر انجام می‌شود.'
        : 'تا تکمیل موارد ناقص، تایید نهایی نباید انجام شود.',
    },
  ];

  const reviewMissingDataReasons = reviewSteps
    .filter((step) => step.status !== 'ready')
    .map((step) => step.detail);

  const reviewFlow: PartnerSettlementReviewFlow = {
    statusLabel: status === 'ready-for-review' ? 'آماده مرور مدیر' : statusMeta[status].label,
    tone: statusMeta[status].tone,
    locked: true,
    managerConfirmationRequired: true,
    automaticExecutionAllowed: false,
    candidateCount: reviewCandidates.length,
    candidateAmount: reviewCandidates.length > 0 ? reviewCandidates.reduce((sum, candidate) => sum + Math.max(0, Number(candidate.balance || 0)), 0) : null,
    candidates: reviewCandidates.slice(0, 8),
    steps: reviewSteps,
    actionHints: [
      'این جریان فقط برای مرور مدیریتی است و خودش هیچ تسویه‌ای ثبت نمی‌کند.',
      'برای ثبت واقعی، مدیر باید از کنترل دستی موجود در جدول عملیاتی استفاده کند.',
      'اگر اطلاعات کالا، سهم یا قیمت خرید روز ناقص باشد، مبلغ تسویه نباید حدس زده شود.',
    ],
    missingDataReasons: reviewMissingDataReasons,
  };

  const candidateAmount = reviewFlow.candidateAmount;

  const confirmationChecks: PartnerSettlementReviewStep[] = [
    {
      label: 'انتخاب ردیف‌های قابل تایید',
      status: reviewCandidates.length > 0 ? 'ready' : 'missing-data',
      detail: reviewCandidates.length > 0
        ? 'ردیف‌های دارای مانده محصول‌محور برای پیش‌نویس تایید آماده نمایش هستند.'
        : 'تا وقتی ردیف دارای مانده وجود نداشته باشد، پیش‌نویس تایید ساخته نمی‌شود.',
    },
    {
      label: 'مبلغ پیش‌نویس از مانده واقعی',
      status: candidateAmount != null && candidateAmount > 0 ? 'ready' : 'missing-data',
      detail: candidateAmount != null && candidateAmount > 0
        ? 'مبلغ پیش‌نویس فقط از جمع مانده‌های ثبت‌شده ساخته شده است.'
        : 'مبلغ قابل تایید از داده‌های موجود قابل محاسبه نیست.',
    },
    {
      label: 'قیمت خرید روز کامل',
      status: missingCurrentPurchasePriceItems === 0 ? 'ready' : 'missing-data',
      detail: missingCurrentPurchasePriceItems === 0
        ? 'برای ردیف‌های فروخته‌شده، نقص قیمت خرید روز دیده نشد.'
        : 'قبل از تایید، قیمت خرید روز ردیف‌های ناقص باید تکمیل شود.',
    },
    {
      label: 'منبع فروش قابل تطبیق',
      status: missingSourceItems === 0 ? 'ready' : 'needs-review',
      detail: missingSourceItems === 0
        ? 'منبع فروش ردیف‌های قابل تایید قابل تشخیص است.'
        : 'بعضی ردیف‌ها منبع فروش کامل ندارند و باید دستی بررسی شوند.',
    },
    {
      label: 'ثبت فقط از مسیر دستی موجود',
      status: 'needs-review',
      detail: 'این پیش‌نویس دکمه ثبت ندارد و فقط به مدیر نشان می‌دهد چه چیزی باید قبل از اقدام دستی بررسی شود.',
    },
  ];

  const confirmationBlockingReasons = confirmationChecks
    .filter((step) => step.status !== 'ready')
    .map((step) => step.detail);

  const confirmationDraft: PartnerSettlementConfirmationDraft = {
    statusLabel: reviewCandidates.length === 0
      ? 'فاقد پیش‌نویس قابل تایید'
      : confirmationBlockingReasons.length > 1
        ? 'نیازمند تکمیل پیش از تایید'
        : 'آماده مرور نهایی مدیر',
    tone: reviewCandidates.length === 0
      ? 'neutral'
      : confirmationBlockingReasons.length > 1
        ? 'warning'
        : 'success',
    readonlyDraft: true,
    managerReviewedRequired: true,
    automaticLedgerMutationAllowed: false,
    automaticInventoryMutationAllowed: false,
    automaticAccountingMutationAllowed: false,
    canSubmit: false,
    draftAmount: candidateAmount,
    draftLineCount: reviewCandidates.length,
    draftLines: reviewCandidates.slice(0, 8).map((candidate) => ({
      id: candidate.id,
      label: candidate.label,
      identifier: candidate.identifier,
      amount: candidate.balance,
      costBasis: candidate.settlementPurchasePrice,
      paidAmount: candidate.paidAmount,
      sourceLabel: candidate.sourceLabel,
      sourceReady: candidate.hasSource,
      priceReady: candidate.hasCurrentPurchasePrice,
      managerReviewRequired: !candidate.hasSource || !candidate.hasCurrentPurchasePrice,
    })),
    confirmationChecks,
    blockingReasons: confirmationBlockingReasons,
    summaryNote: 'این پیش‌نویس فقط برای مرور نهایی مدیر است و هیچ دفتر، موجودی یا حسابداری را تغییر نمی‌دهد.',
  };

  const manualConfirmationBlockingReasons = [
    ...confirmationBlockingReasons,
    ...(reviewCandidates.length === 0 ? ['ردیف دارای مانده محصول‌محور برای تایید دستی وجود ندارد.'] : []),
    ...(candidateAmount == null || candidateAmount <= 0 ? ['مبلغ قابل تایید دستی از داده‌های موجود قابل محاسبه نیست.'] : []),
  ].filter((reason, index, list) => reason && list.indexOf(reason) === index);

  const manualConfirmation: PartnerSettlementManualConfirmation = {
    statusLabel: reviewCandidates.length === 0
      ? 'فاقد مورد برای تایید دستی'
      : manualConfirmationBlockingReasons.length > 1
        ? 'نیازمند رفع نقص پیش از تایید دستی'
        : 'آماده بازبینی دستی مدیر',
    tone: reviewCandidates.length === 0
      ? 'neutral'
      : manualConfirmationBlockingReasons.length > 1
        ? 'warning'
        : 'success',
    managerOnly: true,
    managerRoleRequired: true,
    modalOnly: true,
    readonlyPreview: true,
    automaticSubmissionAllowed: false,
    automaticLedgerMutationAllowed: false,
    automaticInventoryMutationAllowed: false,
    automaticAccountingMutationAllowed: false,
    routeMutationAllowed: false,
    apiCallAllowed: false,
    canOpenModal: reviewCandidates.length > 0,
    canOpenExistingManualWorkspace: reviewCandidates.length > 0 && candidateAmount != null && candidateAmount > 0,
    confirmationAmount: candidateAmount,
    confirmationLineCount: reviewCandidates.length,
    confirmationLines: confirmationDraft.draftLines,
    blockingReasons: manualConfirmationBlockingReasons,
    safeguards: [
      'این تایید فقط یک پنجره مرور دستی برای مدیر است و خودش هیچ پرداختی ثبت نمی‌کند.',
      'هیچ درخواست شبکه، مسیر جدید یا ثبت خودکار دفتر حساب از این پنجره انجام نمی‌شود.',
      'برای اقدام واقعی، مدیر باید جداگانه وارد کنترل دستی موجود شود و اطلاعات را دوباره بررسی کند.',
    ],
    managerOnlyReason: 'باز کردن این پنجره فقط برای نقش‌های مدیر یا ادمین مجاز است؛ سایر نقش‌ها فقط وضعیت خواندنی را می‌بینند.',
  };


  const auditTrailLines: PartnerSettlementAuditTrailPreviewLine[] = confirmationDraft.draftLines.map((line) => {
    const missingFields = [
      ...(line.identifier ? [] : ['شناسه کالا']),
      ...(line.sourceReady ? [] : ['منبع فروش']),
      ...(line.priceReady ? [] : ['قیمت خرید روز']),
      ...(line.amount != null && Number(line.amount) > 0 ? [] : ['مبلغ قابل ردیابی']),
    ];
    return {
      id: line.id,
      label: line.label,
      amount: line.amount,
      sourceLabel: line.sourceLabel,
      ledgerReferenceType: 'phone_settlement_payment',
      traceNote: `پیش‌نمایش ردپا برای تسویه دستی ${line.label}${line.identifier ? ` با شناسه ${line.identifier}` : ''}`,
      missingFields,
      readyForManualAudit: missingFields.length === 0,
    };
  });

  const auditTrailBlockingReasons = [
    ...manualConfirmationBlockingReasons,
    ...auditTrailLines.flatMap((line) => line.missingFields.map((field) => `${line.label}: ${field} نیازمند تکمیل است.`)),
  ].filter((reason, index, list) => reason && list.indexOf(reason) === index);

  const auditTrailChecklist: PartnerSettlementReviewStep[] = [
    {
      label: 'ردیابی منبع فروش',
      status: auditTrailLines.length > 0 && auditTrailLines.every((line) => line.sourceLabel) ? 'ready' : 'needs-review',
      detail: auditTrailLines.length > 0 && auditTrailLines.every((line) => line.sourceLabel)
        ? 'برای ردیف‌های پیش‌نمایش، منبع فروش قابل نمایش است.'
        : 'برای بعضی ردیف‌ها منبع فروش کامل نیست و باید قبل از ثبت دستی بررسی شود.',
    },
    {
      label: 'یادداشت دفتر حساب',
      status: auditTrailLines.length > 0 ? 'ready' : 'missing-data',
      detail: auditTrailLines.length > 0
        ? 'یادداشت پیشنهادی فقط برای کپی ذهنی مدیر است و در این بخش ذخیره نمی‌شود.'
        : 'برای ساخت پیش‌نمایش یادداشت، ردیف قابل مرور وجود ندارد.',
    },
    {
      label: 'محدودیت نگهداری داده',
      status: 'ready',
      detail: 'این پیش‌نمایش raw payload، فایل، مسیر یا داده حساس ذخیره نمی‌کند.',
    },
    {
      label: 'ثبت خودکار ردپا',
      status: 'needs-review',
      detail: 'ایجاد ردپای واقعی فقط هنگام ثبت دستی موجود ممکن است و این بخش هیچ ثبت خودکاری انجام نمی‌دهد.',
    },
  ];

  const auditTrailPreview: PartnerSettlementAuditTrailPreview = {
    statusLabel: auditTrailLines.length === 0
      ? 'فاقد ردپای قابل پیش‌نمایش'
      : auditTrailBlockingReasons.length > 1
        ? 'نیازمند تکمیل ردپای تسویه'
        : 'آماده مرور ردپای دستی',
    tone: auditTrailLines.length === 0
      ? 'neutral'
      : auditTrailBlockingReasons.length > 1
        ? 'warning'
        : 'success',
    readonlyPreview: true,
    generatedFrom: 'manual-confirmation-read-model',
    persistenceAllowed: false,
    apiCallAllowed: false,
    ledgerMutationAllowed: false,
    inventoryMutationAllowed: false,
    accountingMutationAllowed: false,
    pricingMutationAllowed: false,
    automaticAuditCreationAllowed: false,
    previewAmount: candidateAmount,
    previewLineCount: auditTrailLines.length,
    trailLines: auditTrailLines.slice(0, 8),
    checklist: auditTrailChecklist,
    blockingReasons: auditTrailBlockingReasons,
    expectedLedgerNote: 'تسویه دستی همکار بر اساس ردیف‌های محصول‌محور بررسی‌شده؛ ثبت واقعی فقط از مسیر دستی موجود انجام شود.',
    retentionNote: 'این بخش فقط پیش‌نمایش خواندنی است و هیچ یادداشت، فایل، مسیر، payload یا داده عملیاتی را ذخیره نمی‌کند.',
    sourceSummary: auditTrailLines.length > 0
      ? 'ردپا از پیش‌نویس تایید و ردیف‌های محصول‌محور موجود ساخته شده است.'
      : 'برای ساخت ردپا، ابتدا باید ردیف قابل تایید وجود داشته باشد.',
  };

  const executionDraftLines: PartnerSettlementExecutionDraftLine[] = auditTrailLines.slice(0, 8).map((line) => ({
    id: line.id,
    label: line.label,
    identifier: confirmationDraft.draftLines.find((draftLine) => draftLine.id === line.id)?.identifier || null,
    amount: line.amount,
    sourceLabel: line.sourceLabel,
    ledgerReferenceType: line.ledgerReferenceType,
    manualEntryRequired: true,
    readyForManagerControl: line.readyForManualAudit,
  }));

  const executionBlockingReasons = [
    ...auditTrailBlockingReasons,
    ...(!manualConfirmation.canOpenExistingManualWorkspace ? ['برای ورود به کنترل دستی موجود، ردیف و مبلغ قابل بازبینی لازم است.'] : []),
  ].filter((reason, index, list) => reason && list.indexOf(reason) === index);

  const executionChecklist: PartnerSettlementReviewStep[] = [
    {
      label: 'کنترل نقش مدیر',
      status: 'needs-review',
      detail: 'اجرای واقعی فقط پس از ورود مدیر یا ادمین به کنترل دستی موجود قابل انجام است.',
    },
    {
      label: 'اتصال به کنترل دستی موجود',
      status: manualConfirmation.canOpenExistingManualWorkspace ? 'ready' : 'missing-data',
      detail: manualConfirmation.canOpenExistingManualWorkspace
        ? 'پیش‌نویس می‌تواند مدیر را به کنترل دستی موجود هدایت کند؛ خودش ثبت انجام نمی‌دهد.'
        : 'تا وقتی ردیف و مبلغ قابل بازبینی وجود نداشته باشد، کنترل دستی نباید باز شود.',
    },
    {
      label: 'ردپای حسابرسی قابل مرور',
      status: auditTrailLines.length > 0 ? 'ready' : 'missing-data',
      detail: auditTrailLines.length > 0
        ? 'ردیف‌های پیش‌نویس اجرای کنترل‌شده از پیش‌نمایش ردپای خواندنی ساخته شده‌اند.'
        : 'برای ساخت پیش‌نویس اجرا، ابتدا باید ردپای قابل مرور وجود داشته باشد.',
    },
    {
      label: 'قفل تغییر خودکار',
      status: 'ready',
      detail: 'این پیش‌نویس هیچ مسیر شبکه، ثبت دفتر، تغییر موجودی یا محاسبه جدید ایجاد نمی‌کند.',
    },
  ];

  const executionDraft: PartnerSettlementExecutionDraft = {
    statusLabel: executionDraftLines.length === 0
      ? 'فاقد پیش‌نویس اجرا'
      : executionBlockingReasons.length > 1
        ? 'نیازمند کنترل مدیر پیش از اجرا'
        : 'آماده ورود مدیر به کنترل دستی',
    tone: executionDraftLines.length === 0
      ? 'neutral'
      : executionBlockingReasons.length > 1
        ? 'warning'
        : 'success',
    readonlyDraft: true,
    managerControlled: true,
    managerRoleRequired: true,
    existingManualWorkspaceRequired: true,
    automaticExecutionAllowed: false,
    automaticLedgerMutationAllowed: false,
    automaticInventoryMutationAllowed: false,
    automaticAccountingMutationAllowed: false,
    routeMutationAllowed: false,
    apiCallAllowed: false,
    canOpenManualConfirmation: manualConfirmation.canOpenModal,
    executionAmount: candidateAmount,
    executionLineCount: executionDraftLines.length,
    executionLines: executionDraftLines,
    checklist: executionChecklist,
    blockingReasons: executionBlockingReasons,
    safeguards: [
      'این پیش‌نویس فقط ترتیب کنترل مدیر را نشان می‌دهد و خودش تسویه ثبت نمی‌کند.',
      'هیچ مسیر جدید، درخواست شبکه، تغییر دفتر حساب، تغییر موجودی یا ثبت حسابداری از این بخش انجام نمی‌شود.',
      'برای اقدام واقعی، مدیر باید وارد کنترل دستی موجود شود و ثبت را جداگانه تایید کند.',
    ],
    nextActionLabel: 'باز کردن تایید دستی مدیر',
    summaryNote: 'پیش‌نویس اجرا از پیش‌نویس تایید و ردپای حسابرسی خواندنی ساخته شده و فقط مدیر را به مسیر دستی موجود هدایت می‌کند.',
  };


  const guardedSubmitRequirements: PartnerSettlementGuardedSubmitRequirement[] = [
    {
      label: 'قفل نقش مدیر',
      status: 'needs-review',
      detail: 'طراحی ثبت امن باید فقط پس از تایید صریح مدیر یا ادمین در کنترل دستی موجود فعال شود.',
    },
    {
      label: 'تطبیق مبلغ و ردیف‌ها',
      status: candidateAmount != null && candidateAmount > 0 && executionDraftLines.length > 0 ? 'ready' : 'blocked',
      detail: candidateAmount != null && candidateAmount > 0 && executionDraftLines.length > 0
        ? 'مبلغ و ردیف‌های قابل طراحی از همان پیش‌نویس اجرا خوانده شده‌اند.'
        : 'برای طراحی ثبت امن، مبلغ مثبت و ردیف قابل کنترل لازم است.',
    },
    {
      label: 'ردپای حسابرسی قبل از ثبت',
      status: auditTrailLines.length > 0 && auditTrailLines.every((line) => line.readyForManualAudit) ? 'ready' : 'needs-review',
      detail: auditTrailLines.length > 0 && auditTrailLines.every((line) => line.readyForManualAudit)
        ? 'ردپای لازم برای بررسی مدیر کامل است.'
        : 'قبل از هر ثبت واقعی باید منبع فروش، شناسه کالا، قیمت خرید روز و مبلغ ردیف‌ها کامل شود.',
    },
    {
      label: 'کلید جلوگیری از ثبت تکراری',
      status: 'needs-review',
      detail: 'طراحی نهایی باید شناسه یکتای درخواست مدیر داشته باشد تا ثبت دوباره یک تسویه ممکن نباشد.',
    },
    {
      label: 'برنامه برگشت و خطا',
      status: 'needs-review',
      detail: 'قبل از فعال‌سازی ثبت واقعی باید رفتار شکست، برگشت عملیات و پیام خطا دقیق و قابل پیگیری شود.',
    },
  ];

  const guardedSubmitBlockingReasons = [
    ...executionBlockingReasons,
    ...(guardedSubmitRequirements.some((step) => step.status === 'blocked') ? ['طراحی ثبت امن هنوز شرط‌های داده‌ای لازم را کامل ندارد.'] : []),
    'در این مرحله ثبت واقعی عمداً غیرفعال است تا قبل از فعال‌سازی، قفل نقش، ردپا، جلوگیری از ثبت تکراری و برگشت عملیات کامل طراحی شود.',
  ].filter((reason, index, list) => reason && list.indexOf(reason) === index);

  const guardedSubmitDesign: PartnerSettlementGuardedSubmitDesign = {
    statusLabel: executionDraftLines.length === 0
      ? 'فاقد طرح ثبت امن'
      : guardedSubmitBlockingReasons.length > 1
        ? 'نیازمند تکمیل طراحی ثبت امن'
        : 'طرح ثبت امن آماده مرور مدیر',
    tone: executionDraftLines.length === 0
      ? 'neutral'
      : guardedSubmitBlockingReasons.length > 1
        ? 'warning'
        : 'success',
    readonlyDesign: true,
    managerControlled: true,
    managerRoleRequired: true,
    explicitManagerConfirmationRequired: true,
    existingManualWorkspaceRequired: true,
    submitImplementationAllowed: false,
    submitButtonEnabled: false,
    automaticSettlementAllowed: false,
    automaticLedgerMutationAllowed: false,
    automaticInventoryMutationAllowed: false,
    automaticAccountingMutationAllowed: false,
    automaticPricingMutationAllowed: false,
    routeMutationAllowed: false,
    apiCallAllowed: false,
    directSubmitHandlerAllowed: false,
    rollbackPlanRequired: true,
    auditTrailRequired: true,
    idempotencyRequired: true,
    designedAmount: candidateAmount,
    designedLineCount: executionDraftLines.length,
    preSubmitRequirements: guardedSubmitRequirements,
    rollbackPlan: [
      'ثبت واقعی باید اتمیک باشد؛ اگر یک ردیف دفتر حساب شکست خورد، هیچ ردیف نیمه‌کاره نباید باقی بماند.',
      'هر اقدام واقعی باید شناسه دسته و یادداشت قابل ردیابی داشته باشد تا مدیر بتواند آن را در دفتر همکار پیدا کند.',
      'قبل از خروج از کنترل دستی، نتیجه باید با مانده همکار و ردیف‌های تسویه‌شده دوباره تطبیق داده شود.',
    ],
    errorHandlingPlan: [
      'خطای اعتبارسنجی باید بدون تغییر داده نمایش داده شود و مدیر را برای تکمیل مبلغ، منبع یا قیمت روز راهنمایی کند.',
      'خطای شبکه یا سرور نباید دکمه ثبت را دوباره بدون بررسی مدیر فعال کند.',
      'پیام خطا باید مشخص کند کدام ردیف یا شرط باعث توقف ثبت شده است.',
    ],
    mutationLocks: [
      'این طرح هیچ کنترل ثبت، درخواست شبکه یا مسیر ثبت جدیدی فعال نمی‌کند.',
      'هیچ دفتر حساب، موجودی، قیمت یا حسابداری از این بخش تغییر نمی‌کند.',
      'فعال‌سازی ثبت واقعی باید در مرحله جداگانه و با کنترل‌های قفل نقش، اتمیک بودن و عدم ثبت تکراری انجام شود.',
    ],
    blockingReasons: guardedSubmitBlockingReasons,
    nextSafeStepLabel: 'طراحی ثبت واقعی با قفل نقش و برگشت عملیات',
    summaryNote: 'این بخش فقط نقشه ثبت محافظت‌شده را نشان می‌دهد؛ ثبت واقعی، مسیر جدید و تغییر داده عمداً غیرفعال مانده‌اند.',
  };

  const atomicSubmitPreflightChecks: PartnerSettlementAtomicSubmitStep[] = [
    {
      label: 'کنترل نقش و تایید مدیر',
      status: 'needs-review',
      detail: 'قرارداد ثبت اتمیک فقط پس از تایید صریح مدیر یا ادمین در مسیر دستی موجود می‌تواند به مرحله اجرا برسد.',
    },
    {
      label: 'اعتبارسنجی مبلغ و ردیف‌ها',
      status: candidateAmount != null && candidateAmount > 0 && executionDraftLines.length > 0 ? 'ready' : 'blocked',
      detail: candidateAmount != null && candidateAmount > 0 && executionDraftLines.length > 0
        ? 'مبلغ قرارداد و ردیف‌های تحت کنترل از پیش‌نویس اجرای مدیر خوانده شده‌اند.'
        : 'قرارداد اتمیک بدون مبلغ مثبت و ردیف قابل کنترل نباید قابل اجرا باشد.',
    },
    {
      label: 'تطبیق ردپای حسابرسی',
      status: auditTrailLines.length > 0 && auditTrailLines.every((line) => line.readyForManualAudit) ? 'ready' : 'needs-review',
      detail: auditTrailLines.length > 0 && auditTrailLines.every((line) => line.readyForManualAudit)
        ? 'ردپای لازم برای هر ردیف قبل از طراحی اجرای اتمیک کامل است.'
        : 'قبل از اجرای واقعی، شناسه کالا، منبع فروش، مبلغ و مبنای قیمت روز همه ردیف‌ها باید کامل باشد.',
    },
    {
      label: 'کلید یکتای جلوگیری از تکرار',
      status: 'needs-review',
      detail: 'اجرای آینده باید برای هر تلاش مدیر کلید یکتایی از شناسه همکار، ردیف‌ها، مبلغ، نقش مدیر و زمان تایید بسازد.',
    },
    {
      label: 'مرز تراکنش واحد',
      status: 'needs-review',
      detail: 'ثبت آینده باید همه ردیف‌های دفتر حساب را در یک تراکنش واحد انجام دهد یا هیچ تغییری باقی نگذارد.',
    },
  ];

  const atomicSubmitBlockingReasons = [
    ...guardedSubmitBlockingReasons,
    ...(atomicSubmitPreflightChecks.some((step) => step.status === 'blocked') ? ['قرارداد ثبت اتمیک هنوز شرط‌های حداقلی مبلغ و ردیف را کامل ندارد.'] : []),
    'اجرای واقعی در این مرحله فعال نیست؛ این قرارداد فقط مرز اتمیک، جلوگیری از تکرار، برگشت عملیات و کنترل خطا را تعریف می‌کند.',
  ].filter((reason, index, list) => reason && list.indexOf(reason) === index);

  const atomicSubmitContract: PartnerSettlementAtomicSubmitContract = {
    statusLabel: executionDraftLines.length === 0
      ? 'فاقد قرارداد ثبت اتمیک'
      : atomicSubmitBlockingReasons.length > 1
        ? 'نیازمند تکمیل قرارداد ثبت اتمیک'
        : 'قرارداد ثبت اتمیک آماده مرور مدیر',
    tone: executionDraftLines.length === 0
      ? 'neutral'
      : atomicSubmitBlockingReasons.length > 1
        ? 'warning'
        : 'success',
    readonlyContract: true,
    managerControlled: true,
    managerRoleRequired: true,
    explicitManagerConfirmationRequired: true,
    existingManualWorkspaceRequired: true,
    submitImplementationAllowed: false,
    submitButtonEnabled: false,
    routeMutationAllowed: false,
    apiCallAllowed: false,
    directSubmitHandlerAllowed: false,
    transactionRequired: true,
    atomicWriteRequired: true,
    noPartialMutationAllowed: true,
    rollbackRequired: true,
    idempotencyKeyRequired: true,
    duplicateSubmitBlocked: true,
    preflightValidationRequired: true,
    auditTrailRequired: true,
    automaticSettlementAllowed: false,
    automaticLedgerMutationAllowed: false,
    automaticInventoryMutationAllowed: false,
    automaticAccountingMutationAllowed: false,
    automaticPricingMutationAllowed: false,
    contractAmount: candidateAmount,
    contractLineCount: executionDraftLines.length,
    idempotencySourceFields: [
      'partnerId',
      'managerUserId',
      'confirmedLineIds',
      'contractAmount',
      'manualConfirmationTimestamp',
    ],
    transactionBoundary: [
      'اعتبارسنجی نقش مدیر باید قبل از شروع تراکنش انجام شود.',
      'ساخت ردیف‌های دفتر حساب، ثبت ردپا و بروزرسانی وضعیت باید در یک مرز اتمیک آینده قرار بگیرند.',
      'اگر هر ردیف شکست بخورد، کل عملیات باید متوقف شود و هیچ تغییر نیمه‌کاره در دفتر همکار باقی نماند.',
      'پس از موفقیت، مانده همکار باید با مجموع ردیف‌های ثبت‌شده دوباره تطبیق داده شود.',
    ],
    preflightChecks: atomicSubmitPreflightChecks,
    rollbackContract: [
      'خطای اعتبارسنجی قبل از تراکنش باید بدون هیچ تغییر داده‌ای برگردد.',
      'خطای حین تراکنش باید همه تغییرهای همان تلاش را برگرداند و نتیجه نیمه‌کاره نسازد.',
      'تلاش تکراری با همان کلید یکتا باید به‌جای ثبت دوباره، پاسخ ایمن و قابل پیگیری بدهد.',
      'پیام شکست باید دلیل توقف را در سطح ردیف یا شرط نشان دهد، بدون نمایش داده حساس.',
    ],
    failureModes: [
      'نقش غیرمدیر یا تایید ناقص باید قبل از هر تغییر رد شود.',
      'مبلغ نامعتبر، مبلغ بیشتر از مانده یا ردیف بدون منبع باید ثبت را متوقف کند.',
      'تکرار کلید یکتا باید از ثبت دوباره جلوگیری کند.',
      'قطع شبکه یا خطای سرور نباید امکان ثبت دوباره بدون بازبینی مدیر ایجاد کند.',
    ],
    mutationLocks: [
      'این قرارداد هیچ مسیر سرور، درخواست شبکه یا کنترل ارسال جدید فعال نمی‌کند.',
      'هیچ ردیف دفتر، موجودی، قیمت یا حسابداری در این مرحله تغییر نمی‌کند.',
      'پیاده‌سازی واقعی باید در مرحله جداگانه و بعد از قفل شدن قرارداد اتمیک انجام شود.',
    ],
    blockingReasons: atomicSubmitBlockingReasons,
    nextSafeStepLabel: 'طراحی پیاده‌سازی اتمیک با تراکنش واقعی و جلوگیری از تکرار',
    summaryNote: 'قرارداد ثبت اتمیک فقط طراحی مرز اجرای آینده است؛ اجرای واقعی، مسیر جدید و تغییر داده همچنان غیرفعال هستند.',
  };


  const atomicSubmitDryRunSimulationSteps: PartnerSettlementAtomicSubmitDryRunStep[] = [
    {
      label: 'خواندن قرارداد اتمیک',
      status: atomicSubmitContract.contractLineCount > 0 ? 'pass' : 'blocked',
      detail: atomicSubmitContract.contractLineCount > 0
        ? 'شبیه‌سازی از همان قرارداد اتمیک خواندنی و ردیف‌های اجرای مدیر ساخته شده است.'
        : 'برای شبیه‌سازی، حداقل یک ردیف قراردادی قابل مرور لازم است.',
    },
    {
      label: 'پیش‌نمایش کلید تکرارنشدنی',
      status: 'review',
      detail: 'کلید فقط به‌صورت قابل مشاهده ساخته می‌شود و در هیچ مخزن محلی یا سروری ذخیره نمی‌شود.',
    },
    {
      label: 'بررسی برگشت عملیات',
      status: 'review',
      detail: 'سناریوی شکست فقط توضیح داده می‌شود؛ تراکنش واقعی، rollback واقعی و تغییر داده در این بخش وجود ندارد.',
    },
    {
      label: 'کنترل عدم تغییر نیمه‌کاره',
      status: 'review',
      detail: 'شبیه‌سازی تاکید می‌کند که هر اجرای آینده باید یا کامل ثبت شود یا هیچ اثری باقی نگذارد.',
    },
  ];

  const atomicSubmitDryRunBlockedReasons = [
    ...atomicSubmitBlockingReasons,
    ...(atomicSubmitDryRunSimulationSteps.some((step) => step.status === 'blocked') ? ['شبیه‌سازی اتمیک هنوز حداقل ردیف قابل مرور ندارد.'] : []),
    'این شبیه‌ساز فقط خواندنی است و عمداً ثبت واقعی، درخواست شبکه، ذخیره‌سازی و تغییر دفتر را غیرفعال نگه می‌دارد.',
  ].filter((reason, index, list) => reason && list.indexOf(reason) === index);

  const dryRunPreviewLineIds = executionDraftLines.map((line) => line.id).sort((a, b) => a - b).join('-') || 'no-lines';
  const dryRunPreviewAmount = Number(candidateAmount || 0);
  const dryRunId = `partner-${String(profile?.id || 'unknown')}-lines-${dryRunPreviewLineIds}-amount-${dryRunPreviewAmount}`;
  const settlementDraftId = `partner-${String(profile?.id || 'unknown')}-draft-lines-${dryRunPreviewLineIds}-amount-${dryRunPreviewAmount}`;
  const atomicSubmitDryRunHarness: PartnerSettlementAtomicSubmitDryRunHarness = {
    statusLabel: executionDraftLines.length === 0
      ? 'فاقد شبیه‌ساز اجرای اتمیک'
      : atomicSubmitDryRunBlockedReasons.length > 1
        ? 'شبیه‌ساز نیازمند مرور مدیر'
        : 'شبیه‌ساز اتمیک آماده مرور',
    tone: executionDraftLines.length === 0
      ? 'neutral'
      : atomicSubmitDryRunBlockedReasons.length > 1
        ? 'warning'
        : 'success',
    readonlyHarness: true,
    dryRunOnly: true,
    managerControlled: true,
    managerRoleRequired: true,
    explicitManagerConfirmationRequired: true,
    existingManualWorkspaceRequired: true,
    submitImplementationAllowed: false,
    submitButtonEnabled: false,
    routeMutationAllowed: false,
    apiCallAllowed: false,
    directSubmitHandlerAllowed: false,
    persistenceAllowed: false,
    storageMutationAllowed: false,
    ledgerMutationAllowed: false,
    inventoryMutationAllowed: false,
    accountingMutationAllowed: false,
    pricingMutationAllowed: false,
    transactionSimulationOnly: true,
    atomicWriteRequired: true,
    noPartialMutationAllowed: true,
    rollbackPreviewRequired: true,
    idempotencyPreviewRequired: true,
    duplicateSubmitBlocked: true,
    dryRunAmount: atomicSubmitContract.contractAmount,
    dryRunLineCount: atomicSubmitContract.contractLineCount,
    deterministicPreviewKey: dryRunId,
    dryRunId,
    settlementDraftId,
    confirmedLineIds: executionDraftLines.map((line) => line.id).sort((a, b) => a - b),
    simulationSteps: atomicSubmitDryRunSimulationSteps,
    idempotencyPreview: [
      'شناسه همکار، ردیف‌های انتخاب‌شده و مبلغ قرارداد باید کلید پیش‌نمایش را بسازند.',
      'کلید پیش‌نمایش فقط برای مرور مدیر نمایش داده می‌شود و ذخیره نمی‌شود.',
      'هر اجرای واقعی آینده باید تلاش تکراری با همین کلید را رد کند.',
    ],
    rollbackPreview: [
      'شکست اعتبارسنجی باید قبل از شروع تراکنش و بدون تغییر داده متوقف شود.',
      'شکست ردیف میانی باید کل عملیات آینده را برگرداند و هیچ دفتر نیمه‌کاره نسازد.',
      'پس از شکست، مدیر باید علت توقف را در سطح شرط یا ردیف ببیند.',
    ],
    noPartialMutationChecks: [
      'تعداد ردیف‌های موفق و ناموفق نباید در شبیه‌ساز به ذخیره واقعی تبدیل شود.',
      'دفتر همکار، موجودی، قیمت و حسابداری در این مرحله فقط در متن کنترل می‌شوند.',
      'هر پیاده‌سازی واقعی باید بعداً با تست عدم تغییر نیمه‌کاره قفل شود.',
    ],
    blockedExecutionReasons: atomicSubmitDryRunBlockedReasons,
    mutationLocks: [
      'این شبیه‌ساز هیچ مسیر سرور، درخواست شبکه، کنترل ارسال یا ذخیره‌سازی محلی اضافه نمی‌کند.',
      'هیچ تغییر دفتر، موجودی، حسابداری یا قیمت‌گذاری از این بخش اجرا نمی‌شود.',
      'خروجی فقط برای مرور قرارداد اتمیک توسط مدیر است و قابل ارسال نیست.',
    ],
    nextSafeStepLabel: 'طراحی اجرای واقعی با مسیر اتمیک و قفل عدم تغییر نیمه‌کاره',
    summaryNote: 'شبیه‌ساز اتمیک فقط مسیر موفقیت، شکست، جلوگیری از تکرار و برگشت عملیات را توضیح می‌دهد؛ ثبت واقعی همچنان غیرفعال است.',
  };


  return {
    kpis: [
      shareValue,
      inventoryValue,
      reviewableProfitValue,
      buildKnownValue('مانده دفتر شریک', profile?.currentBalance, 'مانده دفتر همکار از پروفایل قابل خواندن نبود.'),
      buildKnownValue('تعداد کالاهای مرتبط', purchaseItemCount, 'تعداد کالاهای مرتبط قابل خواندن نبود.'),
      buildKnownValue('تعداد تراکنش‌های مرتبط', ledgerItemCount, 'تعداد تراکنش‌های دفتر قابل خواندن نبود.'),
      buildKnownValue('پرداختی ثبت‌شده', totalDebits, 'جمع پرداختی‌های دفتر قابل محاسبه نبود.'),
      buildKnownValue('دریافتی/سهم ثبت‌شده', totalCredits, 'جمع سهم/دریافتی‌های دفتر قابل محاسبه نبود.'),
      buildKnownValue('سرمایه فروش قابل بررسی', soldPhonesCurrentPurchaseAmount, 'مبنای سرمایه فروش از read-model قابل محاسبه نبود.'),
    ],
    relatedProducts: {
      totalItems: purchaseItemCount,
      phoneItems,
      productItems,
      soldPhoneItems: safeSoldPhones.length,
      openSettlementItems,
      missingCurrentPurchasePriceItems,
      missingSourceItems,
      inventoryValue,
      shareValue,
    },
    ledgerPreview,
    settlementReadiness: {
      status,
      label: statusMeta[status].label,
      tone: statusMeta[status].tone,
      reasons,
      reviewableAmount,
    },
    reviewFlow,
    confirmationDraft,
    manualConfirmation,
    auditTrailPreview,
    executionDraft,
    guardedSubmitDesign,
    atomicSubmitContract,
    atomicSubmitDryRunHarness,
    warnings,
  };
};
