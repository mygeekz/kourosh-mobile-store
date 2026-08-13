import React, { useEffect, useState } from 'react';
import moment from 'jalali-moment';

import { AppModal } from './modals';
import { DialogActions, ModalField, PanelCard, SelectField, TextareaField, TextField } from './ui';
import PriceInput from './PriceInput';
import ShamsiDatePicker from './ShamsiDatePicker';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/apiFetch';
import { getAuthHeaders } from '../utils/apiUtils';
import { formatCurrencyText, readStoredCurrencyUnit } from '../utils/currency';

type RefundMethod = 'cash' | 'card' | 'bank_transfer' | 'other';

type RefundState = {
  expectedRefundDue: number;
  refundedAmount: number;
  remainingRefund: number;
  refundStatus: string;
  settlementStatus?: string | null;
};

type Props = {
  isOpen: boolean;
  saleId: number;
  refundState: RefundState | null | undefined;
  onClose: () => void;
  onSaved: (message: string) => void;
};

const InstallmentCancellationRefundModal: React.FC<Props> = ({
  isOpen,
  saleId,
  refundState,
  onClose,
  onSaved,
}) => {
  const { token } = useAuth();
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<Date | null>(new Date());
  const [paymentMethod, setPaymentMethod] = useState<RefundMethod>('bank_transfer');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatPrice = (value: number | null | undefined) =>
    formatCurrencyText(Number(value || 0), readStoredCurrencyUnit());

  useEffect(() => {
    if (!isOpen) return;
    setAmount(String(Math.max(0, Number(refundState?.remainingRefund || 0))) || '');
    setPaymentDate(new Date());
    setPaymentMethod('bank_transfer');
    setReferenceNo('');
    setNotes('');
    setError(null);
  }, [isOpen, saleId, refundState?.remainingRefund]);

  const submit = async () => {
    if (!token || isSubmitting) return;
    const numericAmount = Number(amount || 0);
    const remaining = Math.max(0, Number(refundState?.remainingRefund || 0));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('مبلغ بازپرداخت باید بیشتر از صفر باشد.');
      return;
    }
    if (numericAmount > remaining + 0.00001) {
      setError('مبلغ بازپرداخت نمی‌تواند از مانده قابل استرداد بیشتر باشد.');
      return;
    }
    if (!paymentDate) {
      setError('تاریخ واقعی بازپرداخت الزامی است.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await apiFetch(`/api/installment-sales/${saleId}/cancellation/refunds`, {
        method: 'POST',
        headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numericAmount,
          paymentDate: moment(paymentDate).locale('fa').format('jYYYY/jMM/jDD'),
          paymentMethod,
          referenceNo: referenceNo.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || 'ثبت بازپرداخت انجام نشد.');
      }
      onSaved(payload?.message || 'بازپرداخت ثبت شد.');
      onClose();
    } catch (cause: any) {
      setError(cause?.message || 'خطا در ثبت بازپرداخت فسخ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AppModal
      isOpen={isOpen}
      title={`ثبت بازپرداخت فسخ قرارداد #${Number(saleId).toLocaleString('fa-IR')}`}
      onClose={onClose}
      layout="horizontal"
      size="wide"
      variant="operational"
      tone="warning"
      iconClass="fa-solid fa-money-bill-transfer"
      kicker="تسویه واقعی مبلغ قابل استرداد"
      ariaDescription="ثبت پرداخت کامل یا جزئی مبلغ قابل استرداد قرارداد فسخ‌شده"
      closeOnBackdrop={!isSubmitting}
      closeOnEscape={!isSubmitting}
    >
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <PanelCard variant="metric" title="قابل استرداد اولیه" metricValue={formatPrice(refundState?.expectedRefundDue)} metricHint="تعهد ثبت‌شده هنگام فسخ" tone="neutral" icon={<i className="fa-solid fa-file-invoice-dollar" />} density="compact" />
          <PanelCard variant="metric" title="بازپرداخت‌شده" metricValue={formatPrice(refundState?.refundedAmount)} metricHint="پرداخت‌های واقعی ثبت‌شده" tone="success" icon={<i className="fa-solid fa-circle-check" />} density="compact" />
          <PanelCard variant="metric" title="مانده قابل استرداد" metricValue={formatPrice(refundState?.remainingRefund)} metricHint="حداکثر مبلغ قابل ثبت در این مرحله" tone="warning" icon={<i className="fa-solid fa-wallet" />} density="compact" />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <ModalField label="مبلغ بازپرداخت" iconClass="fa-solid fa-coins" required>
            <PriceInput
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              topLabel="مبلغ بازپرداخت"
              suffix="تومان"
              showWords
              required
            />
          </ModalField>

          <ModalField label="تاریخ واقعی پرداخت" iconClass="fa-solid fa-calendar-day" required hint="این تاریخ مستقیماً در Cashflow و دفتر مشتری استفاده می‌شود.">
            <ShamsiDatePicker
              id="installmentCancellationRefundDate"
              selectedDate={paymentDate}
              onDateChange={setPaymentDate}
              size="compact"
            />
          </ModalField>

          <ModalField label="روش بازپرداخت" iconClass="fa-solid fa-money-check-dollar" required>
            <SelectField
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as RefundMethod)}
              options={[
                { value: 'cash', label: 'نقدی' },
                { value: 'card', label: 'کارت / کارت‌خوان' },
                { value: 'bank_transfer', label: 'انتقال بانکی' },
                { value: 'other', label: 'سایر' },
              ]}
            />
          </ModalField>

          <ModalField label="شماره پیگیری / مرجع" iconClass="fa-solid fa-hashtag" hint="برای انتقال بانکی یا کارت، ثبت شماره پیگیری توصیه می‌شود.">
            <TextField
              value={referenceNo}
              onChange={(event) => setReferenceNo(event.target.value)}
              placeholder="مثلاً شماره پیگیری بانکی"
            />
          </ModalField>
        </div>

        <ModalField label="یادداشت بازپرداخت" iconClass="fa-solid fa-note-sticky" hint="اختیاری؛ سند اصلی بازپرداخت پس از ثبت قابل ویرایش یا حذف نیست.">
          <TextareaField
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="توضیح تکمیلی درباره نحوه یا توافق بازپرداخت..."
          />
        </ModalField>

        {error ? (
          <PanelCard title="ثبت بازپرداخت انجام نشد" subtitle={error} icon={<i className="fa-solid fa-circle-exclamation" />} tone="danger" density="compact" />
        ) : null}

        <DialogActions
          onCancel={onClose}
          cancelText="انصراف"
          submitText="ثبت بازپرداخت"
          submittingText="در حال ثبت بازپرداخت..."
          isSubmitting={isSubmitting}
          submitDisabled={!amount || Number(amount) <= 0 || !paymentDate || Number(refundState?.remainingRefund || 0) <= 0}
          onSubmitClick={submit}
          submitType="button"
          submitVariant="primary"
          submitIconClass="fa-solid fa-money-bill-transfer"
          helperTitle="سند غیرقابل حذف"
          helperText="ثبت این پرداخت هم‌زمان دفتر مشتری، مانده قابل استرداد و Cashflow را به‌روزرسانی می‌کند."
          hideHelper={false}
        />
      </div>
    </AppModal>
  );
};

export default InstallmentCancellationRefundModal;
