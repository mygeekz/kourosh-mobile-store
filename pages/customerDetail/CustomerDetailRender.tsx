import React from 'react';
import CustomerDetailHeroOverviewSection from './CustomerDetailHeroOverviewSection';
import CustomerTelegramConversationSection from './CustomerTelegramConversationSection';
import CustomerLedgerRenderSection from './CustomerLedgerRenderSection';
import CustomerPurchaseHistoryPrintSection from './CustomerPurchaseHistoryPrintSection';
import CustomerDetailModalStack from './CustomerDetailModalStack';
import { PeopleDetailPageShell, PeopleDetailSurface } from '@/components/people/PeopleDetailFoundation';
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
    <PeopleDetailPageShell
      entity="customer"
      data-ui-customer-detail-layout="standard-v282"
      data-ui-customer-detail-page-root="true"
    >
      <Notification message={notification} onClose={() => setNotification(null)} />

      <div
        className="grid min-w-0 gap-3"
        data-ui-people-scope="detail"
      >
        {/* پروفایل */}
        <PeopleDetailSurface section="hero">
          <CustomerDetailHeroOverviewSection ctx={ctx} />
        </PeopleDetailSurface>

        <CustomerTelegramConversationSection ctx={ctx} />
      </div>

      <CustomerLedgerRenderSection ctx={ctx} />

      <div
        className="min-w-0"
        data-ui-people-scope="detail"
      >
        <CustomerPurchaseHistoryPrintSection ctx={ctx} />
      </div>

      <CustomerDetailModalStack ctx={ctx} />
    </PeopleDetailPageShell>
  );
};

export default CustomerDetailRender;
