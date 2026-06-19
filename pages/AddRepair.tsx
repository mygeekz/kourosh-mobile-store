// pages/AddRepair.tsx
import React, { useEffect, useMemo, useState, FormEvent, ChangeEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NewRepairData, Customer, NotificationMessage } from '../types';
import Notification from '../components/Notification';
import PriceInput from '../components/PriceInput';
import { useAuth } from '../contexts/AuthContext';
import { useStyle } from '../contexts/StyleContext';
import { apiFetch } from '../utils/apiFetch';
import { parseApiResult, runWithFeedback, humanizeErrorMessage } from '../utils/feedback';
import WorkflowWizard, { WizardStep } from '../components/WorkflowWizard';
import Button from '../components/Button';
import { useMountedRef } from '../utils/asyncGuards';
import { useFormErgonomics } from '../hooks/useFormErgonomics';

/** کمکی‌ها */
const pickMobile = (c?: Partial<Customer> | null) =>
  c?.mobile || (c as any)?.phoneNumber || (c as any)?.phone || '';

const AddRepair: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { style } = useStyle();
  const brand = `hsl(${style.primaryHue} 90% 55%)`;
  const mountedRef = useMountedRef();

  const initialFormState: NewRepairData = {
    customerId: null,
    deviceModel: '',
    deviceColor: '',
    serialNumber: '',
    problemDescription: '',
    estimatedCost: '',
  };

  const [formData, setFormData] = useState<NewRepairData>(initialFormState);
  const [wizardStep, setWizardStep] = useState(0);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerMobile, setCustomerMobile] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<NewRepairData>>({});
  const { formRef, onKeyDownCapture } = useFormErgonomics({
    errorCount: Object.keys(formErrors || {}).filter((key) => Boolean((formErrors as any)[key])).length,
    submitOnLastField: true,
  });

  useEffect(() => {
    if (currentUser && currentUser.roleName === 'Salesperson') {
      setNotification({ type: 'error', text: 'شما اجازه دسترسی به این صفحه را ندارید.' });
      navigate('/');
      return;
    }
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, navigate]);

  const fetchCustomers = async () => {
    setIsLoadingCustomers(true);
    try {
      const response = await apiFetch('/api/customers');
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت لیست مشتریان');
      setCustomers(result.data || []);
    } catch (error: any) {
      setNotification({ type: 'error', text: humanizeErrorMessage(error.message, { endpoint: '/api/repairs', action: 'ثبت اطلاعات پذیرش تعمیر' }) });
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const name = (c.fullName || '').toLowerCase();
      const mobile = (pickMobile(c) || '').toLowerCase();
      return name.includes(q) || mobile.includes(q) || String(c.id).includes(q);
    });
  }, [customers, customerQuery]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === 'customerId') {
      const selected = customers.find((c) => c.id === Number(value));
      setCustomerMobile(pickMobile(selected));
    }

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (formErrors[name as keyof NewRepairData]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<NewRepairData> = {};
    if (!formData.customerId) errors.customerId = 'انتخاب مشتری الزامی است.';
    if (!formData.deviceModel.trim()) errors.deviceModel = 'مدل دستگاه الزامی است.';
    if (!formData.problemDescription.trim()) errors.problemDescription = 'شرح مشکل از زبان مشتری الزامی است.';
    if (
      formData.estimatedCost &&
      (isNaN(Number(String(formData.estimatedCost).replace(/,/g, ''))) ||
        Number(String(formData.estimatedCost).replace(/,/g, '')) < 0)
    ) {
      errors.estimatedCost = 'هزینهٔ تخمینی باید عدد معتبر باشد.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    setNotification(null);

    try {
      const payload: any = {
        ...formData,
        customerId: Number(formData.customerId),
        estimatedCost: formData.estimatedCost
          ? Number(String(formData.estimatedCost).replace(/,/g, ''))
          : null,
        customerMobile: customerMobile || null,
      };

      const result = await runWithFeedback(
        parseApiResult<any>(
          await apiFetch('/api/repairs', {
            method: 'POST',
            body: JSON.stringify(payload),
          }),
          { endpoint: '/api/repairs', action: 'ثبت اطلاعات پذیرش تعمیر' }
        ),
        {
          kind: 'create',
          endpoint: '/api/repairs',
          loading: 'در حال ثبت اطلاعات پذیرش تعمیر…',
          success: 'پذیرش تعمیر با موفقیت ثبت شد.',
          error: 'ثبت اطلاعات پذیرش تعمیر انجام نشد؛ اطلاعات مشتری، دستگاه و هزینه را بررسی و ادامه کنید.',
        }
      );

      setNotification({ type: 'success', text: 'دستگاه با موفقیت پذیرش شد و رسید آماده چاپ است.' });
      const repairId =
        result?.data?.repair?.id ??
        result?.data?.id ??
        result?.data?.repairId ??
        result?.data?.repair?.repairId;

      if (!repairId) {
        throw new Error('شناسه تعمیر پس از ثبت اطلاعات دریافت نشد.');
      }

      navigate(`/repairs/${repairId}/receipt?autoPrint=1`);
    } catch (error: any) {
      setNotification({ type: 'error', text: humanizeErrorMessage(error.message, { endpoint: '/api/repairs', action: 'ثبت اطلاعات پذیرش تعمیر' }) });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const prefillCustomerId = Number((location.state as any)?.prefillCustomerId || 0);
    if (!prefillCustomerId || customers.length === 0) return;
    const selected = customers.find((c) => c.id === prefillCustomerId);
    if (!selected) return;
    setFormData((prev) => ({ ...prev, customerId: prefillCustomerId as any }));
    setCustomerMobile(pickMobile(selected));
  }, [location.state, customers]);

  const selectedCustomer = useMemo(() => {
    if (!formData.customerId) return null;
    return customers.find((c) => c.id === Number(formData.customerId)) || null;
  }, [customers, formData.customerId]);

  return (
    <div className="products-services-redesign-v1 repairs-redesign-v1 repair-form-redesign-v1 repair-workflow-foundation space-y-4 text-right max-w-7xl mx-auto px-4" dir="rtl" data-ui-repair-page="add" data-ui-repair-scope="form">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <form ref={formRef} onKeyDownCapture={onKeyDownCapture} onSubmit={handleSubmit} className="app-card ux-form-shell max-w-4xl mx-auto" aria-busy={isLoading} data-ergonomic-form="true" data-ui-repair-form="intake">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-4 mb-6" data-ui-repair-surface="form-header">
          <h2 className="text-lg md:text-xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-2 min-w-0">
            <i className="fa-solid fa-screwdriver-wrench" style={{ color: brand }} />
            <span className="truncate">پذیرش دستگاه جدید برای تعمیر</span>
          </h2>

          <Button
            type="button"
            onClick={() => navigate('/repairs')}
            variant="secondary"
            size="sm"
            leftIcon={<i className="fa-solid fa-arrow-right" />}
            className="hidden md:inline-flex"
          >
            بازگشت
          </Button>
        </div>

        <div className="mb-5">
          <WorkflowWizard
            steps={([
              { id: 'customer', title: 'مشتری', description: 'انتخاب مشتری و شماره', icon: 'fa-solid fa-user', anchorId: 'repair-step-customer' },
              { id: 'device', title: 'دستگاه', description: 'مدل/رنگ/سریال', icon: 'fa-solid fa-mobile-screen-button', anchorId: 'repair-step-device' },
              { id: 'issue', title: 'شرح مشکل', description: 'مشکل و هزینه تخمینی', icon: 'fa-solid fa-screwdriver-wrench', anchorId: 'repair-step-issue' },
            ] as WizardStep[])}
            stepIndex={wizardStep}
            onStepChange={setWizardStep}
          />
        </div>

        {/* Form grid */}
        <div className="ux-form-grid" data-ui-repair-form-grid="true">
          {/* مشتری */}
          <div id="repair-step-customer" data-ui-repair-step="customer" className={["md:col-span-2", wizardStep === 0 ? '' : 'hidden md:block'].join(' ')}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="customerId" className="app-label">
                  مشتری <span className="text-red-500">*</span>
                </label>
                <select
                  id="customerId"
                  name="customerId"
                  value={formData.customerId || ''}
                  onChange={handleInputChange}
                  className={`app-select ${formErrors.customerId ? 'border-red-500' : ''}`}
                  disabled={isLoadingCustomers}
                >
                  <option value="">— انتخاب مشتری —</option>
                  {filteredCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} {pickMobile(c) ? `— ${pickMobile(c)}` : ''}
                    </option>
                  ))}
                </select>
                {formErrors.customerId && <p className="app-error">{formErrors.customerId}</p>}
              </div>

              <div>
                <label htmlFor="customerMobile" className="app-label">
                  شماره موبایل
                </label>
                <input
                  type="text"
                  id="customerMobile"
                  name="customerMobile" data-ui-repair-control="phone"
                  value={customerMobile}
                  readOnly
                  preview="به‌صورت خودکار پر می‌شود"
                  className="app-input bg-black/[0.02] dark:bg-white/[0.03]"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="app-label">جستجو مشتری</label>
              <div className="relative">
                <input
                  type="text"
                  preview="نام، موبایل یا شناسه…"
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  className="app-input"
                />
                {isLoadingCustomers && (
                  <div className="absolute left-3 top-3 text-gray-400">
                    <i className="fas fa-spinner fa-spin" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* مدل */}
          <div id="repair-step-device" data-ui-repair-step="device" className={[wizardStep === 1 ? '' : 'hidden md:block'].join(' ')}>
            <label htmlFor="deviceModel" className="app-label">
              مدل دستگاه <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="deviceModel"
              name="deviceModel"
              value={formData.deviceModel}
              onChange={handleInputChange}
              preview="مثال: iPhone 13 Pro Max"
              className={`app-input ${formErrors.deviceModel ? 'border-red-500' : ''}`}
            />
            {formErrors.deviceModel && <p className="app-error">{formErrors.deviceModel}</p>}
          </div>

          {/* رنگ */}
          <div className={[wizardStep === 1 ? '' : 'hidden md:block'].join(' ')}>
            <label htmlFor="deviceColor" className="app-label">
              رنگ دستگاه
            </label>
            <input
              type="text"
              id="deviceColor"
              name="deviceColor"
              value={formData.deviceColor || ''}
              onChange={handleInputChange}
              preview="مثال: Sierra Blue"
              className="app-input"
            />
          </div>

          {/* سریال */}
          <div className={[wizardStep === 1 ? '' : 'hidden md:block'].join(' ')}>
            <label htmlFor="serialNumber" className="app-label">
              شماره سریال / IMEI (اختیاری)
            </label>
            <input
              type="text"
              id="serialNumber"
              name="serialNumber" data-ui-repair-control="serial"
              value={formData.serialNumber || ''}
              onChange={handleInputChange}
              preview="IMEI / سریال"
              className="app-input"
            />
          </div>

          {/* هزینه تخمینی */}
          <div id="repair-step-issue" data-ui-repair-step="issue" className={[wizardStep === 2 ? '' : 'hidden md:block'].join(' ')}>
            <label htmlFor="estimatedCost" className="app-label">
              هزینهٔ تخمینی (تومان)
            </label>
            <PriceInput
              id="estimatedCost"
              name="estimatedCost"
              value={String(formData.estimatedCost || '')}
              onChange={handleInputChange}
              className={`app-input text-left ${formErrors.estimatedCost ? 'border-red-500' : ''}`}
              topLabel="برآورد"
              suffix="تومان"
              preview="مثال: ۱۲۰۰۰۰۰"
            />
            {formErrors.estimatedCost && <p className="app-error">{formErrors.estimatedCost}</p>}
          </div>

          {/* شرح مشکل */}
          <div className={["md:col-span-2", wizardStep === 2 ? '' : 'hidden md:block'].join(' ')}>
            <label htmlFor="problemDescription" className="app-label">
              شرح مشکل از زبان مشتری <span className="text-red-500">*</span>
            </label>
            <textarea
              id="problemDescription"
              name="problemDescription"
              value={formData.problemDescription}
              onChange={handleInputChange}
              rows={4}
              preview="مثال: صفحه‌نمایش شکسته، باتری زود خالی می‌شود…"
              className={`app-textarea ${formErrors.problemDescription ? 'border-red-500' : ''}`}
            />
            {formErrors.problemDescription && <p className="app-error">{formErrors.problemDescription}</p>}
          </div>
        </div>

        {/* spacer for sticky bar */}
        <div className="h-20" />

        {/* Sticky submit bar */}
        <div className="sticky bottom-0 z-20 -mx-4 md:-mx-6 px-4 md:px-6 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 bg-white/70 dark:bg-gray-950/50 backdrop-blur border-t border-black/5 dark:border-white/10">
          <div className="app-card p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] text-gray-500 dark:text-gray-400">مشتری انتخاب‌شده</div>
              <div className="text-sm font-black text-gray-900 dark:text-gray-100 truncate">
                {selectedCustomer ? selectedCustomer.fullName : '—'}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => navigate('/repairs')}
                variant="secondary"
                leftIcon={<i className="fa-solid fa-xmark" />}
              >
                انصراف
              </Button>

              <Button
                type="submit"
                disabled={isLoading || isLoadingCustomers}
                variant="primary"
                loading={isLoading}
                loadingText="در حال ثبت اطلاعات..."
                title="ثبت اطلاعات و رفتن به فیش چاپ"
                leftIcon={<i className="fa-solid fa-check" />}
              >
                ثبت اطلاعات پذیرش
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddRepair;
