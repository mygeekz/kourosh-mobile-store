// src/pages/InstallmentSaleDetailPage.tsx
import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
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
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/apiFetch';
import { formatIsoToShamsi } from '../utils/dateUtils';
import ShamsiDatePicker from '../components/ShamsiDatePicker';
import PriceInput from '../components/PriceInput';
import toast from 'react-hot-toast';
import { useConfirm } from '../contexts/ConfirmContext';
import SmsAutoSendSheet from '../components/SmsAutoSendSheet';
import Button from '../components/Button';
import FinancialProgressBar from '../components/FinancialProgressBar';
import FinancialStatusBadge from '../components/FinancialStatusBadge';
import { useMountedRef, useTimeoutGuards } from '../utils/asyncGuards';

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
  const confirmAction = useConfirm();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightedPaymentId = Number(searchParams.get('paymentId') || 0) || 0;
  const { token, authReady } = useAuth();

  const [saleData, setSaleData] = useState<InstallmentSaleDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const [expanded, setExpanded] = useState<Set<number>>(new Set());
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


  // Auto-SMS UX (final payment)
  const [smsSheetOpen, setSmsSheetOpen] = useState(false);
  const [smsSheetStatus, setSmsSheetStatus] = useState<'sent' | 'failed' | 'not_sent'>('not_sent');
  const [smsSheetMessage, setSmsSheetMessage] = useState<string>('');
  const [smsResending, setSmsResending] = useState(false);

  // ویرایش اطلاعات وضعیت چک
  const [isEditCheckModalOpen, setIsEditCheckModalOpen] = useState(false);
  const [editingCheck, setEditingCheck] = useState<InstallmentCheckInfo | null>(null);
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

  const overallBadge = (status: string) => {
    if (status === 'تکمیل شده') return <FinancialStatusBadge label="تکمیل شده" tone="success" icon="fa-solid fa-circle-check" size="sm" />;
    if (status === 'معوق') return <FinancialStatusBadge label="معوق" tone="danger" icon="fa-solid fa-triangle-exclamation" size="sm" />;
    return <FinancialStatusBadge label="در حال پرداخت" tone="info" icon="fa-solid fa-rotate" size="sm" />;
  };

  const getPaymentStatusColor = (status: InstallmentPaymentStatus, dueDate?: string): string => {
    if (status === 'پرداخت شده') return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
    if (status === 'پرداخت جزئی') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
    if (status === 'پرداخت نشده' && dueDate && moment(dueDate, 'jYYYY/jMM/jDD').isBefore(moment(), 'day'))
      return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300';
  };

  const getCheckStatusColor = (status: CheckStatus): string => {
    if (status === 'نقد شد') return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
    if (status === 'برگشت خورد') return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    if (status === 'به مشتری برگشت داده شده') return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300';
    if (status === 'نزد فروشنده') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300';
  };

  const getCheckStatusAccentClass = (status: CheckStatus): string => {
    if (status === 'نقد شد') return 'bg-emerald-500';
    if (status === 'برگشت خورد') return 'bg-rose-500';
    if (status === 'به مشتری برگشت داده شده') return 'bg-orange-500';
    if (status === 'نزد فروشنده') return 'bg-sky-500';
    return 'bg-amber-500';
  };

  const isCashRecoverableCheckStatus = (status?: CheckStatus | string | null) =>
    CASH_RECOVERABLE_CHECK_STATUSES.includes(status as CheckStatus);

  const canReceiveCashForCheck = (check?: InstallmentCheckInfo | null) =>
    !!check && isCashRecoverableCheckStatus(check.status) &&
    Number(((check as any).cashRemaining ?? check.amount ?? 0)) > 0;

  const getCheckTimeline = (check: InstallmentCheckInfo) => {
    const cashPaid = toNumber((check as any).cashPaid);
    const cashRemaining = Math.max(0, toNumber((check as any).cashRemaining ?? check.amount));
    const cashTransactions: any[] = (check as any).cashTransactions || [];
    const statusTone =
      check.status === 'نقد شد' ? 'success' :
      check.status === 'برگشت خورد' ? 'danger' :
      check.status === 'به مشتری برگشت داده شده' ? 'warning' :
      check.status === 'در جریان وصول' ? 'info' : 'neutral';

    const events: Array<{
      key: string;
      icon: string;
      title: string;
      subtitle: string;
      date?: string | null;
      amount: number | null;
      tone: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
    }> = [
      {
        key: 'registered',
        icon: 'fa-file-signature',
        title: 'ثبت چک',
        subtitle: `چک شماره ${check.checkNumber} در فروش اقساطی ثبت شد`,
        date: check.dueDate,
        amount: toNumber(check.amount),
        tone: 'neutral' as const,
      },
      {
        key: 'status',
        icon: check.status === 'نقد شد' ? 'fa-circle-check' : check.status === 'برگشت خورد' ? 'fa-arrow-rotate-left' : check.status === 'به مشتری برگشت داده شده' ? 'fa-handshake-angle' : check.status === 'در جریان وصول' ? 'fa-building-columns' : 'fa-wallet',
        title: check.status,
        subtitle: check.status === 'نقد شد'
          ? 'چک نقد شده و نیاز به دریافت نقدی جایگزین ندارد'
          : check.status === 'برگشت خورد'
            ? 'چک برگشت خورده و دریافت نقدی مرحله‌ای فعال است'
            : check.status === 'به مشتری برگشت داده شده'
              ? 'چک به خریدار برگشته و می‌توان مبلغ آن را نقدی دریافت کرد'
              : check.status === 'در جریان وصول'
                ? 'چک برای وصول در جریان است'
                : 'چک هنوز نزد فروشنده است',
        date: check.dueDate,
        amount: null as number | null,
        tone: statusTone as 'success' | 'danger' | 'warning' | 'info' | 'neutral',
      },
      ...cashTransactions.map((tx: any, index: number) => ({
        key: `cash-${tx.id ?? index}`,
        icon: 'fa-hand-holding-dollar',
        title: `دریافت نقدی مرحله ${(index + 1).toLocaleString('fa-IR')}`,
        subtitle: tx.notes || 'دریافت نقدی بابت چک برگشتی/عودت‌شده',
        date: tx.payment_date,
        amount: toNumber(tx.amount_paid),
        tone: 'success' as const,
      })),
    ];

    if ((check.status === 'برگشت خورد' || check.status === 'به مشتری برگشت داده شده') && cashPaid > 0) {
      events.push({
        key: cashRemaining <= 0 ? 'settled' : 'remaining',
        icon: cashRemaining <= 0 ? 'fa-circle-check' : 'fa-hourglass-half',
        title: cashRemaining <= 0 ? 'تسویه کامل چک' : 'مانده قابل دریافت',
        subtitle: cashRemaining <= 0 ? 'کل مبلغ چک از مسیر نقدی وصول شده است' : 'چک هنوز مانده نقدی قابل دریافت دارد',
        date: cashTransactions[cashTransactions.length - 1]?.payment_date || check.dueDate,
        amount: cashRemaining,
        tone: cashRemaining <= 0 ? 'success' as const : 'warning' as const,
      });
    }

    return events;
  };

  const getCheckTimelineDotClass = (tone: 'success' | 'danger' | 'warning' | 'info' | 'neutral') => {
    if (tone === 'success') return 'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900/60';
    if (tone === 'danger') return 'bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-200 dark:ring-rose-900/60';
    if (tone === 'warning') return 'bg-orange-100 text-orange-700 ring-orange-200 dark:bg-orange-950/50 dark:text-orange-200 dark:ring-orange-900/60';
    if (tone === 'info') return 'bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-200 dark:ring-blue-900/60';
    return 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800';
  };

  const isOverdue = (due: string, status: InstallmentPaymentStatus) =>
    moment(due, 'jYYYY/jMM/jDD').isBefore(moment(), 'day') && status !== 'پرداخت شده';

  const detailSeverityClass = (tone: "danger" | "warning" | "info" | "success" | "violet" | "neutral") => `detail-severity-badge detail-severity-badge--${tone}`;
  const overallSeverity = (status: string) => status === 'تکمیل شده' ? 'success' : status === 'معوق' ? 'danger' : 'info';
  const nextDueSeverity = (status: InstallmentPaymentStatus, dueDate?: string) => {
    if (status === 'پرداخت شده') return 'success' as const;
    if (status === 'پرداخت جزئی') return 'info' as const;
    if (status === 'پرداخت نشده' && dueDate && moment(dueDate, 'jYYYY/jMM/jDD').isBefore(moment(), 'day')) return 'danger' as const;
    return 'warning' as const;
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
  const openPaymentModal = (payment: InstallmentPaymentRecord) => {
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
        date: moment(paymentDate).locale('fa').format('jYYYY/jMM/jDD'),
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

      // Final-payment UX: toast + mobile bottom sheet + resend action
      if (js?.finalizedNow) {
        const status: 'sent' | 'failed' | 'not_sent' = js?.smsAttempted
          ? (js?.smsSuccess ? 'sent' : 'failed')
          : 'not_sent';

        if (!mountedRef.current) return;
        setSmsSheetStatus(status);
        setSmsSheetMessage(js?.smsError ? String(js.smsError) : '');

        toast.custom(
          (t) => (
            <div className="w-full max-w-md rounded-2xl bg-white shadow-lg ring-1 ring-slate-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">تسویه کامل اقساط</div>
                  <div className="mt-1 text-xs text-slate-600">
                    {status === 'sent'
                      ? 'پیامک تایید تسویه ارسال شد.'
                      : status === 'failed'
                      ? 'پرداخت ثبت شد، اما ارسال پیامک با خطا روبه‌رو شد.'
                      : 'پیامک ارسال نشد (تنظیمات یا پترن ناقص است).'}
                  </div>
                </div>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() => toast.dismiss(t.id)}
                  aria-label="dismiss"
                  className="px-2"
                >
                  ✕
                </Button>
              </div>

              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  size="xs"
                  variant="primary"
                  onClick={async () => {
                    toast.dismiss(t.id);
                    await resendFinalPaymentSms();
                  }}
                  className="flex-1"
                  leftIcon={<i className="fa-solid fa-rotate-right" />}
                >
                  ارسال مجدد
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="secondary"
                  onClick={() => {
                    toast.dismiss(t.id);
                    setSmsSheetOpen(true);
                  }}
                  leftIcon={<i className="fa-solid fa-circle-info" />}
                >
                  جزئیات
                </Button>
              </div>
            </div>
          ),
          { duration: 8000 }
        );

        // On mobile, also pop the bottom sheet for a "premium" feel
        if (typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches) {
          setSmsSheetOpen(true);
        }
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
    setEditingCheck({ ...check });
    setIsEditCheckModalOpen(true);
  };

  const handleEditCheckChange = (e: ChangeEvent<HTMLSelectElement>) => {
    if (!editingCheck) return;
    setEditingCheck(prev => (prev ? { ...prev, status: e.target.value as CheckStatus } : null));
  };

  const handleSaveCheckChanges = async () => {
    if (!editingCheck || !editingCheck.id) return;
    setNotification({ type: 'info', text: 'در حال ذخیره تغییرات چک...' });
    try {
      const res = await apiFetch(`/api/installment-sales/check/${editingCheck.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: editingCheck.status }),
      });
      const js = await res.json().catch(() => ({}));
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در تغییر وضعیت چک');
      setNotification({ type: 'success', text: `وضعیت چک شماره ${editingCheck.checkNumber} به‌روز شد.` });
      setIsEditCheckModalOpen(false);
      setEditingCheck(null);
      fetchInstallmentSaleDetail();
    } catch (error: any) {
      setNotification({ type: 'error', text: `خطا در به‌روزرسانی چک: ${error.message}` });
    }
  };
  const updateCheckStatus = async (check: InstallmentCheckInfo, status: CheckStatus, openCashAfter = false) => {
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
    const remaining = Math.max(0, toNumber((check as any).cashRemaining ?? check.amount));
    setCashCheck({ ...check });
    setCheckCashAmount(remaining || '');
    setCheckCashDate(new Date());
    setCheckCashNotes(`دریافت نقدی بابت چک شماره ${check.checkNumber}`);
    setIsCheckCashModalOpen(true);
  };

  const handleSubmitCheckCashPayment = async (e: FormEvent) => {
    e.preventDefault();
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
        date: moment(checkCashDate).locale('fa').format('jYYYY/jMM/jDD'),
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
  const openEditTx = (tx: any) => {
    setEditingTx(tx);
    setEditTxAmount(tx?.amount_paid || '');
    setEditTxDate(tx?.payment_date ? moment(tx.payment_date, ['YYYY-MM-DD', 'YYYY/MM/DD']).toDate() : new Date());
    setEditTxNotes(tx?.notes || '');
    setIsEditTxModalOpen(true);
  };

  const handleSaveTx = async () => {
    if (!editingTx) return;
    try {
      const payload = {
        amount: toNumber(editTxAmount),
        date: moment(editTxDate).locale('fa').format('jYYYY/jMM/jDD'),
        notes: editTxNotes,
      };
      await apiFetch(`/api/installment-sales/payment/transaction/${editingTx.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setNotification({ type: 'success', text: 'پرداخت ویرایش اطلاعات شد.' });
      setIsEditTxModalOpen(false);
      setEditingTx(null);
      notifyHeaderInstallmentRefresh();
      fetchInstallmentSaleDetail();
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message });
    }
  };

  const handleDeleteTx = async (tx: any) => {
    const ok = await confirmAction({ title: 'حذف مورد پرداخت', description: 'این پرداخت حذف مورد می‌شود و امکان بازگشت خودکار وجود ندارد.', confirmText: 'بله، حذف مورد شود', tone: 'danger', iconClass: 'fa-solid fa-money-bill-wave' });
    if (!ok) return;
    try {
      await apiFetch(`/api/installment-sales/payment/transaction/${tx.id}`, { method: 'DELETE' });
      setNotification({ type: 'success', text: 'پرداخت حذف مورد شد.' });
      notifyHeaderInstallmentRefresh();
      fetchInstallmentSaleDetail();
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message });
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
  const timelineDates = [
    { label: 'تاریخ ثبت', value: toShamsiSafe(saleData.dateCreated), icon: 'fa-regular fa-clock', tone: 'info' },
    { label: 'تاریخ خرید اقساطی', value: toShamsiSafe((saleData as any).saleDate || (saleData as any).phoneSaleDate || saleData.dateCreated), icon: 'fa-solid fa-file-signature', tone: 'success' },
    { label: 'شروع اقساط', value: displayInstallmentsStartDate, icon: 'fa-regular fa-calendar-days', tone: 'warning' },
    { label: 'تاریخ ورود گوشی به انبار', value: toShamsiSafe((saleData as any).phonePurchaseDate || (saleData as any).phoneRegisterDate), icon: 'fa-solid fa-mobile-screen-button', tone: 'violet' },
  ];
  const tabs = [
    { key: 'overview', label: 'خلاصه', icon: 'fa-chart-pie' },
    { key: 'installments', label: 'اقساط', icon: 'fa-calendar-check' },
    { key: 'ledger', label: 'پرداخت‌ها', icon: 'fa-money-bill-transfer' },
    { key: 'checks', label: 'چک‌ها', icon: 'fa-money-check-dollar' },
  ] as const;

  return (
    <div className="min-h-screen space-y-6 bg-slate-50/70 px-3 pb-10 pt-2 text-right dark:bg-slate-950/40 sm:px-4" dir="rtl">
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

      {/* Executive installment detail header */}
      <section className="mx-auto max-w-7xl overflow-hidden rounded-[34px] border border-slate-200/85 bg-white shadow-[0_28px_72px_-54px_rgba(15,23,42,0.42)] dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-100 px-4 py-5 dark:border-slate-800 sm:px-5 lg:px-7">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                <i className="fa-solid fa-file-invoice-dollar text-lg" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    {saleKindLabel}
                  </span>
                  {overallBadge(saleData.overallStatus)}
                </div>
                <h1 className="mt-2 truncate text-xl font-black tracking-tight text-slate-950 dark:text-slate-50 sm:text-2xl" title={primaryItemTitle}>
                  {primaryItemTitle}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 dark:bg-slate-900">
                    <i className="fa-solid fa-hashtag text-[10px]" />
                    سند {saleData.id.toLocaleString('fa-IR')}
                  </span>
                  <Link to={`/customers/${saleData.customerId}`} className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 font-black text-sky-700 transition hover:bg-sky-100 dark:bg-sky-950/35 dark:text-sky-200 dark:hover:bg-sky-950/55">
                    <i className="fa-regular fa-user text-[10px]" />
                    {saleData.customerFullName}
                  </Link>
                  {saleData.phoneImei ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 font-mono text-[11px] dark:bg-slate-900" dir="ltr">
                      IMEI {saleData.phoneImei}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
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
          </div>
        </div>

        <div className="border-t border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950 sm:px-5 lg:px-7">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tabItem) => {
              const isActive = activeTab === tabItem.key;
              return (
                <button
                  key={tabItem.key}
                  type="button"
                  onClick={() => setSearchParams((prev) => {
                    const p = new URLSearchParams(prev);
                    p.set('tab', tabItem.key);
                    return p;
                  })}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-2xl border px-4 text-xs font-black transition ${isActive ? 'border-slate-900 bg-slate-900 text-white shadow-[0_16px_36px_-28px_rgba(15,23,42,0.65)] dark:border-white dark:bg-white dark:text-slate-900' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900'}`}
                >
                  <i className={`fa-solid ${tabItem.icon} text-[11px]`} />
                  {tabItem.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Body */}
      {(() => {
        const tab = (searchParams.get('tab') || 'overview') as 'overview' | 'installments' | 'ledger' | 'checks';

        // Derived metrics
        const total = toNumber(saleData.totalInstallmentPrice);
        const remaining = toNumber(saleData.remainingAmount);
        const collected = Math.max(0, total - remaining);

        const payments = saleData.payments || [];
        const overdueCount = payments.filter((p) => isOverdue(p.dueDate, p.status)).length;
        const dueIn7 = payments.filter((p) => p.status !== 'پرداخت شده' && moment(p.dueDate).diff(moment(), 'days') >= 0 && moment(p.dueDate).diff(moment(), 'days') <= 7).length;

        const kpi = [
          { fa: 'مبلغ کل اقساط', en: 'Total installments', icon: 'fa-solid fa-sack-dollar', val: formatPrice(total) },
          { fa: 'وصول‌شده', en: 'Collected', icon: 'fa-solid fa-circle-check', val: formatPrice(collected) },
          { fa: 'باقی‌مانده', en: 'Outstanding', icon: 'fa-solid fa-hourglass-half', val: formatPrice(remaining) },
          { fa: 'معوق', en: 'Overdue', icon: 'fa-solid fa-triangle-exclamation', val: overdueCount.toLocaleString('fa-IR') },
          { fa: '۷ روز آینده', en: 'Due in 7 days', icon: 'fa-regular fa-calendar-days', val: dueIn7.toLocaleString('fa-IR') },
          { fa: 'پیش‌پرداخت', en: 'Down payment', icon: 'fa-solid fa-coins', val: formatPrice(saleData.downPayment) },
        ];

        const Tile = ({ fa, en, icon, val }: any) => {
          const tone = fa === 'معوق' ? 'rose' : fa === '۷ روز آینده' ? 'amber' : fa === 'وصول‌شده' ? 'emerald' : fa === 'باقی‌مانده' ? 'orange' : 'sky';
          const toneClass = tone === 'rose'
            ? 'border-rose-200 bg-rose-50/80 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-200'
            : tone === 'amber'
            ? 'border-amber-200 bg-amber-50/80 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200'
            : tone === 'emerald'
            ? 'border-emerald-200 bg-emerald-50/80 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200'
            : tone === 'orange'
            ? 'border-orange-200 bg-orange-50/80 text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/20 dark:text-orange-200'
            : 'border-sky-200 bg-sky-50/80 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-sky-200';
          return (
            <div className="group relative overflow-hidden rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_18px_46px_-38px_rgba(15,23,42,0.32)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_54px_-40px_rgba(15,23,42,0.42)] dark:border-slate-800 dark:bg-slate-950">
              <span className={`absolute inset-y-4 right-0 w-1 rounded-l-full ${tone === 'rose' ? 'bg-rose-500' : tone === 'amber' ? 'bg-amber-500' : tone === 'emerald' ? 'bg-emerald-500' : tone === 'orange' ? 'bg-orange-500' : 'bg-sky-500'}`} />
              <div className="flex items-start justify-between gap-3 pr-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">{fa}</div>
                  <div className="mt-1 truncate text-[17px] font-black text-slate-950 dark:text-slate-50" title={String(val)}>{val}</div>
                </div>
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border ${toneClass}`}>
                  <i className={`${icon} text-[13px]`} />
                </span>
              </div>
            </div>
          );
        };

        if (tab === 'overview') {
          return (
            <div className="mx-auto max-w-7xl space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {kpi.map((x: any) => <Tile key={x.en} {...x} />)}
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.65fr)]">
                <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_22px_50px_-42px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                    <div className="flex items-start gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/25 dark:text-sky-200">
                        <i className="fa-solid fa-file-invoice-dollar" />
                      </span>
                      <div>
                        <div className="text-base font-black text-slate-950 dark:text-slate-50">جزئیات فروش</div>
                        <div className="mt-1 text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">خلاصه مالی و تاریخ‌های کلیدی پرونده اقساطی</div>
                      </div>
                    </div>
                    {saleData.nextDueDate && saleData.overallStatus !== 'تکمیل شده' ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                        قسط بعدی: <span className="text-slate-950 dark:text-slate-50">{formatIsoToShamsi(saleData.nextDueDate)}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {[
                      { label: 'قیمت فروش نهایی', value: formatPrice(saleData.actualSalePrice), icon: 'fa-solid fa-tag', tone: 'sky' },
                      { label: 'تعداد اقساط', value: `${saleData.numberOfInstallments.toLocaleString('fa-IR')} ماه`, icon: 'fa-solid fa-list-ol', tone: 'slate' },
                      { label: 'مبلغ هر قسط', value: formatPrice(saleData.installmentAmount), icon: 'fa-solid fa-coins', tone: 'emerald' },
                      { label: 'شروع اقساط', value: displayInstallmentsStartDate, icon: 'fa-regular fa-calendar-days', tone: 'amber' },
                      { label: 'تاریخ ثبت پرونده', value: toShamsiSafe(saleData.dateCreated), icon: 'fa-regular fa-clock', tone: 'slate' },
                      { label: 'تاریخ خرید اقساطی', value: toShamsiSafe((saleData as any).saleDate || (saleData as any).phoneSaleDate || saleData.dateCreated), icon: 'fa-solid fa-cart-shopping', tone: 'violet' },
                      { label: 'تاریخ ورود گوشی به انبار', value: toShamsiSafe((saleData as any).phonePurchaseDate || (saleData as any).phoneRegisterDate), icon: 'fa-solid fa-warehouse', tone: 'orange' },
                    ].map((item) => {
                      const toneClass = item.tone === 'emerald'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200'
                        : item.tone === 'amber'
                        ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200'
                        : item.tone === 'violet'
                        ? 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/20 dark:text-violet-200'
                        : item.tone === 'orange'
                        ? 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/20 dark:text-orange-200'
                        : item.tone === 'sky'
                        ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-sky-200'
                        : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300';
                      return (
                        <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/45">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 text-right">
                              <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">{item.label}</div>
                              <div className="mt-1 truncate text-sm font-black text-slate-950 dark:text-slate-50" title={String(item.value)}>{item.value}</div>
                            </div>
                            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl border ${toneClass}`}>
                              <i className={`${item.icon} text-[12px]`} />
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
                </div>

                <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_22px_50px_-42px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                    <div>
                      <div className="text-base font-black text-slate-950 dark:text-slate-50">اقلام پرونده</div>
                      <div className="mt-1 text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">کالاها و خدمات ثبت‌شده در این فروش</div>
                    </div>
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                      <i className="fa-solid fa-boxes-stacked" />
                    </div>
                  </div>

                  {!saleData.items || saleData.items.length === 0 ? (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-5 text-center text-sm font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900/35 dark:text-slate-400">قلمی برای نمایش وجود ندارد.</div>
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
                                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                                    <i className={`${icon} text-[11px]`} />
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
                </div>
              </div>
            </div>
          );
        }

        if (tab === 'checks') {
          return (
            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_22px_50px_-42px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-base font-black text-slate-950 dark:text-slate-50">چک‌های دریافتی</div>
                  <div className="mt-1 text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">وضعیت، وصول، برگشت و دریافت نقدی چک‌های این پرونده</div>
                </div>
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  <i className="fa-solid fa-money-check-dollar" />
                </div>
              </div>

              {saleData.checks.length > 0 && (() => {
                const totalChecksAmount = saleData.checks.reduce((sum, check) => sum + toNumber(check.amount), 0);
                const returnedChecks = saleData.checks.filter((check) => isCashRecoverableCheckStatus(check.status));
                const totalCashRecovered = saleData.checks.reduce((sum, check) => sum + toNumber((check as any).cashPaid), 0);
                const totalRecoverableRemaining = saleData.checks.reduce((sum, check) => {
                  if (!isCashRecoverableCheckStatus(check.status)) return sum;
                  return sum + Math.max(0, toNumber((check as any).cashRemaining ?? check.amount));
                }, 0);
                const clearedChecks = saleData.checks.filter((check) => check.status === 'نقد شد').length;
                return (
                  <div className="mt-4 rounded-3xl border border-slate-200 bg-white/85 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/35">
                    <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <div className="text-sm font-black text-slate-900 dark:text-slate-50">خلاصه وضعیت چک‌ها</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">نمای مدیریتی برای تشخیص چک‌های پاس‌شده، برگشتی و مانده نقدی قابل دریافت.</div>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"><i className="fa-solid fa-chart-pie text-[10px]" /> نمای سریع</div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                        <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400"><i className="fa-solid fa-hashtag text-[10px]" /> تعداد چک‌ها</div>
                        <div className="mt-1 text-base font-black text-slate-900 dark:text-slate-50">{saleData.checks.length.toLocaleString('fa-IR')}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                        <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400"><i className="fa-solid fa-money-check-dollar text-[10px]" /> مجموع چک‌ها</div>
                        <div className="mt-1 text-sm font-black text-slate-900 dark:text-slate-50">{formatPrice(totalChecksAmount)}</div>
                      </div>
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200">
                        <div className="flex items-center gap-2 text-[11px] font-black opacity-80"><i className="fa-solid fa-circle-check text-[10px]" /> چک‌های پاس‌شده</div>
                        <div className="mt-1 text-base font-black">{clearedChecks.toLocaleString('fa-IR')}</div>
                      </div>
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-200">
                        <div className="flex items-center gap-2 text-[11px] font-black opacity-80"><i className="fa-solid fa-arrow-rotate-left text-[10px]" /> برگشتی / عودتی</div>
                        <div className="mt-1 text-base font-black">{returnedChecks.length.toLocaleString('fa-IR')}</div>
                      </div>
                      <div className="rounded-2xl border border-orange-200 bg-orange-50 p-3 text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/25 dark:text-orange-200">
                        <div className="flex items-center gap-2 text-[11px] font-black opacity-80"><i className="fa-solid fa-hand-holding-dollar text-[10px]" /> مانده نقدی قابل دریافت</div>
                        <div className="mt-1 text-sm font-black">{formatPrice(totalRecoverableRemaining)}</div>
                        {totalCashRecovered > 0 && <div className="mt-1 text-[10px] opacity-70">دریافت‌شده: {formatPrice(totalCashRecovered)}</div>}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {saleData.checks.length === 0 ? (
                <div className="mt-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center dark:border-slate-800 dark:bg-slate-900/40"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm dark:bg-slate-950"><i className="fa-solid fa-money-check-dollar" /></div><div className="mt-3 text-sm font-black text-slate-700 dark:text-slate-200">چکی برای این فروش ثبت نشده است.</div><div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">در صورت ثبت فروش چکی، اطلاعات چک‌ها اینجا نمایش داده می‌شود.</div></div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-4">
                  {saleData.checks.map((check) => {
                    const cashPaid = toNumber((check as any).cashPaid);
                    const cashRemaining = Math.max(0, toNumber((check as any).cashRemaining ?? check.amount));
                    const cashTransactions: any[] = (check as any).cashTransactions || [];
                    const timeline = getCheckTimeline(check);
                    return (
                    <div key={check.id} className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.3)] dark:border-slate-800 dark:bg-slate-950 lg:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-start gap-3 text-right">
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"><i className="fa-solid fa-money-check-dollar" /></span>
                            <div>
                              <div className="text-sm font-black text-slate-950 dark:text-slate-50">چک شماره {check.checkNumber}</div>
                              <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">بانک: <span className="text-slate-700 dark:text-slate-200">{check.bankName || '—'}</span></div>
                            </div>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full font-semibold ${getCheckStatusColor(check.status)}`}>
                          {check.status}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/55">
                          <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400"><i className="fa-solid fa-coins text-[10px]" /> مبلغ چک</div>
                          <div className="mt-1 font-black text-slate-950 dark:text-slate-50">{formatPrice(check.amount)}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/55">
                          <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400"><i className="fa-regular fa-calendar text-[10px]" /> تاریخ سررسید</div>
                          <div className="mt-1 font-black text-slate-950 dark:text-slate-50">{formatIsoToShamsi(check.dueDate)}</div>
                        </div>
                        {(check.status === 'برگشت خورد' || check.status === 'به مشتری برگشت داده شده' || cashPaid > 0) && (
                          <>
                            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200">
                              <div className="text-xs font-semibold">دریافت نقدی</div>

                              <div className="mt-0.5 font-black">{formatPrice(cashPaid)}</div>
                            </div>
                            <div className="rounded-xl bg-orange-50 p-2 text-orange-700 dark:bg-orange-950/30 dark:text-orange-200">
                              <div className="text-xs font-semibold">مانده چک</div>

                              <div className="mt-0.5 font-black">{formatPrice(cashRemaining)}</div>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="mt-3 rounded-2xl border border-slate-200/80 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/30">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-xs font-black text-slate-800 dark:text-slate-100">تغییر سریع وضعیت چک</div>
                            <div className="mt-0.5 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                              وضعیت‌های معمول وصول را از این بخش تغییر بده؛ برای برگشت یا عودت، از دکمه‌های دریافت نقدی پایین استفاده کن.
                            </div>
                          </div>
                          <span className={`shrink-0 px-2 py-1 text-[11px] rounded-full font-black ${getCheckStatusColor(check.status)}`}>
                            {check.status}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {CHECK_STATUSES_OPTIONS.filter((status) => !isCashRecoverableCheckStatus(status)).map((status) => {
                            const active = check.status === status;
                            const copy = CHECK_STATUS_COPY[status];
                            return (
                              <button
                                key={status}
                                type="button"
                                onClick={() => updateCheckStatus(check, status, false)}
                                className={`relative min-h-[92px] overflow-hidden rounded-2xl border px-3 py-3 pr-11 text-right transition ${active ? 'border-primary-500 bg-primary-50 text-primary-800 shadow-sm ring-1 ring-primary-200 dark:border-primary-500/70 dark:bg-primary-950/35 dark:text-primary-100 dark:ring-primary-900/50' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-primary-300 hover:bg-primary-50/70 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-primary-700'}`}
                              >
                                {active && <span className={`absolute inset-y-3 right-0 w-1 rounded-l-full ${getCheckStatusAccentClass(status)}`} />}
                                <i className={`fa-solid ${copy.icon} absolute right-3 top-3 text-[13px] opacity-80`} />
                                <div className="min-w-0 text-xs font-black leading-5">{status}</div>
                                <div className="mt-1 max-w-full text-[10px] leading-5 opacity-70">{copy.caption}</div>
                              </button>
                            );
                          })}
                        </div>
                        {isCashRecoverableCheckStatus(check.status) ? (
                          <div className="mt-3 flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-100 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="text-xs font-black">دریافت نقدی بابت این چک فعال است</div>
                              <div className="mt-0.5 text-[11px] opacity-75">مانده قابل دریافت: {formatPrice(cashRemaining)}</div>
                            </div>
                            {cashRemaining > 0 && (
                              <Button
                                onClick={() => openCheckCashModal(check)}
                                variant="success"
                                size="sm"
                                leftIcon={<i className="fa-solid fa-hand-holding-dollar" />}
                              >
                                ثبت دریافت نقدی
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/35">
                            <div className="mb-3 flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-slate-50">
                                  <i className="fa-solid fa-triangle-exclamation text-red-500" />
                                  عملیات جایگزین وصول
                                </div>
                                <div className="mt-1 text-[11px] font-semibold leading-5 line-clamp-1 text-slate-500 dark:text-slate-400">
                                  اگر چک پاس نشد، مسیر نقدی جایگزین را ثبت کن.
                                </div>
                              </div>
                              <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                                مسیر اصلی
                              </span>
                            </div>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                              <button
                                type="button"
                                onClick={() => updateCheckStatus(check, 'برگشت خورد', true)}
                                className="group relative min-h-[92px] overflow-hidden rounded-2xl border border-red-200 bg-red-50 px-4 py-4 pr-14 text-right text-red-800 shadow-[0_18px_38px_-34px_rgba(220,38,38,0.45)] transition hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-100 hover:shadow-[0_22px_44px_-34px_rgba(220,38,38,0.55)] dark:border-red-900/50 dark:bg-red-950/25 dark:text-red-100"
                              >
                                <span className="absolute inset-y-4 right-0 w-1 rounded-l-full bg-red-500" />
                                <span className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-2xl border border-red-200 bg-white text-red-600 shadow-sm dark:border-red-900/60 dark:bg-red-950/45 dark:text-red-200">
                                  <i className="fa-solid fa-arrow-rotate-left text-[13px]" />
                                </span>
                                <div className="text-sm font-black leading-6 whitespace-nowrap">برگشت + نقدی</div>
                                <div className="mt-1 text-[11px] font-semibold leading-5 line-clamp-1 text-red-700/80 dark:text-red-100/75">ثبت برگشت و دریافت نقدی</div>
                                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1 text-[10px] font-black text-red-700 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-100 dark:ring-red-900/50">
                                  <i className="fa-solid fa-hand-holding-dollar text-[9px]" />
                                  ثبت دریافت
                                </div>
                              </button>
                              <button
                                type="button"
                                onClick={() => updateCheckStatus(check, 'به مشتری برگشت داده شده', true)}
                                className="group relative min-h-[92px] overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 pr-14 text-right text-amber-900 shadow-[0_18px_38px_-34px_rgba(217,119,6,0.42)] transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-100 hover:shadow-[0_22px_44px_-34px_rgba(217,119,6,0.52)] dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-100"
                              >
                                <span className="absolute inset-y-4 right-0 w-1 rounded-l-full bg-amber-500" />
                                <span className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-2xl border border-amber-200 bg-white text-amber-700 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/45 dark:text-amber-200">
                                  <i className="fa-solid fa-handshake-angle text-[13px]" />
                                </span>
                                <div className="text-sm font-black leading-6 whitespace-nowrap">عودت + نقدی</div>
                                <div className="mt-1 text-[11px] font-semibold leading-5 line-clamp-1 text-amber-800/80 dark:text-amber-100/75">ثبت عودت و دریافت نقدی</div>
                                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1 text-[10px] font-black text-amber-800 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-900/50">
                                  <i className="fa-solid fa-hand-holding-dollar text-[9px]" />
                                  ثبت دریافت
                                </div>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/35">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-200">
                            <i className="fa-solid fa-timeline" /> مسیر وصول چک
                          </div>
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500 dark:bg-slate-900 dark:text-slate-400"><i className="fa-solid fa-route text-[9px]" /> مسیر</div>
                        </div>
                        <div className="relative space-y-3 before:absolute before:right-[14px] before:top-4 before:bottom-4 before:w-px before:bg-slate-200 dark:before:bg-slate-800">
                          {timeline.map((event, index) => (
                            <div key={event.key} className="relative flex gap-3 pr-8">
                              <div className={`absolute right-0 top-0 flex h-7 w-7 items-center justify-center rounded-full ring-1 ${getCheckTimelineDotClass(event.tone)}`}>
                                <i className={`fa-solid ${event.icon} text-[11px]`} />
                              </div>
                              <div className="min-w-0 flex-1 rounded-xl border border-white/70 bg-white/80 p-2 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="truncate text-xs font-black text-slate-900 dark:text-slate-50">{event.title}</div>
                                    <div className="mt-0.5 line-clamp-2 text-[11px] leading-5 text-slate-500 dark:text-slate-400">{event.subtitle}</div>
                                  </div>
                                  <div className="shrink-0 text-left">
                                    <div className="text-[10px] font-bold text-slate-400">{toShamsiSafe(event.date)}</div>
                                    {event.amount !== null && (
                                      <div className="mt-0.5 text-[11px] font-black text-slate-700 dark:text-slate-200">{formatPrice(event.amount)}</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {cashTransactions.length > 0 && (
                        <div className="mt-3 rounded-xl border border-emerald-200/70 bg-emerald-50/70 p-2 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                          <div className="mb-1 flex items-center gap-2 text-[11px] font-black text-emerald-700 dark:text-emerald-200">
                            <i className="fa-solid fa-receipt" /> تاریخچه دریافت نقدی
                          </div>
                          <div className="space-y-1">
                            {cashTransactions.slice(0, 3).map((tx: any) => (
                              <div key={tx.id} className="flex items-center justify-between gap-2 text-xs text-emerald-800 dark:text-emerald-100">
                                <span>{toShamsiSafe(tx.payment_date)}</span>
                                <strong>{formatPrice(tx.amount_paid)}</strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button
                          onClick={() => openEditCheckModal(check)}
                          variant="warning"
                          size="sm"
                          leftIcon={<i className="fa-solid fa-pen" />}
                        >
                          ویرایش اطلاعات
                        </Button>
                      </div>
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
              });
            }
          }
          txs.sort((a, b) => String(b.payment_date || b.paymentDate || '').localeCompare(String(a.payment_date || a.paymentDate || '')));

          // group by date
          const groups: Record<string, any[]> = {};
          for (const t of txs) {
            const d = toShamsiSafe(t.payment_date || t.paymentDate);
            groups[d] = groups[d] || [];
            groups[d].push(t);
          }
          const dates = Object.keys(groups).sort((a, b) => a.localeCompare(b));

          return (
            <div className="space-y-4">
              <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_22px_50px_-42px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-base font-bold text-text">پرداخت‌ها</div>
                    <div className="text-xs text-muted mt-0.5">Payments ledger</div>
                  </div>
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    <i className="fa-solid fa-receipt" />
                  </div>
                </div>

                {txs.length === 0 ? (
                  <div className="mt-3 text-sm text-muted">هنوز پرداختی ثبت اطلاعات نشده است.</div>
                ) : (
                  <div className="mt-4 space-y-4">
                    {dates.map((d) => {
                      const items = groups[d];
                      const dayTotal = items.reduce((sum, t) => sum + toNumber(t.amount_paid ?? t.amountPaid), 0);
                      return (
                        <div key={d} className="rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden">
                          <div className="px-4 py-3 bg-black/[0.03] dark:bg-white/[0.04] flex items-center justify-between">
                            <div className="text-sm font-semibold text-text">{d}</div>
                            <div className="text-sm font-black text-text">{formatPrice(dayTotal)}</div>
                          </div>
                          <div className="divide-y divide-black/10 dark:divide-white/10">
                            {items.map((t) => (
                              <div key={t.id} className="px-4 py-3 flex items-start justify-between gap-3 bg-white/70 dark:bg-black/20">
                                <div>
                                  <div className="text-sm font-semibold text-text">
                                    قسط {Number(t.installmentNumber).toLocaleString('fa-IR')}
                                    <span className="text-[11px] text-muted mr-2">Installment #{t.installmentNumber}</span>
                                  </div>
                                  <div className="text-xs text-muted mt-0.5">
                                    سررسید / Due: <span className="text-text font-semibold">{formatIsoToShamsi(t.dueDate)}</span>
                                    {t.notes ? <span className="mr-2"> • {t.notes}</span> : null}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-sm font-black">{formatPrice(t.amount_paid ?? t.amountPaid)}</div>
                                  <Button
                                    className="finance-table-action finance-table-action--edit"
                                    variant="warning"
                                    size="xs"
                                    onClick={() => openEditTx(t)}
                                    title="ویرایش اطلاعات"
                                    leftIcon={<i className="fa-solid fa-pen" />}
                                  />
                                  <Button
                                    className="finance-table-action finance-table-action--danger"
                                    variant="danger"
                                    size="xs"
                                    onClick={() => handleDeleteTx(t)}
                                    title="حذف مورد"
                                    leftIcon={<i className="fa-solid fa-trash" />}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        }

        // installments tab (default)
        return (
          <div className="mx-auto max-w-7xl space-y-4">
            <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_22px_50px_-42px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-slate-950">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    <i className="fa-solid fa-calendar-check" />
                  </span>
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">INSTALLMENT SCHEDULE</div>
                    <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-slate-50">برنامه اقساط و وضعیت پرداخت</h2>
                    <p className="mt-1 text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">هر قسط به‌صورت کارت مستقل نمایش داده می‌شود تا مانده، دیرکرد و عملیات پرداخت سریع‌تر دیده شود.</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  مجموع اقساط: <span className="text-slate-950 dark:text-slate-50">{formatPrice(total)}</span>
                </div>
              </div>
            </section>

            <div className="grid gap-3 xl:grid-cols-2">
              {payments.map((p) => {
                const isExp = expanded.has(p.id);
                const paid = getTotalPaid(p);
                const remain = Math.max(0, toNumber(p.amountDue) - paid);
                const progress = toNumber(p.amountDue) > 0 ? Math.min(100, Math.max(0, (paid / toNumber(p.amountDue)) * 100)) : 0;
                const progressPercent = Math.round(progress);
                const dueMeta = getPaymentDueMeta(p);
                const tone = p.status === 'پرداخت شده' ? 'emerald' : isOverdue(p.dueDate, p.status) ? 'rose' : p.status === 'پرداخت جزئی' ? 'sky' : 'amber';
                return (
                  <article
                    id={`payment-row-${p.id}`}
                    key={p.id}
                    className={`overflow-hidden rounded-[28px] border bg-white shadow-[0_18px_44px_-38px_rgba(15,23,42,0.28)] transition dark:bg-slate-950 ${p.id === highlightedPaymentId ? 'border-sky-300 ring-4 ring-sky-100 dark:border-sky-700 dark:ring-sky-950/40' : tone === 'rose' ? 'border-rose-200 dark:border-rose-900/50' : 'border-slate-200 dark:border-slate-800'}`}
                  >
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
                      <div className="flex items-start gap-3">
                        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${tone === 'emerald' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200' : tone === 'rose' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-200' : tone === 'sky' ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-200' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-200'}`}>
                          <i className="fa-solid fa-receipt" />
                        </span>
                        <div>
                          <h3 className="text-base font-black text-slate-950 dark:text-slate-50">قسط {p.installmentNumber.toLocaleString('fa-IR')}</h3>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1.5"><i className="fa-regular fa-calendar" /> {formatIsoToShamsi(p.dueDate)}</span>
                            <FinancialStatusBadge label={p.status === 'پرداخت نشده' && isOverdue(p.dueDate, p.status) ? 'معوق' : p.status} tone={p.status === 'پرداخت شده' ? 'success' : p.status === 'پرداخت جزئی' ? 'info' : isOverdue(p.dueDate, p.status) ? 'danger' : 'warning'} size="xs" />
                          </div>
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-[11px] font-black text-slate-400">مبلغ قسط</div>
                        <div className="mt-1 whitespace-nowrap text-sm font-black text-slate-950 dark:text-slate-50">{formatPrice(p.amountDue)}</div>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900/50">
                          <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">پرداختی</div>
                          <div className="mt-1 text-sm font-black text-slate-950 dark:text-slate-50">{formatPrice(paid)}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900/50">
                          <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">مانده</div>
                          <div className="mt-1 text-sm font-black text-slate-950 dark:text-slate-50">{formatPrice(remain)}</div>
                        </div>
                      </div>

                      <FinancialProgressBar
                        className="mt-3"
                        value={progressPercent}
                        label={dueMeta.label}
                        tone={tone === 'emerald' ? 'emerald' : tone === 'rose' ? 'rose' : tone === 'sky' ? 'sky' : 'amber'}
                        ariaLabel={`درصد پرداخت قسط ${p.installmentNumber}`}
                      />

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                        <Button
                          onClick={() => {
                            const s = new Set(expanded);
                            s.has(p.id) ? s.delete(p.id) : s.add(p.id);
                            setExpanded(s);
                          }}
                          variant="secondary"
                          size="xs"
                          className="finance-table-action finance-table-action--history"
                          leftIcon={<i className={`fa-solid ${isExp ? 'fa-chevron-up' : 'fa-chevron-down'}`} />}
                        >
                          {isExp ? 'بستن جزئیات' : 'ریز پرداخت'}
                        </Button>
                        {p.status !== 'پرداخت شده' ? (
                          <Button onClick={() => openPaymentModal(p)} variant="success" size="xs" className="finance-table-action finance-table-action--payment" leftIcon={<i className="fa-solid fa-plus" />}>
                            ثبت پرداخت
                          </Button>
                        ) : (
                          <FinancialStatusBadge label="تسویه شده" tone="success" icon="fa-solid fa-circle-check" size="sm" />
                        )}
                      </div>

                      {isExp && (
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/45">
                          {(p as any).transactions && (p as any).transactions.length > 0 ? (
                            <div className="space-y-2">
                              <div className="text-xs font-black text-slate-700 dark:text-slate-200">تاریخچه پرداخت</div>
                              {(p as any).transactions.map((tx: any) => (
                                <div key={tx.id} className="flex items-start justify-between gap-3 rounded-xl bg-white p-3 dark:bg-slate-950/60">
                                  <div className="text-xs text-slate-500 dark:text-slate-400">
                                    <div><span className="font-black text-slate-900 dark:text-slate-50">{formatPrice(tx.amount_paid)}</span> • {toShamsiSafe(tx.payment_date)}</div>
                                    {tx.notes ? <div className="mt-1">{tx.notes}</div> : null}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button className="finance-table-action finance-table-action--edit" variant="warning" size="xs" onClick={() => openEditTx(tx)} title="ویرایش پرداخت" leftIcon={<i className="fa-solid fa-pen" />} />
                                    <Button className="finance-table-action finance-table-action--danger" variant="danger" size="xs" onClick={() => handleDeleteTx(tx)} title="حذف پرداخت" leftIcon={<i className="fa-solid fa-trash" />} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">پرداختی برای این قسط ثبت نشده است.</div>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        );      })()}

      {/* Quick Payment Summary */}
      {isQuickPaymentSummaryOpen && currentPayment && (() => {
        const remaining = getPaymentRemaining(currentPayment);
        const dueMeta = getPaymentDueMeta(currentPayment);
        const dueToneClass =
          dueMeta.tone === 'danger' ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200' :
          dueMeta.tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200' :
          dueMeta.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200' :
          'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200';
        return (
          <Modal
            title="خلاصه پرداخت سریع"
            onClose={() => setIsQuickPaymentSummaryOpen(false)}
            widthClass="max-w-xl"
          >
            <div className="space-y-4 p-2 text-sm">
              <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/80">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">NEXT INSTALLMENT</div>
                    <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-slate-50">قسط شماره {currentPayment.installmentNumber.toLocaleString('fa-IR')}</h3>
                    <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">قبل از ثبت، این خلاصه نشان می‌دهد پرداخت سریع دقیقاً روی کدام قسط اعمال می‌شود.</p>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black ${dueToneClass}`}>
                    <i className="fa-solid fa-calendar-check" /> {dueMeta.label}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-[18px] border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                    <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400"><i className="fa-regular fa-calendar" /> سررسید</div>
                    <div className="mt-2 font-black text-slate-900 dark:text-slate-50">{toShamsiSafe(currentPayment.dueDate)}</div>
                  </div>
                  <div className="rounded-[18px] border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                    <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400"><i className="fa-solid fa-sack-dollar" /> مبلغ قسط</div>
                    <div className="mt-2 font-black text-slate-900 dark:text-slate-50">{formatPrice(currentPayment.amountDue)}</div>
                  </div>
                  <div className="rounded-[18px] border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                    <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400"><i className="fa-solid fa-coins" /> پرداخت‌شده</div>
                    <div className="mt-2 font-black text-slate-900 dark:text-slate-50">{formatPrice(getTotalPaid(currentPayment))}</div>
                  </div>
                  <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                    <div className="flex items-center gap-2 text-[11px] font-black text-emerald-700 dark:text-emerald-200"><i className="fa-solid fa-hand-holding-dollar" /> مبلغ پیشنهادی پرداخت سریع</div>
                    <div className="mt-2 font-black text-emerald-700 dark:text-emerald-200">{formatPrice(remaining)}</div>
                  </div>
                </div>
              </div>

              <div className="premium-sticky-footer flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" size="md" onClick={() => setIsQuickPaymentSummaryOpen(false)} leftIcon={<i className="fa-solid fa-xmark" />}>
                  انصراف
                </Button>
                <Button type="button" variant="success" size="md" onClick={continueFromQuickPaymentSummary} disabled={remaining <= 0} leftIcon={<i className="fa-solid fa-arrow-left" />}>
                  ادامه و ثبت پرداخت
                </Button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Payment Modal */}
      {isPaymentModalOpen && currentPayment && (
        <Modal
          title={`ثبت اطلاعات پرداخت برای قسط شماره ${currentPayment.installmentNumber.toLocaleString('fa-IR')}`}
          onClose={() => setIsPaymentModalOpen(false)}
          widthClass="max-w-6xl"
          iconClass="fa-solid fa-wallet"
          wrapperClassName="installment-payment-modal-shell-v444"
        >
          <form onSubmit={handleSubmitPartialPayment} className="installment-payment-modal p-1 text-sm">
            <aside className="installment-payment-modal__summary">
              <div className="installment-payment-modal__summary-head">
                <span className="installment-payment-modal__summary-icon">
                  <i className="fa-solid fa-file-invoice-dollar" />
                </span>
                <div>
                  <div className="installment-payment-modal__eyebrow">INSTALLMENT PAYMENT</div>
                  <h3>قسط شماره {currentPayment.installmentNumber.toLocaleString('fa-IR')}</h3>
                  <p>پرداخت جدید را ثبت کن تا مانده قسط، وضعیت پرونده و دفتر مشتری هم‌زمان به‌روزرسانی شود.</p>
                </div>
              </div>

              <div className="installment-payment-modal__status-chip">
                <i className="fa-solid fa-circle-info" />
                {currentPayment.status || 'فعال'}
              </div>

              <div className="installment-payment-modal__metric-grid">
                <div className="installment-payment-modal__metric">
                  <span><i className="fa-solid fa-sack-dollar" /> مبلغ کل قسط</span>
                  <strong>{formatPrice(currentPayment.amountDue)}</strong>
                </div>
                <div className="installment-payment-modal__metric installment-payment-modal__metric--success">
                  <span><i className="fa-solid fa-coins" /> پرداختی تا الان</span>
                  <strong>{formatPrice(getTotalPaid(currentPayment))}</strong>
                </div>
                <div className="installment-payment-modal__metric installment-payment-modal__metric--warning">
                  <span><i className="fa-regular fa-clipboard" /> مانده فعلی</span>
                  <strong>{formatPrice(getPaymentRemaining(currentPayment))}</strong>
                </div>
              </div>

              <div className="installment-payment-modal__history">
                <div className="installment-payment-modal__section-title">
                  <span><i className="fa-regular fa-clock" /> تاریخچه پرداخت‌ها</span>
                  <small>{(currentPayment.transactions?.length || 0).toLocaleString('fa-IR')} ثبت</small>
                </div>
                <div className="installment-payment-modal__history-list">
                  {(currentPayment.transactions && currentPayment.transactions.length > 0) ? (
                    currentPayment.transactions.map((tx: any) => (
                      <div key={tx.id} className="installment-payment-modal__history-item">
                        <div className="min-w-0">
                          <div className="installment-payment-modal__history-amount">
                            <span>{formatPrice(tx.amount_paid)}</span>
                            <span>{toShamsiSafe(tx.payment_date)}</span>
                          </div>
                          <div className="installment-payment-modal__history-note">{tx.notes || 'بدون یادداشت تکمیلی'}</div>
                        </div>
                        <div className="installment-payment-modal__history-actions">
                          <Button className="finance-table-action finance-table-action--edit" variant="warning" size="xs" onClick={() => openEditTx(tx)} title="ویرایش اطلاعات" leftIcon={<i className="fa-solid fa-pen" />} />
                          <Button className="finance-table-action finance-table-action--danger" variant="danger" size="xs" onClick={() => handleDeleteTx(tx)} title="حذف مورد" leftIcon={<i className="fa-solid fa-trash" />} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="installment-payment-modal__empty">هنوز برای این قسط پرداختی ثبت نشده است.</div>
                  )}
                </div>
              </div>
            </aside>

            <section className="installment-payment-modal__main">
              <div className="installment-payment-modal__form-head">
                <span><i className="fa-solid fa-plus" /></span>
                <div>
                  <div className="installment-payment-modal__eyebrow">NEW PAYMENT ENTRY</div>
                  <h3>ثبت پرداخت جدید</h3>
                </div>
              </div>

              <div className="installment-payment-modal__fields">
                <div className="installment-payment-modal__field installment-payment-modal__field--amount">
                  <label htmlFor="paymentAmount"><i className="fa-solid fa-coins" /> مبلغ پرداختی جدید</label>
                  <PriceInput
                    id="paymentAmount"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    className="w-full text-left"
                    preview="مثلاً ۵,۰۰۰,۰۰۰"
                    topLabel=""
                    suffix=""
                    required
                  />
                  <div className="installment-payment-modal__after-chip">
                    <i className="fa-solid fa-calculator" />
                    مانده پس از این پرداخت:
                    <strong>
                      {formatPrice(
                        Math.max(
                          0,
                          toNumber(currentPayment.amountDue) - getTotalPaid(currentPayment) - toNumber(paymentAmount)
                        )
                      )}
                    </strong>
                  </div>
                </div>

                <div className="installment-payment-modal__field">
                  <label htmlFor="paymentDate"><i className="fa-solid fa-calendar-day" /> تاریخ پرداخت</label>
                  <ShamsiDatePicker id="paymentDate" selectedDate={paymentDate} onDateChange={setPaymentDate} />
                </div>

                <div className="installment-payment-modal__field installment-payment-modal__field--wide">
                  <label htmlFor="paymentNotes"><i className="fa-solid fa-note-sticky" /> یادداشت اختیاری</label>
                  <input
                    id="paymentNotes"
                    type="text"
                    value={paymentNotes}
                    onChange={e => setPaymentNotes(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition  dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 "
                    placeholder="مثلاً: پرداخت کارت‌خوان / واریز بانکی / تسویه بخشی از قسط"
                  />
                </div>
              </div>

              <div className="installment-payment-modal__actions premium-sticky-footer">
                <Button type="button" onClick={() => setIsPaymentModalOpen(false)} variant="secondary" size="md" leftIcon={<i className="fa-solid fa-xmark" />}>
                  انصراف
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingPayment}
                  loading={isSubmittingPayment}
                  loadingText="در حال ثبت اطلاعات..."
                  loadingHint={paymentStageHint}
                  loadingStageStep={paymentStageProgress}
                  loadingStageTotal={3}
                  loadingStageIcon={paymentStageIcon}
                  successPulseText="پرداخت ثبت شد"
                  successPulseHint="قسط، مانده مشتری و دفتر حساب به‌روزرسانی شد"
                  variant="success"
                  size="md"
                  leftIcon={!isSubmittingPayment ? <i className="fa-solid fa-check" /> : undefined}
                  className="min-w-[12rem]"
                >
                  ثبت اطلاعات پرداخت
                </Button>
              </div>
            </section>
          </form>
        </Modal>
      )}


      {/* Edit Transaction Modal */}
      {isEditTxModalOpen && editingTx && (() => {
        const originalAmount = toNumber(editingTx.amount_paid ?? editingTx.amountPaid ?? 0);
        const editedAmount = toNumber(editTxAmount);
        const nextRemaining = currentPayment
          ? Math.max(0, toNumber(currentPayment.amountDue) - (getTotalPaid(currentPayment) - originalAmount + editedAmount))
          : 0;
        const customerName = sale?.customerFullName || sale?.customerName || 'پرونده مشتری';
        return (
          <Modal
            title="ویرایش ریز پرداخت"
            onClose={() => setIsEditTxModalOpen(false)}
            widthClass="max-w-6xl"
            iconClass="fa-solid fa-pen-to-square"
            variant="expansive"
            wrapperClassName="installment-edit-tx-modal-shell-v445"
          >
            <div className="installment-edit-tx-modal p-1 text-sm">
              <aside className="installment-edit-tx-modal__summary">
                <div className="installment-edit-tx-modal__summary-head">
                  <span className="installment-edit-tx-modal__summary-icon">
                    <i className="fa-solid fa-receipt" />
                  </span>
                  <div>
                    <div className="installment-edit-tx-modal__eyebrow">PAYMENT DETAIL EDITOR</div>
                    <h3>بازنگری ریز پرداخت ثبت‌شده</h3>
                    <p>جزئیات این ریزپرداخت را بدون به‌هم‌زدن نظم پرونده، به‌صورت دقیق و افقی به‌روزرسانی کن.</p>
                  </div>
                </div>

                <div className="installment-edit-tx-modal__status-row">
                  <span className="installment-edit-tx-modal__status-chip">
                    <i className="fa-solid fa-layer-group" />
                    ریزپرداخت ثبت‌شده
                  </span>
                  {currentPayment ? (
                    <span className="installment-edit-tx-modal__status-chip installment-edit-tx-modal__status-chip--soft">
                      <i className="fa-solid fa-file-invoice-dollar" />
                      قسط شماره {currentPayment.installmentNumber.toLocaleString('fa-IR')}
                    </span>
                  ) : null}
                </div>

                <div className="installment-edit-tx-modal__metric-grid">
                  <div className="installment-edit-tx-modal__metric">
                    <span><i className="fa-solid fa-sack-dollar" /> مبلغ ثبت‌شده فعلی</span>
                    <strong>{formatPrice(originalAmount)}</strong>
                  </div>
                  <div className="installment-edit-tx-modal__metric">
                    <span><i className="fa-regular fa-calendar" /> تاریخ فعلی</span>
                    <strong>{toShamsiSafe(editingTx.payment_date)}</strong>
                  </div>
                  <div className="installment-edit-tx-modal__metric installment-edit-tx-modal__metric--soft">
                    <span><i className="fa-solid fa-user" /> پرونده</span>
                    <strong>{customerName}</strong>
                  </div>
                  <div className="installment-edit-tx-modal__metric installment-edit-tx-modal__metric--accent">
                    <span><i className="fa-solid fa-scale-balanced" /> مانده پس از ویرایش</span>
                    <strong>{formatPrice(nextRemaining)}</strong>
                  </div>
                </div>

                <div className="installment-edit-tx-modal__note-card">
                  <div className="installment-edit-tx-modal__section-title">
                    <span><i className="fa-solid fa-note-sticky" /> توضیح ثبت‌شده</span>
                    <small>نسخه فعلی</small>
                  </div>
                  <p>{editingTx.notes || 'برای این ریزپرداخت توضیحی ثبت نشده است.'}</p>
                </div>
              </aside>

              <section className="installment-edit-tx-modal__main">
                <div className="installment-edit-tx-modal__form-head">
                  <span><i className="fa-solid fa-pen-ruler" /></span>
                  <div>
                    <div className="installment-edit-tx-modal__eyebrow">EDIT PAYMENT ENTRY</div>
                    <h3>ویرایش اطلاعات پرداخت</h3>
                    <p>مبلغ، تاریخ و یادداشت را به‌صورت دقیق اصلاح کن. ذخیره‌سازی، وضعیت پرونده و مانده را هماهنگ نگه می‌دارد.</p>
                  </div>
                </div>

                <div className="installment-edit-tx-modal__fields">
                  <div className="installment-edit-tx-modal__field installment-edit-tx-modal__field--amount">
                    <label><i className="fa-solid fa-coins" /> مبلغ ویرایش‌شده</label>
                    <PriceInput
                      value={editTxAmount}
                      onChange={e => setEditTxAmount(e.target.value)}
                      className="w-full text-left"
                      topLabel=""
                      suffix=""
                      preview="مثلاً ۱۰,۵۰۰,۰۰۰"
                    />
                  </div>

                  <div className="installment-edit-tx-modal__field">
                    <label><i className="fa-solid fa-calendar-day" /> تاریخ پرداخت</label>
                    <ShamsiDatePicker selectedDate={editTxDate} onDateChange={setEditTxDate} />
                  </div>

                  <div className="installment-edit-tx-modal__field installment-edit-tx-modal__field--wide">
                    <label><i className="fa-solid fa-note-sticky" /> یادداشت تکمیلی</label>
                    <input
                      value={editTxNotes}
                      onChange={e => setEditTxNotes(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition  dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 "
                      placeholder="مثلاً: اصلاح مبلغ کارت‌خوان / ثبت واریز دقیق / بروزرسانی توضیح"
                    />
                  </div>
                </div>

                <div className="installment-edit-tx-modal__helper-row">
                  <span className="installment-edit-tx-modal__helper-chip">
                    <i className="fa-solid fa-calculator" />
                    پس از ثبت، مانده قسط برابر با <strong>{formatPrice(nextRemaining)}</strong> خواهد بود.
                  </span>
                </div>

                <div className="installment-edit-tx-modal__actions premium-sticky-footer">
                  <Button variant="secondary" size="md" onClick={() => setIsEditTxModalOpen(false)} leftIcon={<i className="fa-solid fa-xmark" />}>
                    انصراف
                  </Button>
                  <Button variant="primary" size="md" onClick={handleSaveTx} leftIcon={<i className="fa-solid fa-floppy-disk" />}>
                    ذخیره تغییرات
                  </Button>
                </div>
              </section>
            </div>
          </Modal>
        );
      })()}

      {/* Check cash recovery modal */}
      {isCheckCashModalOpen && cashCheck && (() => {
        const cashPaid = toNumber((cashCheck as any).cashPaid);
        const cashRemaining = Math.max(0, toNumber((cashCheck as any).cashRemaining ?? cashCheck.amount));
        const afterPayment = Math.max(0, cashRemaining - toNumber(checkCashAmount));
        return (
          <Modal title={`ثبت دریافت نقدی بابت چک شماره ${cashCheck.checkNumber}`} onClose={() => setIsCheckCashModalOpen(false)} widthClass="max-w-5xl">
            <form onSubmit={handleSubmitCheckCashPayment} className="p-2 text-sm">
              <div className="grid gap-4 lg:grid-cols-[0.95fr_1.35fr]">
                <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-slate-900 dark:text-slate-50">خلاصه وضعیت چک</div>
                      <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Check recovery summary</div>
                    </div>
                    <span className={`shrink-0 px-2.5 py-1 text-xs rounded-full font-black ${getCheckStatusColor(cashCheck.status)}`}>{cashCheck.status}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-950/40 dark:ring-slate-800">
                      <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">مبلغ چک</div>
                      <div className="mt-1 whitespace-nowrap font-black text-slate-900 dark:text-slate-50">{formatPrice(cashCheck.amount)}</div>
                    </div>
                    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-950/40 dark:ring-slate-800">
                      <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">سررسید</div>
                      <div className="mt-1 whitespace-nowrap font-black text-slate-900 dark:text-slate-50">{formatIsoToShamsi(cashCheck.dueDate)}</div>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700 ring-1 ring-emerald-200/70 dark:bg-emerald-950/25 dark:text-emerald-200 dark:ring-emerald-900/40">
                      <div className="text-[11px] font-black">دریافت‌شده نقدی</div>
                      <div className="mt-1 whitespace-nowrap font-black">{formatPrice(cashPaid)}</div>
                    </div>
                    <div className="rounded-2xl bg-orange-50 p-3 text-orange-700 ring-1 ring-orange-200/70 dark:bg-orange-950/25 dark:text-orange-200 dark:ring-orange-900/40">
                      <div className="text-[11px] font-black">مانده قابل دریافت</div>
                      <div className="mt-1 whitespace-nowrap font-black">{formatPrice(cashRemaining)}</div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/40">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-200">
                      <i className="fa-solid fa-calculator" /> نتیجه بعد از این دریافت
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="text-xs text-slate-500 dark:text-slate-400">مانده جدید</span>
                      <strong className="whitespace-nowrap text-sm text-slate-900 dark:text-slate-50">{formatPrice(afterPayment)}</strong>
                    </div>
                  </div>
                </aside>

                <section className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/35">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label htmlFor="checkCashAmount" className="mb-1 block text-xs font-black text-slate-700 dark:text-slate-200">مبلغ دریافت نقدی جدید</label>
                      <PriceInput
                        id="checkCashAmount"
                        value={checkCashAmount}
                        onChange={e => setCheckCashAmount(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 p-2 text-left dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        preview="مثلاً ۵,۰۰۰,۰۰۰"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-black text-slate-700 dark:text-slate-200">تاریخ دریافت</label>
                      <ShamsiDatePicker selectedDate={checkCashDate} onDateChange={setCheckCashDate} />
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor="checkCashNotes" className="mb-1 block text-xs font-black text-slate-700 dark:text-slate-200">توضیحات</label>
                      <textarea
                        id="checkCashNotes"
                        value={checkCashNotes}
                        onChange={e => setCheckCashNotes(e.target.value)}
                        rows={4}
                        className="w-full rounded-2xl border border-gray-300 p-3 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        placeholder="مثلاً: دریافت مرحله اول بابت چک برگشتی"
                      />
                    </div>
                  </div>

                  <div className="premium-sticky-footer mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button type="button" variant="secondary" size="md" onClick={() => setIsCheckCashModalOpen(false)} leftIcon={<i className="fa-solid fa-xmark" />}>
                      انصراف
                    </Button>
                    <Button type="submit" variant="success" size="md" disabled={isSubmittingCheckCash || toNumber(checkCashAmount) <= 0 || toNumber(checkCashAmount) > cashRemaining + 1} leftIcon={<i className="fa-solid fa-floppy-disk" />}>
                      {isSubmittingCheckCash ? 'در حال ثبت...' : 'ثبت دریافت نقدی'}
                    </Button>
                  </div>
                </section>
              </div>
            </form>
          </Modal>
        );
      })()}

      {/* Check edit modal */}
      {isEditCheckModalOpen && editingCheck && (
        <Modal title={`ویرایش اطلاعات چک شماره ${editingCheck.checkNumber}`} onClose={() => setIsEditCheckModalOpen(false)} widthClass="max-w-4xl">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]" dir="rtl">
            <section className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/45">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                  <i className="fa-solid fa-money-check" />
                </span>
                <div className="min-w-0">
                  <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">خلاصه چک</div>
                  <div className="mt-1 text-base font-black text-slate-950 dark:text-slate-50">چک شماره {editingCheck.checkNumber || '—'}</div>
                  <div className="mt-1 text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">اطلاعات اصلی چک را بررسی کن و وضعیت وصول را در ستون کناری تغییر بده.</div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400"><i className="fa-solid fa-building-columns" />بانک</div>
                  <div className="mt-1 text-sm font-black text-slate-900 dark:text-slate-50">{editingCheck.bankName || 'ثبت نشده'}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400"><i className="fa-regular fa-calendar-check" />سررسید</div>
                  <div className="mt-1 text-sm font-black text-slate-900 dark:text-slate-50">{formatIsoToShamsi(editingCheck.dueDate)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 sm:col-span-2">
                  <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400"><i className="fa-solid fa-sack-dollar" />مبلغ چک</div>
                  <div className="mt-1 text-lg font-black text-slate-950 dark:text-slate-50">{formatPrice(editingCheck.amount)}</div>
                </div>
              </div>
            </section>

            <section className="rounded-[26px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">وضعیت وصول</div>
                  <h3 className="mt-1 text-base font-black text-slate-950 dark:text-slate-50">ویرایش وضعیت چک</h3>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  {editingCheck.status || 'بدون وضعیت'}
                </span>
              </div>

              <div className="mt-4">
                <label htmlFor="checkStatus" className="mb-2 flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-200">
                  <i className="fa-solid fa-list-check text-slate-400" />
                  وضعیت جدید چک
                </label>
                <select
                  id="checkStatus"
                  name="status"
                  value={editingCheck.status}
                  onChange={handleEditCheckChange}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition    dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100  "
                >
                  {CHECK_STATUSES_OPTIONS.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-xs font-bold leading-6 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-200">
                <i className="fa-solid fa-circle-info ml-1" />
                برای چک برگشتی یا عودت‌شده، ثبت دریافت نقدی از داخل کارت چک انجام می‌شود.
              </div>

              <div className="premium-sticky-footer mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" onClick={() => setIsEditCheckModalOpen(false)} variant="secondary" size="md" leftIcon={<i className="fa-solid fa-xmark" />}>
                  انصراف
                </Button>
                <Button type="button" onClick={handleSaveCheckChanges} variant="primary" size="md" leftIcon={<i className="fa-solid fa-floppy-disk" />}>
                  ذخیره تغییرات
                </Button>
              </div>
            </section>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default InstallmentSaleDetailPage;
