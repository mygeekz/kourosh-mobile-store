import React from 'react';
import CustomerManagerNoteModal from './CustomerManagerNoteModal';
import CustomerProfileEditModal from './CustomerProfileEditModal';
import CustomerLedgerPaymentModal from './CustomerLedgerPaymentModal';
import CustomerLedgerEntryEditModal from './CustomerLedgerEntryEditModal';
import type { NewCustomerData } from '../../types';

type Props = {
  ctx: Record<string, any> & {
    setEditingCustomer: React.Dispatch<React.SetStateAction<Partial<NewCustomerData>>>;
    setEditFormErrors: React.Dispatch<React.SetStateAction<Partial<NewCustomerData>>>;
  };
};

const CustomerDetailModalStack: React.FC<Props> = ({ ctx }) => {
  const {
    ChangeEvent,
    FormErrorSummary,
    Modal,
    ModalActions,
    ModalField,
    PriceInput,
    ShamsiDatePicker,
    amount,
    balanceDirectionLabel,
    balanceValueText,
    credit,
    d,
    debit,
    editFormErrors,
    editingCustomer,
    editingEntry,
    editingEntryAmountText,
    editingEntryKind,
    editingEntryKindLabel,
    editingEntryKindTone,
    editingEntrySourceTarget,
    errors,
    getBalanceLabel,
    getBalanceState,
    handleEditInputChange,
    handleEditSubmit,
    handleLedgerEdit,
    handleLedgerInputChange,
    handleLedgerSubmit,
    handleManagerNoteSubmit,
    handleTransactionTypeChange,
    id,
    inputClass,
    isEditModalOpen,
    isLedgerModalOpen,
    isManagerNoteModalOpen,
    isSavingManagerNote,
    isSubmittingEdit,
    isSubmittingLedger,
    ledger,
    ledgerDateSelected,
    ledgerFormErrors,
    managerNoteContext,
    managerNoteDraft,
    name,
    navigate,
    newLedgerEntry,
    note,
    ok,
    profile,
    rows,
    setEditFormErrors,
    setEditingCustomer,
    setEditingEntry,
    setIsEditModalOpen,
    setIsLedgerModalOpen,
    setIsManagerNoteModalOpen,
    setLedgerDateSelected,
    setManagerNoteDraft,
    token,
    transactionType,
    value,
  } = ctx;

  return (
    <>
      <CustomerManagerNoteModal ctx={ctx} />


            <CustomerProfileEditModal ctx={ctx} />

            <CustomerLedgerPaymentModal ctx={ctx} />


            <CustomerLedgerEntryEditModal ctx={ctx} />

    </>
  );
};

export default CustomerDetailModalStack;
