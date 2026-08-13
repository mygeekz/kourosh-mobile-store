import { apiFetch } from '../../utils/apiFetch';
import { runWithFeedback, humanizeErrorMessage } from '../../utils/feedback';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';

const isAtomicSettlementManagerRole = (roleName: unknown): boolean => {
  const normalized = String(roleName || '').trim().toLowerCase();
  return normalized === 'admin' || normalized === 'manager' || normalized === 'مدیر' || normalized === 'ادمین';
};

type SubmitPartnerAtomicSettlementArgs = {
  profile: any;
  id: string | undefined;
  token: string | null | undefined;
  currentUser: any;
  partnerBusinessReadModel: any;
  confirmAction: (options: any) => Promise<boolean>;
  setNotification: (message: any) => void;
  setIsSubmittingAtomicSettlement: (value: boolean) => void;
  setLastAtomicSettlementSubmitResult: (value: any) => void;
  setLastAtomicSettlementSubmitError: (value: any) => void;
  appendAtomicSettlementSubmitAttempt?: (attempt: any) => void;
  fetchPartnerDetails: () => void | Promise<void>;
};

export const submitPartnerAtomicSettlementFromUi = async ({
  profile,
  id,
  token,
  currentUser,
  partnerBusinessReadModel,
  confirmAction,
  setNotification,
  setIsSubmittingAtomicSettlement,
  setLastAtomicSettlementSubmitResult,
  setLastAtomicSettlementSubmitError,
  appendAtomicSettlementSubmitAttempt,
  fetchPartnerDetails,
}: SubmitPartnerAtomicSettlementArgs): Promise<void> => {
  const partnerId = Number(profile?.id || id || 0);
  const dryRunHarness = partnerBusinessReadModel?.atomicSubmitDryRunHarness;
  const executionDraft = partnerBusinessReadModel?.executionDraft;
  const endpoint = `/api/partners/${partnerId}/settlement/atomic-submit`;

  if (!token || !partnerId || !dryRunHarness || !executionDraft) {
    setNotification({ type: 'error', text: 'اطلاعات لازم برای ثبت تسویه همکار کامل نیست.' });
    return;
  }

  if (!isAtomicSettlementManagerRole(currentUser?.roleName)) {
    setNotification({ type: 'error', text: 'ثبت نهایی تسویه فقط برای مدیر یا ادمین مجاز است.' });
    return;
  }

  const confirmedLineIds = Array.isArray(dryRunHarness.confirmedLineIds)
    ? dryRunHarness.confirmedLineIds.map(Number).filter((lineId: number) => Number.isFinite(lineId) && lineId > 0).sort((a: number, b: number) => a - b)
    : [];
  const confirmedAmount = Number(dryRunHarness.dryRunAmount || 0);
  const dryRunId = String(dryRunHarness.dryRunId || dryRunHarness.deterministicPreviewKey || '').trim();
  const settlementDraftId = String(dryRunHarness.settlementDraftId || '').trim();

  if (!dryRunId || !settlementDraftId || confirmedLineIds.length === 0 || confirmedAmount <= 0) {
    setNotification({ type: 'error', text: 'پیش‌بررسی تسویه کامل نیست؛ مبلغ و ردیف‌های قابل تسویه را بررسی کنید.' });
    return;
  }

  const idempotencyKey = `partner-settlement-ui-${partnerId}-${dryRunId}-${settlementDraftId}`;
  const attemptBase = {
    attemptId: `partner-settlement-attempt-${partnerId}-${Date.now()}`,
    partnerId,
    settlementDraftId,
    dryRunId,
    idempotencyKey,
    confirmedAmount,
    confirmedLineCount: confirmedLineIds.length,
    requestedByUserId: Number(currentUser?.id || 0) || null,
    requestedByRole: String(currentUser?.roleName || 'Manager'),
    requestedAt: new Date().toISOString(),
  };
  const confirmed = await confirmAction({
    title: 'تایید نهایی تسویه همکار',
    description: 'پس از تایید، ردیف‌های تسویه به‌صورت یکپارچه در دفتر همکار ثبت می‌شوند. موجودی، فاکتور، مشتری و قیمت‌ها تغییر نمی‌کنند. ادامه می‌دهید؟',
    confirmText: 'تایید و ثبت تسویه',
    cancelText: 'انصراف',
    tone: 'warning',
    iconClass: 'fa-solid fa-user-shield',
    summaryItems: [
      { label: 'مبلغ', value: formatCurrencyText(confirmedAmount, readStoredCurrencyUnit()) },
      { label: 'ردیف‌ها', value: confirmedLineIds.length.toLocaleString('fa-IR') },
      { label: 'نقش', value: String(currentUser?.roleName || 'مدیر') },
    ],
  });
  if (!confirmed) return;

  setIsSubmittingAtomicSettlement(true);
  setLastAtomicSettlementSubmitError(null);
  setNotification(null);
  try {
    const result = await runWithFeedback(
      apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settlementDraftId,
          dryRunId,
          idempotencyKey,
          confirmedAmount,
          confirmedLineIds,
          managerConfirmation: {
            confirmed: true,
            confirmedByUserId: Number(currentUser?.id || 0) || undefined,
            confirmationText: 'manager-confirmed-from-partner-detail-ui',
          },
        }),
      }).then(async (response) => {
        const payload = await response.json().catch(() => ({} as any));
        if (!response.ok || payload?.ok === false) {
          const submitError: any = new Error(payload?.message || payload?.reason || response.statusText || 'ثبت تسویه همکار انجام نشد.');
          submitError.payload = payload;
          submitError.httpStatus = response.status;
          throw submitError;
        }
        if (payload?.ok !== true) {
          throw new Error('پاسخ ثبت تسویه همکار معتبر نبود.');
        }
        return payload;
      }),
      {
        kind: 'submit',
        loading: 'در حال ثبت تسویه همکار…',
        success: (result: any) => result?.status === 'already-submitted'
          ? 'این تسویه قبلاً با همین کلید ثبت شده بود؛ ردیف تکراری ساخته نشد.'
          : 'تسویه همکار با تایید مدیر ثبت شد.',
        endpoint,
        action: 'ثبت تسویه همکار',
      },
    );
    setLastAtomicSettlementSubmitResult(result);
    appendAtomicSettlementSubmitAttempt?.({
      ...attemptBase,
      ok: true,
      status: result?.status || 'submitted',
      settlementId: result?.settlementId || null,
      ledgerEntryIds: Array.isArray(result?.ledgerEntryIds) ? result.ledgerEntryIds : [],
      submittedAt: result?.submittedAt || new Date().toISOString(),
      mutationScope: result?.mutationScope || null,
    });
    setLastAtomicSettlementSubmitError(null);
    setNotification({
      type: 'success',
      text: result?.status === 'already-submitted'
        ? 'این تسویه قبلاً ثبت شده بود و ردیف تکراری ایجاد نشد.'
        : 'تسویه با موفقیت ثبت شد و فقط دفتر همکار به‌روزرسانی شد.',
    });
    await fetchPartnerDetails();
  } catch (error: any) {
    const payload = error?.payload || {};
    const submitErrorSnapshot = {
      status: payload?.status || 'rejected',
      reason: payload?.reason || 'transaction-rolled-back',
      message: humanizeErrorMessage(error?.message || payload?.message || 'خطا در ثبت تسویه همکار', { endpoint, action: 'ثبت تسویه همکار' }),
      details: payload?.details || null,
      dryRunId,
      settlementDraftId,
      idempotencyKey,
      failedAt: new Date().toISOString(),
      recoverable: ['transaction-rolled-back', 'dry-run-stale', 'blocking-validation-errors'].includes(String(payload?.reason || 'transaction-rolled-back')),
    };
    setLastAtomicSettlementSubmitError(submitErrorSnapshot);
    appendAtomicSettlementSubmitAttempt?.({
      ...attemptBase,
      ok: false,
      status: submitErrorSnapshot.status,
      reason: submitErrorSnapshot.reason,
      message: submitErrorSnapshot.message,
      failedAt: submitErrorSnapshot.failedAt,
      recoverable: submitErrorSnapshot.recoverable,
    });
    setNotification({ type: 'error', text: humanizeErrorMessage(error?.message || 'خطا در ثبت تسویه همکار', { endpoint, action: 'ثبت تسویه همکار' }) });
  } finally {
    setIsSubmittingAtomicSettlement(false);
  }
};
