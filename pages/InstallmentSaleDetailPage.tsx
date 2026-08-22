import { ActionLink, Button, Dialog as Modal, DialogActions, EmptyState, FinancialTimeline, FinancialTimelineEntry, ModalField, PanelCard, SelectField, TableActionGroup, TextareaField, TextField } from '@/components/ui';
// src/pages/InstallmentSaleDetailPage.tsx
import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import moment from 'jalali-moment';
import { Search, Save, RefreshCw } from '../components/lucide-react';

import {
  InstallmentSaleDetailData,
  InstallmentCheckInfo,
  NotificationMessage,
  CheckStatus,
  InstallmentPaymentStatus,
  InstallmentPaymentRecord,
} from '../types';
import Notification from '../components/Notification';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/apiFetch';
import { formatIsoToShamsi } from '../utils/dateUtils';
import ShamsiDatePicker from '../components/ShamsiDatePicker';
import PriceInput from '../components/PriceInput';
import toast from 'react-hot-toast';
import SmsAutoSendSheet from '../components/SmsAutoSendSheet';
import FinancialProgressBar from '../components/FinancialProgressBar';
import FinancialStatusBadge from '../components/FinancialStatusBadge';
import InstallmentCancellationRefundModal from '../components/InstallmentCancellationRefundModal';
import FilterChipsBar from '../components/FilterChipsBar';
import { useMountedRef, useTimeoutGuards } from '../utils/asyncGuards';
import FormErrorSummary, { FormErrors } from '../components/FormErrorSummary';
import { focusFirstError } from '../utils/focusFirstError';

type CheckEditErrorKey =
  | 'ownershipType'
  | 'issuerName'
  | 'issuerNationalCode'
  | 'sayadiId'
  | 'checkNumber'
  | 'bankName'
  | 'dueDate';

const normalizeIdentityDigits = (value: unknown) => String(value ?? '')
  .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
  .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
  .replace(/\D/g, '');

const parseStoredCheckDate = (value: unknown): Date | null => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const jalali = moment(raw, 'jYYYY/jMM/jDD', true);
  if (jalali.isValid()) return jalali.toDate();
  const iso = moment(raw, 'YYYY-MM-DD', true);
  return iso.isValid() ? iso.toDate() : null;
};

const CHECK_STATUSES_OPTIONS: CheckStatus[] = [
  'نزد فروشنده',
  'در جریان وصول',
  'نقد شد',
  'برگشت خورد',
  'به مشتری برگشت داده شده',
];

const CASH_RECOVERABLE_CHECK_STATUSES: CheckStatus[] = ['برگشت خورد', 'به مشتری برگشت داده شده'];

const CHECK_STATUS_COPY: Record<CheckStatus, { icon: string; caption: string }> = {
  'نزد فروشنده': { icon: 'fa-wallet', caption: 'چک نزد فروشنده است' },
  'در جریان وصول': { icon: 'fa-building-columns', caption: 'برای وصول به بانک/مسیر وصول ارسال شده' },
  'نقد شد': { icon: 'fa-circle-check', caption: 'چک پاس و تسویه شده است' },
  'برگشت خورد': { icon: 'fa-arrow-rotate-left', caption: 'چک برگشت خورده؛ دریافت نقدی فعال می‌شود' },
  'به مشتری برگشت داده شده': { icon: 'fa-handshake-angle', caption: 'چک عودت شده؛ دریافت نقدی فعال می‌شود' },
};

const InstallmentSaleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightedPaymentId = Number(searchParams.get('paymentId') || 0) || 0;
  const highlightedCheckId = Number(searchParams.get('checkId') || 0) || 0;
  const { token, authReady, currentUser } = useAuth();

  const [saleData, setSaleData] = useState<InstallmentSaleDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [expandedChecks, setExpandedChecks] = useState<Set<number>>(new Set());
  const mountedRef = useMountedRef();


  const notifyHeaderInstallmentRefresh = () => {
    try {
      window.dispatchEvent(new CustomEvent('kourosh:installment-payment-updated'));
      window.dispatchEvent(new CustomEvent('kourosh:installments-updated'));
      window.dispatchEvent(new CustomEvent('kourosh:header-quick-refresh'));
    } catch {}
  };
  const { scheduleTimeout } = useTimeoutGuards();

  // Deep-link support: open Installments tab + highlight a specific payment row
  useEffect(() => {
    if (!highlightedPaymentId) return;
    if (!saleData) return;

    // Ensure we are on installments tab
    const tab = (searchParams.get('tab') || 'overview');
    if (tab !== 'installments') {
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        p.set('tab', 'installments');
        return p;
      });
    }

    // Expand details for that payment
    setExpanded((prev) => {
      const next = new Set(prev);
      next.add(highlightedPaymentId);
      return next;
    });

    // Scroll to the row
    scheduleTimeout(() => {
      const el = document.getElementById(`payment-row-${highlightedPaymentId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightedPaymentId, saleData]);

  // Deep-link support: open Checks tab + highlight a specific check card.
  useEffect(() => {
    if (!highlightedCheckId || !saleData) return;
    if (!(saleData.checks || []).some((check) => Number(check.id || 0) === highlightedCheckId)) return;

    const tab = searchParams.get('tab') || 'overview';
    if (tab !== 'checks') {
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        p.set('tab', 'checks');
        return p;
      });
    }

    setExpandedChecks((prev) => {
      const next = new Set(prev);
      next.add(highlightedCheckId);
      return next;
    });

    scheduleTimeout(() => {
      const el = document.getElementById(`check-row-${highlightedCheckId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 220);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightedCheckId, saleData]);


  // Auto-SMS UX (final payment)
  const [smsSheetOpen, setSmsSheetOpen] = useState(false);
  const [smsSheetStatus, setSmsSheetStatus] = useState<'sent' | 'failed' | 'not_sent'>('not_sent');
  const [smsSheetMessage, setSmsSheetMessage] = useState<string>('');
  const [smsResending, setSmsResending] = useState(false);
  const [finalizationSmsAvailable, setFinalizationSmsAvailable] = useState(false);
  const [isCancellationRefundModalOpen, setIsCancellationRefundModalOpen] = useState(false);

  // ویرایش اطلاعات وضعیت چک
  const [isEditCheckModalOpen, setIsEditCheckModalOpen] = useState(false);
  const [editingCheck, setEditingCheck] = useState<InstallmentCheckInfo | null>(null);
  const [editingCheckDueDate, setEditingCheckDueDate] = useState<Date | null>(null);
  const [editCheckErrors, setEditCheckErrors] = useState<Partial<Record<CheckEditErrorKey, string>>>({});
  const [isCheckCashModalOpen, setIsCheckCashModalOpen] = useState(false);
  const [cashCheck, setCashCheck] = useState<InstallmentCheckInfo | null>(null);
  const [checkCashAmount, setCheckCashAmount] = useState<string | number>('');
  const [checkCashDate, setCheckCashDate] = useState<Date | null>(new Date());
  const [checkCashNotes, setCheckCashNotes] = useState('');
  const [isSubmittingCheckCash, setIsSubmittingCheckCash] = useState(false);

  // ثبت اطلاعات پرداخت جزئی
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [currentPayment, setCurrentPayment] = useState<InstallmentPaymentRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string | number>('');
  const [paymentDate, setPaymentDate] = useState<Date | null>(new Date());
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentStageHint, setPaymentStageHint] = useState<string>('به‌روزرسانی مانده مشتری و دفتر حساب');
  const [isQuickPaymentSummaryOpen, setIsQuickPaymentSummaryOpen] = useState(false);

  // ویرایش اطلاعات/حذف مورد تراکنش جزئی
  const [isEditTxModalOpen, setIsEditTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [editTxAmount, setEditTxAmount] = useState<string | number>('');
  const [editTxDate, setEditTxDate] = useState<Date | null>(new Date());
  const [editTxNotes, setEditTxNotes] = useState<string>('');
  const [isSavingTx, setIsSavingTx] = useState(false);
  const [isDeleteTxModalOpen, setIsDeleteTxModalOpen] = useState(false);
  const [deletingTx, setDeletingTx] = useState<any | null>(null);
  const [isDeletingTx, setIsDeletingTx] = useState(false);

  // ---------- helpers ----------
  // هر نوع ورودی عددی (رشته/کامادار/…) را به number تمیز تبدیل می‌کند
  const toNumber = (val: unknown): number =>
    typeof val === 'number' ? val : Number(String(val ?? '0').replace(/[^\d.-]/g, '')) || 0;

  // قیمت را همیشه به شکل عدد صحیح نمایش می‌دهد (صفر به‌جای -)
  const formatPrice = (price: number | string | undefined | null) => {
    const n = toNumber(price);
    return n.toLocaleString('fa-IR') + ' تومان';
  };

  // تاریخ هر فرمتی را به شمسی کوتاه تبدیل می‌کند؛ بدون وابستگی به moment.ISO_8601
  const parseDateSafe = (value: string | Date | undefined | null) => {
    if (!value) return null;
    try {
      if (value instanceof Date) {
        const dateMoment = moment(value);
        return dateMoment && typeof dateMoment.isValid === 'function' && dateMoment.isValid() ? dateMoment : null;
      }

      const raw = String(value).trim();
      if (!raw || raw === 'null' || raw === 'undefined' || raw === '—') return null;

      const formats = [
        'jYYYY/jMM/jDD',
        'jYYYY/jM/jD',
        'YYYY-MM-DDTHH:mm:ss.SSSZ',
        'YYYY-MM-DDTHH:mm:ssZ',
        'YYYY-MM-DDTHH:mm:ss',
        'YYYY-MM-DD',
        'YYYY/MM/DD',
      ];

      const isSaneJalaliYear = (m: any) => {
        try {
          const jy = Number(m.locale('fa').format('jYYYY'));
          return jy >= 1300 && jy <= 1500;
        } catch {
          return false;
        }
      };

      for (const format of formats) {
        const parsed = moment(raw, format, true);
        if (parsed && typeof parsed.isValid === 'function' && parsed.isValid() && isSaneJalaliYear(parsed)) return parsed;
      }

      const loose = moment(raw);
      return loose && typeof loose.isValid === 'function' && loose.isValid() && isSaneJalaliYear(loose) ? loose : null;
    } catch {
      return null;
    }
  };

  const toShamsiSafe = (d: string | Date | undefined | null) => {
    const parsed = parseDateSafe(d);
    return parsed ? parsed.locale('fa').format('jYYYY/MM/DD') : '—';
  };

  // مجموع پرداختی واقعی هر قسط
  const getTotalPaid = (p?: InstallmentPaymentRecord | null): number => {
    if (!p) return 0;
    if (typeof (p as any).computedPaid === 'number') return (p as any).computedPaid;
    if (typeof (p as any).totalPaid === 'number') return (p as any).totalPaid;
    const txs: any[] = (p as any).transactions || [];
    return txs.reduce((sum, t) => sum + toNumber(t?.amount_paid ?? t?.amountPaid), 0);
  };

  const getPaymentRemaining = (p?: InstallmentPaymentRecord | null): number => {
    if (!p) return 0;
    return Math.max(0, toNumber(p.amountDue) - getTotalPaid(p));
  };

  const getPaymentDueMeta = (p?: InstallmentPaymentRecord | null) => {
    if (!p?.dueDate) return { label: 'بدون تاریخ سررسید', tone: 'neutral' as const };
    if (p.status === 'پرداخت شده') return { label: 'تسویه‌شده', tone: 'success' as const };

    const normalizedDue = parseDateSafe(p.dueDate);
    if (!normalizedDue) return { label: 'تاریخ سررسید نامعتبر', tone: 'neutral' as const };

    const diffDays = normalizedDue.clone().startOf('day').diff(moment().startOf('day'), 'days');
    if (diffDays < 0) return { label: `${Math.abs(diffDays).toLocaleString('fa-IR')} روز دیرکرد`, tone: 'danger' as const };
    if (diffDays === 0) return { label: 'سررسید امروز', tone: 'warning' as const };
    return { label: `${diffDays.toLocaleString('fa-IR')} روز تا سررسید`, tone: diffDays <= 7 ? 'warning' as const : 'info' as const };
  };

  const getTransactionPresentation = (tx: any) => {
    if (tx?.sourceType === 'check_recovery') {
      return {
        title: `وصول نقدی چک ${String(tx.checkNumber || '—')}`,
        badge: 'وصول نقدی چک',
        tone: 'info' as const,
        icon: 'fa-solid fa-money-bill-transfer',
      };
    }
    if (tx?.sourceType === 'check_cashed') {
      return {
        title: `وصول چک ${String(tx.checkNumber || '—')}`,
        badge: 'چک وصول‌شده',
        tone: 'success' as const,
        icon: 'fa-solid fa-money-check-dollar',
      };
    }
    const installmentNumber = Number(tx?.installmentNumber || 0);
    return {
      title: installmentNumber > 0 ? `قسط ${installmentNumber.toLocaleString('fa-IR')}` : 'پرداخت قسط',
      badge: 'پرداخت قسط',
      tone: 'neutral' as const,
      icon: 'fa-solid fa-receipt',
    };
  };

  const overallBadge = (status: string) => {
    if (status === 'فسخ شده' || ['canceled', 'cancelled'].includes(String(status || '').trim().toLowerCase())) {
      return <FinancialStatusBadge label="فسخ شده" tone="neutral" icon="fa-solid fa-file-circle-xmark" size="sm" />;
    }
    if (status === 'تکمیل شده') return <FinancialStatusBadge label="تکمیل شده" tone="success" icon="fa-solid fa-circle-check" size="sm" />;
    if (status === 'معوق') return <FinancialStatusBadge label="معوق" tone="danger" icon="fa-solid fa-triangle-exclamation" size="sm" />;
    return <FinancialStatusBadge label="در حال پرداخت" tone="info" icon="fa-solid fa-rotate" size="sm" />;
  };


  const isCashRecoverableCheckStatus = (status?: CheckStatus | string | null) =>
    CASH_RECOVERABLE_CHECK_STATUSES.includes(status as CheckStatus);

  const canReceiveCashForCheck = (check?: InstallmentCheckInfo | null) =>
    !!check && isCashRecoverableCheckStatus(check.status) &&
    Number(((check as any).cashRemaining ?? check.amount ?? 0)) > 0;

  const getCheckDueMeta = (check: InstallmentCheckInfo) => {
    const cashRemaining = Math.max(0, toNumber((check as any).cashRemaining ?? check.amount));
    if (check.status === 'نقد شد') return { label: 'وصول قطعی', tone: 'success' as const };
    if (isCashRecoverableCheckStatus(check.status)) {
      if (cashRemaining <= 0.00001) return { label: 'تسویه نقدی', tone: 'success' as const };
      return { label: 'نیازمند دریافت نقدی', tone: check.status === 'برگشت خورد' ? 'danger' as const : 'warning' as const };
    }

    const normalizedDue = parseDateSafe(check.dueDate);
    if (!normalizedDue) return { label: 'سررسید نامعتبر', tone: 'neutral' as const };
    const diffDays = normalizedDue.clone().startOf('day').diff(moment().startOf('day'), 'days');
    if (diffDays < 0) return { label: `${Math.abs(diffDays).toLocaleString('fa-IR')} روز از سررسید`, tone: 'danger' as const };
    if (diffDays === 0) return { label: 'سررسید امروز', tone: 'warning' as const };
    return { label: `${diffDays.toLocaleString('fa-IR')} روز تا سررسید`, tone: diffDays <= 7 ? 'warning' as const : 'info' as const };
  };

  const isOverdue = (due: string, status: InstallmentPaymentStatus) =>
    moment(due, 'jYYYY/jMM/jDD').isBefore(moment(), 'day') && status !== 'پرداخت شده';


  const openInstallmentContractPrint = () => {
    if (!saleData?.id) {
      setNotification({ type: 'error', text: 'اطلاعات فروش برای چاپ قرارداد هنوز آماده نیست.' });
      return;
    }
    const base = `${window.location.origin}${window.location.pathname}`;
    const printUrl = `${base}#/print/installment-contract/${saleData.id}?mode=print`;
    const popup = window.open(printUrl, '_blank', 'noopener,noreferrer');
    if (!popup) {
      setNotification({
        type: 'warning',
        text: 'مرورگر بازشدن تب چاپ را مسدود کرد. اجازه Pop-up را برای این برنامه فعال و دوباره «چاپ قرارداد» را انتخاب کنید.',
      });
    }
  };

  // ---------- data ----------
  const fetchInstallmentSaleDetail = async () => {
    if (!id) {
      navigate('/installment-sales');
      return;
    }
    if (!token) {
      setIsLoading(false);
      setNotification({ type: 'error', text: 'برای دسترسی به این بخش، ابتدا باید وارد سیستم شوید.' });
      return;
    }
    setIsLoading(true);
    setNotification(null);
    try {
      const response = await apiFetch(`/api/installment-sales/${id}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت جزئیات فروش اقساطی');
      if (!mountedRef.current) return;
      setSaleData(result.data);
      setCurrentPayment((previous) => {
        if (!previous) return previous;
        const refreshedPayment = (result.data?.payments || []).find((payment: InstallmentPaymentRecord) => Number(payment.id) === Number(previous.id));
        return refreshedPayment || previous;
      });
    } catch (error: any) {
      if (mountedRef.current) setNotification({ type: 'error', text: error.message });
      if (error.message.includes('یافت نشد')) scheduleTimeout(() => navigate('/installment-sales'), 2000);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authReady && token) fetchInstallmentSaleDetail();
    else if (authReady && !token) setIsLoading(false);
  }, [id, token, authReady]);

  // ---------- actions ----------
  const isCanceledContract = () =>
    saleData?.overallStatus === 'فسخ شده' || ['canceled', 'cancelled'].includes(String((saleData as any)?.status || '').trim().toLowerCase());

  const guardCanceledMutation = () => {
    if (!isCanceledContract()) return false;
    setNotification({ type: 'info', text: 'این قرارداد فسخ شده است؛ تاریخچه مالی فقط برای مشاهده نگه‌داری می‌شود و عملیات جدید مجاز نیست.' });
    return true;
  };

  const openPaymentModal = (payment: InstallmentPaymentRecord) => {
    if (guardCanceledMutation()) return;
    setCurrentPayment(payment);
    const remaining = getPaymentRemaining(payment);
    setPaymentAmount(remaining > 0 ? remaining : '');
    setPaymentDate(new Date());
    setPaymentNotes('');
    setIsPaymentModalOpen(true);
  };

  const findNextUnpaidPayment = (): InstallmentPaymentRecord | null => {
    const payments = saleData?.payments || [];
    return [...payments]
      .filter((p) => p && p.status !== 'پرداخت شده' && (p as any).sourceType !== 'check_recovery')
      .sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')))[0] || null;
  };

  const openQuickPayment = () => {
    if (guardCanceledMutation()) return;
    const next = findNextUnpaidPayment();
    if (!next) {
      setNotification({ type: 'info', text: 'برای این فروش اقساطی، قسط پرداخت‌نشده‌ای برای پرداخت سریع وجود ندارد.' });
      return;
    }
    setCurrentPayment(next);
    setIsQuickPaymentSummaryOpen(true);
  };

  const continueFromQuickPaymentSummary = () => {
    if (!currentPayment) return;
    setIsQuickPaymentSummaryOpen(false);
    openPaymentModal(currentPayment);
  };

  // Deep-link actions (Global Search / Quick Actions)
  // /installment-sales/:id?pay=next  -> open next unpaid installment payment modal
  useEffect(() => {
    if (!saleData) return;
    const pay = (searchParams.get('pay') || '').toLowerCase();
    if (pay === 'next' && (saleData.overallStatus === 'فسخ شده' || ['canceled', 'cancelled'].includes(String((saleData as any)?.status || '').trim().toLowerCase()))) {
      setNotification({ type: 'info', text: 'قرارداد فسخ شده است و پرداخت جدید ثبت نمی‌شود.' });
      setSearchParams((prev) => { const p = new URLSearchParams(prev); p.delete('pay'); return p; }, { replace: true });
      return;
    }
    if (pay !== 'next') return;

    const next = findNextUnpaidPayment();
    if (next) {
      // defer to next tick so modal state doesn't fight initial render
      scheduleTimeout(() => { setCurrentPayment(next); setIsQuickPaymentSummaryOpen(true); }, 0);
    } else {
      setNotification({ type: 'info', text: 'برای این فروش اقساطی، قسط پرداخت‌نشده‌ای برای پرداخت سریع وجود ندارد.' });
    }

    // پاکسازی پارامتر تا در رفرش/ری‌رندر دوباره باز نشود
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.delete('pay');
      return p;
    }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleData, searchParams]);

  const resendFinalPaymentSms = async () => {
    if (!saleData?.id) return;
    setSmsResending(true);
    try {
      const res = await apiFetch('/api/sms/trigger-event', {
        method: 'POST',
        body: JSON.stringify({ targetId: saleData.id, eventType: 'INSTALLMENT_COMPLETED' }),
      });
      const js = await res.json().catch(() => ({}));
      if (!res.ok || !js?.success) {
        throw new Error(js?.message || 'خطا در ارسال پیامک');
      }
      setSmsSheetStatus('sent');
      setSmsSheetMessage('');
      toast.success('پیامک تسویه کامل ارسال شد.');
    } catch (err: any) {
      setSmsSheetStatus('failed');
      toast.error(err?.message || 'پرداخت ثبت شد، اما ارسال پیامک با خطا روبه‌رو شد');
    } finally {
      setSmsResending(false);
    }
  };

  const handleSubmitPartialPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (guardCanceledMutation()) return;
    if (!currentPayment) return;
    const amount = toNumber(paymentAmount);
    if (amount <= 0) {
      setNotification({ type: 'error', text: 'مبلغ پرداخت باید یک عدد مثبت باشد.' });
      return;
    }
    setIsSubmittingPayment(true);
    setPaymentStageHint('در حال اعتبارسنجی مبلغ و تاریخ پرداخت');
    try {
      const payload = {
        amount,
        date: moment(paymentDate || new Date()).locale('fa').format('jYYYY/jMM/jDD'),
        notes: paymentNotes,
      };
      setPaymentStageHint('در حال ثبت اطلاعات پرداخت و به‌روزرسانی قسط');
      const res = await apiFetch(`/api/installment-sales/payment/${currentPayment.id}/transaction`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const js = await res.json().catch(() => ({}));
      if (!res.ok || !js?.success) {
        throw new Error(js?.message || 'خطا در ثبت پرداخت');
      }

      // Final-payment UX: keep the success feedback short and inside the content flow.
      // A fixed custom toast used to collide visually with the right sidebar on wide layouts.
      if (js?.finalizedNow) {
        const status: 'sent' | 'failed' | 'not_sent' = js?.smsAttempted
          ? (js?.smsSuccess ? 'sent' : 'failed')
          : 'not_sent';

        if (!mountedRef.current) return;
        setSmsSheetStatus(status);
        setSmsSheetMessage(js?.smsError ? String(js.smsError) : '');
        setFinalizationSmsAvailable(true);

        toast.success(
          status === 'sent' ? 'تسویه کامل شد؛ پیامک تایید ارسال شد.' : 'تسویه کامل شد.',
          { duration: 4200, position: 'top-center' },
        );
      }

      if (mountedRef.current) {
        setNotification({ type: 'success', text: js?.message || 'پرداخت با موفقیت ثبت شد و مانده قسط به‌روزرسانی شد.' });
        setIsPaymentModalOpen(false);
      }
      notifyHeaderInstallmentRefresh();
      fetchInstallmentSaleDetail();
    } catch (error: any) {
      if (mountedRef.current) setNotification({ type: 'error', text: error.message });
    } finally {
      if (mountedRef.current) {
        setPaymentStageHint('به‌روزرسانی مانده مشتری و دفتر حساب');
        setIsSubmittingPayment(false);
      }
    }
  };


const paymentStageProgress = (() => {
  if (/اعتبارسنج/i.test(paymentStageHint)) return 1;
  if (/ثبت اطلاعات پرداخت/i.test(paymentStageHint)) return 2;
  if (/مانده مشتری|دفتر حساب/i.test(paymentStageHint)) return 3;
  return 1;
})();

const paymentStageIcon = paymentStageProgress === 1
  ? <Search className="h-3.5 w-3.5" />
  : paymentStageProgress === 2
    ? <Save className="h-3.5 w-3.5" />
    : <RefreshCw className="h-3.5 w-3.5" />;

  const openEditCheckModal = (check: InstallmentCheckInfo) => {
    if (guardCanceledMutation()) return;
    const buyerNationalCode = normalizeIdentityDigits(saleData?.buyerNationalCode);
    const issuerNationalCode = normalizeIdentityDigits(check.issuerNationalCode);
    setEditingCheck({
      ...check,
      ownershipType: check.ownershipType || (buyerNationalCode && issuerNationalCode === buyerNationalCode ? 'buyer' : 'third_party'),
    });
    setEditingCheckDueDate(parseStoredCheckDate(check.dueDate));
    setEditCheckErrors({});
    setIsEditCheckModalOpen(true);
  };

  const clearEditCheckError = (key: string) => {
    setEditCheckErrors(prev => {
      const next = { ...prev };
      delete next[key as CheckEditErrorKey];
      return next;
    });
  };

  const handleEditCheckChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!editingCheck) return;
    const { name, value } = e.target;
    if (name === 'ownershipType') {
      const buyerName = String(saleData?.buyerFullName || saleData?.customerFullName || '').trim();
      const buyerNationalCode = normalizeIdentityDigits(saleData?.buyerNationalCode);
      setEditingCheck(prev => prev ? ({
        ...prev,
        ownershipType: value === 'third_party' ? 'third_party' : 'buyer',
        issuerName: value === 'buyer' ? buyerName : (String(prev.issuerName || '').trim() === buyerName ? '' : prev.issuerName),
        issuerNationalCode: value === 'buyer' ? buyerNationalCode : (normalizeIdentityDigits(prev.issuerNationalCode) === buyerNationalCode ? '' : prev.issuerNationalCode),
      }) : null);
      clearEditCheckError('ownershipType');
      clearEditCheckError('issuerName');
      clearEditCheckError('issuerNationalCode');
      return;
    }
    const normalizedValue = name === 'issuerNationalCode' || name === 'sayadiId'
      ? normalizeIdentityDigits(value)
      : value;
    setEditingCheck(prev => (prev ? { ...prev, [name]: normalizedValue } : null));
    clearEditCheckError(name);
  };

  const handleSaveCheckChanges = async () => {
    if (guardCanceledMutation()) return;
    if (!editingCheck || !editingCheck.id) return;
    const errors: Partial<Record<CheckEditErrorKey, string>> = {};
    const issuerName = String(editingCheck.issuerName || '').trim();
    const issuerNationalCode = normalizeIdentityDigits(editingCheck.issuerNationalCode);
    const sayadiId = normalizeIdentityDigits(editingCheck.sayadiId);
    const checkNumber = String(editingCheck.checkNumber || '').trim();
    const bankName = String(editingCheck.bankName || '').trim();
    const buyerNationalCode = normalizeIdentityDigits(saleData?.buyerNationalCode);
    if (!['buyer', 'third_party'].includes(String(editingCheck.ownershipType || ''))) {
      errors.ownershipType = 'مشخص کنید چک متعلق به خریدار است یا شخص ثالث.';
    }
    if (!issuerName) errors.issuerName = 'نام و نام خانوادگی صادرکننده را وارد کنید.';
    if (issuerNationalCode.length !== 10) errors.issuerNationalCode = 'کد ملی صادرکننده باید دقیقاً ۱۰ رقم باشد.';
    else if (editingCheck.ownershipType === 'buyer' && issuerNationalCode !== buyerNationalCode) {
      errors.issuerNationalCode = 'برای چک خریدار، کد ملی صادرکننده باید با کد ملی خریدار یکسان باشد.';
    } else if (editingCheck.ownershipType === 'third_party' && issuerNationalCode === buyerNationalCode) {
      errors.ownershipType = 'این کد ملی متعلق به خریدار است؛ نوع مالکیت را «چک خریدار» انتخاب کنید.';
    }
    if (sayadiId.length !== 16) errors.sayadiId = 'شناسه صیادی باید دقیقاً ۱۶ رقم باشد.';
    if (!checkNumber) errors.checkNumber = 'شماره چک را وارد کنید.';
    if (!bankName) errors.bankName = 'نام بانک صادرکننده را وارد کنید.';
    if (!editingCheckDueDate) {
      errors.dueDate = 'تاریخ سررسید چک را انتخاب کنید.';
    } else {
      const saleDate = parseStoredCheckDate(saleData?.saleDate || saleData?.phoneSaleDate || saleData?.dateCreated);
      if (saleDate && moment(editingCheckDueDate).startOf('day').isBefore(moment(saleDate).startOf('day'))) {
        errors.dueDate = 'تاریخ سررسید نمی‌تواند قبل از تاریخ فروش باشد.';
      }
    }

    setEditCheckErrors(errors);
    if (Object.keys(errors).length > 0) {
      setNotification({ type: 'error', text: `تغییرات ذخیره نشد؛ ${Object.keys(errors).length} مورد را تکمیل یا اصلاح کنید.` });
      scheduleTimeout(() => focusFirstError(errors as FormErrors, {
        ownershipType: 'editCheckOwnershipType',
        issuerName: 'editCheckIssuerName',
        issuerNationalCode: 'editCheckIssuerNationalCode',
        sayadiId: 'editCheckSayadiId',
        checkNumber: 'editCheckNumber',
        bankName: 'editCheckBankName',
        dueDate: 'editCheckDueDate',
      }), 0);
      return;
    }
    setNotification({ type: 'info', text: 'در حال ذخیره تغییرات چک...' });
    try {
      const res = await apiFetch(`/api/installment-sales/check/${editingCheck.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: editingCheck.status,
          checkNumber,
          bankName,
          ownershipType: editingCheck.ownershipType,
          issuerName,
          issuerNationalCode,
          sayadiId,
          dueDate: moment(editingCheckDueDate).locale('fa').format('jYYYY/jMM/jDD'),
        }),
      });
      const js = await res.json().catch(() => ({}));
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در تغییر وضعیت چک');
      setNotification({ type: 'success', text: `مشخصات قراردادی و وضعیت چک شماره ${editingCheck.checkNumber} به‌روز شد.` });
      setIsEditCheckModalOpen(false);
      setEditingCheck(null);
      setEditingCheckDueDate(null);
      setEditCheckErrors({});
      fetchInstallmentSaleDetail();
    } catch (error: any) {
      setNotification({ type: 'error', text: `خطا در به‌روزرسانی چک: ${error.message}` });
    }
  };
  const updateCheckStatus = async (check: InstallmentCheckInfo, status: CheckStatus, openCashAfter = false) => {
    if (guardCanceledMutation()) return;
    if (!check.id) return;
    if (check.status === status) {
      if (openCashAfter && canReceiveCashForCheck(check)) openCheckCashModal(check);
      return;
    }
    setNotification({ type: 'info', text: `در حال تغییر وضعیت چک شماره ${check.checkNumber}...` });
    try {
      const res = await apiFetch(`/api/installment-sales/check/${check.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      const js = await res.json().catch(() => ({}));
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در تغییر وضعیت چک');
      setNotification({ type: 'success', text: `وضعیت چک شماره ${check.checkNumber} به «${status}» تغییر کرد.` });
      await fetchInstallmentSaleDetail();
      const updatedCheck = saleData?.checks?.find((c) => c.id === check.id);
      if (openCashAfter && isCashRecoverableCheckStatus(status)) {
        openCheckCashModal({ ...(updatedCheck || check), status });
      }
    } catch (error: any) {
      setNotification({ type: 'error', text: `خطا در تغییر وضعیت چک: ${error.message}` });
    }
  };


  const openCheckCashModal = (check: InstallmentCheckInfo) => {
    if (guardCanceledMutation()) return;
    const remaining = Math.max(0, toNumber((check as any).cashRemaining ?? check.amount));
    setCashCheck({ ...check });
    setCheckCashAmount(remaining || '');
    setCheckCashDate(new Date());
    setCheckCashNotes(`دریافت نقدی بابت چک شماره ${check.checkNumber}`);
    setIsCheckCashModalOpen(true);
  };

  const handleSubmitCheckCashPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (guardCanceledMutation()) return;
    if (!cashCheck?.id) return;
    const amount = toNumber(checkCashAmount);
    const remaining = Math.max(0, toNumber((cashCheck as any).cashRemaining ?? cashCheck.amount));
    if (amount <= 0) {
      setNotification({ type: 'error', text: 'مبلغ دریافت نقدی باید عدد مثبت باشد.' });
      return;
    }
    if (amount > remaining + 1) {
      setNotification({ type: 'error', text: `مبلغ دریافت نقدی بیشتر از مانده چک (${formatPrice(remaining)}) است.` });
      return;
    }
    setIsSubmittingCheckCash(true);
    try {
      const payload = {
        amount,
        date: moment(checkCashDate || new Date()).locale('fa').format('jYYYY/jMM/jDD'),
        notes: checkCashNotes,
      };
      const res = await apiFetch(`/api/installment-sales/check/${cashCheck.id}/cash-payment`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const js = await res.json().catch(() => ({}));
      if (!res.ok || !js?.success) throw new Error(js?.message || 'خطا در ثبت دریافت نقدی چک');
      setNotification({ type: 'success', text: js?.message || 'دریافت نقدی بابت چک ثبت شد.' });
      setIsCheckCashModalOpen(false);
      setCashCheck(null);
      notifyHeaderInstallmentRefresh();
      fetchInstallmentSaleDetail();
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
    } finally {
      setIsSubmittingCheckCash(false);
    }
  };

  // ویرایش اطلاعات/حذف مورد تراکنش
  const resolveTransactionPayment = (tx: any): InstallmentPaymentRecord | null => {
    if (!tx || !saleData?.payments?.length) return null;
    const txId = String(tx.id ?? '');
    const paymentId = Number(tx.paymentId || 0);
    return saleData.payments.find((payment) => {
      if (paymentId && Number(payment.id) === paymentId) return true;
      return ((payment as any).transactions || []).some((item: any) => String(item.id ?? '') === txId);
    }) || null;
  };

  const openEditTx = (tx: any) => {
    if (guardCanceledMutation()) return;
    setEditingTx(tx);
    setEditTxAmount(tx?.amount_paid || '');
    setEditTxDate(tx?.payment_date ? moment(tx.payment_date, ['YYYY-MM-DD', 'YYYY/MM/DD']).toDate() : new Date());
    setEditTxNotes(tx?.notes || '');
    setIsEditTxModalOpen(true);
  };

  const openDeleteTx = (tx: any) => {
    if (guardCanceledMutation()) return;
    setDeletingTx(tx);
    setIsDeleteTxModalOpen(true);
  };

  const handleSaveTx = async () => {
    if (guardCanceledMutation()) return;
    if (!editingTx || isSavingTx) return;
    const nextAmount = toNumber(editTxAmount);
    if (nextAmount <= 0) {
      setNotification({ type: 'error', text: 'مبلغ ویرایش‌شده باید بیشتر از صفر باشد.' });
      return;
    }
    setIsSavingTx(true);
    try {
      const payload = {
        amount: nextAmount,
        date: moment(editTxDate || new Date()).locale('fa').format('jYYYY/jMM/jDD'),
        notes: editTxNotes,
      };
      await apiFetch(`/api/installment-sales/payment/transaction/${editingTx.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setNotification({ type: 'success', text: 'اطلاعات پرداخت با موفقیت ویرایش شد.' });
      setIsEditTxModalOpen(false);
      setEditingTx(null);
      notifyHeaderInstallmentRefresh();
      await fetchInstallmentSaleDetail();
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message });
    } finally {
      setIsSavingTx(false);
    }
  };

  const handleDeleteTx = async () => {
    if (guardCanceledMutation()) return;
    if (!deletingTx || isDeletingTx) return;
    setIsDeletingTx(true);
    try {
      await apiFetch(`/api/installment-sales/payment/transaction/${deletingTx.id}`, { method: 'DELETE' });
      setNotification({ type: 'success', text: 'پرداخت با موفقیت حذف شد و مانده پرونده به‌روزرسانی شد.' });
      setIsDeleteTxModalOpen(false);
      setDeletingTx(null);
      notifyHeaderInstallmentRefresh();
      fetchInstallmentSaleDetail();
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message });
    } finally {
      setIsDeletingTx(false);
    }
  };

  // ---------- render ----------
  if (isLoading)
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-300">
        <i className="fas fa-spinner fa-spin text-2xl mr-2" /> در حال دریافت اطلاعات...
      </div>
    );
  if (!token && authReady) return <div className="p-6 text-center text-orange-500">برای مشاهده این صفحه، ابتدا وارد شوید.</div>;
  if (!saleData) return <div className="p-6 text-center text-red-500">اطلاعات فروش اقساطی یافت نشد.</div>;

  const activeTab = (searchParams.get('tab') || 'overview') as 'overview' | 'installments' | 'ledger' | 'checks';
  const primaryItemTitle = saleData.phoneModel || saleData.itemsSummary || saleData.items?.[0]?.description || 'پرونده فروش اقساطی';
  const saleKindLabel = saleData.saleType === 'check' ? 'فروش چکی' : 'فروش اقساطی';
  const firstInstallmentDueDate = saleData.payments?.[0]?.dueDate || null;
  const formattedStartDate = toShamsiSafe(saleData.installmentsStartDate);
  const displayInstallmentsStartDate = formattedStartDate !== '—' ? formattedStartDate : toShamsiSafe(firstInstallmentDueDate);
  const installmentRemainingAmount = Math.max(0, toNumber(saleData.remainingAmount));
  const installmentContractAmount = Math.max(0, toNumber(saleData.totalInstallmentPrice));
  const allRecordedPaymentsSettled = (saleData.payments || []).length > 0 && (saleData.payments || []).every((payment) => payment.status === 'پرداخت شده');
  const isCanceled = saleData.overallStatus === 'فسخ شده' || ['canceled', 'cancelled'].includes(String((saleData as any).status || '').trim().toLowerCase());
  const cancellationRefund = (saleData as any).cancellationRefund || null;
  const refundRemaining = Math.max(0, Number(cancellationRefund?.remainingRefund || 0));
  const refundPaid = Math.max(0, Number(cancellationRefund?.refundedAmount || 0));
  const refundExpected = Math.max(0, Number(cancellationRefund?.expectedRefundDue || 0));
  const canRegisterCancellationRefund = isCanceled && currentUser?.roleName === 'Admin' && refundRemaining > 0.00001;
  const isSaleSettled = !isCanceled && (saleData.overallStatus === 'تکمیل شده' || (installmentContractAmount > 0 && installmentRemainingAmount <= 0 && allRecordedPaymentsSettled));
  const headerContractTotal = Math.max(0, toNumber(saleData.totalInstallmentPrice));
  const headerRemaining = Math.max(0, toNumber(saleData.remainingAmount));
  const headerOverpayment = Math.max(0, toNumber(saleData.overpaymentAmount));
  const headerCollected = Math.max(0, headerContractTotal - headerRemaining + headerOverpayment);
  const headerCollectionRate = headerContractTotal > 0 ? Math.min(100, (headerCollected / headerContractTotal) * 100) : 0;
  const nextUnpaidPayment = !isCanceled && !isSaleSettled ? findNextUnpaidPayment() : null;
  const nextDueRemaining = nextUnpaidPayment ? getPaymentRemaining(nextUnpaidPayment) : 0;
  const nextDueMeta = nextUnpaidPayment ? getPaymentDueMeta(nextUnpaidPayment) : null;
  const tabs = [
    { key: 'overview', label: 'خلاصه', icon: 'fa-chart-pie' },
    { key: 'installments', label: 'اقساط', icon: 'fa-calendar-check' },
    { key: 'ledger', label: 'پرداخت‌ها', icon: 'fa-money-bill-transfer' },
    { key: 'checks', label: 'چک‌ها', icon: 'fa-money-check-dollar' },
  ] as const;
  const tabChips = tabs.map((item) => ({
    key: item.key,
    label: item.label,
    icon: `fa-solid ${item.icon}`,
  }));

  return (
    <div className="min-h-screen space-y-4 bg-slate-50/70 px-3 pb-8 pt-2 text-right dark:bg-slate-950/40 sm:px-4" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <SmsAutoSendSheet
        open={smsSheetOpen}
        title="تسویه کامل اقساط"
        description={smsSheetMessage ? `جزئیات: ${smsSheetMessage}` : undefined}
        status={smsSheetStatus}
        primaryActionLabel="ارسال مجدد پیامک"
        primaryActionLoading={smsResending}
        onPrimaryAction={resendFinalPaymentSms}
        onClose={() => setSmsSheetOpen(false)}
      />

      {/* Canonical installment detail header */}
      <PanelCard
        className="mx-auto max-w-7xl"
        density="compact"
        tone={isCanceled ? 'neutral' : saleData.overallStatus === 'معوق' ? 'danger' : isSaleSettled ? 'success' : 'info'}
        title={primaryItemTitle}
        subtitle={
          <div className="flex flex-wrap items-center gap-2">
            <FinancialStatusBadge
              label={saleKindLabel}
              tone="neutral"
              icon="fa-solid fa-file-invoice-dollar"
              size="xs"
            />
            {overallBadge(saleData.overallStatus)}
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">سند {saleData.id.toLocaleString('fa-IR')}</span>
          </div>
        }
        icon={<i className="fa-solid fa-file-invoice-dollar" aria-hidden="true" />}
        actions={
          <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
            <Button
              type="button"
              onClick={openInstallmentContractPrint}
              variant="primary"
              size="sm"
              title="چاپ قرارداد کامل ۸ ماده‌ای"
              leftIcon={<i className="fa-solid fa-print" aria-hidden="true" />}
            >
              چاپ قرارداد
            </Button>
            {!isCanceled && !isSaleSettled ? (
              <Button
                type="button"
                onClick={openQuickPayment}
                variant="success"
                size="sm"
                title="ثبت سریع قسط بعدی پرداخت‌نشده"
                leftIcon={<i className="fa-solid fa-hand-holding-dollar" />}
              >
                پرداخت سریع
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={() => navigate(-1)}
              variant="secondary"
              size="sm"
              title="بازگشت"
              leftIcon={<i className="fa-solid fa-arrow-right" />}
            >
              بازگشت
            </Button>
          </div>
        }
        bodyClassName="!py-3"
        footer={
          <FilterChipsBar
            chips={tabChips}
            value={activeTab}
            ariaLabel="بخش‌های پرونده فروش اقساطی"
            onChange={(key) => setSearchParams((prev) => {
              const params = new URLSearchParams(prev);
              params.set('tab', key);
              return params;
            })}
          />
        }
        footerClassName="!py-2.5"
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <ActionLink
              to={`/customers/${saleData.customerId}`}
              variant="secondary"
              size="xs"
              autoIcon={false}
              leftIcon={<i className="fa-regular fa-user" aria-hidden="true" />}
              title="مشاهده پرونده مشتری"
            >
              {saleData.customerFullName}
            </ActionLink>
            {saleData.phoneImei ? (
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px]" dir="ltr">
                <i className="fa-solid fa-barcode" aria-hidden="true" /> IMEI {saleData.phoneImei}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <i className="fa-regular fa-calendar" aria-hidden="true" /> شروع اقساط: {displayInstallmentsStartDate}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 border-t border-slate-200 pt-3 dark:border-slate-800 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(16rem,1.15fr)_minmax(18rem,1.35fr)]">
            <div className="min-w-0 rounded-2xl bg-slate-50/80 px-3 py-2.5 dark:bg-slate-900/45">
              <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400">
                <i className="fa-solid fa-circle-check text-emerald-500" aria-hidden="true" />
                وصول‌شده
              </div>
              <div className="mt-1 whitespace-nowrap text-base font-black tabular-nums text-emerald-700 dark:text-emerald-300">{formatPrice(headerCollected)}</div>
            </div>

            <div className="min-w-0 rounded-2xl bg-slate-50/80 px-3 py-2.5 dark:bg-slate-900/45">
              <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400">
                <i className="fa-solid fa-wallet text-amber-500" aria-hidden="true" />
                مانده قابل وصول
              </div>
              <div className={`mt-1 whitespace-nowrap text-base font-black tabular-nums ${headerRemaining > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{formatPrice(headerRemaining)}</div>
            </div>

            <div className="min-w-0 rounded-2xl bg-slate-50/80 px-3 py-2.5 dark:bg-slate-900/45">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black text-slate-500 dark:text-slate-400">پیشرفت وصول</span>
                <span className="whitespace-nowrap text-xs font-black tabular-nums text-slate-800 dark:text-slate-100">{Math.round(headerCollectionRate).toLocaleString('fa-IR')}٪</span>
              </div>
              <FinancialProgressBar
                value={headerCollectionRate}
                showPercent={false}
                tone={headerRemaining <= 0.00001 ? 'emerald' : headerCollectionRate >= 75 ? 'brand' : 'amber'}
                size="xs"
                className="mt-2"
                ariaLabel="درصد وصول قرارداد"
              />
              <div className="mt-1.5 truncate text-[10px] font-bold text-slate-500 dark:text-slate-400" title={`${formatPrice(headerCollected)} از ${formatPrice(headerContractTotal)}`}>
                {formatPrice(headerCollected)} از {formatPrice(headerContractTotal)}
              </div>
            </div>

            <div className="min-w-0 rounded-2xl bg-slate-50/80 px-3 py-2.5 dark:bg-slate-900/45">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400">
                    <i className="fa-regular fa-calendar-check text-slate-400" aria-hidden="true" />
                    نزدیک‌ترین سررسید
                  </div>
                  {nextUnpaidPayment ? (
                    <>
                      <div className="mt-1 whitespace-nowrap text-sm font-black tabular-nums text-slate-950 dark:text-slate-50">{toShamsiSafe(nextUnpaidPayment.dueDate)}</div>
                      <div className="mt-0.5 whitespace-nowrap text-[11px] font-bold tabular-nums text-slate-500 dark:text-slate-400">قسط {Number(nextUnpaidPayment.installmentNumber || 0).toLocaleString('fa-IR')} • {formatPrice(nextDueRemaining)}</div>
                    </>
                  ) : (
                    <div className="mt-1 text-sm font-black text-emerald-700 dark:text-emerald-300">{isCanceled ? 'قرارداد فسخ شده' : 'سررسید بازی وجود ندارد'}</div>
                  )}
                </div>
                {nextDueMeta ? <FinancialStatusBadge label={nextDueMeta.label} tone={nextDueMeta.tone} size="xs" /> : null}
              </div>
            </div>
          </div>
        </div>
      </PanelCard>

      {isCanceled ? (
        <PanelCard
          className="mx-auto max-w-7xl"
          density="compact"
          tone={(saleData as any).cancellationSettlementStatus === 'needs_reconciliation' ? 'warning' : refundRemaining > 0 ? 'warning' : 'neutral'}
          title="این قرارداد فسخ شده است"
          subtitle={(saleData as any).cancelReason || 'فسخ قرارداد ثبت شده و تاریخچه مالی برای حسابرسی حفظ شده است.'}
          icon={<i className="fa-solid fa-file-circle-xmark" aria-hidden="true" />}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <FinancialStatusBadge
                label={(saleData as any).cancellationSettlementStatus === 'needs_reconciliation' ? 'نیازمند تطبیق' : refundRemaining > 0 ? 'بازپرداخت باز' : refundExpected > 0 ? 'بازپرداخت تسویه‌شده' : 'فسخ ثبت‌شده'}
                tone={(saleData as any).cancellationSettlementStatus === 'needs_reconciliation' ? 'warning' : refundRemaining > 0 ? 'warning' : refundExpected > 0 ? 'success' : 'neutral'}
                icon={(saleData as any).cancellationSettlementStatus === 'needs_reconciliation' ? 'fa-solid fa-scale-balanced' : refundRemaining > 0 ? 'fa-solid fa-money-bill-transfer' : refundExpected > 0 ? 'fa-solid fa-circle-check' : 'fa-solid fa-lock'}
                size="sm"
              />
              {canRegisterCancellationRefund ? (
                <Button
                  type="button"
                  variant="primary"
                  size="xs"
                  onClick={() => setIsCancellationRefundModalOpen(true)}
                  leftIcon={<i className="fa-solid fa-money-bill-transfer" aria-hidden="true" />}
                >
                  ثبت بازپرداخت
                </Button>
              ) : null}
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">تاریخ فسخ</span><strong>{(saleData as any).canceledAt ? formatIsoToShamsi((saleData as any).canceledAt) : '—'}</strong></div>
              <div><span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">روش فسخ</span><strong>{(saleData as any).cancellationMode === 'full_reversal' ? 'برگشت کامل' : 'تسویه و تطبیق باز'}</strong></div>
              <div><span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">مانده قبل از فسخ</span><strong>{formatPrice((saleData as any).cancellation?.remainingBeforeCancellation || 0)}</strong></div>
              <div><span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">قابل استرداد اولیه</span><strong>{formatPrice(refundExpected)}</strong></div>
            </div>

            {refundExpected > 0 ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <PanelCard variant="metric" title="بازپرداخت‌شده" metricValue={formatPrice(refundPaid)} metricHint="پرداخت واقعی به مشتری" tone="success" icon={<i className="fa-solid fa-circle-check" aria-hidden="true" />} density="compact" />
                  <PanelCard variant="metric" title="مانده قابل استرداد" metricValue={formatPrice(refundRemaining)} metricHint={refundRemaining > 0 ? 'هنوز به مشتری پرداخت نشده' : 'بازپرداخت کامل شده است'} tone={refundRemaining > 0 ? 'warning' : 'success'} icon={<i className="fa-solid fa-wallet" aria-hidden="true" />} density="compact" />
                  <PanelCard variant="metric" title="تعداد بازپرداخت‌ها" metricValue={Number(cancellationRefund?.refunds?.length || 0).toLocaleString('fa-IR')} metricHint="سوابق غیرقابل حذف" tone="neutral" icon={<i className="fa-solid fa-list-ul" aria-hidden="true" />} density="compact" />
                </div>

                {Array.isArray(cancellationRefund?.refunds) && cancellationRefund.refunds.length > 0 ? (
                  <>
                    <div className="grid gap-2 md:hidden">
                      {cancellationRefund.refunds.map((refund: any) => {
                        const methodLabel = refund.paymentMethod === 'cash' ? 'نقدی' : refund.paymentMethod === 'card' ? 'کارت / کارت‌خوان' : refund.paymentMethod === 'bank_transfer' ? 'انتقال بانکی' : 'سایر';
                        return (
                          <PanelCard
                            key={`mobile-refund-${refund.id}`}
                            title={formatPrice(refund.amount)}
                            subtitle={refund.paymentDate ? formatIsoToShamsi(refund.paymentDate) : 'تاریخ نامشخص'}
                            icon={<i className="fa-solid fa-money-bill-transfer" aria-hidden="true" />}
                            density="compact"
                          >
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div><span className="block text-slate-500 dark:text-slate-400">روش</span><strong>{methodLabel}</strong></div>
                              <div><span className="block text-slate-500 dark:text-slate-400">پیگیری</span><strong>{refund.referenceNo || '—'}</strong></div>
                              <div className="col-span-2"><span className="block text-slate-500 dark:text-slate-400">ثبت‌کننده</span><strong>{refund.createdByUsername || 'سیستم'}</strong></div>
                            </div>
                          </PanelCard>
                        );
                      })}
                    </div>
                    <div className="hidden overflow-x-auto md:block">
                      <table className="app-table w-full min-w-[720px] text-sm">
                        <thead>
                          <tr>
                            <th>تاریخ پرداخت</th>
                            <th>مبلغ</th>
                            <th>روش</th>
                            <th>شماره پیگیری</th>
                            <th>ثبت‌کننده</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cancellationRefund.refunds.map((refund: any) => {
                            const methodLabel = refund.paymentMethod === 'cash' ? 'نقدی' : refund.paymentMethod === 'card' ? 'کارت / کارت‌خوان' : refund.paymentMethod === 'bank_transfer' ? 'انتقال بانکی' : 'سایر';
                            return (
                              <tr key={refund.id}>
                                <td>{refund.paymentDate ? formatIsoToShamsi(refund.paymentDate) : '—'}</td>
                                <td className="font-black">{formatPrice(refund.amount)}</td>
                                <td>{methodLabel}</td>
                                <td>{refund.referenceNo || '—'}</td>
                                <td>{refund.createdByUsername || 'سیستم'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : null}
              </>
            ) : null}
          </div>
        </PanelCard>
      ) : null}

      {isSaleSettled ? (
        <PanelCard
          className="mx-auto max-w-7xl"
          density="compact"
          tone="success"
          title="تسویه کامل"
          subtitle="همه اقساط این پرونده پرداخت شده است."
          icon={
            <span className="relative inline-flex h-7 w-7 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-emerald-400/25 motion-safe:animate-ping" aria-hidden="true" />
              <i className="fa-solid fa-circle-check relative z-10" aria-hidden="true" />
            </span>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <FinancialStatusBadge
                label={`مانده: ${formatPrice(installmentRemainingAmount)}`}
                tone="success"
                icon="fa-solid fa-check"
                size="sm"
              />
              {finalizationSmsAvailable ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={() => setSmsSheetOpen(true)}
                  leftIcon={<i className="fa-solid fa-message" aria-hidden="true" />}
                >
                  وضعیت پیامک
                </Button>
              ) : null}
            </div>
          }
          bodyClassName="!hidden"
          headerDivider={false}
        />
      ) : null}

      {/* Body */}
      {(() => {
        const tab = (searchParams.get('tab') || 'overview') as 'overview' | 'installments' | 'ledger' | 'checks';

        // Derived metrics
        const remaining = headerRemaining;
        const overpayment = headerOverpayment;

        const payments = saleData.payments || [];
        const overdueCount = remaining <= 0.00001 ? 0 : payments.filter((p) => isOverdue(p.dueDate, p.status)).length;
        const dueIn7 = remaining <= 0.00001 ? 0 : payments.filter((p) => p.status !== 'پرداخت شده' && moment(p.dueDate).diff(moment(), 'days') >= 0 && moment(p.dueDate).diff(moment(), 'days') <= 7).length;

        if (tab === 'overview') {
          return (
            <div className="mx-auto max-w-7xl space-y-4">
              {(overdueCount > 0 || dueIn7 > 0 || overpayment > 0.00001) ? (
                <PanelCard
                  title="نیازمند توجه"
                  subtitle="فقط مواردی که برای پیگیری این پرونده اقدام می‌خواهند"
                  icon={<i className="fa-solid fa-bell" aria-hidden="true" />}
                  tone={overdueCount > 0 ? 'danger' : 'warning'}
                  density="compact"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {overdueCount > 0 ? (
                      <FinancialStatusBadge label={`${overdueCount.toLocaleString('fa-IR')} قسط معوق`} tone="danger" icon="fa-solid fa-triangle-exclamation" size="sm" />
                    ) : null}
                    {dueIn7 > 0 ? (
                      <FinancialStatusBadge label={`${dueIn7.toLocaleString('fa-IR')} سررسید تا ۷ روز آینده`} tone="warning" icon="fa-regular fa-calendar-days" size="sm" />
                    ) : null}
                    {overpayment > 0.00001 ? (
                      <FinancialStatusBadge label={`مازاد دریافت: ${formatPrice(overpayment)}`} tone="warning" icon="fa-solid fa-scale-balanced" size="sm" />
                    ) : null}
                  </div>
                </PanelCard>
              ) : null}

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.65fr)]">
                <PanelCard
                  title="مشخصات قرارداد"
                  subtitle="شرایط فروش و تاریخ‌های اصلی ثبت‌شده برای این پرونده"
                  icon={<i className="fa-solid fa-file-signature" aria-hidden="true" />}
                  tone="info"
                  density="compact"
                  actions={<FinancialStatusBadge label={`${saleData.numberOfInstallments.toLocaleString('fa-IR')} قسط`} tone="neutral" icon="fa-solid fa-list-ol" size="sm" />}
                >
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {[
                      { label: 'قیمت فروش نهایی', value: formatPrice(saleData.actualSalePrice), icon: 'fa-solid fa-tag', tone: 'sky' },
                      { label: 'پیش‌پرداخت', value: formatPrice(saleData.downPayment), icon: 'fa-solid fa-coins', tone: 'emerald' },
                      { label: 'تعداد اقساط', value: `${saleData.numberOfInstallments.toLocaleString('fa-IR')} قسط`, icon: 'fa-solid fa-list-ol', tone: 'slate' },
                      { label: 'مبلغ هر قسط', value: formatPrice(saleData.installmentAmount), icon: 'fa-solid fa-money-bill-wave', tone: 'emerald' },
                      { label: 'تاریخ خرید اقساطی', value: toShamsiSafe((saleData as any).saleDate || (saleData as any).phoneSaleDate || saleData.dateCreated), icon: 'fa-solid fa-cart-shopping', tone: 'violet' },
                      { label: 'تاریخ ورود گوشی به انبار', value: toShamsiSafe((saleData as any).phonePurchaseDate || (saleData as any).phoneRegisterDate), icon: 'fa-solid fa-warehouse', tone: 'orange' },
                    ].map((item) => {
                      return (
                        <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/45">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 text-right">
                              <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">{item.label}</div>
                              <div className="mt-1 truncate text-sm font-black text-slate-950 dark:text-slate-50" title={String(item.value)}>{item.value}</div>
                            </div>
                            <span className="shrink-0 text-slate-400 dark:text-slate-500" data-ui-icon-surface="bare">
                              <i className={`${item.icon} text-[13px]`} />
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {saleData.notes ? (
                      <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/45">
                        <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-slate-50">
                          <i className="fa-solid fa-note-sticky text-slate-400" />
                          یادداشت‌ها
                        </div>
                        <div className="mt-2 text-sm leading-7 text-slate-700 dark:text-slate-200">{saleData.notes}</div>
                      </div>
                    ) : null}
                  </div>
                </PanelCard>

                <PanelCard
                  title="اقلام پرونده"
                  subtitle="کالاها و خدمات ثبت‌شده در این فروش"
                  icon={<i className="fa-solid fa-boxes-stacked" aria-hidden="true" />}
                  tone="neutral"
                  density="compact"
                >

                  {!saleData.items || saleData.items.length === 0 ? (
                    <div className="mt-3">
                      <EmptyState
                        title="قلمی برای نمایش وجود ندارد"
                        description="برای این پرونده کالای جداگانه یا خدمت قابل نمایش ثبت نشده است."
                        icon={<i className="fa-solid fa-box-open" aria-hidden="true" />}
                      />
                    </div>
                  ) : (
                    <div className="mt-4 space-y-2">
                      {saleData.items.slice(0, 6).map((it: any, idx: number) => {
                        const typeLabel = it.itemType === 'inventory' ? 'لوازم جانبی' : it.itemType === 'service' ? 'خدمات' : 'موبایل';
                        const icon = it.itemType === 'inventory' ? 'fa-solid fa-box-open' : it.itemType === 'service' ? 'fa-solid fa-screwdriver-wrench' : 'fa-solid fa-mobile-screen-button';
                        return (
                          <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 transition hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900/45 dark:hover:border-slate-700 dark:hover:bg-slate-950">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 text-right">
                                <div className="flex items-center gap-2">
                                  <span className="shrink-0 text-slate-400 dark:text-slate-500" data-ui-icon-surface="bare">
                                    <i className={`${icon} text-[13px]`} />
                                  </span>
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-black text-slate-950 dark:text-slate-50" title={it.description || typeLabel}>{it.description || typeLabel}</div>
                                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                      <span>{typeLabel} • تعداد {(Number(it.quantity || 0)).toLocaleString('fa-IR')}</span>
                                      {it.itemType === 'phone' ? (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-black text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                                          <i className="fa-solid fa-scale-balanced text-[9px]" />
                                          مبنای بها: {it.costBasisSource === 'currentPurchasePrice' ? 'قیمت خرید روز' : it.costBasisSource === 'documentBuyPrice' ? 'قیمت خرید سند' : it.costBasisSource === 'purchasePrice' ? 'قیمت خرید اصلی' : 'نامشخص'}
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="shrink-0 text-sm font-black text-slate-950 dark:text-slate-50">{formatPrice(Number(it.totalPrice || 0))}</div>
                            </div>
                          </div>
                        );
                      })}
                      {saleData.items.length > 6 ? (
                        <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">+ {Number(saleData.items.length - 6).toLocaleString('fa-IR')} مورد دیگر</div>
                      ) : null}
                    </div>
                  )}
                </PanelCard>
              </div>
            </div>
          );
        }

        if (tab === 'checks') {
          const totalChecksAmount = saleData.checks.reduce((sum, check) => sum + toNumber(check.amount), 0);
          const clearedChecks = saleData.checks.filter((check) => check.status === 'نقد شد');
          const activeChecks = saleData.checks.filter((check) => check.status === 'نزد فروشنده' || check.status === 'در جریان وصول');
          const recoverableChecks = saleData.checks.filter((check) => isCashRecoverableCheckStatus(check.status));
          const totalCashRecovered = saleData.checks.reduce((sum, check) => sum + toNumber((check as any).cashPaid), 0);
          const totalRecoverableRemaining = recoverableChecks.reduce(
            (sum, check) => sum + Math.max(0, toNumber((check as any).cashRemaining ?? check.amount)),
            0,
          );
          const clearedAmount = clearedChecks.reduce((sum, check) => sum + toNumber(check.amount), 0);

          return (
            <div className="mx-auto max-w-7xl space-y-4">
              <PanelCard
                title="چک‌های دریافتی"
                subtitle="وضعیت هر چک، سررسید و مسیر وصول نقدی جایگزین در یک نمای واحد"
                icon={<i className="fa-solid fa-money-check-dollar" aria-hidden="true" />}
                tone={recoverableChecks.length > 0 ? 'warning' : 'info'}
                density="compact"
                actions={<FinancialStatusBadge label={`${saleData.checks.length.toLocaleString('fa-IR')} چک`} tone="neutral" size="sm" />}
              >
                <div className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                      <i className="fa-solid fa-coins shrink-0" aria-hidden="true" />
                      <span>مجموع چک‌ها</span>
                    </div>
                    <div className="mt-1.5 whitespace-nowrap text-base font-black tabular-nums text-slate-900 dark:text-slate-50">{formatPrice(totalChecksAmount)}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                      <i className="fa-solid fa-circle-check shrink-0 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
                      <span>وصول قطعی</span>
                    </div>
                    <div className="mt-1.5 whitespace-nowrap text-base font-black tabular-nums text-emerald-700 dark:text-emerald-300">{clearedChecks.length.toLocaleString('fa-IR')} چک</div>
                    {clearedChecks.length > 0 ? <div className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">جمع: {formatPrice(clearedAmount)}</div> : null}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                      <i className="fa-solid fa-building-columns shrink-0 text-sky-600 dark:text-sky-300" aria-hidden="true" />
                      <span>در انتظار وصول</span>
                    </div>
                    <div className="mt-1.5 whitespace-nowrap text-base font-black tabular-nums text-slate-900 dark:text-slate-50">{activeChecks.length.toLocaleString('fa-IR')} چک</div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                      <i className="fa-solid fa-hand-holding-dollar shrink-0 text-amber-600 dark:text-amber-300" aria-hidden="true" />
                      <span>مانده نقدی جایگزین</span>
                    </div>
                    <div className={`mt-1.5 whitespace-nowrap text-base font-black tabular-nums ${totalRecoverableRemaining > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-slate-900 dark:text-slate-50'}`}>{formatPrice(totalRecoverableRemaining)}</div>
                    {totalCashRecovered > 0 ? <div className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">دریافت‌شده: {formatPrice(totalCashRecovered)}</div> : null}
                  </div>
                </div>
              </PanelCard>

              {saleData.checks.length === 0 ? (
                <EmptyState
                  title="چکی برای این فروش ثبت نشده است"
                  description="در صورت ثبت فروش چکی، وضعیت وصول و عملیات مربوط به چک‌ها در همین بخش نمایش داده می‌شود."
                  icon={<i className="fa-solid fa-money-check-dollar" aria-hidden="true" />}
                />
              ) : (
                <div className="grid gap-3 xl:grid-cols-2">
                  {saleData.checks.map((check) => {
                    const checkId = Number(check.id || 0);
                    const isCashDetailsExpanded = checkId > 0 && expandedChecks.has(checkId);
                    const cashPaid = toNumber((check as any).cashPaid);
                    const cashRemaining = Math.max(0, toNumber((check as any).cashRemaining ?? check.amount));
                    const cashTransactions: any[] = (check as any).cashTransactions || [];
                    const isRecoverable = isCashRecoverableCheckStatus(check.status);
                    const dueMeta = getCheckDueMeta(check);
                    const statusCopy = CHECK_STATUS_COPY[check.status];
                    const checkTone = check.status === 'نقد شد'
                      ? 'success' as const
                      : check.status === 'برگشت خورد'
                        ? 'danger' as const
                        : check.status === 'به مشتری برگشت داده شده'
                          ? 'warning' as const
                          : 'info' as const;
                    const cashProgress = toNumber(check.amount) > 0
                      ? Math.round(Math.min(100, Math.max(0, (cashPaid / toNumber(check.amount)) * 100)))
                      : 0;

                    const checkActions = [
                      {
                        key: 'edit',
                        kind: 'button' as const,
                        label: 'ویرایش وضعیت چک',
                        icon: <i className="fa-solid fa-pen" aria-hidden="true" />,
                        variant: 'warning' as const,
                        onClick: () => openEditCheckModal(check),
                      },
                      {
                        key: 'seller',
                        kind: 'button' as const,
                        label: 'ثبت نزد فروشنده',
                        icon: <i className="fa-solid fa-wallet" aria-hidden="true" />,
                        variant: 'secondary' as const,
                        disabled: isCanceled,
                        hidden: check.status === 'نزد فروشنده',
                        onClick: () => updateCheckStatus(check, 'نزد فروشنده', false),
                      },
                      {
                        key: 'collection',
                        kind: 'button' as const,
                        label: 'ثبت در جریان وصول',
                        icon: <i className="fa-solid fa-building-columns" aria-hidden="true" />,
                        variant: 'secondary' as const,
                        disabled: isCanceled,
                        hidden: check.status === 'در جریان وصول',
                        onClick: () => updateCheckStatus(check, 'در جریان وصول', false),
                      },
                      {
                        key: 'cashed',
                        kind: 'button' as const,
                        label: 'ثبت چک نقد شده',
                        icon: <i className="fa-solid fa-circle-check" aria-hidden="true" />,
                        variant: 'success' as const,
                        disabled: isCanceled,
                        hidden: check.status === 'نقد شد',
                        onClick: () => updateCheckStatus(check, 'نقد شد', false),
                      },
                      {
                        key: 'returned-customer',
                        kind: 'button' as const,
                        label: 'عودت چک به مشتری',
                        icon: <i className="fa-solid fa-handshake-angle" aria-hidden="true" />,
                        variant: 'warning' as const,
                        disabled: isCanceled,
                        hidden: check.status === 'به مشتری برگشت داده شده',
                        onClick: () => updateCheckStatus(check, 'به مشتری برگشت داده شده', true),
                      },
                      {
                        key: 'bounced',
                        kind: 'button' as const,
                        label: 'ثبت چک برگشتی',
                        icon: <i className="fa-solid fa-arrow-rotate-left" aria-hidden="true" />,
                        variant: 'danger' as const,
                        disabled: isCanceled,
                        hidden: check.status === 'برگشت خورد',
                        onClick: () => updateCheckStatus(check, 'برگشت خورد', true),
                      },
                    ];

                    return (
                      <div
                        key={check.id ?? check.checkNumber}
                        id={checkId > 0 ? `check-row-${checkId}` : undefined}
                        className={checkId > 0 && checkId === highlightedCheckId ? 'rounded-[24px] ring-4 ring-sky-100 dark:ring-sky-950/40' : undefined}
                      >
                      <PanelCard
                        title={`چک ${check.checkNumber}`}
                        subtitle={
                          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="inline-flex min-w-0 items-center gap-1.5">
                              <i className="fa-solid fa-building-columns shrink-0" aria-hidden="true" />
                              <span className="truncate">{check.bankName || 'بانک نامشخص'}</span>
                            </span>
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                              <i className="fa-regular fa-calendar shrink-0" aria-hidden="true" />
                              سررسید {formatIsoToShamsi(check.dueDate)}
                            </span>
                            <FinancialStatusBadge label={dueMeta.label} tone={dueMeta.tone} size="xs" />
                          </div>
                        }
                        icon={<i className="fa-solid fa-money-check-dollar" aria-hidden="true" />}
                        tone={checkTone}
                        density="compact"
                        actions={<FinancialStatusBadge label={check.status} tone={checkTone} size="sm" />}
                      >
                        <div className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                          <div className="min-w-0">
                            <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400">مبلغ چک</div>
                            <div className="mt-1 whitespace-nowrap text-sm font-black tabular-nums text-slate-950 dark:text-slate-50">{formatPrice(check.amount)}</div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400">دریافت نقدی جایگزین</div>
                            <div className={`mt-1 whitespace-nowrap text-sm font-black tabular-nums ${cashPaid > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-950 dark:text-slate-50'}`}>{formatPrice(cashPaid)}</div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400">مانده نقدی</div>
                            <div className={`mt-1 whitespace-nowrap text-sm font-black tabular-nums ${isRecoverable && cashRemaining > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-slate-950 dark:text-slate-50'}`}>
                              {isRecoverable || cashPaid > 0 ? formatPrice(cashRemaining) : '—'}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400">ریز دریافت نقدی</div>
                            <div className="mt-1 whitespace-nowrap text-sm font-black tabular-nums text-slate-950 dark:text-slate-50">{cashTransactions.length.toLocaleString('fa-IR')} ثبت</div>
                          </div>
                        </div>

                        <div className="mt-3 flex min-w-0 items-start gap-2 border-t border-slate-200/80 pt-3 text-xs font-semibold leading-6 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                          <i className={`fa-solid ${statusCopy?.icon || 'fa-circle-info'} mt-1 shrink-0`} aria-hidden="true" />
                          <span>{statusCopy?.caption || 'وضعیت چک ثبت شده است.'}</span>
                        </div>

                        {isRecoverable ? (
                          <FinancialProgressBar
                            className="mt-3"
                            value={cashProgress}
                            label={`${cashProgress.toLocaleString('fa-IR')}٪ از مسیر نقدی جایگزین وصول شده`}
                            tone={cashRemaining <= 0 ? 'emerald' : check.status === 'برگشت خورد' ? 'rose' : 'amber'}
                            ariaLabel={`درصد وصول نقدی چک ${check.checkNumber}`}
                          />
                        ) : null}

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-3 dark:border-slate-800">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            {isRecoverable && cashRemaining > 0 ? (
                              <Button
                                disabled={isCanceled}
                                onClick={() => openCheckCashModal(check)}
                                variant="success"
                                size="xs"
                                leftIcon={<i className="fa-solid fa-hand-holding-dollar" />}
                              >
                                ثبت دریافت نقدی
                              </Button>
                            ) : null}

                            {cashTransactions.length > 0 && checkId > 0 ? (
                              <Button
                                type="button"
                                onClick={() => {
                                  setExpandedChecks((prev) => {
                                    const next = new Set(prev);
                                    next.has(checkId) ? next.delete(checkId) : next.add(checkId);
                                    return next;
                                  });
                                }}
                                variant="secondary"
                                size="xs"
                                leftIcon={<i className={`fa-solid ${isCashDetailsExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}`} />}
                              >
                                {isCashDetailsExpanded ? 'بستن ریزدریافت' : `ریز دریافت (${cashTransactions.length.toLocaleString('fa-IR')})`}
                              </Button>
                            ) : null}
                          </div>

                          <TableActionGroup
                            ariaLabel={`عملیات چک ${check.checkNumber}`}
                            collapseBelow="xl"
                            align="end"
                            actions={checkActions}
                          />
                        </div>

                        {isCashDetailsExpanded ? (
                          <div className="mt-3 border-t border-slate-200/80 pt-3 dark:border-slate-800">
                            <FinancialTimeline
                              title="ریز دریافت‌های نقدی این چک"
                              subtitle="دریافت‌های جایگزین چک برگشتی یا عودت‌شده، از جدیدترین به قدیمی‌ترین"
                              eyebrow="تایم‌لاین وصول چک"
                              iconClass="fa-solid fa-money-check-dollar"
                              countLabel={`${cashTransactions.length.toLocaleString('fa-IR')} ثبت`}
                              empty={cashTransactions.length === 0}
                              emptyTitle="دریافت نقدی جایگزینی ثبت نشده است"
                              emptyDescription="اگر چک برگشتی یا عودت‌شده باشد، دریافت‌های نقدی جایگزین در این تاریخچه ثبت می‌شوند."
                              onRefresh={() => void fetchInstallmentSaleDetail()}
                              refreshing={isLoading}
                              compact
                              tone={cashRemaining > 0 ? 'warning' : 'success'}
                            >
                              <div className="space-y-2.5">
                                {[...cashTransactions]
                                  .sort((a: any, b: any) => String(b.payment_date || b.paymentDate || '').localeCompare(String(a.payment_date || a.paymentDate || '')))
                                  .map((tx: any, index: number, source: any[]) => {
                                    const decoratedTx = {
                                      ...tx,
                                      id: tx.id ?? `check-${checkId}-cash-${index}`,
                                      paymentId: (check as any).cashPaymentId,
                                      dueDate: check.dueDate,
                                      checkNumber: check.checkNumber,
                                      sourceType: 'check_recovery',
                                    };
                                    return (
                                      <FinancialTimelineEntry key={decoratedTx.id} marker={source.length - index} markerTone="warning" isLast={index === source.length - 1} compact>
                                        <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                                          <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 text-xs font-black text-slate-900 dark:text-slate-50">
                                              <span className="whitespace-nowrap tabular-nums">{formatPrice(tx.amount_paid ?? tx.amountPaid)}</span>
                                              <span className="text-slate-400">•</span>
                                              <span className="whitespace-nowrap tabular-nums">{toShamsiSafe(tx.payment_date || tx.paymentDate)}</span>
                                            </div>
                                            <div className="mt-1 break-words text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">{tx.notes || 'بدون یادداشت تکمیلی'}</div>
                                          </div>
                                          <TableActionGroup
                                            ariaLabel="عملیات دریافت نقدی چک"
                                            collapseBelow="sm"
                                            align="end"
                                            actions={[
                                              { key: 'edit', kind: 'button', label: 'ویرایش پرداخت', icon: <i className="fa-solid fa-pen" aria-hidden="true" />, variant: 'warning', onClick: () => openEditTx(decoratedTx) },
                                              { key: 'delete', kind: 'button', label: 'حذف پرداخت', icon: <i className="fa-solid fa-trash" aria-hidden="true" />, variant: 'danger', onClick: () => openDeleteTx(decoratedTx) },
                                            ]}
                                          />
                                        </div>
                                      </FinancialTimelineEntry>
                                    );
                                  })}
                              </div>
                            </FinancialTimeline>
                          </div>
                        ) : null}
                      </PanelCard>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        if (tab === 'ledger') {
          // Flatten transactions
          const txs: any[] = [];
          for (const p of payments) {
            for (const tx of (p as any).transactions || []) {
              txs.push({
                ...tx,
                installmentNumber: p.installmentNumber,
                paymentId: p.id,
                dueDate: p.dueDate,
                sourceType: 'installment',
              });
            }
          }
          for (const check of saleData.checks || []) {
            for (const tx of (check as any).cashTransactions || []) {
              txs.push({
                ...tx,
                paymentId: (check as any).cashPaymentId,
                dueDate: check.dueDate,
                checkNumber: check.checkNumber,
                sourceType: 'check_recovery',
              });
            }
            const cashedLedgerAmount = toNumber((check as any).cashedLedgerAmount);
            if (cashedLedgerAmount > 0.00001) {
              txs.push({
                id: `check-cashed-${check.id}`,
                amount_paid: cashedLedgerAmount,
                payment_date: (check as any).cashedLedgerDate,
                dueDate: check.dueDate,
                checkNumber: check.checkNumber,
                sourceType: 'check_cashed',
                readOnly: true,
              });
            }
          }
          txs.sort((a, b) => String(b.payment_date || b.paymentDate || '').localeCompare(String(a.payment_date || a.paymentDate || '')));

          const groups: Record<string, any[]> = {};
          for (const t of txs) {
            const d = toShamsiSafe(t.payment_date || t.paymentDate);
            groups[d] = groups[d] || [];
            groups[d].push(t);
          }
          const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
          const totalReceived = txs.reduce((sum, tx) => sum + toNumber(tx.amount_paid ?? tx.amountPaid), 0);
          const installmentReceiptCount = txs.filter((tx) => tx.sourceType === 'installment').length;
          const checkReceiptCount = txs.filter((tx) => tx.sourceType === 'check_recovery' || tx.sourceType === 'check_cashed').length;
          const latestPaymentDate = txs.length > 0 ? toShamsiSafe(txs[0].payment_date || txs[0].paymentDate) : '—';

          return (
            <div className="mx-auto max-w-7xl space-y-4">
              <PanelCard
                title="پرداخت‌ها"
                subtitle="تاریخچه یکپارچه دریافت‌های اقساط و وصول چک‌های این پرونده"
                icon={<i className="fa-solid fa-receipt" aria-hidden="true" />}
                tone="info"
                density="compact"
                actions={<FinancialStatusBadge label={`${txs.length.toLocaleString('fa-IR')} ثبت`} tone="neutral" size="sm" />}
              >
                <div className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                      <i className="fa-solid fa-coins shrink-0 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
                      <span>جمع دریافت‌ها</span>
                    </div>
                    <div className="mt-1.5 whitespace-nowrap text-base font-black tabular-nums text-emerald-700 dark:text-emerald-300">{formatPrice(totalReceived)}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                      <i className="fa-solid fa-receipt shrink-0" aria-hidden="true" />
                      <span>دریافت اقساط</span>
                    </div>
                    <div className="mt-1.5 whitespace-nowrap text-base font-black tabular-nums text-slate-900 dark:text-slate-50">{installmentReceiptCount.toLocaleString('fa-IR')} ثبت</div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                      <i className="fa-solid fa-money-check-dollar shrink-0" aria-hidden="true" />
                      <span>وصول چک</span>
                    </div>
                    <div className="mt-1.5 whitespace-nowrap text-base font-black tabular-nums text-slate-900 dark:text-slate-50">{checkReceiptCount.toLocaleString('fa-IR')} ثبت</div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                      <i className="fa-regular fa-calendar shrink-0" aria-hidden="true" />
                      <span>آخرین دریافت</span>
                    </div>
                    <div className="mt-1.5 whitespace-nowrap text-base font-black tabular-nums text-slate-900 dark:text-slate-50">{latestPaymentDate}</div>
                  </div>
                </div>
              </PanelCard>

              <FinancialTimeline
                title="تاریخچه دریافت‌ها"
                subtitle="دریافت‌های اقساط، وصول نقدی جایگزین و چک‌های پاس‌شده در یک الگوی مالی واحد"
                eyebrow="تایم‌لاین پرونده اقساط"
                iconClass="fa-solid fa-receipt"
                countLabel={`${txs.length.toLocaleString('fa-IR')} ثبت`}
                empty={txs.length === 0}
                emptyTitle="هنوز پرداختی ثبت نشده است"
                emptyDescription="بعد از ثبت اولین پرداخت، تاریخچه دریافت‌ها در این بخش نمایش داده می‌شود."
                onRefresh={() => void fetchInstallmentSaleDetail()}
                refreshing={isLoading}
                tone="info"
              >
                <div className="space-y-5">
                  {dates.map((d) => {
                    const items = groups[d];
                    const dayTotal = items.reduce((sum, t) => sum + toNumber(t.amount_paid ?? t.amountPaid), 0);
                    return (
                      <section key={d} className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <i className="fa-regular fa-calendar text-slate-400" aria-hidden="true" />
                            <strong className="whitespace-nowrap text-xs font-black text-slate-900 dark:text-slate-50">{d}</strong>
                            <span className="text-[10px] font-bold text-slate-400">{items.length.toLocaleString('fa-IR')} دریافت</span>
                          </div>
                          <div className="whitespace-nowrap text-xs font-black tabular-nums text-slate-900 dark:text-slate-50">{formatPrice(dayTotal)}</div>
                        </div>

                        <div className="space-y-2.5">
                          {items.map((t, index) => {
                            const meta = getTransactionPresentation(t);
                            return (
                              <FinancialTimelineEntry
                                key={t.id}
                                marker={<i className={meta.icon} aria-hidden="true" />}
                                markerTone={meta.tone === 'success' ? 'success' : meta.tone === 'warning' ? 'warning' : meta.tone === 'danger' ? 'danger' : 'info'}
                                isLast={index === items.length - 1}
                                compact
                              >
                                <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center lg:grid-cols-[minmax(0,1.35fr)_minmax(11rem,.65fr)_auto]">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="truncate text-sm font-black text-slate-950 dark:text-slate-50" title={meta.title}>{meta.title}</span>
                                      <FinancialStatusBadge label={meta.badge} tone={meta.tone} size="xs" />
                                    </div>
                                    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                      <span className="whitespace-nowrap">سررسید: {toShamsiSafe(t.dueDate)}</span>
                                      {t.notes ? <span className="min-w-0 break-words">• {t.notes}</span> : <span>• بدون یادداشت</span>}
                                    </div>
                                  </div>
                                  <div className="min-w-0 text-right sm:text-left lg:text-right">
                                    <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400">مبلغ دریافت</div>
                                    <div className="mt-1 whitespace-nowrap text-sm font-black tabular-nums text-slate-950 dark:text-slate-50">{formatPrice(t.amount_paid ?? t.amountPaid)}</div>
                                  </div>
                                  <div className="sm:col-span-2 lg:col-span-1">
                                    {t.readOnly ? (
                                      <FinancialStatusBadge label="ثبت سیستمی" tone="success" icon="fa-solid fa-lock" size="xs" />
                                    ) : (
                                      <TableActionGroup
                                        ariaLabel="عملیات پرداخت"
                                        collapseBelow="sm"
                                        align="end"
                                        actions={[
                                          { key: 'edit', kind: 'button', label: 'ویرایش پرداخت', icon: <i className="fa-solid fa-pen" aria-hidden="true" />, variant: 'warning', onClick: () => openEditTx(t) },
                                          { key: 'delete', kind: 'button', label: 'حذف پرداخت', icon: <i className="fa-solid fa-trash" aria-hidden="true" />, variant: 'danger', onClick: () => openDeleteTx(t) },
                                        ]}
                                      />
                                    )}
                                  </div>
                                </div>
                              </FinancialTimelineEntry>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </FinancialTimeline>
            </div>
          );
        }

        // installments tab (default)
        const settledInstallments = payments.filter((p) => p.status === 'پرداخت شده').length;
        const partialInstallments = payments.filter((p) => p.status === 'پرداخت جزئی').length;
        const overdueInstallments = payments.filter((p) => p.status !== 'پرداخت شده' && isOverdue(p.dueDate, p.status)).length;
        const openInstallments = Math.max(0, payments.length - settledInstallments);

        return (
          <div className="mx-auto max-w-7xl space-y-4">
            <PanelCard
              title="برنامه اقساط و وضعیت پرداخت"
              subtitle="سررسید، مانده و ریزدریافت هر قسط در یک نمای واحد و قابل پیگیری"
              icon={<i className="fa-solid fa-calendar-check" aria-hidden="true" />}
              tone={overdueInstallments > 0 ? 'warning' : 'info'}
              density="compact"
              actions={<FinancialStatusBadge label={`مانده کل: ${formatPrice(remaining)}`} tone={remaining > 0 ? 'warning' : 'success'} size="sm" />}
            >
              <div className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                    <i className="fa-solid fa-list-ol shrink-0" aria-hidden="true" />
                    <span>تعداد اقساط</span>
                  </div>
                  <div className="mt-1.5 whitespace-nowrap text-base font-black tabular-nums text-slate-900 dark:text-slate-50">{payments.length.toLocaleString('fa-IR')}</div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                    <i className="fa-solid fa-circle-check shrink-0 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
                    <span>تسویه‌شده</span>
                  </div>
                  <div className="mt-1.5 whitespace-nowrap text-base font-black tabular-nums text-emerald-700 dark:text-emerald-300">{settledInstallments.toLocaleString('fa-IR')}</div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                    <i className="fa-solid fa-hourglass-half shrink-0 text-sky-600 dark:text-sky-300" aria-hidden="true" />
                    <span>باز / جزئی</span>
                  </div>
                  <div className="mt-1.5 whitespace-nowrap text-base font-black tabular-nums text-slate-900 dark:text-slate-50">{openInstallments.toLocaleString('fa-IR')} <span className="text-xs font-bold text-slate-400">({partialInstallments.toLocaleString('fa-IR')} جزئی)</span></div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                    <i className="fa-solid fa-triangle-exclamation shrink-0 text-rose-600 dark:text-rose-300" aria-hidden="true" />
                    <span>معوق</span>
                  </div>
                  <div className={`mt-1.5 whitespace-nowrap text-base font-black tabular-nums ${overdueInstallments > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-900 dark:text-slate-50'}`}>{overdueInstallments.toLocaleString('fa-IR')}</div>
                </div>
              </div>
            </PanelCard>

            {payments.length === 0 ? (
              <EmptyState
                title="برنامه قسطی برای این پرونده ثبت نشده است"
                description="در صورت وجود اقساط، سررسید و عملیات پرداخت هر قسط در این قسمت نمایش داده می‌شود."
                icon={<i className="fa-solid fa-calendar-check" aria-hidden="true" />}
              />
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {payments.map((p) => {
                  const paymentId = Number(p.id);
                  if (!paymentId) return null;
                  const isExp = expanded.has(paymentId);
                  const paid = getTotalPaid(p);
                  const remain = Math.max(0, toNumber(p.amountDue) - paid);
                  const progress = toNumber(p.amountDue) > 0 ? Math.min(100, Math.max(0, (paid / toNumber(p.amountDue)) * 100)) : 0;
                  const progressPercent = Math.round(progress);
                  const dueMeta = getPaymentDueMeta(p);
                  const tone = p.status === 'پرداخت شده' ? 'emerald' : isOverdue(p.dueDate, p.status) ? 'rose' : p.status === 'پرداخت جزئی' ? 'sky' : 'amber';
                  const panelTone = p.status === 'پرداخت شده' ? 'success' as const : isOverdue(p.dueDate, p.status) ? 'danger' as const : p.status === 'پرداخت جزئی' ? 'info' as const : 'warning' as const;
                  const transactions: any[] = (p as any).transactions || [];
                  const visibleStatus = p.status === 'پرداخت نشده' && isOverdue(p.dueDate, p.status) ? 'معوق' : p.status;
                  const visibleStatusTone = p.status === 'پرداخت شده' ? 'success' : p.status === 'پرداخت جزئی' ? 'info' : isOverdue(p.dueDate, p.status) ? 'danger' : 'warning';

                  return (
                    <div
                      id={`payment-row-${paymentId}`}
                      key={paymentId}
                      className={paymentId === highlightedPaymentId ? 'rounded-[24px] ring-4 ring-sky-100 dark:ring-sky-950/40' : undefined}
                    >
                      <PanelCard
                        title={`قسط ${p.installmentNumber.toLocaleString('fa-IR')}`}
                        subtitle={
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                              <i className="fa-regular fa-calendar" aria-hidden="true" />
                              سررسید {formatIsoToShamsi(p.dueDate)}
                            </span>
                            <FinancialStatusBadge label={dueMeta.label} tone={dueMeta.tone === 'neutral' ? 'neutral' : dueMeta.tone} size="xs" />
                          </div>
                        }
                        icon={<i className="fa-solid fa-receipt" aria-hidden="true" />}
                        tone={panelTone}
                        density="compact"
                        actions={<FinancialStatusBadge label={visibleStatus} tone={visibleStatusTone} size="sm" />}
                      >
                        <div className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-3">
                          <div className="min-w-0">
                            <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400">مبلغ قسط</div>
                            <div className="mt-1 whitespace-nowrap text-sm font-black tabular-nums text-slate-950 dark:text-slate-50">{formatPrice(p.amountDue)}</div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400">پرداخت‌شده</div>
                            <div className="mt-1 whitespace-nowrap text-sm font-black tabular-nums text-emerald-700 dark:text-emerald-300">{formatPrice(paid)}</div>
                            {toNumber((p as any).externalCovered) > 0.00001 ? (
                              <div className="mt-1 text-[10px] font-semibold leading-5 text-slate-500 dark:text-slate-400">
                                شامل {formatPrice((p as any).externalCovered)} پوشش از وصول چک
                              </div>
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400">مانده قابل دریافت</div>
                            <div className={`mt-1 whitespace-nowrap text-sm font-black tabular-nums ${remain > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{formatPrice(remain)}</div>
                          </div>
                        </div>

                        <FinancialProgressBar
                          className="mt-4"
                          value={progressPercent}
                          label={`${progressPercent.toLocaleString('fa-IR')}٪ وصول شده`}
                          tone={tone === 'emerald' ? 'emerald' : tone === 'rose' ? 'rose' : tone === 'sky' ? 'sky' : 'amber'}
                          ariaLabel={`درصد پرداخت قسط ${p.installmentNumber}`}
                        />

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-3 dark:border-slate-800">
                          <Button
                            onClick={() => {
                              const next = new Set(expanded);
                              next.has(paymentId) ? next.delete(paymentId) : next.add(paymentId);
                              setExpanded(next);
                            }}
                            variant="secondary"
                            size="xs"
                            leftIcon={<i className={`fa-solid ${isExp ? 'fa-chevron-up' : 'fa-chevron-down'}`} />}
                          >
                            {isExp ? 'بستن ریزپرداخت' : `ریزپرداخت (${transactions.length.toLocaleString('fa-IR')})`}
                          </Button>

                          {!isCanceled && p.status !== 'پرداخت شده' ? (
                            <Button onClick={() => openPaymentModal(p)} variant="success" size="xs" leftIcon={<i className="fa-solid fa-plus" />}>
                              ثبت پرداخت
                            </Button>
                          ) : (
                            <FinancialStatusBadge label="تسویه کامل" tone="success" icon="fa-solid fa-circle-check" size="sm" />
                          )}
                        </div>

                        {isExp ? (
                          <div className="mt-3 border-t border-slate-200/80 pt-3 dark:border-slate-800">
                            <FinancialTimeline
                              title="ریز دریافت‌های این قسط"
                              subtitle="مبلغ، تاریخ و توضیح هر دریافت بدون خروج از برنامه اقساط"
                              eyebrow="تایم‌لاین دریافت قسط"
                              iconClass="fa-solid fa-file-invoice-dollar"
                              countLabel={`${transactions.length.toLocaleString('fa-IR')} ثبت`}
                              empty={transactions.length === 0}
                              emptyTitle="هنوز دریافتی برای این قسط ثبت نشده است"
                              emptyDescription="بعد از ثبت اولین دریافت، ریز پرداخت‌های همین قسط اینجا نمایش داده می‌شود."
                              onRefresh={() => void fetchInstallmentSaleDetail()}
                              refreshing={isLoading}
                              compact
                              tone={remain > 0 ? 'warning' : 'success'}
                            >
                              <div className="space-y-2.5">
                                {transactions.map((tx: any, index: number) => {
                                  const decoratedTx = { ...tx, paymentId: p.id, installmentNumber: p.installmentNumber, dueDate: p.dueDate, sourceType: 'installment' };
                                  return (
                                    <FinancialTimelineEntry key={tx.id} marker={transactions.length - index} markerTone="success" isLast={index === transactions.length - 1} compact>
                                      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                                        <div className="min-w-0">
                                          <div className="flex flex-wrap items-center gap-2 text-xs font-black text-slate-900 dark:text-slate-50">
                                            <span className="whitespace-nowrap tabular-nums">{formatPrice(tx.amount_paid)}</span>
                                            <span className="text-slate-400">•</span>
                                            <span className="whitespace-nowrap tabular-nums">{toShamsiSafe(tx.payment_date)}</span>
                                          </div>
                                          <div className="mt-1 break-words text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">{tx.notes || 'بدون یادداشت تکمیلی'}</div>
                                        </div>
                                        <TableActionGroup
                                          ariaLabel="عملیات پرداخت"
                                          collapseBelow="sm"
                                          align="end"
                                          actions={[
                                            { key: 'edit', kind: 'button', label: 'ویرایش پرداخت', icon: <i className="fa-solid fa-pen" aria-hidden="true" />, variant: 'warning', onClick: () => openEditTx(decoratedTx) },
                                            { key: 'delete', kind: 'button', label: 'حذف پرداخت', icon: <i className="fa-solid fa-trash" aria-hidden="true" />, variant: 'danger', onClick: () => openDeleteTx(decoratedTx) },
                                          ]}
                                        />
                                      </div>
                                    </FinancialTimelineEntry>
                                  );
                                })}
                              </div>
                            </FinancialTimeline>
                          </div>
                        ) : null}
                      </PanelCard>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );      })()}

      {/* Quick Payment Summary */}
      {isQuickPaymentSummaryOpen && currentPayment && (() => {
        const remaining = getPaymentRemaining(currentPayment);
        const dueMeta = getPaymentDueMeta(currentPayment);
        return (
          <Modal
            title="خلاصه پرداخت سریع"
            onClose={() => setIsQuickPaymentSummaryOpen(false)}
            widthClass="max-w-4xl"
            iconClass="fa-solid fa-bolt"
            layout="horizontal"
            ariaDescription="مرور قسط بعدی و مانده قابل پرداخت قبل از ورود به فرم ثبت پرداخت"
          >
            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]" dir="rtl">
              <PanelCard
                title={`قسط شماره ${currentPayment.installmentNumber.toLocaleString('fa-IR')}`}
                subtitle="قسط بعدی پرداخت‌نشده این پرونده"
                icon={<i className="fa-solid fa-file-invoice-dollar" aria-hidden="true" />}
                tone={dueMeta.tone === 'danger' ? 'danger' : dueMeta.tone === 'warning' ? 'warning' : dueMeta.tone === 'success' ? 'success' : 'info'}
                density="compact"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <FinancialStatusBadge
                    label={dueMeta.label}
                    tone={dueMeta.tone === 'neutral' ? 'neutral' : dueMeta.tone}
                    icon="fa-solid fa-calendar-check"
                    size="sm"
                  />
                </div>
                <p className="mt-3 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">
                  قبل از ثبت، مبلغ و سررسید را بررسی کن؛ ادامه عملیات همان فرم استاندارد ثبت پرداخت را باز می‌کند.
                </p>
              </PanelCard>

              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <PanelCard variant="metric" title="سررسید" metricValue={toShamsiSafe(currentPayment.dueDate)} metricHint="تاریخ قسط" tone="neutral" icon={<i className="fa-regular fa-calendar" aria-hidden="true" />} density="compact" />
                <PanelCard variant="metric" title="مبلغ قسط" metricValue={formatPrice(currentPayment.amountDue)} metricHint="مبلغ ثبت‌شده" tone="neutral" icon={<i className="fa-solid fa-sack-dollar" aria-hidden="true" />} density="compact" />
                <PanelCard variant="metric" title="پرداخت‌شده" metricValue={formatPrice(getTotalPaid(currentPayment))} metricHint="وصول تا این لحظه" tone="success" icon={<i className="fa-solid fa-coins" aria-hidden="true" />} density="compact" />
                <PanelCard variant="metric" title="پرداخت پیشنهادی" metricValue={formatPrice(remaining)} metricHint="مانده قابل پرداخت" tone={remaining > 0 ? 'warning' : 'success'} icon={<i className="fa-solid fa-hand-holding-dollar" aria-hidden="true" />} density="compact" />
              </div>
            </div>

            <DialogActions
              onCancel={() => setIsQuickPaymentSummaryOpen(false)}
              cancelText="انصراف"
              submitText="ادامه و ثبت پرداخت"
              submitType="button"
              onSubmitClick={continueFromQuickPaymentSummary}
              submitDisabled={remaining <= 0}
              submitVariant="success"
              submitIconClass="fa-solid fa-arrow-left"
              align="end"
            />
          </Modal>
        );
      })()}

      {/* Payment Modal */}
      {isPaymentModalOpen && currentPayment && (
        <Modal
          title={`ثبت پرداخت قسط شماره ${currentPayment.installmentNumber.toLocaleString('fa-IR')}`}
          onClose={() => setIsPaymentModalOpen(false)}
          widthClass="max-w-6xl"
          iconClass="fa-solid fa-wallet"
          variant="expansive"
          layout="horizontal"
          ariaDescription="ثبت مبلغ، تاریخ و توضیح پرداخت با نمایش هم‌زمان مانده و تاریخچه قسط"
        >
          <form onSubmit={handleSubmitPartialPayment} className="min-w-0 space-y-3 text-sm" dir="rtl">
            <PanelCard
              title={`قسط شماره ${currentPayment.installmentNumber.toLocaleString('fa-IR')}`}
              subtitle="خلاصه وضعیت قسط قبل از ثبت پرداخت جدید"
              icon={<i className="fa-solid fa-file-invoice-dollar" aria-hidden="true" />}
              actions={<FinancialStatusBadge label={currentPayment.status || 'فعال'} tone={currentPayment.status === 'پرداخت شده' ? 'success' : currentPayment.status === 'پرداخت جزئی' ? 'info' : 'warning'} size="sm" />}
              density="compact"
              bodyClassName="pt-3"
            >
              <div className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 md:grid-cols-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                    <i className="fa-solid fa-sack-dollar shrink-0" aria-hidden="true" />
                    <span>مبلغ کل قسط</span>
                  </div>
                  <div className="mt-1.5 whitespace-nowrap text-lg font-black tabular-nums text-slate-900 dark:text-slate-50">
                    {formatPrice(currentPayment.amountDue)}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                    <i className="fa-solid fa-coins shrink-0 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
                    <span>پرداخت‌شده</span>
                  </div>
                  <div className="mt-1.5 whitespace-nowrap text-lg font-black tabular-nums text-emerald-700 dark:text-emerald-300">
                    {formatPrice(getTotalPaid(currentPayment))}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                    <i className="fa-regular fa-clipboard shrink-0 text-amber-600 dark:text-amber-300" aria-hidden="true" />
                    <span>مانده قابل دریافت</span>
                  </div>
                  <div className="mt-1.5 whitespace-nowrap text-lg font-black tabular-nums text-amber-700 dark:text-amber-300">
                    {formatPrice(getPaymentRemaining(currentPayment))}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                    <i className="fa-regular fa-calendar shrink-0" aria-hidden="true" />
                    <span>سررسید قسط</span>
                  </div>
                  <div className="mt-1.5 whitespace-nowrap text-lg font-black tabular-nums text-slate-900 dark:text-slate-50">
                    {toShamsiSafe(currentPayment.dueDate)}
                  </div>
                </div>
              </div>
            </PanelCard>

            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(19rem,0.8fr)]">
              <PanelCard
                title="ثبت پرداخت جدید"
                subtitle="مبلغ، تاریخ و توضیح را وارد کن؛ مانده قسط و دفتر مشتری هم‌زمان به‌روزرسانی می‌شوند."
                icon={<i className="fa-solid fa-plus" aria-hidden="true" />}
                tone="success"
                density="compact"
              >
                <div className="grid min-w-0 gap-4 md:grid-cols-2">
                  <ModalField
                    label="مبلغ پرداختی جدید"
                    iconClass="fa-solid fa-coins"
                    required
                    hint={`مانده فعلی: ${formatPrice(getPaymentRemaining(currentPayment))}`}
                  >
                    <PriceInput
                      id="paymentAmount"
                      name="paymentAmount"
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(e.target.value)}
                      preview="مثلاً ۵,۰۰۰,۰۰۰"
                      topLabel=""
                      suffix=""
                      required
                      showWords={false}
                    />
                  </ModalField>

                  <ModalField label="تاریخ پرداخت" iconClass="fa-solid fa-calendar-day" required>
                    <ShamsiDatePicker id="paymentDate" selectedDate={paymentDate} onDateChange={setPaymentDate} size="compact" />
                  </ModalField>

                  <ModalField label="یادداشت اختیاری" iconClass="fa-solid fa-note-sticky" className="md:col-span-2">
                    <TextField
                      id="paymentNotes"
                      name="paymentNotes"
                      value={paymentNotes}
                      onChange={e => setPaymentNotes(e.target.value)}
                      placeholder="مثلاً پرداخت کارت‌خوان، واریز بانکی یا تسویه بخشی از قسط"
                    />
                  </ModalField>
                </div>

                <div className="mt-4 flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-4 dark:border-slate-800">
                  <div className="flex min-w-0 items-center gap-2 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                    <i className="fa-solid fa-calculator shrink-0 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
                    <span>مانده پس از این پرداخت</span>
                  </div>
                  <div className="whitespace-nowrap text-lg font-black tabular-nums text-emerald-700 dark:text-emerald-300">
                    {formatPrice(Math.max(0, toNumber(currentPayment.amountDue) - getTotalPaid(currentPayment) - toNumber(paymentAmount)))}
                  </div>
                </div>
              </PanelCard>

              <PanelCard
                title="تاریخچه پرداخت‌ها"
                subtitle="ریز پرداخت‌های ثبت‌شده برای همین قسط"
                icon={<i className="fa-regular fa-clock" aria-hidden="true" />}
                actions={<FinancialStatusBadge label={`${(currentPayment.transactions?.length || 0).toLocaleString('fa-IR')} ثبت`} tone="neutral" size="xs" />}
                density="compact"
                bodyClassName="min-h-0"
              >
                {currentPayment.transactions && currentPayment.transactions.length > 0 ? (
                  <div className="max-h-[15rem] space-y-2 overflow-y-auto overscroll-contain pe-1">
                    {currentPayment.transactions.map((tx: any) => (
                      <div key={tx.id} className="flex min-w-0 flex-col gap-2 rounded-2xl bg-slate-50 p-3 dark:bg-slate-900/55 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-black text-slate-900 dark:text-slate-50">
                            <span className="whitespace-nowrap tabular-nums">{formatPrice(tx.amount_paid)}</span>
                            <span className="text-slate-400">•</span>
                            <span className="whitespace-nowrap tabular-nums">{toShamsiSafe(tx.payment_date)}</span>
                          </div>
                          <div className="mt-1 break-words text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">{tx.notes || 'بدون یادداشت تکمیلی'}</div>
                        </div>
                        <TableActionGroup
                          ariaLabel="عملیات سابقه پرداخت"
                          collapseBelow="xl"
                          align="end"
                          actions={[
                            { key: 'edit', kind: 'button', label: 'ویرایش اطلاعات', icon: <i className="fa-solid fa-pen" aria-hidden="true" />, variant: 'warning', onClick: () => openEditTx(tx) },
                            { key: 'delete', kind: 'button', label: 'حذف مورد', icon: <i className="fa-solid fa-trash" aria-hidden="true" />, variant: 'danger', onClick: () => openDeleteTx(tx) },
                          ]}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-[9.5rem] flex-col items-center justify-center px-4 text-center">
                    <i className="fa-solid fa-receipt text-xl text-slate-400" aria-hidden="true" />
                    <div className="mt-3 text-sm font-black text-slate-800 dark:text-slate-100">پرداختی ثبت نشده است</div>
                    <p className="mt-1 max-w-xs text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">
                      اولین پرداخت این قسط از فرم کنار ثبت می‌شود.
                    </p>
                  </div>
                )}
              </PanelCard>
            </div>

            <DialogActions
              onCancel={() => setIsPaymentModalOpen(false)}
              cancelText="انصراف"
              submitText="ثبت پرداخت"
              submittingText="در حال ثبت اطلاعات..."
              submitType="submit"
              isSubmitting={isSubmittingPayment}
              submitVariant="success"
              submitIconClass="fa-solid fa-check"
              align="end"
              submitButtonProps={{
                size: 'md',
                loadingHint: paymentStageHint,
                loadingStageStep: paymentStageProgress,
                loadingStageTotal: 3,
                loadingStageIcon: paymentStageIcon,
                successPulseText: 'پرداخت ثبت شد',
                successPulseHint: 'قسط، مانده مشتری و دفتر حساب به‌روزرسانی شد',
                className: 'min-w-[12rem]',
              }}
            />
          </form>
        </Modal>
      )}


      {/* Edit Transaction Modal */}
      {isEditTxModalOpen && editingTx && (() => {
        const originalAmount = toNumber(editingTx.amount_paid ?? editingTx.amountPaid ?? 0);
        const editedAmount = toNumber(editTxAmount);
        const editingPayment = resolveTransactionPayment(editingTx);
        const paidBeforeEdit = editingPayment ? getTotalPaid(editingPayment) : 0;
        const currentRemaining = editingPayment
          ? Math.max(0, toNumber(editingPayment.amountDue) - paidBeforeEdit)
          : null;
        const nextRemaining = editingPayment
          ? Math.max(0, toNumber(editingPayment.amountDue) - (paidBeforeEdit - originalAmount + editedAmount))
          : null;
        const amountDelta = editedAmount - originalAmount;
        const paymentContextLabel = editingTx.sourceType === 'check_recovery'
          ? `وصول نقدی چک ${String(editingTx.checkNumber || '—')}`
          : editingPayment
            ? `قسط شماره ${editingPayment.installmentNumber.toLocaleString('fa-IR')}`
            : 'ریز پرداخت پرونده';
        const customerName = saleData.customerFullName || 'پرونده مشتری';

        return (
          <Modal
            title="ویرایش ریز پرداخت"
            onClose={() => {
              if (isSavingTx) return;
              setIsEditTxModalOpen(false);
              setEditingTx(null);
            }}
            widthClass="max-w-6xl"
            iconClass="fa-solid fa-pen-to-square"
            variant="expansive"
            layout="horizontal"
            ariaDescription="ویرایش مبلغ، تاریخ و توضیح پرداخت با نمایش اثر تغییر روی مانده پرونده"
          >
            <div className="min-w-0 space-y-3 text-sm" dir="rtl">
              <PanelCard
                title="خلاصه پرداخت انتخاب‌شده"
                subtitle="قبل از ذخیره، مقدار فعلی و اثر مبلغ جدید را یک‌جا بررسی کن."
                icon={<i className="fa-solid fa-receipt" aria-hidden="true" />}
                actions={<FinancialStatusBadge label={paymentContextLabel} tone="info" size="sm" />}
                density="compact"
                bodyClassName="pt-3"
              >
                <div className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 md:grid-cols-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                      <i className="fa-solid fa-sack-dollar shrink-0" aria-hidden="true" />
                      <span>مبلغ فعلی</span>
                    </div>
                    <div className="mt-1.5 whitespace-nowrap text-lg font-black tabular-nums text-slate-900 dark:text-slate-50">
                      {formatPrice(originalAmount)}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                      <i className="fa-regular fa-calendar shrink-0" aria-hidden="true" />
                      <span>تاریخ فعلی</span>
                    </div>
                    <div className="mt-1.5 whitespace-nowrap text-lg font-black tabular-nums text-slate-900 dark:text-slate-50">
                      {toShamsiSafe(editingTx.payment_date || editingTx.paymentDate)}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                      <i className="fa-solid fa-user shrink-0 text-sky-600 dark:text-sky-300" aria-hidden="true" />
                      <span>پرونده مشتری</span>
                    </div>
                    <div className="mt-1.5 truncate text-base font-black text-slate-900 dark:text-slate-50" title={customerName}>
                      {customerName}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                      <i className="fa-solid fa-scale-balanced shrink-0 text-amber-600 dark:text-amber-300" aria-hidden="true" />
                      <span>{nextRemaining !== null ? 'مانده پس از ویرایش' : 'تغییر مبلغ'}</span>
                    </div>
                    <div className={`mt-1.5 whitespace-nowrap text-lg font-black tabular-nums ${nextRemaining === 0 || amountDelta <= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                      {nextRemaining !== null ? formatPrice(nextRemaining) : formatPrice(Math.abs(amountDelta))}
                    </div>
                  </div>
                </div>
              </PanelCard>

              <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(19rem,0.8fr)]">
                <PanelCard
                  title="ویرایش اطلاعات پرداخت"
                  subtitle="فقط مواردی را که نیاز به اصلاح دارند تغییر بده."
                  icon={<i className="fa-solid fa-pen-ruler" aria-hidden="true" />}
                  tone="info"
                  density="compact"
                >
                  <div className="grid min-w-0 gap-4 md:grid-cols-2">
                    <ModalField
                      label="مبلغ ویرایش‌شده"
                      iconClass="fa-solid fa-coins"
                      required
                      hint={`مبلغ ثبت‌شده: ${formatPrice(originalAmount)}`}
                    >
                      <PriceInput
                        id="editTxAmount"
                        name="editTxAmount"
                        value={editTxAmount}
                        onChange={e => setEditTxAmount(e.target.value)}
                        preview="مثلاً ۱۰,۵۰۰,۰۰۰"
                        topLabel=""
                        suffix=""
                        showWords={false}
                      />
                    </ModalField>

                    <ModalField label="تاریخ پرداخت" iconClass="fa-solid fa-calendar-day" required>
                      <ShamsiDatePicker id="editTxDate" selectedDate={editTxDate} onDateChange={setEditTxDate} size="compact" />
                    </ModalField>

                    <ModalField label="یادداشت تکمیلی" iconClass="fa-solid fa-note-sticky" className="md:col-span-2">
                      <TextField
                        id="editTxNotes"
                        name="editTxNotes"
                        value={editTxNotes}
                        onChange={e => setEditTxNotes(e.target.value)}
                        placeholder="مثلاً اصلاح مبلغ کارت‌خوان، ثبت واریز دقیق یا توضیح تکمیلی"
                      />
                    </ModalField>
                  </div>
                </PanelCard>

                <PanelCard
                  title="اثر ویرایش"
                  subtitle="تغییرات مالی قبل از ذخیره نهایی"
                  icon={<i className="fa-solid fa-calculator" aria-hidden="true" />}
                  tone={nextRemaining === 0 ? 'success' : 'warning'}
                  density="compact"
                >
                  <div className="space-y-3">
                    <div className="flex min-w-0 items-center justify-between gap-4 border-b border-slate-200/80 pb-3 dark:border-slate-800">
                      <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">مبلغ قبلی</span>
                      <span className="whitespace-nowrap font-black tabular-nums text-slate-900 dark:text-slate-50">{formatPrice(originalAmount)}</span>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-4 border-b border-slate-200/80 pb-3 dark:border-slate-800">
                      <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">مبلغ جدید</span>
                      <span className="whitespace-nowrap font-black tabular-nums text-slate-900 dark:text-slate-50">{formatPrice(editedAmount)}</span>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-4 border-b border-slate-200/80 pb-3 dark:border-slate-800">
                      <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">اختلاف مبلغ</span>
                      <span className={`whitespace-nowrap font-black tabular-nums ${amountDelta > 0 ? 'text-amber-700 dark:text-amber-300' : amountDelta < 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'}`}>
                        {amountDelta === 0 ? 'بدون تغییر' : `${amountDelta > 0 ? '+' : '−'} ${formatPrice(Math.abs(amountDelta))}`}
                      </span>
                    </div>
                    {currentRemaining !== null && nextRemaining !== null ? (
                      <div className="flex min-w-0 items-center justify-between gap-4 pt-1">
                        <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">مانده قسط</span>
                        <div className="text-left">
                          <div className="whitespace-nowrap text-xs font-bold tabular-nums text-slate-400 line-through">{formatPrice(currentRemaining)}</div>
                          <div className={`mt-1 whitespace-nowrap text-lg font-black tabular-nums ${nextRemaining > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                            {formatPrice(nextRemaining)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-1 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">
                        این ریزپرداخت به مسیر وصول چک مرتبط است؛ مانده نهایی پس از ذخیره از دفتر پرونده بازخوانی می‌شود.
                      </div>
                    )}
                  </div>

                  <div className="mt-4 border-t border-slate-200/80 pt-4 text-xs font-semibold leading-6 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <i className="fa-solid fa-circle-info ms-1" aria-hidden="true" />
                    ویرایش این رکورد روی جمع پرداختی و مانده پرونده اثر می‌گذارد؛ تاریخچه اصلی حذف نمی‌شود.
                  </div>
                </PanelCard>
              </div>

              <DialogActions
                onCancel={() => {
                  if (isSavingTx) return;
                  setIsEditTxModalOpen(false);
                  setEditingTx(null);
                }}
                cancelText="انصراف"
                submitText="ذخیره تغییرات"
                submittingText="در حال ذخیره تغییرات..."
                submitType="button"
                onSubmitClick={handleSaveTx}
                isSubmitting={isSavingTx}
                submitVariant="primary"
                submitIconClass="fa-solid fa-floppy-disk"
                align="end"
              />
            </div>
          </Modal>
        );
      })()}

      {/* Delete Transaction Modal */}
      {isDeleteTxModalOpen && deletingTx && (() => {
        const deleteAmount = toNumber(deletingTx.amount_paid ?? deletingTx.amountPaid ?? 0);
        const deletingPayment = resolveTransactionPayment(deletingTx);
        const paidBeforeDelete = deletingPayment ? getTotalPaid(deletingPayment) : 0;
        const currentRemaining = deletingPayment
          ? Math.max(0, toNumber(deletingPayment.amountDue) - paidBeforeDelete)
          : null;
        const remainingAfterDelete = deletingPayment
          ? Math.max(0, toNumber(deletingPayment.amountDue) - Math.max(0, paidBeforeDelete - deleteAmount))
          : null;
        const deleteContextLabel = deletingTx.sourceType === 'check_recovery'
          ? `وصول نقدی چک ${String(deletingTx.checkNumber || '—')}`
          : deletingPayment
            ? `قسط شماره ${deletingPayment.installmentNumber.toLocaleString('fa-IR')}`
            : 'ریز پرداخت پرونده';

        const closeDeleteModal = () => {
          if (isDeletingTx) return;
          setIsDeleteTxModalOpen(false);
          setDeletingTx(null);
        };

        return (
          <Modal
            title="حذف پرداخت"
            onClose={closeDeleteModal}
            widthClass="max-w-4xl"
            iconClass="fa-solid fa-trash-can"
            variant="expansive"
            layout="horizontal"
            ariaDescription="تأیید حذف یک ریزپرداخت با نمایش مبلغ، تاریخ و اثر حذف روی مانده پرونده"
          >
            <div className="min-w-0 space-y-3 text-sm" dir="rtl">
              <PanelCard
                title="پرداخت انتخاب‌شده"
                subtitle="این رکورد را قبل از حذف نهایی بررسی کن."
                icon={<i className="fa-solid fa-receipt" aria-hidden="true" />}
                actions={<FinancialStatusBadge label={deleteContextLabel} tone="danger" size="sm" />}
                density="compact"
                bodyClassName="pt-3"
              >
                <div className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                      <i className="fa-solid fa-sack-dollar shrink-0 text-rose-600 dark:text-rose-300" aria-hidden="true" />
                      <span>مبلغ پرداخت</span>
                    </div>
                    <div className="mt-1.5 whitespace-nowrap text-lg font-black tabular-nums text-slate-900 dark:text-slate-50">{formatPrice(deleteAmount)}</div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                      <i className="fa-regular fa-calendar shrink-0" aria-hidden="true" />
                      <span>تاریخ پرداخت</span>
                    </div>
                    <div className="mt-1.5 whitespace-nowrap text-lg font-black tabular-nums text-slate-900 dark:text-slate-50">{toShamsiSafe(deletingTx.payment_date || deletingTx.paymentDate)}</div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                      <i className="fa-solid fa-scale-balanced shrink-0 text-amber-600 dark:text-amber-300" aria-hidden="true" />
                      <span>{remainingAfterDelete !== null ? 'مانده پس از حذف' : 'اثر حذف'}</span>
                    </div>
                    <div className="mt-1.5 whitespace-nowrap text-lg font-black tabular-nums text-amber-700 dark:text-amber-300">
                      {remainingAfterDelete !== null ? formatPrice(remainingAfterDelete) : 'بازمحاسبه پرونده'}
                    </div>
                  </div>
                </div>
              </PanelCard>

              <PanelCard
                title="اثر حذف روی پرونده"
                subtitle="حذف این ریزپرداخت قابل بازگشت خودکار نیست."
                icon={<i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />}
                tone="danger"
                density="compact"
              >
                {currentRemaining !== null && remainingAfterDelete !== null ? (
                  <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <div className="flex min-w-0 items-center justify-between gap-4 border-b border-slate-200/80 pb-3 sm:border-b-0 sm:border-l sm:pb-0 sm:pl-4 dark:border-slate-800">
                      <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">مانده فعلی قسط</span>
                      <span className="whitespace-nowrap font-black tabular-nums text-slate-900 dark:text-slate-50">{formatPrice(currentRemaining)}</span>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-4">
                      <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">مانده بعد از حذف</span>
                      <span className="whitespace-nowrap text-lg font-black tabular-nums text-rose-700 dark:text-rose-300">{formatPrice(remainingAfterDelete)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-semibold leading-6 text-slate-600 dark:text-slate-300">
                    این رکورد به وصول نقدی چک مرتبط است. بعد از حذف، جمع وصول‌ها و مانده پرونده از اطلاعات اصلی دوباره محاسبه می‌شود.
                  </p>
                )}

                <div className="mt-4 border-t border-rose-200/70 pt-4 text-xs font-semibold leading-6 text-rose-700 dark:border-rose-950/60 dark:text-rose-300">
                  <i className="fa-solid fa-circle-exclamation ms-1" aria-hidden="true" />
                  فقط زمانی حذف را تأیید کن که این دریافت واقعاً اشتباه ثبت شده باشد. در غیر این صورت از «ویرایش پرداخت» استفاده کن تا سابقه مالی پرونده دقیق بماند.
                </div>
              </PanelCard>

              <DialogActions
                onCancel={closeDeleteModal}
                cancelText="انصراف"
                submitText="حذف پرداخت"
                submittingText="در حال حذف پرداخت..."
                submitType="button"
                onSubmitClick={handleDeleteTx}
                isSubmitting={isDeletingTx}
                submitVariant="danger"
                submitIconClass="fa-solid fa-trash-can"
                align="end"
                submitButtonProps={{ className: 'min-w-[11rem]' }}
              />
            </div>
          </Modal>
        );
      })()}

      {/* Check cash recovery modal */}
      {isCheckCashModalOpen && cashCheck && (() => {
        const cashPaid = toNumber((cashCheck as any).cashPaid);
        const cashRemaining = Math.max(0, toNumber((cashCheck as any).cashRemaining ?? cashCheck.amount));
        const afterPayment = Math.max(0, cashRemaining - toNumber(checkCashAmount));
        const statusTone = cashCheck.status === 'نقد شد' ? 'success' : cashCheck.status === 'برگشت خورد' ? 'danger' : cashCheck.status === 'به مشتری برگشت داده شده' ? 'warning' : cashCheck.status === 'در جریان وصول' ? 'info' : 'neutral';
        return (
          <Modal
            title={`ثبت دریافت نقدی چک شماره ${cashCheck.checkNumber}`}
            onClose={() => setIsCheckCashModalOpen(false)}
            widthClass="max-w-5xl"
            iconClass="fa-solid fa-hand-holding-dollar"
            variant="expansive"
            layout="horizontal"
            ariaDescription="ثبت دریافت نقدی جایگزین برای چک برگشتی یا عودت‌شده و محاسبه مانده جدید"
          >
            <form onSubmit={handleSubmitCheckCashPayment} className="min-w-0 space-y-4 text-sm" dir="rtl">
              <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(18rem,0.92fr)_minmax(0,1.2fr)]">
                <PanelCard
                  title="خلاصه وضعیت چک"
                  subtitle="مانده نقدی قابل دریافت از این سند"
                  icon={<i className="fa-solid fa-money-check-dollar" aria-hidden="true" />}
                  actions={<FinancialStatusBadge label={cashCheck.status} tone={statusTone} size="sm" />}
                  density="compact"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <PanelCard variant="metric" title="مبلغ چک" metricValue={formatPrice(cashCheck.amount)} metricHint="ارزش اسمی" tone="neutral" icon={<i className="fa-solid fa-sack-dollar" aria-hidden="true" />} density="compact" />
                    <PanelCard variant="metric" title="سررسید" metricValue={formatIsoToShamsi(cashCheck.dueDate)} metricHint="تاریخ وصول" tone="neutral" icon={<i className="fa-regular fa-calendar-check" aria-hidden="true" />} density="compact" />
                    <PanelCard variant="metric" title="دریافت‌شده نقدی" metricValue={formatPrice(cashPaid)} metricHint="وصول جایگزین" tone="success" icon={<i className="fa-solid fa-coins" aria-hidden="true" />} density="compact" />
                    <PanelCard variant="metric" title="مانده قابل دریافت" metricValue={formatPrice(cashRemaining)} metricHint="قبل از ثبت جدید" tone={cashRemaining > 0 ? 'warning' : 'success'} icon={<i className="fa-solid fa-hourglass-half" aria-hidden="true" />} density="compact" />
                  </div>
                </PanelCard>

                <PanelCard
                  title="ثبت دریافت جدید"
                  subtitle="مبلغ و تاریخ دریافت نقدی جایگزین را وارد کن."
                  icon={<i className="fa-solid fa-plus" aria-hidden="true" />}
                  tone="success"
                  density="compact"
                >
                  <div className="grid min-w-0 gap-4 md:grid-cols-2">
                    <ModalField
                      label="مبلغ دریافت نقدی"
                      iconClass="fa-solid fa-coins"
                      required
                      hint={`حداکثر قابل ثبت: ${formatPrice(cashRemaining)}`}
                    >
                      <PriceInput
                        id="checkCashAmount"
                        name="checkCashAmount"
                        value={checkCashAmount}
                        onChange={e => setCheckCashAmount(e.target.value)}
                        preview="مثلاً ۵,۰۰۰,۰۰۰"
                        topLabel=""
                        suffix=""
                        showWords={false}
                        required
                      />
                    </ModalField>

                    <ModalField label="تاریخ دریافت" iconClass="fa-solid fa-calendar-day" required>
                      <ShamsiDatePicker id="checkCashDate" selectedDate={checkCashDate} onDateChange={setCheckCashDate} size="compact" />
                    </ModalField>

                    <ModalField label="توضیحات" iconClass="fa-solid fa-note-sticky" className="md:col-span-2">
                      <TextareaField
                        id="checkCashNotes"
                        name="checkCashNotes"
                        value={checkCashNotes}
                        onChange={e => setCheckCashNotes(e.target.value)}
                        rows={4}
                        placeholder="مثلاً: دریافت مرحله اول بابت چک برگشتی"
                      />
                    </ModalField>
                  </div>

                  <div className="mt-4">
                    <PanelCard variant="metric" title="مانده بعد از این دریافت" metricValue={formatPrice(afterPayment)} metricHint="محاسبه زنده قبل از ثبت" tone={afterPayment > 0 ? 'warning' : 'success'} icon={<i className="fa-solid fa-calculator" aria-hidden="true" />} density="compact" />
                  </div>
                </PanelCard>
              </div>

              <DialogActions
                onCancel={() => setIsCheckCashModalOpen(false)}
                cancelText="انصراف"
                submitText="ثبت دریافت نقدی"
                submittingText="در حال ثبت دریافت..."
                submitType="submit"
                isSubmitting={isSubmittingCheckCash}
                submitDisabled={toNumber(checkCashAmount) <= 0 || toNumber(checkCashAmount) > cashRemaining + 1}
                submitVariant="success"
                submitIconClass="fa-solid fa-floppy-disk"
                align="end"
              />
            </form>
          </Modal>
        );
      })()}

      {/* Check edit modal */}
      {isEditCheckModalOpen && editingCheck && (() => {
        const statusTone = editingCheck.status === 'نقد شد' ? 'success' : editingCheck.status === 'برگشت خورد' ? 'danger' : editingCheck.status === 'به مشتری برگشت داده شده' ? 'warning' : editingCheck.status === 'در جریان وصول' ? 'info' : 'neutral';
        return (
          <Modal
            title={`ویرایش چک شماره ${editingCheck.checkNumber}`}
            onClose={() => {
              setIsEditCheckModalOpen(false);
              setEditCheckErrors({});
            }}
            widthClass="max-w-4xl"
            iconClass="fa-solid fa-money-check"
            variant="operational"
            layout="horizontal"
            ariaDescription="تکمیل مشخصات قراردادی، تاریخ سررسید و وضعیت وصول چک با حفظ مبلغ مالی ثبت‌شده"
          >
            <div className="min-w-0 space-y-4 text-sm" dir="rtl">
              <FormErrorSummary
                errors={editCheckErrors as FormErrors}
                labels={{
                  ownershipType: 'مالک چک',
                  issuerName: 'نام صادرکننده',
                  issuerNationalCode: 'کد ملی صادرکننده',
                  sayadiId: 'شناسه صیادی',
                  checkNumber: 'شماره چک',
                  bankName: 'نام بانک',
                  dueDate: 'تاریخ سررسید',
                }}
                fieldIdMap={{
                  ownershipType: 'editCheckOwnershipType',
                  issuerName: 'editCheckIssuerName',
                  issuerNationalCode: 'editCheckIssuerNationalCode',
                  sayadiId: 'editCheckSayadiId',
                  checkNumber: 'editCheckNumber',
                  bankName: 'editCheckBankName',
                  dueDate: 'editCheckDueDate',
                }}
              />

              <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(17rem,0.85fr)]">
                <PanelCard
                  title="اطلاعات چک و صادرکننده"
                  subtitle="اطلاعات ناقص رکوردهای قبلی را همین‌جا تکمیل یا اصلاح کنید."
                  icon={<i className="fa-solid fa-money-check-dollar" aria-hidden="true" />}
                  actions={<FinancialStatusBadge label={editingCheck.status || 'بدون وضعیت'} tone={statusTone} size="sm" />}
                  density="compact"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ModalField
                      label="مالک چک"
                      iconClass="fa-solid fa-user-check"
                      required
                      error={editCheckErrors.ownershipType}
                      hint="با تغییر این گزینه، نسخه حقوقی قرارداد چاپی نیز تغییر می‌کند."
                      className="sm:col-span-2"
                    >
                      <SelectField
                        id="editCheckOwnershipType"
                        name="ownershipType"
                        value={editingCheck.ownershipType || ''}
                        onChange={handleEditCheckChange}
                      >
                        <option value="buyer">چک متعلق به خود خریدار است</option>
                        <option value="third_party">چک متعلق به شخص ثالث است</option>
                      </SelectField>
                    </ModalField>
                    <ModalField label="نام و نام خانوادگی صادرکننده" iconClass="fa-solid fa-user" required error={editCheckErrors.issuerName}>
                      <TextField id="editCheckIssuerName" name="issuerName" value={editingCheck.issuerName || ''} onChange={handleEditCheckChange} autoComplete="off" />
                    </ModalField>
                    <ModalField label="کد ملی صادرکننده" iconClass="fa-solid fa-id-card" required error={editCheckErrors.issuerNationalCode}>
                      <TextField id="editCheckIssuerNationalCode" name="issuerNationalCode" value={editingCheck.issuerNationalCode || ''} onChange={handleEditCheckChange} inputMode="numeric" dir="ltr" maxLength={10} autoComplete="off" />
                    </ModalField>
                    <ModalField label="شناسه صیادی" iconClass="fa-solid fa-barcode" required error={editCheckErrors.sayadiId}>
                      <TextField id="editCheckSayadiId" name="sayadiId" value={editingCheck.sayadiId || ''} onChange={handleEditCheckChange} inputMode="numeric" dir="ltr" maxLength={16} autoComplete="off" />
                    </ModalField>
                    <ModalField label="شماره چک" iconClass="fa-solid fa-hashtag" required error={editCheckErrors.checkNumber}>
                      <TextField id="editCheckNumber" name="checkNumber" value={editingCheck.checkNumber || ''} onChange={handleEditCheckChange} autoComplete="off" />
                    </ModalField>
                    <ModalField label="نام بانک" iconClass="fa-solid fa-building-columns" required error={editCheckErrors.bankName} className="sm:col-span-2">
                      <TextField id="editCheckBankName" name="bankName" value={editingCheck.bankName || ''} onChange={handleEditCheckChange} autoComplete="off" />
                    </ModalField>
                  </div>
                </PanelCard>

                <PanelCard
                  title="سررسید و وضعیت وصول"
                  subtitle="مبلغ چک یک سند مالی تثبیت‌شده است؛ تاریخ و وضعیت قابل اصلاح‌اند."
                  icon={<i className="fa-solid fa-list-check" aria-hidden="true" />}
                  tone={statusTone === 'danger' ? 'danger' : statusTone === 'warning' ? 'warning' : statusTone === 'success' ? 'success' : 'info'}
                  density="compact"
                >
                  <div className="space-y-3">
                    <PanelCard
                      variant="metric"
                      title="مبلغ ثبت‌شده چک"
                      metricValue={formatPrice(editingCheck.amount)}
                      metricHint="برای حفظ سازگاری قرارداد و دفتر حساب قابل ویرایش نیست."
                      tone="neutral"
                      icon={<i className="fa-solid fa-sack-dollar" aria-hidden="true" />}
                      density="compact"
                    />

                    <ModalField label="تاریخ سررسید" required error={editCheckErrors.dueDate}>
                      <ShamsiDatePicker
                        id="editCheckDueDate"
                        selectedDate={editingCheckDueDate}
                        onDateChange={(date) => {
                          setEditingCheckDueDate(date);
                          clearEditCheckError('dueDate');
                        }}
                        invalid={Boolean(editCheckErrors.dueDate)}
                        size="standard"
                      />
                    </ModalField>

                  <ModalField
                    label="وضعیت جدید چک"
                    iconClass="fa-solid fa-list-check"
                    required
                    hint="برای چک برگشتی یا عودت‌شده، دریافت نقدی از کارت همان چک ثبت می‌شود."
                  >
                    <SelectField
                      id="checkStatus"
                      name="status"
                      value={editingCheck.status}
                      onChange={handleEditCheckChange}
                    >
                      {CHECK_STATUSES_OPTIONS.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </SelectField>
                  </ModalField>

                  <div>
                    <FinancialStatusBadge
                      label={CHECK_STATUS_COPY[editingCheck.status]?.caption || 'وضعیت چک ثبت شده است'}
                      tone={statusTone}
                      icon={`fa-solid ${CHECK_STATUS_COPY[editingCheck.status]?.icon || 'fa-circle-info'}`}
                      size="sm"
                    />
                  </div>
                  </div>
                </PanelCard>
              </div>

              <DialogActions
                onCancel={() => {
                  setIsEditCheckModalOpen(false);
                  setEditCheckErrors({});
                }}
                cancelText="انصراف"
                submitText="ذخیره تغییرات"
                submitType="button"
                onSubmitClick={handleSaveCheckChanges}
                submitVariant="primary"
                submitIconClass="fa-solid fa-floppy-disk"
                align="end"
              />
            </div>
          </Modal>
        );
      })()}

      {saleData ? (
        <InstallmentCancellationRefundModal
          isOpen={isCancellationRefundModalOpen}
          saleId={Number(saleData.id)}
          refundState={cancellationRefund}
          onClose={() => setIsCancellationRefundModalOpen(false)}
          onSaved={(message) => {
            setNotification({ type: 'success', text: message });
            void fetchInstallmentSaleDetail();
            notifyHeaderInstallmentRefresh();
          }}
        />
      ) : null}
    </div>
  );
};

export default InstallmentSaleDetailPage;
