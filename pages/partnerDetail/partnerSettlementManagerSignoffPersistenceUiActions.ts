import { apiFetch } from '../../utils/apiFetch';
import { runWithFeedback, humanizeErrorMessage } from '../../utils/feedback';

const isManagerSignoffRole = (roleName: unknown): boolean => {
  const normalized = String(roleName || '').trim().toLowerCase();
  return normalized === 'admin' || normalized === 'manager' || normalized === 'مدیر' || normalized === 'ادمین';
};

const asText = (value: unknown): string => String(value ?? '').trim();
const parseLedgerMeta = (entry: any): Record<string, any> | null => {
  try {
    return entry?.changeHistoryJson ? JSON.parse(String(entry.changeHistoryJson)) : null;
  } catch {
    return null;
  }
};

type PersistPartnerSettlementManagerSignoffArgs = {
  profile: any;
  id: string | undefined;
  token: string | null | undefined;
  currentUser: any;
  ledger: any[];
  lastAtomicSettlementSubmitResult: any;
  partnerBusinessReadModel: any;
  confirmAction: (options: any) => Promise<boolean>;
  setNotification: (message: any) => void;
  setIsPersistingManagerSignoff: (value: boolean) => void;
  setLastManagerSignoffPersistenceResult: (value: any) => void;
  setLastManagerSignoffPersistenceError: (value: any) => void;
  fetchPartnerDetails: () => void | Promise<void>;
};

