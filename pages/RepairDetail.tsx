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
import Modal from '../components/Modal';
import PriceInput from '../components/PriceInput';
import Button from '../components/Button';
import SelectField from '../components/ui/SelectField';
import TextField from '../components/ui/TextField';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/apiFetch';
import { formatIsoToShamsiDateTime } from '../utils/dateUtils';
import { REPAIR_STATUSES } from '../constants';
import { useStyle } from '../contexts/StyleContext';
import { useMountedRef } from '../utils/asyncGuards';

export default function RepairDetail(): React.ReactElement | null {
  const confirmAction = useConfirm();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const mountedRef = useMountedRef();
  const { token, currentUser } = useAuth();
  const { style } = useStyle();
  const brand = `hsl(${style.primaryHue} 90% 55%)`;

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
      setNotification({ type: 'success', text: 'تعمیر با موفقیت نهایی و در حساب‌ها ثبت اطلاعات شد.' });
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

    if (!productIdToAdd || quantityToAdd <= 0) {
      setNotification({ type: 'error', text: 'لطفا قطعه و تعداد معتبر را انتخاب کنید.' });
      return;
    }
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
    'پذیرش شده':      { cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',   icon: 'fa-clipboard-check' },
    'در حال بررسی و ادامه':   { cls: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300',   icon: 'fa-magnifying-glass' },
    'منتظر قطعه':     { cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300', icon: 'fa-clock' },
    'در حال تعمیر':   { cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300', icon: 'fa-screwdriver-wrench' },
    'آماده تحویل':    { cls: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300', icon: 'fa-box-open' },
    'تحویل داده شده': { cls: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300', icon: 'fa-check-circle' },
    'تعمیر نشد':      { cls: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300', icon: 'fa-circle-xmark' },
    'مرجوع شد':       { cls: 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200', icon: 'fa-rotate-left' },
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
    <div className="detail-page-shell products-services-redesign-v1 repairs-redesign-v1 repair-detail-redesign-v1 repair-workflow-foundation space-y-6" dir="rtl" data-ui-repair-page="detail" data-ui-repair-scope="detail">
      <Notification message={notification} onClose={() => setNotification(null)} />

      {isEditMode && (
        <div data-ui-repair-surface="edit-banner" className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 p-4 shadow-sm dark:border-amber-500/30 dark:from-amber-500/10 dark:via-orange-500/10 dark:to-rose-500/10 dark:bg-none">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-white shadow">
                <i className="fa-solid fa-pen-to-square" />
              </div>
              <div>
                <div className="text-sm font-extrabold text-amber-900 dark:text-amber-200">حالت ویرایش اطلاعات فعال است</div>
                <div className="mt-1 text-xs leading-6 text-amber-800/90 dark:text-amber-100/80">
                  تغییرات همین رسید را از همین صفحه ذخیره تغییرات کن. هر ویرایش اطلاعات، مستقیم روی همین رکورد اعمال می‌شود.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-100 dark:ring-amber-500/25">
                <i className="fa-solid fa-hashtag" />
                تعمیر شماره {repair.id.toLocaleString('fa-IR')}
              </span>
              <Button
                type="button"
                onClick={() => setSearchParams({})}
                variant="warning"
                size="sm"
                leftIcon={<i className="fa-solid fa-xmark" />}
              >
                خروج از ویرایش اطلاعات
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header and Basic Info */}
      <div data-ui-repair-surface="detail-card" className="detail-hero-card detail-card p-6">
        <div className="detail-card__header mb-4 items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">جزئیات تعمیر #{repair.id}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              پذیرش شده در: {formatIsoToShamsiDateTime(repair.dateReceived)}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={`/repairs/${repair.id}/receipt?autoPrint=1`}
              className="px-3 py-1.5 text-xs text-white rounded-md hover:opacity-90"
              style={{ backgroundColor: brand }}
              title="چاپ رسید پذیرش"
            >
              <i className="fas fa-print ml-1" /> چاپ رسید
            </Link>

            <Button
              type="button"
              onClick={() => setSearchParams(isEditMode ? {} : { edit: '1' })}
              variant="warning"
              size="sm"
              title={isEditMode ? 'خروج از حالت ویرایش اطلاعات' : 'فعال کردن حالت ویرایش اطلاعات'}
              leftIcon={<i className={`fas ${isEditMode ? 'fa-xmark' : 'fa-pen-to-square'}`} />}
            >
              {isEditMode ? 'خروج از ویرایش اطلاعات' : 'حالت ویرایش اطلاعات'}
            </Button>

            <Button
              onClick={() => handleTriggerRepairSms('REPAIR_RECEIVED')}
              disabled={!!sendingSmsType}
              loading={sendingSmsType === 'REPAIR_RECEIVED'}
              size="sm"
              variant="secondary"
              title="ارسال پیامک ثبت اطلاعات پذیرش"
              leftIcon={!sendingSmsType || sendingSmsType != 'REPAIR_RECEIVED' ? <i className="fas fa-receipt" /> : undefined}
            >
              پیامک رسید
            </Button>
            <Button
              onClick={() => handleTriggerRepairTelegram('REPAIR_RECEIVED')}
              disabled={!!sendingSmsType}
              size="sm"
              variant="primary"
              title="ارسال تلگرام"
              leftIcon={<i className="fa-brands fa-telegram" />}
            >
              تلگرام
            </Button>

            <span className={`px-3 py-1.5 text-xs font-semibold rounded-full inline-flex items-center gap-1 ${getStatusColor(repair.status)}`}>
              <i className={`fa-solid ${getStatusIcon(repair.status)}`} />
              {repair.status}
            </span>
          </div>
        </div>

        <div className="detail-inline-stats text-sm mb-6">
          <div>
            <strong className="text-gray-700 dark:text-gray-300">مشتری:</strong>{' '}
            <Link to={`/customers/${repair.customerId}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
              {repair.customerFullName}
            </Link>
          </div>
          <div>
            <strong className="text-gray-700 dark:text-gray-300">دستگاه:</strong> {repair.deviceModel} {repair.deviceColor && `(${repair.deviceColor})`}
          </div>
          <div>
            <strong className="text-gray-700 dark:text-gray-300">سریال:</strong> {repair.serialNumber || '-'}
          </div>
          <div className="md:col-span-full">
            <strong className="text-gray-700 dark:text-gray-300">مشکل اعلامی:</strong> {repair.problemDescription}
          </div>
          <div className="flex items-center gap-2">
            <strong className="text-gray-700 dark:text-gray-300">هزینه تخمینی اولیه:</strong>
            <span>{formatPrice(repair.estimatedCost)}</span>
            {repair.estimatedCost && !isFinalized && (
              <>
                <Button
                  onClick={() => handleTriggerRepairSms('REPAIR_COST_ESTIMATED')}
                  disabled={!!sendingSmsType}
                  loading={sendingSmsType === 'REPAIR_COST_ESTIMATED'}
                  size="xs"
                  variant="secondary"
                  title="ارسال پیامک اعلام هزینه"
                  leftIcon={sendingSmsType === 'REPAIR_COST_ESTIMATED' ? undefined : <i className="fas fa-comment-dollar" />}
                >
                  پیامک هزینه
                </Button>
                <Button
                  onClick={() => handleTriggerRepairTelegram('REPAIR_COST_ESTIMATED')}
                  disabled={!!sendingSmsType}
                  size="xs"
                  variant="primary"
                  title="ارسال تلگرام"
                  leftIcon={<i className="fa-brands fa-telegram" />}
                >
                  تلگرام
                </Button>
              </>
            )}
          </div>
        </div>

        {!isFinalized && (
          <div className="detail-card--soft mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              تغییر وضعیت تعمیر:
            </label>
            <div className="flex flex-wrap gap-2">
              {REPAIR_STATUSES.filter((s) => s !== 'تحویل داده شده').map((status) => {
                const isActive = repair.status === status;
                return (
                  <div key={status} className="flex items-center">
                    <Button
                      onClick={() => handleUpdate({ status })}
                      disabled={isSaving || isActive}
                      size="xs"
                      variant={isActive ? 'primary' : 'ghost'}
                      className={isActive ? 'ring-2 ring-offset-2 ring-indigo-500' : ''}
                      title={`تغییر به "${status}"`}
                      leftIcon={<i className={`fa-solid ${getStatusIcon(status)}`} />}
                    >
                      {status}
                    </Button>
                    {/* Manual SMS trigger for this status */}
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Map each status to an SMS event type
                        const statusSmsMap: Record<RepairStatus, 'REPAIR_RECEIVED' | 'REPAIR_COST_ESTIMATED' | 'REPAIR_READY_FOR_PICKUP'> = {
                          'پذیرش شده': 'REPAIR_RECEIVED',
                          'در حال بررسی و ادامه': 'REPAIR_RECEIVED',
                          'منتظر قطعه': 'REPAIR_COST_ESTIMATED',
                          'در حال تعمیر': 'REPAIR_COST_ESTIMATED',
                          'آماده تحویل': 'REPAIR_READY_FOR_PICKUP',
                          'تحویل داده شده': 'REPAIR_READY_FOR_PICKUP',
                          'تعمیر نشد': 'REPAIR_READY_FOR_PICKUP',
                          'مرجوع شد': 'REPAIR_READY_FOR_PICKUP',
                        };
                        const event = statusSmsMap[status];
                        handleTriggerRepairSms(event);
                      }}
                      disabled={!!sendingSmsType}
                      loading={!!sendingSmsType}
                      size="xs"
                      variant="ghost"
                      title="ارسال پیامک مربوط به این وضعیت"
                      leftIcon={!sendingSmsType ? <i className="fas fa-paper-plane" /> : undefined}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${isEditMode ? 'ring-1 ring-amber-200 rounded-2xl p-1 bg-amber-50/30 dark:bg-amber-900/10' : ''}`}>
        <div className="lg:col-span-2 repair-detail-editor-shell space-y-6">
          {/* Technician Notes */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 border-b dark:border-gray-700 pb-2 mb-3">
              یادداشت‌های تکنسین
            </h3>
            <textarea
              value={technicianNotes}
              onChange={(e) => setTechnicianNotes(e.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
              preview="جزئیات فنی، کارهای انجام شده..."
              disabled={isFinalized}
            />
            {!isFinalized && (
              <Button
                onClick={() => handleUpdate({ technicianNotes })}
                disabled={isSaving || technicianNotes === (repair.technicianNotes || '')}
                loading={isSaving}
                variant="primary"
                size="sm"
                className="mt-2"
                leftIcon={<i className="fa-solid fa-floppy-disk" />}
              >
                ذخیره تغییرات یادداشت
              </Button>
            )}
          </div>

          {/* Finalization Section */}
          {!isFinalized ? (
            <div className="border-t dark:border-gray-700 pt-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 pb-2 mb-3">
                ثبت اطلاعات هزینه‌ها و نهایی‌سازی
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    اختصاص به تعمیرکار
                  </label>
                  <SelectField
                    value={assignedTechnicianId}
                    onChange={(e) => setAssignedTechnicianId(e.target.value)}
                    onBlur={() => assignedTechnicianId && handleUpdate({ technicianId: Number(assignedTechnicianId) })}
                  >
                    <option value="">-- انتخاب تعمیرکار --</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.partnerName}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <div className="space-y-1">
                  <label htmlFor="laborFee" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    اجرت تعمیرکار (تومان)
                  </label>
                  <PriceInput
                    id="laborFee"
                    name="laborFee"
                    value={laborFee}
                    onChange={(e) => setLaborFee(e.target.value)}
                    className="w-full text-left"
                    preview="مثال: ۵۰۰۰۰۰"
                    topLabel="اجرت"
                    suffix="تومان"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="finalCost" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    هزینه نهایی کل (تومان)
                  </label>
                  <PriceInput
                    id="finalCost"
                    name="finalCost"
                    value={finalCost}
                    onChange={(e) => setFinalCost(e.target.value)}
                    className="w-full text-left"
                    preview="مثال: ۱۲۰۰۰۰۰"
                    topLabel="مبلغ کل"
                    suffix="تومان"
                  />
                </div>
                <div data-ui-repair-surface="financial-summary" className="repair-detail-softbox space-y-1">
                  <p>
                    <strong>هزینه قطعات:</strong> {formatPrice(partsCost)}
                  </p>
                    <p>
                      <strong>اجرت تعمیرکار:</strong> {formatPrice(laborFeeNum)}
                    </p>
                    <p>
                      <strong>سود فروشگاه:</strong> {formatPrice(storeProfit)}
                    </p>
                    <p className="font-bold">
                      <strong>مبلغ کل فاکتور:</strong> {formatPrice(finalCostNum)}
                    </p>
                </div>
              </div>
              <Button
                onClick={handleFinalize}
                disabled={isFinalizing}
                loading={isFinalizing}
                loadingText="در حال نهایی‌سازی..."
                className="mt-4 w-full"
                variant="success"
                leftIcon={<i className="fa-solid fa-circle-check" />}
              >
                نهایی‌سازی و ثبت اطلاعات در حساب‌ها
              </Button>
            </div>
          ) : (
            <div className="border-t dark:border-gray-700 pt-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 pb-2 mb-3">اطلاعات مالی</h3>
              <div className="space-y-2 text-sm">
                <p><strong>هزینه نهایی:</strong> {formatPrice(repair.finalCost)}</p>
                <p><strong>اجرت تعمیرکار:</strong> {formatPrice(repair.laborFee)}</p>
                {/* Use actual parts cost for finalized repairs */}
                <p><strong>هزینه قطعات:</strong> {formatPrice(partsCost)}</p>
                {/* Calculate and show store profit for finalized repair */}
                <p><strong>سود فروشگاه:</strong> {formatPrice(Math.max(0, (repair.finalCost || 0) - (repair.laborFee || 0) - partsCost))}</p>
                <p><strong>تعمیرکار:</strong> {repair.technicianName || '-'}</p>
                <p className="flex items-center gap-2">
                  <strong>تاریخ تکمیل:</strong>
                  <span>{formatIsoToShamsiDateTime(repair.dateCompleted)}</span>
                  <Button
                    onClick={() => handleTriggerRepairSms('REPAIR_READY_FOR_PICKUP')}
                    disabled={!!sendingSmsType}
                    loading={sendingSmsType === 'REPAIR_READY_FOR_PICKUP'}
                    size="xs"
                    variant="secondary"
                    title="ارسال پیامک آماده تحویل"
                    leftIcon={sendingSmsType === 'REPAIR_READY_FOR_PICKUP' ? undefined : <i className="fas fa-mobile-alt" />}
                  >
                    پیامک آماده تحویل
                  </Button>
                  <Button
                    onClick={() => handleTriggerRepairTelegram('REPAIR_READY_FOR_PICKUP')}
                    disabled={!!sendingSmsType}
                    size="xs"
                    variant="primary"
                    title="ارسال تلگرام"
                    leftIcon={<i className="fa-brands fa-telegram" />}
                  >
                    تلگرام
                  </Button>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Parts Section */}
        <div data-ui-repair-surface="detail-card" className="detail-hero-card detail-card p-6">
          <div className="flex justify-between items-center border-b dark:border-gray-700 pb-2 mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">قطعات مصرفی</h3>
            {!isFinalized && (
              <Button onClick={openAddPartModal} size="sm" variant="primary" leftIcon={<i className="fa-solid fa-plus" />}>
                افزودن مورد جدید قطعه
              </Button>
            )}
          </div>
          <p className="text-sm font-semibold mb-2">مجموع هزینه قطعات: {formatPrice(partsCost)}</p>
          <ul className="space-y-2 text-sm max-h-96 overflow-y-auto">
            {parts.length > 0 ? (
              parts.map((part) => (
                <li
                  key={part.id}
                  className="flex justify-between items-center p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <div>
                    <p className="font-medium text-gray-700 dark:text-gray-200">
                      {part.productName} (×{part.quantityUsed})
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      قیمت واحد: {formatPrice(part.pricePerItem)}
                    </p>
                  </div>
                  {!isFinalized && (
                    <Button onClick={() => handleDeletePart(part.id)} size="xs" variant="danger" leftIcon={<i className="fa-solid fa-trash" />}>
                      حذف مورد
                    </Button>
                  )}
                </li>
              ))
            ) : (
              <li className="text-gray-500 dark:text-gray-400">هیچ قطعه‌ای استفاده نشده است.</li>
            )}
          </ul>
        </div>
      </div>

      {isAddPartModalOpen && (
        <Modal title="افزودن قطعه مصرفی" onClose={() => setIsAddPartModalOpen(false)} variant="operational" widthClass="max-w-2xl">
          <div className="space-y-4" data-ui-repair-modal="add-part">
            <form onSubmit={handlePartBarcodeScan} className="space-y-2">
              <label htmlFor="part-barcode-scanner" className="text-sm font-medium">
                اسکن بارکد قطعه
              </label>
              <TextField
                type="text"
                id="part-barcode-scanner" data-ui-repair-control="barcode"
                value={partBarcodeScanInput}
                onChange={(e) => setPartBarcodeScanInput(e.target.value)}
                preview="بارکد قطعه را اسکن کنید..."
                autoFocus
              />
            </form>

            <div className="text-center text-gray-500 text-sm">یا</div>

            <div className="space-y-2">
              <label className="text-sm font-medium">انتخاب دستی</label>
              <SelectField
                value={selectedPart.productId}
                onChange={(e) => setSelectedPart((p) => ({ ...p, productId: e.target.value }))}
              >
                <option value="">-- انتخاب قطعه --</option>
                {availableParts.map((part) => (
                  <option key={part.id} value={part.id}>
                    {part.name} (موجودی: {part.stock_quantity})
                  </option>
                ))}
              </SelectField>
              <TextField
                type="number"
                min="1"
                value={selectedPart.quantity}
                onChange={(e) => setSelectedPart((p) => ({ ...p, quantity: Number(e.target.value) }))}
                preview="تعداد"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={() => setIsAddPartModalOpen(false)} variant="ghost">انصراف</Button>
              <Button onClick={() => handleAddPart()} disabled={isSubmittingPart} loading={isSubmittingPart} loadingText="در حال افزودن مورد جدید..." variant="primary" leftIcon={<i className="fa-solid fa-plus" />}>
                افزودن مورد جدید
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
