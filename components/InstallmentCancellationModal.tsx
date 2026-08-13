import React, { useEffect, useMemo, useState } from 'react';

import { AppModal } from './modals';
import {
  Button,
  CheckboxField,
  DialogActions,
  EmptyState,
  ModalField,
  PanelCard,
  Skeleton,
  TextareaField,
} from './ui';
import { useAuth } from '../contexts/AuthContext';
import type { InstallmentSale } from '../types';
import { apiFetch } from '../utils/apiFetch';
import { getAuthHeaders } from '../utils/apiUtils';
import { formatCurrencyText, readStoredCurrencyUnit } from '../utils/currency';

type CancellationMode = 'full_reversal' | 'review_required';

type Preview = {
  saleId: number;
  saleStatus: 'active' | 'canceled';
  existingCancellation?: any;
  contract: {
    actualSalePrice: number;
    downPayment: number;
    contractDebt: number;
    itemsSummary?: string | null;
  };
  receivable: {
    collectedAfterDownPayment: number;
    remaining: number;
    overpayment: number;
    expectedRefundDue: number;
    ledgerRecordedReceipts: number;
    receiptLedgerGap: number;
  };
  inventory: {
    physicalItems: any[];
    physicalItemRows: number;
    physicalQuantity: number;
  };
  checks: {
    total: number;
    unused: number;
    cashed: number;
    returned: number;
    unusedItems: any[];
  };
  reconciliation: {
    issueCount: number;
    highIssueCount: number;
    issueKeys: string[];
  };
  effects: {
    mode: CancellationMode;
    willReverseContractCharge: boolean;
    reversalCredit: number;
    downPaymentRefundCredit: number;
    expectedRefundDue: number;
    financialTermsRemainForReview: boolean;
  };
};

type Props = {
  isOpen: boolean;
  sale: InstallmentSale | null;
  onClose: () => void;
  onCanceled: (message: string) => void;
};