export const persistPartnerSettlementManagerSignoffFromUi = async ({
  profile,
  id,
  token,
  currentUser,
  ledger,
  lastAtomicSettlementSubmitResult,
  partnerBusinessReadModel,
  confirmAction,
  setNotification,
  setIsPersistingManagerSignoff,
  setLastManagerSignoffPersistenceResult,
  setLastManagerSignoffPersistenceError,
  fetchPartnerDetails,
}: PersistPartnerSettlementManagerSignoffArgs): Promise<void> => {
  const partnerId = Number(profile?.id || id || 0);
  const result = lastAtomicSettlementSubmitResult;
  const endpoint = `/api/partners/${partnerId}/settlement/manager-signoff`;

  if (!token || !partnerId || !result?.ok || !['submitted', 'already-submitted'].includes(asText(result.status))) {
    setNotification({ type: 'error', text: 'ابتدا باید ثبت اتمیک تسویه با نتیجه معتبر انجام شده باشد.' });
    return;
  }

  if (!isManagerSignoffRole(currentUser?.roleName)) {
    setNotification({ type: 'error', text: 'ذخیره تایید مدیر فقط برای مدیر یا ادمین مجاز است.' });
    return;
  }

  const ledgerEntryIds = Array.isArray(result.ledgerEntryIds)
    ? result.ledgerEntryIds.map((entryId: unknown) => asText(entryId)).filter(Boolean)
    : [];
  const expectedLedgerIds = new Set(ledgerEntryIds);
  const settlementId = asText(result.settlementId);
  const idempotencyKey = asText(result.idempotencyKey);
  const tracedLedgerRows = Array.isArray(ledger)
    ? ledger.filter((entry: any) => {
        if (expectedLedgerIds.has(asText(entry?.id))) return true;
        const meta = parseLedgerMeta(entry);
        return asText(entry?.settlementBatchId) === idempotencyKey || asText(meta?.settlementId) === settlementId;
      })
    : [];
  const firstMeta = tracedLedgerRows.map(parseLedgerMeta).find(Boolean) || {};
  const settlementFingerprint = asText(result.settlementFingerprint || firstMeta.settlementFingerprint);
  const sourceFingerprint = asText(firstMeta.sourceFingerprint);
  const reconciliationHarness = partnerBusinessReadModel?.atomicSubmitDryRunHarness || {};
  const postSubmitOpenAmount = Number(reconciliationHarness.dryRunAmount || 0);
  const reconciliationStatus = postSubmitOpenAmount > 0 ? 'needs-review' : 'ready-for-signoff';

  if (!settlementId || !idempotencyKey || !settlementFingerprint || tracedLedgerRows.length === 0) {
    setNotification({ type: 'error', text: 'شواهد لازم برای ذخیره تایید مدیر کامل نیست؛ دفتر همکار و نتیجه ثبت را بررسی کنید.' });
    return;
  }

  const confirmed = await confirmAction({
    title: 'تایید ذخیره امضای مدیر تسویه',
    description: 'این عملیات فقط شواهد تایید مدیر را در audit log ذخیره می‌کند و هیچ تسویه، موجودی، فاکتور، مشتری، قیمت یا ML را تغییر نمی‌دهد. ادامه می‌دهید؟',
    confirmText: 'بله، تایید مدیر ذخیره شود',
    cancelText: 'انصراف',
    tone: 'warning',
    iconClass: 'fa-solid fa-file-signature',
    summaryItems: [
      { label: 'شناسه تسویه', value: settlementId },
      { label: 'ردیف‌های دفتر', value: tracedLedgerRows.length.toLocaleString('fa-IR') },
      { label: 'نقش', value: String(currentUser?.roleName || 'مدیر') },
    ],
  });
  if (!confirmed) return;

  setIsPersistingManagerSignoff(true);
  setLastManagerSignoffPersistenceError(null);
  setNotification(null);

  try {
    const persisted = await runWithFeedback(
      apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settlementId,
          idempotencyKey: `partner-signoff-ui-${partnerId}-${settlementId}-${settlementFingerprint}`,
          settlementFingerprint,
          sourceFingerprint: sourceFingerprint || undefined,
          ledgerEntryIds,
          reconciliationStatus,
          signoffEvidence: {
            settlementBackendIdempotencyKey: idempotencyKey,
            postSubmitOpenAmount,
            tracedLedgerRowCount: tracedLedgerRows.length,
            mutationScope: result.mutationScope || null,
          },
          managerSignoff: {
            confirmed: true,
            confirmedByUserId: Number(currentUser?.id || 0) || undefined,
            signoffText: 'manager-signoff-confirmed-from-partner-detail-ui',
          },
        }),
      }).then(async (response) => {
        const payload = await response.json().catch(() => ({} as any));
        if (!response.ok || payload?.ok === false) {
          const signoffError: any = new Error(payload?.message || payload?.reason || response.statusText || 'ذخیره تایید مدیر انجام نشد.');
          signoffError.payload = payload;
          signoffError.httpStatus = response.status;
          throw signoffError;
        }
        if (payload?.ok !== true) throw new Error('پاسخ ذخیره تایید مدیر معتبر نبود.');
        return payload;
      }),
      {
        kind: 'submit',
        loading: 'در حال ذخیره تایید مدیر…',
        success: (payload: any) => payload?.status === 'already-signed'
          ? 'تایید مدیر قبلاً ذخیره شده بود؛ ردیف audit تکراری ساخته نشد.'
          : 'تایید مدیر با موفقیت در audit log ذخیره شد.',
        endpoint,
        action: 'ذخیره تایید مدیر تسویه',
      },
    );
    setLastManagerSignoffPersistenceResult(persisted);
    setLastManagerSignoffPersistenceError(null);
    setNotification({
      type: 'success',
      text: persisted?.status === 'already-signed'
        ? 'تایید مدیر قبلاً ذخیره شده بود و رکورد تکراری ساخته نشد.'
        : 'تایید مدیر با موفقیت ذخیره شد و هیچ داده مالی دیگری تغییر نکرد.',
    });
    await fetchPartnerDetails();
  } catch (error: any) {
    const payload = error?.payload || {};
    const signoffErrorSnapshot = {
      status: payload?.status || 'rejected',
      reason: payload?.reason || 'transaction-rolled-back',
      message: humanizeErrorMessage(error?.message || payload?.message || 'خطا در ذخیره تایید مدیر', { endpoint, action: 'ذخیره تایید مدیر تسویه' }),
      details: payload?.details || null,
      settlementId,
      idempotencyKey,
      failedAt: new Date().toISOString(),
    };
    setLastManagerSignoffPersistenceError(signoffErrorSnapshot);
    setNotification({ type: 'error', text: signoffErrorSnapshot.message });
  } finally {
    setIsPersistingManagerSignoff(false);
  }
};
