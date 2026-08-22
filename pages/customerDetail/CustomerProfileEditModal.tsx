import { TextareaField } from '@/components/ui';
import React from 'react';
import TextField from '../../components/ui/TextField';
import type { NewCustomerData } from '../../types';

type Props = {
  ctx: Record<string, any> & {
    setEditingCustomer: React.Dispatch<React.SetStateAction<Partial<NewCustomerData>>>;
    setEditFormErrors: React.Dispatch<React.SetStateAction<Partial<NewCustomerData>>>;
  };
};

const CustomerProfileEditModal: React.FC<Props> = ({ ctx }) => {
  const {
    FormErrorSummary,
    Modal,
    ModalActions,
    editFormErrors,
    editingCustomer,
    errors,
    handleEditInputChange,
    handleEditSubmit,
    id,
    isEditModalOpen,
    isSubmittingEdit,
    name,
    note,
    profile,
    rows,
    setEditFormErrors,
    setEditingCustomer,
    setIsEditModalOpen,
    token,
    value,
  } = ctx;

  return (
    <>
{/* مودال ویرایش پروفایل */}
      {isEditModalOpen && (
        <Modal
          title="ویرایش اطلاعات مشتری"
          onClose={() => setIsEditModalOpen(false)}
          widthClass="max-w-2xl"
          iconClass="fa-solid fa-user-pen"
          variant="operational"
        >
          <form onSubmit={handleEditSubmit} className="grid gap-4" dir="rtl">
            <FormErrorSummary
              errors={editFormErrors as any}
              labels={{ fullName: 'نام کامل', nationalCode: 'کد ملی', phoneNumber: 'شماره تماس', address: 'آدرس قرارداد' }}
              fieldIdMap={{ fullName: 'editFullName', nationalCode: 'editNationalCode', phoneNumber: 'editPhoneNumber', address: 'editAddress' }}
            />
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
              نام، کد ملی و آدرس این پروفایل منبع مشخصات خریدار در قراردادهای اقساطی هستند. قراردادهای ثبت‌شده فقط در صورت خالی‌بودن snapshot از این اطلاعات تکمیل می‌شوند.
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                          id="editFullName"
                          name="fullName"
                          type="text"
                          dir="rtl"
                          autoComplete="name"
                          value={editingCustomer.fullName || ''}
                          onChange={(event) => {
                            const value = event.currentTarget.value;
                            setEditingCustomer(prev => ({ ...prev, fullName: value }));
                            if (editFormErrors.fullName) setEditFormErrors(prev => ({ ...prev, fullName: undefined }));
                          }}
                          label="نام کامل"
                          required
                          error={editFormErrors.fullName}
                          placeholder="نام و نام خانوادگی مشتری"
                        />
              <TextField
                          id="editPhoneNumber"
                          name="phoneNumber"
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel"
                          dir="ltr"
                          value={editingCustomer.phoneNumber || ''}
                          onChange={(event) => {
                            const value = event.currentTarget.value.replace(/[^0-9]/g, '');
                            setEditingCustomer(prev => ({ ...prev, phoneNumber: value }));
                            if (editFormErrors.phoneNumber) setEditFormErrors(prev => ({ ...prev, phoneNumber: undefined }));
                          }}
                          label="شماره تماس"
                          required
                          error={editFormErrors.phoneNumber}
                          placeholder="مثال: 09123456789"
                        />
              <TextField
                          id="editNationalCode"
                          name="nationalCode"
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          dir="ltr"
                          maxLength={10}
                          value={editingCustomer.nationalCode || ''}
                          onChange={(event) => {
                            const value = event.currentTarget.value
                              .replace(/[۰-۹]/g, (digit) => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)] || digit)
                              .replace(/[٠-٩]/g, (digit) => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(digit)] || digit)
                              .replace(/\D/g, '');
                            setEditingCustomer(prev => ({ ...prev, nationalCode: value }));
                            if (editFormErrors.nationalCode) setEditFormErrors(prev => ({ ...prev, nationalCode: undefined }));
                          }}
                          label="کد ملی خریدار"
                          error={editFormErrors.nationalCode}
                          hint="برای چاپ قرارداد اقساطی، کد ملی باید دقیقاً ۱۰ رقم باشد."
                          placeholder="0012345678"
                        />
            </div>

            <div className="grid gap-3">
              <TextareaField
                          id="editAddress"
                          name="address"
                          rows={3}
                          value={editingCustomer.address || ''}
                          onChange={handleEditInputChange}
                          label="آدرس محل سکونت / قرارداد"
                          error={editFormErrors.address}
                          placeholder="آدرس ثبت‌شده مشتری"
                        />
              <TextareaField
                          id="editNotes"
                          name="notes"
                          rows={3}
                          value={editingCustomer.notes || ''}
                          onChange={handleEditInputChange}
                          label="یادداشت داخلی"
                          error={editFormErrors.notes}
                          placeholder="مثلاً توضیح تکمیلی برای پیگیری یا ارتباط با مشتری"
                        />
            </div>

            <ModalActions
              onCancel={() => setIsEditModalOpen(false)}
              submitText="ذخیره تغییرات مشتری"
              submittingText="در حال ذخیره تغییرات..."
              isSubmitting={isSubmittingEdit}
              submitDisabled={!token || isSubmittingEdit}
              submitIconClass="fa-solid fa-floppy-disk"
              helperIconClass="fa-solid fa-shield-halved"
              helperText="اطلاعات شما با بالاترین سطح امنیت ذخیره می‌شود."
              hideHelper={false}
            />
          </form>
        </Modal>
      )}
    </>
  );
};

export default CustomerProfileEditModal;
