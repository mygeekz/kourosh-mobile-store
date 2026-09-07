import React from 'react';
import PartnerEditProfileModal, { type PartnerEditProfileModalContext } from './PartnerEditProfileModal';
import PartnerTelegramLinkModalSection from './PartnerTelegramLinkModalSection';
import PartnerLedgerPaymentModal from './PartnerLedgerPaymentModal';
import PartnerFullSettlementModal, { type PartnerFullSettlementModalContext } from './PartnerFullSettlementModal';
import PartnerPhoneSettlementModal, { type PartnerPhoneSettlementModalContext } from './PartnerPhoneSettlementModal';
import PartnerLedgerEntryEditModal from './PartnerLedgerEntryEditModal';
import PartnerSettlementManualConfirmationModal from './PartnerSettlementManualConfirmationModal';

export type PartnerDetailModalStackContext = PartnerEditProfileModalContext &
  PartnerFullSettlementModalContext &
  PartnerPhoneSettlementModalContext;

type Props = {
  ctx: PartnerDetailModalStackContext;
};

const PartnerDetailModalStack: React.FC<Props> = ({ ctx }) => {
  const {
    BULK_SETTLEMENT_LAST_NOTE_KEY,
    Button,
    FinancialProgressBar,
    FormErrorSummary,
    Modal,
    ModalActions,
    ModalField,
    PARTNER_TYPES,
    PriceInput,
    ShamsiDatePicker,
    TelegramLinkModal,
    amount,
    applyBulkSettlementNoteTemplate,
    balance,
    bulkSettlementAmount,
    bulkSettlementAmountValue,
    bulkSettlementAppliedTotal,
    bulkSettlementBatchId,
    bulkSettlementDistribution,
    bulkSettlementIdSet,
    bulkSettlementNote,
    bulkSettlementNoteTemplates,
    bulkSettlementPriority,
    bulkSettlementUnallocatedAmount,
    credit,
    current,
    debit,
    deepLink,
    editFormErrors,
    editingEntry,
    editingPartner,
    entry,
    errors,
    formatCurrencyText,
    formatIsoToShamsi,
    fullSettlementAmounts,
    fullSettlementOpenBalanceTotal,
    fullSettlementOpenBasisTotal,
    fullSettlementOpenPaidTotal,
    getBalanceLabel,
    getBalanceState,
    handleBulkSettlementAmountChange,
    handleBulkSettlementClear,
    handleBulkSettlementSelectAll,
    handleBulkSettlementSubmit,
    handleEditInputChange,
    handleEditSubmit,
    handleFullSettlementPhoneSubmit,
    handleLedgerEdit,
    handleLedgerInputChange,
    handleLedgerSubmit,
    handlePhoneSettlementAmountChange,
    handlePhoneSettlementSubmit,
    id,
    identifier,
    inputClass,
    isEditModalOpen,
    isFullPhoneSettlementModalOpen,
    isLedgerModalOpen,
    isSubmittingBulkSettlement,
    isSubmittingEdit,
    isSubmittingFullSettlementPhoneId,
    isSubmittingLedger,
    isSubmittingPhoneSettlement,
    item,
    lastBulkSettlementNote,
    lastSubmittedBulkSettlementBatchId,
    ledger,
    ledgerDateSelected,
    ledgerDirection,
    ledgerFormErrors,
    name,
    newLedgerEntry,
    note,
    num,
    openPartnerQrLinkModal,
    openSoldPhoneSettlementRows,
    phone,
    phoneId,
    phoneSettlementAmount,
    phoneSettlementBalance,
    phoneSettlementDateSelected,
    phoneSettlementErrors,
    phoneSettlementItem,
    phoneSettlementNote,
    phoneSettlementNoteTemplates,
    phoneSettlementPaidAmount,
    profile,
    readStoredCurrencyUnit,
    rows,
    selectedBulkSettlementBalanceTotal,
    selectedBulkSettlementRows,
    setActiveLedgerBatchId,
    setBulkSettlementAmount,
    setBulkSettlementNote,
    setBulkSettlementPhoneIds,
    setBulkSettlementPriority,
    setEditFormErrors,
    setEditingEntry,
    setEditingPartner,
    setFullSettlementAmounts,
    setIsEditModalOpen,
    setIsFullPhoneSettlementModalOpen,
    setIsLedgerModalOpen,
    setLastBulkSettlementNote,
    setLedgerDateSelected,
    setLedgerDirection,
    setNotification,
    setPhoneSettlementAmount,
    setPhoneSettlementDateSelected,
    setPhoneSettlementErrors,
    setPhoneSettlementItem,
    setPhoneSettlementNote,
    setTgQrOpen,
    settlementPurchasePrice,
    summary,
    target,
    text,
    tgBotUsernameMissing,
    tgQrDeepLink,
    tgQrLoading,
    tgQrOpen,
    token,
    tone,
    value,
  } = ctx;

  return (
    <>
      <PartnerEditProfileModal ctx={ctx} />

            <PartnerTelegramLinkModalSection ctx={ctx} />

            <PartnerLedgerPaymentModal ctx={ctx} />


            <PartnerFullSettlementModal ctx={ctx} />


            <PartnerPhoneSettlementModal ctx={ctx} />



            <PartnerSettlementManualConfirmationModal ctx={ctx} />

            <PartnerLedgerEntryEditModal ctx={ctx} />

    </>
  );
};

export default PartnerDetailModalStack;