const InstallmentCancellationModal: React.FC<Props> = ({ isOpen, sale, onClose, onCanceled }) => {
  const { token } = useAuth();
  const [mode, setMode] = useState<CancellationMode>('review_required');
  const [reason, setReason] = useState('');
  const [returnPhysicalItems, setReturnPhysicalItems] = useState(false);
  const [returnUnusedChecks, setReturnUnusedChecks] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatPrice = (value: number | null | undefined) =>
    formatCurrencyText(Number(value || 0), readStoredCurrencyUnit());

  useEffect(() => {
    if (!isOpen) return;
    setMode('review_required');
    setReason('');
    setReturnPhysicalItems(false);
    setReturnUnusedChecks(false);
    setPreview(null);
    setError(null);
  }, [isOpen, sale?.id]);

  useEffect(() => {
    if (!isOpen || !sale?.id || !token) return;
    let cancelled = false;
    const load = async () => {
      setIsLoadingPreview(true);
      setError(null);
      try {
        const response = await apiFetch(`/api/installment-sales/${sale.id}/cancellation/preview`, {
          method: 'POST',
          headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode }),
        });
        const payload = await response.json();
        if (!response.ok || payload?.success === false) {
          throw new Error(payload?.message || 'پیش‌نمایش فسخ قرارداد دریافت نشد.');
        }
        if (!cancelled) setPreview(payload.data as Preview);
      } catch (cause: any) {
        if (!cancelled) setError(cause?.message || 'خطا در بررسی اثرات فسخ قرارداد.');
      } finally {
        if (!cancelled) setIsLoadingPreview(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, sale?.id, mode, token]);

  const fullReversalBlocked = useMemo(
    () => mode === 'full_reversal' && Number(preview?.inventory.physicalItemRows || 0) > 0 && !returnPhysicalItems,
    [mode, preview?.inventory.physicalItemRows, returnPhysicalItems],
  );

  const submit = async () => {
    if (!sale?.id || !token || isSubmitting) return;
    if (!reason.trim()) {
      setError('ثبت دلیل فسخ قرارداد الزامی است.');
      return;
    }
    if (fullReversalBlocked) {
      setError('برای برگشت کامل مالی، بازگشت همه اقلام فیزیکی باید تأیید شود.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await apiFetch(`/api/installment-sales/${sale.id}/cancel`, {
        method: 'POST',
        headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reason.trim(),
          mode,
          returnPhysicalItems,
          returnUnusedChecks,
        }),
      });
      const payload = await response.json();
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || 'فسخ قرارداد انجام نشد.');
      }
      onCanceled(payload?.message || 'قرارداد فسخ شد.');
      onClose();
    } catch (cause: any) {
      setError(cause?.message || 'خطا در فسخ قرارداد.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !sale) return null;

  return (
    <AppModal
      isOpen={isOpen}
      title={`فسخ قرارداد اقساطی #${Number(sale.id).toLocaleString('fa-IR')}`}
      onClose={onClose}
      layout="horizontal"
      size="wide"
      variant="operational"
      tone="danger"
      iconClass="fa-solid fa-file-circle-xmark"
      kicker="فسخ غیرمخرب و قابل حسابرسی"
      ariaDescription="پیش‌نمایش اثرات مالی، انبار، چک و مغایرت‌ها پیش از فسخ قرارداد"
      closeOnBackdrop={!isSubmitting}
      closeOnEscape={!isSubmitting}
    >
      <div className="space-y-4">
        {isLoadingPreview ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24" />)}
          </div>
        ) : preview ? (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <PanelCard variant="metric" title="مانده قبل از فسخ" metricValue={formatPrice(preview.receivable.remaining)} metricHint="مانده فعال فعلی قرارداد" tone="warning" icon={<i className="fa-solid fa-wallet" />} density="compact" />
              <PanelCard variant="metric" title="وصول پس از پیش‌پرداخت" metricValue={formatPrice(preview.receivable.collectedAfterDownPayment)} metricHint="از تراکنش‌ها و چک‌های وصول‌شده" tone="success" icon={<i className="fa-solid fa-coins" />} density="compact" />
              <PanelCard variant="metric" title="مغایرت‌های موجود" metricValue={Number(preview.reconciliation.issueCount).toLocaleString('fa-IR')} metricHint="مانع فسخ نمی‌شوند" tone={preview.reconciliation.issueCount ? 'danger' : 'success'} icon={<i className="fa-solid fa-scale-balanced" />} density="compact" />
              <PanelCard variant="metric" title="چک استفاده‌نشده" metricValue={Number(preview.checks.unused).toLocaleString('fa-IR')} metricHint="فقط با تأیید شما عودت‌شده ثبت می‌شود" tone={preview.checks.unused ? 'warning' : 'neutral'} icon={<i className="fa-solid fa-money-check" />} density="compact" />
            </div>

            <PanelCard
              title="روش فسخ"
              subtitle="فسخ در هر دو حالت انجام می‌شود؛ تفاوت فقط در میزان عملیات مالی قابل‌اثبات است."
              icon={<i className="fa-solid fa-code-branch" />}
              tone="neutral"
              density="compact"
            >
              <div className="grid gap-3 lg:grid-cols-2">
                <Button
                  type="button"
                  variant={mode === 'review_required' ? 'primary' : 'secondary'}
                  onClick={() => setMode('review_required')}
                  leftIcon={<i className="fa-solid fa-magnifying-glass-dollar" />}
                  className="h-auto min-h-20 justify-start whitespace-normal text-start"
                >
                  <span>
                    <strong className="block">فسخ با تسویه و تطبیق باز</strong>
                    <small className="mt-1 block font-medium opacity-80">قرارداد متوقف می‌شود؛ مبلغ، Ledger یا موجودی نامطمئن با حدس تغییر نمی‌کند.</small>
                  </span>
                </Button>
                <Button
                  type="button"
                  variant={mode === 'full_reversal' ? 'danger' : 'secondary'}
                  onClick={() => setMode('full_reversal')}
                  leftIcon={<i className="fa-solid fa-arrow-rotate-left" />}
                  className="h-auto min-h-20 justify-start whitespace-normal text-start"
                >
                  <span>
                    <strong className="block">برگشت کامل و قابل‌اثبات</strong>
                    <small className="mt-1 block font-medium opacity-80">بدهی قرارداد معکوس می‌شود و پیش‌پرداخت به‌عنوان مبلغ قابل استرداد ثبت می‌شود.</small>
                  </span>
                </Button>
              </div>
            </PanelCard>

            {mode === 'full_reversal' ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <PanelCard variant="metric" title="برگشت بدهی قرارداد" metricValue={formatPrice(preview.effects.reversalCredit)} metricHint="Credit معکوس‌کننده سند بدهی اولیه" tone="info" icon={<i className="fa-solid fa-right-left" />} density="compact" />
                <PanelCard variant="metric" title="پیش‌پرداخت قابل استرداد" metricValue={formatPrice(preview.effects.downPaymentRefundCredit)} metricHint="به‌عنوان بدهی فروشگاه به مشتری" tone="warning" icon={<i className="fa-solid fa-hand-holding-dollar" />} density="compact" />
                <PanelCard variant="metric" title="برآورد کل قابل استرداد" metricValue={formatPrice(preview.effects.expectedRefundDue)} metricHint="پیش‌پرداخت + وصول‌های واقعی ثبت‌شده" tone="danger" icon={<i className="fa-solid fa-receipt" />} density="compact" />
              </div>
            ) : null}

            <PanelCard
              title="تأیید اثرات عینی فسخ"
              subtitle="فقط مواردی را تأیید کنید که واقعاً انجام شده‌اند."
              icon={<i className="fa-solid fa-list-check" />}
              tone="neutral"
              density="compact"
            >
              <div className="grid gap-3 md:grid-cols-2">
                <CheckboxField
                  checked={returnPhysicalItems}
                  onChange={(event) => setReturnPhysicalItems(event.target.checked)}
                  label="همه اقلام فیزیکی این قرارداد به فروشگاه برگشته‌اند"
                  description={`${Number(preview.inventory.physicalItemRows).toLocaleString('fa-IR')} ردیف فیزیکی؛ با تأیید، موجودی و وضعیت گوشی/فروش کالا معکوس می‌شود.`}
                />
                <CheckboxField
                  checked={returnUnusedChecks}
                  onChange={(event) => setReturnUnusedChecks(event.target.checked)}
                  label="همه چک‌های استفاده‌نشده به مشتری برگشت داده شده‌اند"
                  description={`${Number(preview.checks.unused).toLocaleString('fa-IR')} چک در انتظار تعیین تکلیف؛ فقط چک‌های وصول‌نشده تغییر وضعیت می‌دهند.`}
                />
              </div>
            </PanelCard>

            <ModalField
              label="دلیل فسخ قرارداد"
              iconClass="fa-solid fa-pen-to-square"
              required
              error={!reason.trim() && error?.includes('دلیل') ? error : undefined}
              hint="دلیل در Audit Log و سابقه فسخ ذخیره می‌شود و بعداً حذف نمی‌شود."
            >
              <TextareaField
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                placeholder="مثلاً: توافق طرفین برای فسخ، برگشت کامل کالا، عدم ادامه قرارداد..."
              />
            </ModalField>

            {preview.receivable.receiptLedgerGap > 0 || preview.reconciliation.issueCount > 0 ? (
              <PanelCard
                title="فسخ با وجود مغایرت مجاز است"
                subtitle="سیستم برای صفر کردن مصنوعی حساب هیچ مبلغ یا تاریخی را حدس نمی‌زند."
                icon={<i className="fa-solid fa-triangle-exclamation" />}
                tone="warning"
                density="compact"
              >
                <div className="grid gap-2 text-sm md:grid-cols-2">
                  <div>تعداد موارد نیازمند تطبیق: <strong>{Number(preview.reconciliation.issueCount).toLocaleString('fa-IR')}</strong></div>
                  <div>فاصله وصول شناخته‌شده با Ledger: <strong>{formatPrice(preview.receivable.receiptLedgerGap)}</strong></div>
                </div>
              </PanelCard>
            ) : null}
          </>
        ) : (
          <EmptyState title="پیش‌نمایش فسخ در دسترس نیست" description={error || 'اطلاعات قرارداد برای محاسبه اثرات فسخ دریافت نشد.'} icon={<i className="fa-solid fa-circle-exclamation" />} />
        )}

        {error && preview ? (
          <PanelCard title="نیازمند بررسی" subtitle={error} icon={<i className="fa-solid fa-circle-exclamation" />} tone="danger" density="compact" />
        ) : null}

        <DialogActions
          onCancel={onClose}
          cancelText="انصراف"
          submitText="ثبت فسخ قرارداد"
          submittingText="در حال ثبت فسخ..."
          isSubmitting={isSubmitting}
          submitDisabled={!preview || isLoadingPreview || !reason.trim() || fullReversalBlocked}
          onSubmitClick={submit}
          submitType="button"
          submitVariant="danger"
          submitIconClass="fa-solid fa-file-circle-xmark"
          helperTitle="فسخ غیرمخرب"
          helperText="تاریخچه پرداخت، چک و اسناد قبلی حذف نمی‌شود."
          hideHelper={false}
        />
      </div>
    </AppModal>
  );
};

export default InstallmentCancellationModal;
