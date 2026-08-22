import React from 'react';
import { ModalField, SelectField, TextareaField, TextField } from '@/components/ui';
import type { NewPartnerData } from '../../types';
import type { PartnerTypeOption } from '../viewBoundaryTypes';

export type PartnerEditProfileModalContext = Record<string, any> & {
  PARTNER_TYPES: PartnerTypeOption[];
  setEditingPartner: React.Dispatch<React.SetStateAction<Partial<NewPartnerData>>>;
  setEditFormErrors: React.Dispatch<React.SetStateAction<Partial<NewPartnerData>>>;
};

type Props = {
  ctx: PartnerEditProfileModalContext;
};

const PartnerEditProfileModal: React.FC<Props> = ({ ctx }) => {
  const {
    FormErrorSummary,
    Modal,
    ModalActions,
    PARTNER_TYPES,
    editFormErrors,
    editingPartner,
    handleEditInputChange,
    handleEditSubmit,
    isEditModalOpen,
    isSubmittingEdit,
    setEditFormErrors,
    setEditingPartner,
    setIsEditModalOpen,
    token,
  } = ctx;

  if (!isEditModalOpen) return null;

  const partnerTypeLabel = PARTNER_TYPES.find((type) => type.value === editingPartner.partnerType)?.label || 'انتخاب نشده';
  const statusItems = [
    {
      label: 'نوع همکاری',
      value: partnerTypeLabel,
      complete: Boolean(editingPartner.partnerType?.trim()),
      icon: 'fa-solid fa-diagram-project',
    },
    {
      label: 'شماره تماس',
      value: editingPartner.phoneNumber || 'ثبت نشده',
      complete: Boolean(editingPartner.phoneNumber?.trim()),
      icon: 'fa-solid fa-phone',
      ltr: true,
    },
    {
      label: 'فرد رابط',
      value: editingPartner.contactPerson?.trim() || 'ثبت نشده',
      complete: Boolean(editingPartner.contactPerson?.trim()),
      icon: 'fa-solid fa-user-tie',
    },
  ];

  return (
    <Modal
      title="ویرایش اطلاعات همکار"
      onClose={() => setIsEditModalOpen(false)}
      widthClass="max-w-5xl"
      iconClass="fa-solid fa-user-tie"
      variant="operational"
    >
      <form onSubmit={handleEditSubmit} className="space-y-4" dir="rtl">
        <FormErrorSummary
          errors={editFormErrors as any}
          labels={{
            partnerName: 'نام همکار',
            partnerType: 'نوع همکار',
            phoneNumber: 'شماره تماس',
            email: 'ایمیل',
          }}
          fieldIdMap={{
            partnerName: 'editPartnerName',
            partnerType: 'editPartnerType',
            phoneNumber: 'editPhoneNumber',
            email: 'editEmail',
          }}
        />

        <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300" aria-hidden="true">
                <i className="fa-solid fa-briefcase" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">پرونده همکار</p>
                <h3 className="mt-1 break-words text-base font-bold text-slate-900 dark:text-white">
                  {editingPartner.partnerName || 'همکار فروشگاه'}
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                  مشخصات هویتی و راه‌های ارتباطی را بازبینی کنید.
                </p>
              </div>
            </div>

            <div className="space-y-2" aria-label="خلاصه وضعیت اطلاعات">
              {statusItems.map((item) => (
                <div key={item.label} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200" aria-hidden="true">
                    <i className={item.icon} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
                    <p className="mt-0.5 break-words text-sm font-semibold text-slate-900 dark:text-white">
                      {item.ltr ? <bdi dir="ltr">{item.value}</bdi> : item.value}
                    </p>
                  </div>
                  <span
                    className={item.complete
                      ? 'inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'}
                    aria-label={item.complete ? 'تکمیل شده' : 'نیازمند تکمیل'}
                  >
                    <i className={`fa-solid ${item.complete ? 'fa-check' : 'fa-minus'}`} aria-hidden="true" />
                  </span>
                </div>
              ))}
            </div>
          </aside>

          <section className="grid min-w-0 gap-4 sm:grid-cols-2" aria-label="اطلاعات همکار">
            <ModalField
              label="نام همکار"
              iconClass="fa-solid fa-building-user"
              required
              error={editFormErrors.partnerName as string | undefined}
            >
              <TextField
                id="editPartnerName"
                name="partnerName"
                type="text"
                dir="rtl"
                value={editingPartner.partnerName || ''}
                onChange={(event) => {
                  const nextValue = event.currentTarget.value;
                  setEditingPartner((previous) => ({ ...previous, partnerName: nextValue }));
                  if (editFormErrors.partnerName) setEditFormErrors((previous) => ({ ...previous, partnerName: undefined }));
                }}
                placeholder="نام همکار یا مجموعه"
              />
            </ModalField>

            <ModalField
              label="نوع همکار"
              iconClass="fa-solid fa-diagram-project"
              required
              error={editFormErrors.partnerType as string | undefined}
            >
              <SelectField
                id="editPartnerType"
                name="partnerType"
                value={editingPartner.partnerType || ''}
                onChange={handleEditInputChange}
                required
              >
                {PARTNER_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </SelectField>
            </ModalField>

            <ModalField label="فرد رابط" iconClass="fa-solid fa-user-tie" error={editFormErrors.contactPerson as string | undefined}>
              <TextField
                id="editContactPerson"
                name="contactPerson"
                type="text"
                dir="rtl"
                value={editingPartner.contactPerson || ''}
                onChange={(event) => {
                  const nextValue = event.currentTarget.value;
                  setEditingPartner((previous) => ({ ...previous, contactPerson: nextValue }));
                  if (editFormErrors.contactPerson) setEditFormErrors((previous) => ({ ...previous, contactPerson: undefined }));
                }}
                placeholder="نام فرد پاسخ‌گو"
              />
            </ModalField>

            <ModalField label="شماره تماس" iconClass="fa-solid fa-phone" error={editFormErrors.phoneNumber as string | undefined}>
              <TextField
                id="editPhoneNumber"
                name="phoneNumber"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                dir="ltr"
                value={editingPartner.phoneNumber || ''}
                onChange={(event) => {
                  const nextValue = event.currentTarget.value.replace(/[^0-9]/g, '');
                  setEditingPartner((previous) => ({ ...previous, phoneNumber: nextValue }));
                  if (editFormErrors.phoneNumber) setEditFormErrors((previous) => ({ ...previous, phoneNumber: undefined }));
                }}
                placeholder="09123456789"
              />
            </ModalField>

            <ModalField label="ایمیل" iconClass="fa-regular fa-envelope" error={editFormErrors.email as string | undefined} className="sm:col-span-2">
              <TextField
                id="editEmail"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                dir="ltr"
                value={editingPartner.email || ''}
                onChange={(event) => {
                  const nextValue = event.currentTarget.value;
                  setEditingPartner((previous) => ({ ...previous, email: nextValue }));
                  if (editFormErrors.email) setEditFormErrors((previous) => ({ ...previous, email: undefined }));
                }}
                placeholder="example@domain.com"
              />
            </ModalField>

            <ModalField label="آدرس" iconClass="fa-solid fa-location-dot" error={editFormErrors.address as string | undefined} className="sm:col-span-2">
              <TextareaField
                id="editAddress"
                name="address"
                rows={3}
                value={editingPartner.address || ''}
                onChange={handleEditInputChange}
                placeholder="آدرس یا موقعیت همکار"
              />
            </ModalField>

            <ModalField label="یادداشت داخلی" iconClass="fa-regular fa-note-sticky" error={editFormErrors.notes as string | undefined} className="sm:col-span-2">
              <TextareaField
                id="editNotes"
                name="notes"
                rows={3}
                value={editingPartner.notes || ''}
                onChange={handleEditInputChange}
                placeholder="شرایط همکاری یا توضیحات مدیریتی"
              />
            </ModalField>
          </section>
        </div>

        <ModalActions
          onCancel={() => setIsEditModalOpen(false)}
          submitText="ذخیره تغییرات همکار"
          submittingText="در حال ذخیره تغییرات..."
          isSubmitting={isSubmittingEdit}
          submitDisabled={!token || isSubmittingEdit}
          submitIconClass="fa-solid fa-floppy-disk"
          align="end"
        />
      </form>
    </Modal>
  );
};

export default PartnerEditProfileModal;
