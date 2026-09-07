import { useConfirm } from '../contexts/ConfirmContext';
// src/pages/RepairDetail.tsx
import React, { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  RepairDetailsPageData,
  NotificationMessage,
  RepairStatus,
  Repair,
  Product,
  Partner,
  FinalizeRepairPayload,
} from '../types';
import Notification from '../components/Notification';
import { Dialog as Modal, DialogActions, FormGrid, ModalField, PageShell, PanelCard, positiveNumberError, requiredSelectionError } from '@/components/ui';
import PriceInput from '../components/PriceInput';
import Button from '../components/Button';
import { SearchableSelectField, TextareaField } from '@/components/ui';
import TextField from '../components/ui/TextField';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/apiFetch';
import { formatIsoToShamsiDateTime } from '../utils/dateUtils';
import { REPAIR_STATUSES } from '../constants';
import { preserveNavigationReturnSearch } from '../utils/navigationReturnContext';
import { focusErrorsSoon } from '../utils/formBehavior';
export default function RepairDetail(): React.ReactElement | null {
  const confirmAction = useConfirm();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { token, currentUser } = useAuth();
  const isEditMode = searchParams.get('edit') === '1';

  const [details, setDetails] = useState<RepairDetailsPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  // Part management state
  const [isAddPartModalOpen, setIsAddPartModalOpen] = useState(false);
  const [availableParts, setAvailableParts] = useState<Product[]>([]);
  const [selectedPart, setSelectedPart] = useState<{ productId: string; quantity: number }>({
    productId: '',
    quantity: 1,
  });
  const [partBarcodeScanInput, setPartBarcodeScanInput] = useState('');
  const [isSubmittingPart, setIsSubmittingPart] = useState(false);
  const [partFormErrors, setPartFormErrors] = useState<{ productId?: string; quantity?: string }>({});

  // Edit state
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Finalization state
  const [technicians, setTechnicians] = useState<Partner[]>([]);
  const [assignedTechnicianId, setAssignedTechnicianId] = useState<string>('');
  const [finalCost, setFinalCost] = useState<string>('');
  const [laborFee, setLaborFee] = useState<string>('');
  const [isFinalizing, setIsFinalizing] = useState(false);

  // SMS State
  const [sendingSmsType, setSendingSmsType] = useState<string | null>(null);

  const fetchRepairDetails = async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch(`/api/repairs/${id}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت جزئیات تعمیر');
      setDetails(result.data);
      setTechnicianNotes(result.data.repair.technicianNotes || '');
      setAssignedTechnicianId(result.data.repair.technicianId?.toString() || '');
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const response = await apiFetch('/api/partners?partnerType=Technician');
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      setTechnicians(result.data);
    } catch (error: any) {
      setNotification({ type: 'error', text: `خطا در دریافت لیست تعمیرکاران: ${error.message}` });
    }
  };

  useEffect(() => {
    if (!id) navigate('/repairs');
    if (currentUser && currentUser.roleName === 'Salesperson') {
      setNotification({ type: 'error', text: 'شما اجازه دسترسی به این صفحه را ندارید.' });
      navigate('/');
      return;
    }
    fetchRepairDetails();
    fetchTechnicians();
  }, [id, currentUser, navigate, token]);

  const handleTriggerRepairSms = async (
    eventType: 'REPAIR_RECEIVED' | 'REPAIR_COST_ESTIMATED' | 'REPAIR_READY_FOR_PICKUP'
  ) => {
    if (!id) return;

    const eventNameMap = {
      REPAIR_RECEIVED: 'تایید پذیرش',
      REPAIR_COST_ESTIMATED: 'اعلام هزینه',
      REPAIR_READY_FOR_PICKUP: 'اطلاع‌رسانی آماده بودن',
    };

    const isConfirmed = await confirmAction({ title: 'ارسال پیامک تعمیر', description: `آیا از ارسال پیامک "${eventNameMap[eventType]}" برای این تعمیر مطمئن هستید؟`, confirmText: 'بله، ارسال شود', tone: 'info', iconClass: 'fa-solid fa-message-sms' });
    if (!isConfirmed) return;

    setSendingSmsType(eventType);
    setNotification(null);
    try {
      const response = await apiFetch('/api/sms/trigger-event', {
        method: 'POST',
        body: JSON.stringify({ targetId: Number(id), eventType }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      setNotification({ type: 'success', text: result.message });
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
    } finally {
      setSendingSmsType(null);
    }
  };

  const handleTriggerRepairTelegram = async (
    eventType: 'REPAIR_RECEIVED' | 'REPAIR_COST_ESTIMATED' | 'REPAIR_READY_FOR_PICKUP'
  ) => {
    if (!id) return;

    const eventNameMap = {
      REPAIR_RECEIVED: 'تایید پذیرش',
      REPAIR_COST_ESTIMATED: 'اعلام هزینه',
      REPAIR_READY_FOR_PICKUP: 'اطلاع‌رسانی آماده بودن',
    };

    const isConfirmed = await confirmAction({ title: 'ارسال تلگرام تعمیر', description: `آیا از ارسال تلگرام "${eventNameMap[eventType]}" برای این تعمیر مطمئن هستید؟`, confirmText: 'بله، ارسال شود', tone: 'info', iconClass: 'fa-brands fa-telegram' });
    if (!isConfirmed) return;

    setSendingSmsType(eventType);
    setNotification(null);
    try {
      const response = await apiFetch('/api/telegram/trigger-event', {
        method: 'POST',
        body: JSON.stringify({ targetId: Number(id), eventType }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      setNotification({ type: 'success', text: result.message });
    } catch (error: any) {
      setNotification({ type: 'error', text: error?.message || 'خطا در ارسال تلگرام' });
    } finally {
      setSendingSmsType(null);
    }
  };


  const handleUpdate = async (updatePayload: Partial<Repair>) => {
    setIsSaving(true);
    try {
      const response = await apiFetch(`/api/repairs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updatePayload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      setDetails(result.data);
      setAssignedTechnicianId(result.data.repair.technicianId?.toString() || '');
      setNotification({ type: 'success', text: 'تغییرات با موفقیت ذخیره شد.' });
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!assignedTechnicianId) {
      setNotification({ type: 'error', text: 'لطفا ابتدا یک تعمیرکار اختصاص دهید.' });
      return;
    }
    const numFinalCost = Number(finalCost);
    const numLaborFee = Number(laborFee);
    if (isNaN(numFinalCost) || numFinalCost <= 0 || isNaN(numLaborFee) || numLaborFee < 0) {
      setNotification({ type: 'error', text: 'هزینه نهایی و اجرت باید اعداد معتبر باشند.' });
      return;
    }
    if (numLaborFee > numFinalCost) {
      setNotification({ type: 'error', text: 'اجرت تعمیرکار نمی‌تواند بیشتر از هزینه نهایی کل باشد.' });
      return;
    }

    setIsFinalizing(true);
    const payload: FinalizeRepairPayload = {
      finalCost: numFinalCost,
      laborFee: numLaborFee,
      technicianId: Number(assignedTechnicianId),
    };

    try {
      const response = await apiFetch(`/api/repairs/${id}/finalize`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      setNotification({ type: 'success', text: 'تعمیر با موفقیت نهایی و در حساب‌ها ثبت شد.' });
      setDetails(result.data);
      setFinalCost('');
      setLaborFee('');
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleAddPart = async (partId?: number, quantity: number = 1) => {
    const productIdToAdd = partId || Number(selectedPart.productId);
    const quantityToAdd = partId ? quantity : selectedPart.quantity;

    const nextErrors = {
      productId: requiredSelectionError(productIdToAdd || '', 'قطعه'),
      quantity: positiveNumberError(quantityToAdd, 'تعداد', { integer: true }),
    };
    const normalizedErrors = Object.fromEntries(Object.entries(nextErrors).filter(([, message]) => Boolean(message))) as { productId?: string; quantity?: string };
    if (Object.keys(normalizedErrors).length) {
      setPartFormErrors(normalizedErrors);
      focusErrorsSoon(normalizedErrors, { productId: 'repairPartProductId', quantity: 'repairPartQuantity' });
      return;
    }
    setPartFormErrors({});
    setIsSubmittingPart(true);
    try {
      const response = await apiFetch(`/api/repairs/${id}/parts`, {
        method: 'POST',
        body: JSON.stringify({ productId: productIdToAdd, quantityUsed: quantityToAdd }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);

      fetchRepairDetails();
      setNotification({ type: 'success', text: `قطعه "${result.data.productName}" با موفقیت اضافه شد.` });

      if (!partId) {
        setIsAddPartModalOpen(false);
        setSelectedPart({ productId: '', quantity: 1 });
      }
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
    } finally {
      setIsSubmittingPart(false);
    }
  };

  const handlePartBarcodeScan = (e: FormEvent) => {
    e.preventDefault();
    if (!partBarcodeScanInput.trim()) return;

    const [type, idStr] = partBarcodeScanInput.trim().split('-');
    const partId = parseInt(idStr, 10);

    if (type !== 'product' || !partId) {
      setNotification({ type: 'error', text: 'فرمت بارکد قطعه نامعتبر است.' });
    } else {
      const partExists = availableParts.some((p) => p.id === partId);
      if (partExists) {
        handleAddPart(partId, 1);
      } else {
        setNotification({ type: 'error', text: 'قطعه‌ای با این بارکد یافت نشد یا موجودی آن صفر است.' });
      }
    }
    setPartBarcodeScanInput('');
  };

  const handleDeletePart = async (partId: number) => {
    const ok = await confirmAction({ title: 'حذف مورد قطعه مصرفی', description: 'این قطعه از تعمیر حذف مورد می‌شود و موجودی انبار نیز به‌روزرسانی خواهد شد.', confirmText: 'بله، حذف مورد شود', tone: 'danger', iconClass: 'fa-solid fa-trash-can' });
    if (!ok) return;
    try {
      const response = await apiFetch(`/api/repairs/${id}/parts/${partId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      fetchRepairDetails();
      setNotification({ type: 'success', text: 'قطعه با موفقیت حذف شد.' });
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
    }
  };

  const openAddPartModal = async () => {
    setIsAddPartModalOpen(true);
    try {
      const response = await apiFetch('/api/products');
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      setAvailableParts(result.data.filter((p: Product) => p.stock_quantity > 0));
    } catch (error: any) {
      setNotification({ type: 'error', text: 'خطا در دریافت لیست قطعات.' });
    }
  };

  const formatPrice = (price?: number | null) => (price || price === 0 ? `${(price || 0).toLocaleString('fa-IR')} تومان` : '-');

  const statusMeta: Record<RepairStatus, { cls: string; icon: string; severity: 'warning' | 'info' | 'violet' | 'success' | 'neutral' }> = {
    'پذیرش شده':      { cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300', icon: 'fa-clipboard-check', severity: 'info' },
    'در حال بررسی':   { cls: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300', icon: 'fa-magnifying-glass', severity: 'info' },
    'در حال بررسی و ادامه': { cls: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300', icon: 'fa-magnifying-glass', severity: 'info' },
    'منتظر قطعه':     { cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300', icon: 'fa-clock', severity: 'warning' },
    'در حال تعمیر':   { cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300', icon: 'fa-screwdriver-wrench', severity: 'warning' },
    'آماده تحویل':    { cls: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300', icon: 'fa-box-open', severity: 'violet' },
    'تحویل داده شده': { cls: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300', icon: 'fa-check-circle', severity: 'success' },
    'تعمیر نشد':      { cls: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300', icon: 'fa-circle-xmark', severity: 'neutral' },
    'مرجوع شد':       { cls: 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200', icon: 'fa-rotate-left', severity: 'neutral' },
  };

  const getStatusColor = (status: RepairStatus) => statusMeta[status]?.cls || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  const getStatusIcon  = (status: RepairStatus) => statusMeta[status]?.icon || 'fa-circle';

  const partsCost =
    details?.parts.reduce((sum, part) => sum + ((part.pricePerItem || 0) * part.quantityUsed), 0) || 0;
  const finalCostNum = Number(finalCost) || 0;
  const laborFeeNum = Number(laborFee) || 0;
  // محاسبه سود فروشگاه: هزینه کل - هزینه قطعات - اجرت
  const storeProfit = Math.max(0, finalCostNum - partsCost - laborFeeNum);

  if (isLoading) {
    return (
      <div className="p-10 text-center text-gray-500 dark:text-gray-400">
        <i className="fas fa-spinner fa-spin text-3xl mb-3"></i>
        <p>در حال دریافت اطلاعات جزئیات تعمیر...</p>
      </div>
    );
  }

  if (!details) {
    return <div className="p-10 text-center text-red-500">اطلاعات تعمیر یافت نشد.</div>;
  }

  const { repair, parts } = details;
  const isFinalized = repair.status === 'تحویل داده شده';

  return (
    <PageShell
      title={`جزئیات تعمیر #${repair.id}`}
      description={`پذیرش: ${formatIsoToShamsiDateTime(repair.dateReceived)}`}
      icon={<i className="fa-solid fa-screwdriver-wrench" aria-hidden="true" />}
      actions={(
        <div className="flex w-full flex-wrap items-center justify-start gap-2 xl:w-auto">
          <Button
            type="button"
            onClick={() => navigate(`/repairs/${repair.id}/receipt?autoPrint=1`)}
            variant="secondary"
            size="sm"
            title="چاپ رسید پذیرش"
            leftIcon={<i className="fa-solid fa-print" />}
          >
            چاپ رسید
          </Button>
          <Button
            type="button"
            onClick={() => setSearchParams(preserveNavigationReturnSearch(searchParams.toString(), isEditMode ? {} : { edit: '1' }))}
            variant="secondary"
            size="sm"
            title={isEditMode ? 'خروج از حالت ویرایش اطلاعات' : 'فعال کردن حالت ویرایش اطلاعات'}
            leftIcon={<i className={`fa-solid ${isEditMode ? 'fa-xmark' : 'fa-pen-to-square'}`} />}
          >
            {isEditMode ? 'خروج از ویرایش' : 'ویرایش اطلاعات'}
          </Button>
          <Button
            onClick={() => handleTriggerRepairSms('REPAIR_RECEIVED')}
            disabled={!!sendingSmsType}
            loading={sendingSmsType === 'REPAIR_RECEIVED'}
            loadingText="در حال ارسال پیامک…"
            size="sm"
            variant="secondary"
            title="ارسال پیامک پذیرش"
            leftIcon={!sendingSmsType || sendingSmsType !== 'REPAIR_RECEIVED' ? <i className="fa-solid fa-message-sms" /> : undefined}
          >
            پیامک رسید
          </Button>
          <Button
            onClick={() => handleTriggerRepairTelegram('REPAIR_RECEIVED')}
            disabled={!!sendingSmsType}
            size="sm"
            variant="primary"
            title="ارسال تلگرام پذیرش"
            leftIcon={<i className="fa-brands fa-telegram" />}
          >
            تلگرام
          </Button>
          <span className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${getStatusColor(repair.status)}`}>
            <i className={`fa-solid ${getStatusIcon(repair.status)}`} aria-hidden="true" />
            {repair.status}
          </span>
        </div>
      )}
      className="mx-auto w-full max-w-7xl px-2 sm:px-4"
    >
      <Notification message={notification} onClose={() => setNotification(null)} />

      {isEditMode ? (
        <PanelCard
          title="حالت ویرایش اطلاعات فعال است"
          subtitle="تغییرات این رسید مستقیماً روی همین رکورد ذخیره می‌شود."
          icon={<i className="fa-solid fa-pen-to-square" aria-hidden="true" />}
          tone="warning"
          density="compact"
          actions={(
            <Button
              type="button"
              onClick={() => setSearchParams(preserveNavigationReturnSearch(searchParams.toString(), {}))}
              variant="secondary"
              size="sm"
              leftIcon={<i className="fa-solid fa-xmark" />}
            >
              خروج از ویرایش
            </Button>
          )}
        >
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            تعمیر شماره {repair.id.toLocaleString('fa-IR')}
          </div>
        </PanelCard>
      ) : null}

      <PanelCard
        title="اطلاعات پذیرش"
        subtitle="مشخصات مشتری، دستگاه، مشکل ثبت‌شده و برآورد اولیه"
        icon={<i className="fa-solid fa-clipboard-check" aria-hidden="true" />}
        density="comfortable"
        bodyClassName="space-y-5"
      >
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div className="min-w-0">
            <span className="font-bold text-slate-700 dark:text-slate-200">مشتری: </span>
            <Link to={`/customers/${repair.customerId}`} className="font-semibold text-indigo-600 hover:underline dark:text-indigo-300">
              {repair.customerFullName}
            </Link>
          </div>
          <div className="min-w-0">
            <span className="font-bold text-slate-700 dark:text-slate-200">دستگاه: </span>
            <span>{repair.deviceModel} {repair.deviceColor && `(${repair.deviceColor})`}</span>
          </div>
          <div className="min-w-0">
            <span className="font-bold text-slate-700 dark:text-slate-200">سریال: </span>
            <bdi dir="ltr" className="break-all">{repair.serialNumber || '-'}</bdi>
          </div>
          <div className="min-w-0 sm:col-span-2 lg:col-span-3">
            <span className="font-bold text-slate-700 dark:text-slate-200">مشکل اعلامی: </span>
            <span className="leading-7">{repair.problemDescription}</span>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-3">
            <span className="font-bold text-slate-700 dark:text-slate-200">هزینه تخمینی اولیه:</span>
            <span className="font-semibold tabular-nums">{formatPrice(repair.estimatedCost)}</span>
            {repair.estimatedCost && !isFinalized ? (
              <>
                <Button
                  onClick={() => handleTriggerRepairSms('REPAIR_COST_ESTIMATED')}
                  disabled={!!sendingSmsType}
                  loading={sendingSmsType === 'REPAIR_COST_ESTIMATED'}
                  loadingText="در حال ارسال پیامک…"
                  size="xs"
                  variant="secondary"
                  title="ارسال پیامک اعلام هزینه"
                  leftIcon={sendingSmsType === 'REPAIR_COST_ESTIMATED' ? undefined : <i className="fa-solid fa-comment-dollar" />}
                >
                  پیامک هزینه
                </Button>
                <Button
                  onClick={() => handleTriggerRepairTelegram('REPAIR_COST_ESTIMATED')}
                  disabled={!!sendingSmsType}
                  size="xs"
                  variant="primary"
                  title="ارسال تلگرام اعلام هزینه"
                  leftIcon={<i className="fa-brands fa-telegram" />}
                >
                  تلگرام
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {!isFinalized ? (
          <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
            <div className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">تغییر وضعیت تعمیر</div>
            <div className="flex flex-wrap gap-2">
              {REPAIR_STATUSES.filter((status) => status !== 'تحویل داده شده').map((status) => {
                const isActive = repair.status === status;
                return (
                  <div key={status} className="flex items-center gap-1">
                    <Button
                      onClick={() => handleUpdate({ status })}
                      disabled={isSaving || isActive}
                      size="xs"
                      variant={isActive ? 'primary' : 'ghost'}
                      className={isActive ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-950' : ''}
                      title={`تغییر به «${status}»`}
                      leftIcon={<i className={`fa-solid ${getStatusIcon(status)}`} />}
                    >
                      {status}
                    </Button>
                    <Button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        const statusSmsMap: Record<RepairStatus, 'REPAIR_RECEIVED' | 'REPAIR_COST_ESTIMATED' | 'REPAIR_READY_FOR_PICKUP'> = {
                          'پذیرش شده': 'REPAIR_RECEIVED',
                          'در حال بررسی': 'REPAIR_RECEIVED',
                          'در حال بررسی و ادامه': 'REPAIR_RECEIVED',
                          'منتظر قطعه': 'REPAIR_COST_ESTIMATED',
                          'در حال تعمیر': 'REPAIR_COST_ESTIMATED',
                          'آماده تحویل': 'REPAIR_READY_FOR_PICKUP',
                          'تحویل داده شده': 'REPAIR_READY_FOR_PICKUP',
                          'تعمیر نشد': 'REPAIR_READY_FOR_PICKUP',
                          'مرجوع شد': 'REPAIR_READY_FOR_PICKUP',
                        };
                        void handleTriggerRepairSms(statusSmsMap[status]);
                      }}
                      disabled={!!sendingSmsType}
                      loading={!!sendingSmsType}
                      loadingText="در حال ارسال…"
                      size="icon"
                      variant="ghost"
                      title="ارسال پیامک مربوط به این وضعیت"
                      leftIcon={!sendingSmsType ? <i className="fa-solid fa-paper-plane" /> : undefined}
                      aria-label={`ارسال پیامک وضعیت ${status}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </PanelCard>

      <div className={`grid grid-cols-1 gap-5 lg:grid-cols-3 ${isEditMode ? 'rounded-2xl bg-amber-50/40 p-2 ring-1 ring-amber-200 dark:bg-amber-950/10 dark:ring-amber-900/60' : ''}`}>
        <div className="space-y-5 lg:col-span-2">
          <PanelCard
            title="یادداشت‌های تکنسین"
            subtitle="شرح اقدامات، قطعات و توضیحات فنی تعمیر"
            icon={<i className="fa-solid fa-note-sticky" aria-hidden="true" />}
            density="comfortable"
            bodyClassName="space-y-3"
          >
            <TextareaField
              controlOnly
              value={technicianNotes}
              onChange={(event) => setTechnicianNotes(event.target.value)}
              rows={5}
              className="w-full"
              preview="شرح اقدامات انجام‌شده، قطعات و توضیحات تعمیر..."
              disabled={isFinalized}
            />
            {!isFinalized ? (
              <Button
                onClick={() => handleUpdate({ technicianNotes })}
                disabled={isSaving || technicianNotes === (repair.technicianNotes || '')}
                loading={isSaving}
                loadingText="در حال ذخیره تغییرات…"
                variant="primary"
                size="sm"
                leftIcon={<i className="fa-solid fa-floppy-disk" />}
              >
                ذخیره یادداشت
              </Button>
            ) : null}
          </PanelCard>

          {!isFinalized ? (
            <PanelCard
              title="هزینه‌ها و نهایی‌سازی"
              subtitle="تعمیرکار، اجرت و مبلغ نهایی را قبل از ثبت نهایی بررسی کنید."
              icon={<i className="fa-solid fa-file-invoice-dollar" aria-hidden="true" />}
              tone="info"
              bodyClassName="space-y-4"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ModalField label="اختصاص به تعمیرکار" iconClass="fa-solid fa-user-gear">
                  <SearchableSelectField
                    value={assignedTechnicianId || null}
                    onValueChange={(value) => {
                      const nextValue = value ? String(value) : '';
                      setAssignedTechnicianId(nextValue);
                      if (nextValue) void handleUpdate({ technicianId: Number(nextValue) });
                    }}
                    options={technicians.map((technician) => ({
                      value: String(technician.id),
                      label: technician.partnerName || `تعمیرکار #${technician.id}`,
                      searchText: `${technician.partnerName || ''} ${technician.phoneNumber || ''} ${technician.id}`,
                    }))}
                    placeholder="نام، شماره تماس یا کد تعمیرکار را جستجو کنید…"
                    noOptionsMessage="تعمیرکاری مطابق جستجو پیدا نشد"
                    ariaLabel="جستجو و انتخاب تعمیرکار"
                    clearable
                  />
                </ModalField>

                <ModalField label="اجرت تعمیرکار" iconClass="fa-solid fa-hand-holding-dollar">
                  <PriceInput
                    id="laborFee"
                    name="laborFee"
                    value={laborFee}
                    onChange={(event) => setLaborFee(event.target.value)}
                    className="w-full text-left"
                    preview="مثال: ۵۰۰۰۰۰"
                    topLabel="اجرت"
                    suffix="تومان"
                  />
                </ModalField>

                <ModalField label="هزینه نهایی کل" iconClass="fa-solid fa-sack-dollar">
                  <PriceInput
                    id="finalCost"
                    name="finalCost"
                    value={finalCost}
                    onChange={(event) => setFinalCost(event.target.value)}
                    className="w-full text-left"
                    preview="مثال: ۱۲۰۰۰۰۰"
                    topLabel="مبلغ کل"
                    suffix="تومان"
                  />
                </ModalField>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex items-center justify-between gap-3"><span>هزینه قطعات</span><strong className="tabular-nums">{formatPrice(partsCost)}</strong></div>
                  <div className="flex items-center justify-between gap-3"><span>اجرت تعمیرکار</span><strong className="tabular-nums">{formatPrice(laborFeeNum)}</strong></div>
                  <div className="flex items-center justify-between gap-3"><span>سود فروشگاه</span><strong className="tabular-nums">{formatPrice(storeProfit)}</strong></div>
                  <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-200 pt-2 dark:border-slate-700"><span className="font-bold">مبلغ کل فاکتور</span><strong className="tabular-nums">{formatPrice(finalCostNum)}</strong></div>
                </div>
              </div>
              <Button
                onClick={handleFinalize}
                disabled={isFinalizing}
                loading={isFinalizing}
                loadingText="در حال نهایی‌سازی..."
                className="w-full"
                variant="primary"
                leftIcon={<i className="fa-solid fa-circle-check" />}
              >
                نهایی‌سازی و ثبت در حساب‌ها
              </Button>
            </PanelCard>
          ) : (
            <PanelCard
              title="اطلاعات مالی"
              subtitle="خلاصه مالی تعمیر نهایی‌شده"
              icon={<i className="fa-solid fa-wallet" aria-hidden="true" />}
              tone="success"
              bodyClassName="space-y-3 text-sm"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><span className="font-bold">هزینه نهایی: </span>{formatPrice(repair.finalCost)}</div>
                <div><span className="font-bold">اجرت تعمیرکار: </span>{formatPrice(repair.laborFee)}</div>
                <div><span className="font-bold">هزینه قطعات: </span>{formatPrice(partsCost)}</div>
                <div><span className="font-bold">سود فروشگاه: </span>{formatPrice(Math.max(0, (repair.finalCost || 0) - (repair.laborFee || 0) - partsCost))}</div>
                <div><span className="font-bold">تعمیرکار: </span>{repair.technicianName || '-'}</div>
                <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                  <span className="font-bold">تاریخ تکمیل:</span>
                  <span>{formatIsoToShamsiDateTime(repair.dateCompleted)}</span>
                  <Button
                    onClick={() => handleTriggerRepairSms('REPAIR_READY_FOR_PICKUP')}
                    disabled={!!sendingSmsType}
                    loading={sendingSmsType === 'REPAIR_READY_FOR_PICKUP'}
                    loadingText="در حال ارسال پیامک…"
                    size="xs"
                    variant="secondary"
                    title="ارسال پیامک آماده تحویل"
                    leftIcon={sendingSmsType === 'REPAIR_READY_FOR_PICKUP' ? undefined : <i className="fa-solid fa-mobile-screen" />}
                  >
                    پیامک آماده تحویل
                  </Button>
                  <Button
                    onClick={() => handleTriggerRepairTelegram('REPAIR_READY_FOR_PICKUP')}
                    disabled={!!sendingSmsType}
                    size="xs"
                    variant="primary"
                    title="ارسال تلگرام آماده تحویل"
                    leftIcon={<i className="fa-brands fa-telegram" />}
                  >
                    تلگرام
                  </Button>
                </div>
              </div>
            </PanelCard>
          )}
        </div>

        <PanelCard
          title="قطعات مصرفی"
          subtitle={`مجموع هزینه قطعات: ${formatPrice(partsCost)}`}
          icon={<i className="fa-solid fa-gears" aria-hidden="true" />}
          density="comfortable"
          actions={!isFinalized ? (
            <Button onClick={openAddPartModal} size="sm" variant="primary" leftIcon={<i className="fa-solid fa-plus" />}>
              افزودن قطعه
            </Button>
          ) : undefined}
          bodyClassName="space-y-2"
        >
          {parts.length > 0 ? (
            <ul className="max-h-96 space-y-2 overflow-y-auto">
              {parts.map((part) => (
                <li key={part.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 dark:text-slate-100">{part.productName} (×{part.quantityUsed})</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">قیمت واحد: {formatPrice(part.pricePerItem)}</div>
                  </div>
                  {!isFinalized ? (
                    <Button onClick={() => handleDeletePart(part.id)} size="xs" variant="danger" leftIcon={<i className="fa-solid fa-trash" />}>
                      حذف
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              هیچ قطعه‌ای استفاده نشده است.
            </div>
          )}
        </PanelCard>
      </div>

      {isAddPartModalOpen ? (
        <Modal title="افزودن قطعه مصرفی" onClose={() => setIsAddPartModalOpen(false)} variant="operational" widthClass="max-w-2xl">
          <div className="space-y-4">
            <form onSubmit={handlePartBarcodeScan} className="space-y-3">
              <ModalField label="اسکن بارکد قطعه" iconClass="fa-solid fa-barcode">
                <TextField
                  type="text"
                  id="part-barcode-scanner"
                  value={partBarcodeScanInput}
                  onChange={(event) => setPartBarcodeScanInput(event.target.value)}
                  preview="بارکد قطعه را اسکن کنید..."
                  autoFocus
                />
              </ModalField>
            </form>

            <div className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400">یا انتخاب دستی</div>

            <FormGrid columns={2}>
              <ModalField label="قطعه" iconClass="fa-solid fa-gears" required error={partFormErrors.productId}>
                <SearchableSelectField
                  inputId="repairPartProductId"
                  value={selectedPart.productId || null}
                  onValueChange={(value) => { setSelectedPart((current) => ({ ...current, productId: value ? String(value) : '' })); setPartFormErrors((current) => ({ ...current, productId: undefined })); }}
                  options={availableParts.map((part) => ({
                    value: String(part.id),
                    label: `${part.name} — موجودی: ${Number((part as any).stock_quantity ?? (part as any).stock ?? 0).toLocaleString('fa-IR')}`,
                    searchText: `${part.name || ''} ${(part as any).sku || ''} ${(part as any).barcode || ''} ${part.id}`,
                  }))}
                  placeholder="نام، بارکد، SKU یا کد قطعه را جستجو کنید…"
                  noOptionsMessage="قطعه‌ای مطابق جستجو پیدا نشد"
                  ariaLabel="جستجو و انتخاب قطعه تعمیر"
                  clearable
                />
              </ModalField>
              <ModalField label="تعداد" iconClass="fa-solid fa-hashtag" required error={partFormErrors.quantity}>
                <TextField
                  id="repairPartQuantity"
                  type="number"
                  valueKind="number"
                  min="1"
                  value={selectedPart.quantity}
                  onChange={(event) => { setSelectedPart((current) => ({ ...current, quantity: Number(event.target.value) })); setPartFormErrors((current) => ({ ...current, quantity: undefined })); }}
                  preview="تعداد"
                />
              </ModalField>
            </FormGrid>

            <DialogActions
              onCancel={() => setIsAddPartModalOpen(false)}
              cancelText="انصراف"
              submitText="افزودن قطعه"
              submittingText="در حال افزودن..."
              isSubmitting={isSubmittingPart}
              submitDisabled={!selectedPart.productId || selectedPart.quantity <= 0}
              submitType="button"
              onSubmitClick={() => void handleAddPart()}
              submitIconClass="fa-solid fa-plus"
              align="end"
            />
          </div>
        </Modal>
      ) : null}
    </PageShell>
  );
}
