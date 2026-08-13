import React from 'react';
import CustomerDetailHeroOverviewSection from './CustomerDetailHeroOverviewSection';
import CustomerTelegramConversationSection from './CustomerTelegramConversationSection';
import CustomerLedgerRenderSection from './CustomerLedgerRenderSection';
import CustomerPurchaseHistoryPrintSection from './CustomerPurchaseHistoryPrintSection';
import CustomerDetailModalStack from './CustomerDetailModalStack';
import type {
  CustomerDetailsPageData,
  CustomerLedgerEntry,
  NewCustomerData,
  SalesTransactionEntry,
} from '../../types';
import type {
  CustomerLedgerViewEntry,
  CustomerManagerAction,
  CustomerManagerNote,
  CustomerManagerSummary,
  CustomerProfileStat,
  CustomerQuickAction,
  TelegramConversationItem,
} from '../viewBoundaryTypes';

type Props = {
  ctx: Record<string, any> & {
    managerActionSummary: CustomerManagerSummary[];
    managerActionCards: CustomerManagerAction[];
    managerNotes: CustomerManagerNote[];
    profileOverviewStats: CustomerProfileStat[];
    quickActions: CustomerQuickAction[];
    normalizeTags: (value: unknown) => string[];
    filteredLedgerEntries: CustomerLedgerViewEntry[];
    purchaseHistory: SalesTransactionEntry[];
    ledger: CustomerLedgerEntry[];
    tgConvItems: TelegramConversationItem[];
    tgFilteredConvItems: TelegramConversationItem[];
    setCustomerData: React.Dispatch<React.SetStateAction<CustomerDetailsPageData | null>>;
    setTgQuickReply: React.Dispatch<React.SetStateAction<string>>;
    setTgShowChatId: React.Dispatch<React.SetStateAction<boolean>>;
    setExpandedLedgerEntryId: React.Dispatch<React.SetStateAction<number | null>>;
    setEditingCustomer: React.Dispatch<React.SetStateAction<Partial<NewCustomerData>>>;
    setEditFormErrors: React.Dispatch<React.SetStateAction<Partial<NewCustomerData>>>;
  };
};

