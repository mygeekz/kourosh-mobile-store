import { useEffect, useState } from 'react';
import {
  CustomerDetailsPageData,
  CustomerLedgerInsights,
  InstallmentSale,
  NewCustomerData,
  NotificationMessage,
} from '../../types';
import { type CustomerTrustHistory, type CustomerTrustProfile } from './customerDetailControllerSupport';

export function useCustomerDetailControllerState() {
  const [customerData, setCustomerData] = useState<CustomerDetailsPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [ledgerInsights, setLedgerInsights] = useState<CustomerLedgerInsights | null>(null);
  const [followups, setFollowups] = useState<any[]>([]);
  const [followupNote, setFollowupNote] = useState('');
  const [followupNextDate, setFollowupNextDate] = useState<Date | null>(null);
  const [isSavingFollowup, setIsSavingFollowup] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [customerInstallmentSales, setCustomerInstallmentSales] = useState<InstallmentSale[]>([]);
  const [installmentSalesLoading, setInstallmentSalesLoading] = useState(false);
  const [customerTrustProfile, setCustomerTrustProfile] = useState<CustomerTrustProfile | null>(null);
  const [customerTrustLoading, setCustomerTrustLoading] = useState(false);
  const [customerTrustHistory, setCustomerTrustHistory] = useState<CustomerTrustHistory | null>(null);
  const [customerTrustHistoryLoading, setCustomerTrustHistoryLoading] = useState(false);

  // CRM tags
  const [tagInput, setTagInput] = useState('');
  const [isSavingTags, setIsSavingTags] = useState(false);

  // ویرایش پروفایل
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<NewCustomerData>>({});
  const [editFormErrors, setEditFormErrors] = useState<Partial<NewCustomerData>>({});
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isManagerNoteModalOpen, setIsManagerNoteModalOpen] = useState(false);
  const [managerNoteContext, setManagerNoteContext] = useState('');
  const [managerNoteDraft, setManagerNoteDraft] = useState('');
  const [isSavingManagerNote, setIsSavingManagerNote] = useState(false);
  const [managerNotes, setManagerNotes] = useState<any[]>([]);
  const [managerNotesLoading, setManagerNotesLoading] = useState(false);

  // ثبت دفتر
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [prefillMessageText, setPrefillMessageText] = useState<string>('');
  const [prefillChannels, setPrefillChannels] = useState<{ sms?: boolean; telegram?: boolean } | undefined>(undefined);

// کارت تلگرام مشتری (برای اپراتور)
const [tgCardText, setTgCardText] = useState<string>('');
const [tgCardParseMode, setTgCardParseMode] = useState<'HTML' | 'Markdown' | 'MarkdownV2' | 'TEXT'>('HTML');
const [tgShowChatId, setTgShowChatId] = useState(false);
const [tgChatIdInput, setTgChatIdInput] = useState('');
const [tgIsSending, setTgIsSending] = useState(false);
const [tgPreset, setTgPreset] = useState<'custom' | 'hello' | 'installment_reminder' | 'payment_link' | 'thank_you' | 'balance_followup' | 'visit_invite'>('custom');

// QR one-tap linking
const [tgQrOpen, setTgQrOpen] = useState(false);
const [tgQrLoading, setTgQrLoading] = useState(false);
const [tgQrDeepLink, setTgQrDeepLink] = useState<string>('');
const [tgQrExpiresAt, setTgQrExpiresAt] = useState<string>('');
const [tgQrExpectedPhone, setTgQrExpectedPhone] = useState<string>('');
const [tgQrBotUsernameMissing, setTgQrBotUsernameMissing] = useState(false);

useEffect(() => {
  const nextChatId = String((customerData?.profile as any)?.telegramChatId || (customerData?.profile as any)?.telegram_chat_id || '').trim();
  setTgChatIdInput(nextChatId);
}, [customerData?.profile]);

  return { customerData, setCustomerData, isLoading, setIsLoading, notification, setNotification, ledgerInsights, setLedgerInsights, followups, setFollowups, followupNote, setFollowupNote, followupNextDate, setFollowupNextDate, isSavingFollowup, setIsSavingFollowup, insightsLoading, setInsightsLoading, customerInstallmentSales, setCustomerInstallmentSales, installmentSalesLoading, setInstallmentSalesLoading, customerTrustProfile, setCustomerTrustProfile, customerTrustLoading, setCustomerTrustLoading, customerTrustHistory, setCustomerTrustHistory, customerTrustHistoryLoading, setCustomerTrustHistoryLoading, tagInput, setTagInput, isSavingTags, setIsSavingTags, isEditModalOpen, setIsEditModalOpen, editingCustomer, setEditingCustomer, editFormErrors, setEditFormErrors, isSubmittingEdit, setIsSubmittingEdit, isManagerNoteModalOpen, setIsManagerNoteModalOpen, managerNoteContext, setManagerNoteContext, managerNoteDraft, setManagerNoteDraft, isSavingManagerNote, setIsSavingManagerNote, managerNotes, setManagerNotes, managerNotesLoading, setManagerNotesLoading, isLedgerModalOpen, setIsLedgerModalOpen, isMessageModalOpen, setIsMessageModalOpen, prefillMessageText, setPrefillMessageText, prefillChannels, setPrefillChannels, tgCardText, setTgCardText, tgCardParseMode, setTgCardParseMode, tgShowChatId, setTgShowChatId, tgChatIdInput, setTgChatIdInput, tgIsSending, setTgIsSending, tgPreset, setTgPreset, tgQrOpen, setTgQrOpen, tgQrLoading, setTgQrLoading, tgQrDeepLink, setTgQrDeepLink, tgQrExpiresAt, setTgQrExpiresAt, tgQrExpectedPhone, setTgQrExpectedPhone, tgQrBotUsernameMissing, setTgQrBotUsernameMissing };
}