const CustomerDetailRender: React.FC<Props> = ({ ctx }) => {
  const {
    Button,
    ChangeEvent,
    FinancialStatusBadge,
    FormErrorSummary,
    MessageComposerModal,
    Modal,
    ModalActions,
    ModalField,
    Notification,
    PriceInput,
    ShamsiDatePicker,
    TelegramLinkModal,
    amount,
    applyTgQuickPreset,
    averageLedgerValue,
    balance,
    balanceDirectionLabel,
    balanceValueText,
    chatId,
    cleanName,
    credit,
    customerTrustHistory,
    customerTrustHistoryLoading,
    customerTrustLoading,
    customerTrustProfile,
    d,
    debit,
    deepLink,
    editFormErrors,
    editingCustomer,
    editingEntry,
    editingEntryAmountText,
    editingEntryKindLabel,
    editingEntrySourceTarget,
    el,
    errors,
    expandedLedgerEntryId,
    fetchCustomerDetails,
    fetchTelegramConversation,
    filteredLedgerEntries,
    firstInstallmentSaleId,
    formatCurrencyText,
    formatIsoToShamsi,
    formatKnownShamsiDate,
    formatLedgerCurrency,
    formatPrice,
    getAuthHeaders,
    getBalanceLabel,
    getBalanceState,
    getLedgerEntryContext,
    getLedgerEntryKind,
    getLedgerSourceLink,
    handleEditInputChange,
    handleEditSubmit,
    handleLedgerDelete,
    handleLedgerEdit,
    handleLedgerInputChange,
    handleLedgerSubmit,
    handleManagerNoteSubmit,
    handleTransactionTypeChange,
    id,
    imei,
    inputClass,
    installmentSalesLoading,
    invoiceId,
    isDeletingEntry,
    isEditModalOpen,
    isLedgerModalOpen,
    isManagerNoteModalOpen,
    isMessageModalOpen,
    isSavingManagerNote,
    isSavingTags,
    isSubmittingEdit,
    isSubmittingLedger,
    js,
    json,
    jumpToFirstTgResult,
    lacheckOpenInstallmentDue,
    latestLedgerEntry,
    ledger,
    ledgerDateSelected,
    ledgerFormErrors,
    ledgerInsights,
    ledgerRange,
    ledgerRecordedAt,
    ledgerSearch,
    ledgerStatusSummary,
    managerNoteContext,
    managerNoteDraft,
    managerNotes,
    managerNotesLoading,
    name,
    navigate,
    nearBottom,
    newLedgerEntry,
    nextChatId,
    normalizeTags,
    note,
    notification,
    ok,
    openEditModal,
    openLedgerModal,
    openQrLinkModal,
    openTelegramReport,
    optedOut,
    parseLedgerMeta,
    parseSaleItemMeta,
    prefillChannels,
    prefillMessageText,
    profile,
    purchaseHistory,
    purchaseType,
    purchaseTypeLabel,
    readStoredCurrencyUnit,
    registeredDateLabel,
    res,
    rows,
    saleId,
    sendTgQuickReply,
    setCustomerData,
    setEditFormErrors,
    setEditingCustomer,
    setEditingEntry,
    setExpandedLedgerEntryId,
    setIsEditModalOpen,
    setIsLedgerModalOpen,
    setIsManagerNoteModalOpen,
    setIsMessageModalOpen,
    setLedgerDateSelected,
    setLedgerRange,
    setLedgerSearch,
    setLedgerViewFilter,
    setManagerNoteDraft,
    setNotification,
    setPrefillChannels,
    setPrefillMessageText,
    setTagInput,
    setTgAttachment,
    setTgChatIdInput,
    setTgDirectionFilter,
    setTgIsSending,
    setTgNewSinceScroll,
    setTgQrOpen,
    setTgQuickReply,
    setTgReplyTo,
    setTgSearchQuery,
    setTgShowChatId,
    t,
    tagInput,
    tgAttachment,
    tgChatIdInput,
    tgConvError,
    tgConvItems,
    tgConvLoading,
    tgConvMeta,
    tgDirectionFilter,
    tgFilteredConvItems,
    tgIsSending,
    tgNewSinceScroll,
    tgQrBotUsernameMissing,
    tgQrDeepLink,
    tgQrExpectedPhone,
    tgQrExpiresAt,
    tgQrLoading,
    tgQrOpen,
    tgQuickPreset,
    tgQuickReply,
    tgReplyTo,
    tgSearchQuery,
    tgShowChatId,
    tgTimelineRef,
    token,
    transactionType,
    trustScore,
    trustTone,
    typeLabel,
    updateTags,
    uploadTelegramAttachment,
    url,
    value,
  } = ctx;

  return (
    <div
      className="customer-detail-page-root space-y-8"
      dir="rtl"
      data-ui-customer-detail-layout="isolated-ledger-root"
      data-ui-customer-detail-page-root="true"
    >
      <Notification message={notification} onClose={() => setNotification(null)} />

      <div
        className="detail-page-shell people-detail-apple customer-detail-apple people-detail-redesign-v1 people-detail-redesign-v1--customer people-foundation people-detail-foundation space-y-8"
        data-ui-people-page="customer-detail"
        data-ui-people-scope="detail"
        data-ui-customer-detail-legacy-shell="profile-messaging"
      >
        {/* پروفایل */}
        <div className="customer-detail-hero detail-hero-card" data-ui-people-surface="detail-hero">
          <CustomerDetailHeroOverviewSection ctx={ctx} />
        </div>

        <CustomerTelegramConversationSection ctx={ctx} />
      </div>

      <CustomerLedgerRenderSection ctx={ctx} />

      <div
        className="detail-page-shell people-detail-apple customer-detail-apple people-detail-redesign-v1 people-detail-redesign-v1--customer people-foundation people-detail-foundation"
        data-ui-people-page="customer-detail"
        data-ui-people-scope="detail"
        data-ui-customer-detail-legacy-shell="history"
      >
        <CustomerPurchaseHistoryPrintSection ctx={ctx} />
      </div>

      <CustomerDetailModalStack ctx={ctx} />
    </div>
  );
};

export default CustomerDetailRender;
