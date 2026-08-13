import { TextareaField, SelectField } from '@/components/ui';
import React from 'react';
import TextField from '../../components/ui/TextField';
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
    errors,
    handleEditInputChange,
    handleEditSubmit,
    id,
    isEditModalOpen,
    isSubmittingEdit,
    item,
    name,
    note,
    phone,
    profile,
    rows,
    setEditFormErrors,
    setEditingPartner,
    setIsEditModalOpen,
    summary,
    token,
    value,
  } = ctx;

  return (
    <>
{/* Edit Partner Modal */}
      {isEditModalOpen && (
        <Modal
          title="ویرایش اطلاعات همکار"
          onClose={() => setIsEditModalOpen(false)}
          widthClass="max-w-[980px]"
          wrapperClassName="customer-edit-v2-overlay partner-edit-v98-overlay"
          panelClassName="partner-edit-modal-panel"
          iconClass="fa-solid fa-user-tie"
          variant="operational"
          layout="split"
          bodyClassName="partner-edit-modal-body"
        >
          <form onSubmit={handleEditSubmit} className="customer-edit-v2 modal-template-form modal-template-form--profile-edit partner-edit-v98" dir="rtl">
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
              className="customer-edit-v2__errors"
            />

            <div className="customer-edit-v2__layout modal-template-form__layout">
              <aside className="customer-edit-v2__summary modal-template-side">
                <div className="customer-edit-v2-card modal-template-card customer-edit-v2-card--hero customer-edit-v2-card--hero-side partner-edit-v98-hero-card">
                  <div className="customer-edit-v2-hero">
                    <div className="customer-edit-v2-hero__copy">
                      <span className="customer-edit-v2-hero__eyebrow"><i className="fa-solid fa-briefcase" /> فرم بازبینی پرونده همکار</span>
                      <h3>{editingPartner.partnerName || 'همکار فروشگاه'}</h3>
                      <p>مشخصات همکاری، راه‌های ارتباطی و اطلاعات پیگیری این همکار را دقیق و یکپارچه به‌روزرسانی کنید.</p>
                      <div className="customer-edit-v2-hero__chips">
                        <span className="customer-edit-v2-chip"><i className="fa-solid fa-lock" /> ثبت امن تغییرات</span>
                        <span className="customer-edit-v2-chip"><i className="fa-solid fa-bolt" /> بروزرسانی سریع پرونده</span>
                      </div>
                    </div>
                    <span className="customer-edit-v2-hero__avatar partner-edit-v98-avatar"><i className="fa-solid fa-user-tie" /></span>
                  </div>
                </div>

                <div className="customer-edit-v2-card modal-template-card customer-edit-v2-card--summary">
                  <div className="customer-edit-v2-card__head">
                    <div>
                      <h4>خلاصه وضعیت اطلاعات</h4>
                      <p>نمای کلی اطلاعات مهم همکاری</p>
                    </div>
                    <span className="customer-edit-v2-card__head-icon"><i className="fa-solid fa-chart-column" /></span>
                  </div>

                  <div className="customer-edit-v2-status-list modal-template-metric-list">
                    <div className="customer-edit-v2-status-item modal-template-metric modal-template-status-metric">
                      <div className="customer-edit-v2-status-item__copy modal-template-metric__copy">
                        <span>نوع همکاری</span>
                        <strong>{PARTNER_TYPES.find((t) => t.value === editingPartner.partnerType)?.label || 'انتخاب نشده'}</strong>
                        <em className={editingPartner.partnerType?.trim() ? 'is-positive' : 'is-neutral'}><i className={`fa-solid ${editingPartner.partnerType?.trim() ? 'fa-circle-check' : 'fa-circle-minus'}`} /> {editingPartner.partnerType?.trim() ? 'تکمیل شده' : 'نیازمند انتخاب'}</em>
                      </div>
                      <span className="customer-edit-v2-status-item__icon modal-template-metric__icon"><i className="fa-solid fa-diagram-project" /></span>
                    </div>

                    <div className="customer-edit-v2-status-item modal-template-metric modal-template-status-metric">
                      <div className="customer-edit-v2-status-item__copy modal-template-metric__copy">
                        <span>شماره تماس</span>
                        <strong dir="ltr">{editingPartner.phoneNumber || 'ثبت نشده'}</strong>
                        <em className={editingPartner.phoneNumber?.trim() ? 'is-positive' : 'is-neutral'}><i className={`fa-solid ${editingPartner.phoneNumber?.trim() ? 'fa-circle-check' : 'fa-circle-minus'}`} /> {editingPartner.phoneNumber?.trim() ? 'ثبت شده' : 'نیازمند ثبت'}</em>
                      </div>
                      <span className="customer-edit-v2-status-item__icon modal-template-metric__icon"><i className="fa-solid fa-phone" /></span>
                    </div>

                    <div className="customer-edit-v2-status-item modal-template-metric modal-template-status-metric">
                      <div className="customer-edit-v2-status-item__copy modal-template-metric__copy">
                        <span>فرد رابط</span>
                        <strong>{editingPartner.contactPerson?.trim() ? editingPartner.contactPerson : 'ثبت نشده'}</strong>
                        <em className={editingPartner.contactPerson?.trim() ? 'is-info' : 'is-neutral'}><i className={`fa-solid ${editingPartner.contactPerson?.trim() ? 'fa-circle-info' : 'fa-circle-minus'}`} /> {editingPartner.contactPerson?.trim() ? 'قابل پیگیری' : 'در صورت نیاز ثبت شود'}</em>
                      </div>
                      <span className="customer-edit-v2-status-item__icon modal-template-metric__icon is-indigo"><i className="fa-solid fa-user-tie" /></span>
                    </div>
                  </div>
                </div>
              </aside>

              <section className="customer-edit-v2__main modal-template-main">
                <div className="customer-edit-v2-card modal-template-card customer-edit-v2-card--panel">
                  <div className="customer-edit-v2-panel__head">
                    <h4>هویت و ارتباط</h4>
                    <span><i className="fa-solid fa-handshake" /></span>
                  </div>

                  <div className="customer-edit-v2-grid customer-edit-v2-grid--two">
                    <label className="customer-edit-v2-field">
                      <span className="customer-edit-v2-field__label">نام همکار <em>*</em></span>
                      <div className={`customer-edit-v2-clean-shell ${editFormErrors.partnerName ? 'is-error' : ''}`}>
                        <TextField
                          id="editPartnerName"
                          name="partnerName"
                          type="text"
                          dir="rtl"
                          value={editingPartner.partnerName || ''}
                          onChange={(event) => {
                            const value = event.currentTarget.value;
                            setEditingPartner(prev => ({ ...prev, partnerName: value }));
                            if (editFormErrors.partnerName) setEditFormErrors(prev => ({ ...prev, partnerName: undefined }));
                          }}
                          wrapperClassName="contents"
                          controlWrapClassName="contents"
                          className="customer-edit-v2-native-input"
                          placeholder="نام همکار یا مجموعه"
                        />
                        <span className="customer-edit-v2-clean-divider" aria-hidden="true" />
                        <span className="customer-edit-v2-clean-icon" aria-hidden="true"><i className="fa-solid fa-building-user" /></span>
                      </div>
                      {editFormErrors.partnerName ? <span className="customer-edit-v2-field__error"><i className="fa-solid fa-circle-exclamation" /> {editFormErrors.partnerName}</span> : null}
                    </label>

                    <label className="customer-edit-v2-field">
                      <span className="customer-edit-v2-field__label">نوع همکار <em>*</em></span>
                      <div className={`customer-edit-v2-clean-shell partner-edit-v98-select-shell ${editFormErrors.partnerType ? 'is-error' : ''}`}>
                        <SelectField controlOnly unstyled showChevron={false}
                          id="editPartnerType"
                          name="partnerType"
                          value={editingPartner.partnerType || ''}
                          onChange={handleEditInputChange}
                          className="partner-edit-v98-select"
                          required
                        >
                          {PARTNER_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                        </SelectField>
                        <span className="customer-edit-v2-clean-divider" aria-hidden="true" />
                        <span className="customer-edit-v2-clean-icon" aria-hidden="true"><i className="fa-solid fa-diagram-project" /></span>
                      </div>
                      {editFormErrors.partnerType ? <span className="customer-edit-v2-field__error"><i className="fa-solid fa-circle-exclamation" /> {editFormErrors.partnerType}</span> : null}
                    </label>

                    <label className="customer-edit-v2-field">
                      <span className="customer-edit-v2-field__label">فرد رابط</span>
                      <div className={`customer-edit-v2-clean-shell ${editFormErrors.contactPerson ? 'is-error' : ''}`}>
                        <TextField
                          id="editContactPerson"
                          name="contactPerson"
                          type="text"
                          dir="rtl"
                          value={editingPartner.contactPerson || ''}
                          onChange={(event) => {
                            const value = event.currentTarget.value;
                            setEditingPartner(prev => ({ ...prev, contactPerson: value }));
                            if (editFormErrors.contactPerson) setEditFormErrors(prev => ({ ...prev, contactPerson: undefined }));
                          }}
                          wrapperClassName="contents"
                          controlWrapClassName="contents"
                          className="customer-edit-v2-native-input"
                          placeholder="نام فرد پاسخ‌گو یا مسئول هماهنگی"
                        />
                        <span className="customer-edit-v2-clean-divider" aria-hidden="true" />
                        <span className="customer-edit-v2-clean-icon" aria-hidden="true"><i className="fa-solid fa-user-tie" /></span>
                      </div>
                    </label>

                    <label className="customer-edit-v2-field">
                      <span className="customer-edit-v2-field__label">شماره تماس</span>
                      <div className={`customer-edit-v2-clean-shell ${editFormErrors.phoneNumber ? 'is-error' : ''}`}>
                        <TextField
                          id="editPhoneNumber"
                          name="phoneNumber"
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel"
                          dir="ltr"
                          value={editingPartner.phoneNumber || ''}
                          onChange={(event) => {
                            const value = event.currentTarget.value.replace(/[^0-9]/g, '');
                            setEditingPartner(prev => ({ ...prev, phoneNumber: value }));
                            if (editFormErrors.phoneNumber) setEditFormErrors(prev => ({ ...prev, phoneNumber: undefined }));
                          }}
                          wrapperClassName="contents"
                          controlWrapClassName="contents"
                          className="customer-edit-v2-native-input customer-edit-v2-native-input--ltr"
                          placeholder="مثال: 09123456789"
                        />
                        <span className="customer-edit-v2-clean-divider" aria-hidden="true" />
                        <span className="customer-edit-v2-clean-icon" aria-hidden="true"><i className="fa-solid fa-phone" /></span>
                      </div>
                      {editFormErrors.phoneNumber ? <span className="customer-edit-v2-field__error"><i className="fa-solid fa-circle-exclamation" /> {editFormErrors.phoneNumber}</span> : null}
                    </label>
                  </div>
                </div>

                <div className="customer-edit-v2-card modal-template-card customer-edit-v2-card--panel">
                  <div className="customer-edit-v2-panel__head">
                    <h4>اطلاعات تکمیلی</h4>
                    <span><i className="fa-solid fa-file-lines" /></span>
                  </div>

                  <div className="customer-edit-v2-grid customer-edit-v2-grid--stack">
                    <label className="customer-edit-v2-field customer-edit-v2-field--full">
                      <span className="customer-edit-v2-field__label">ایمیل</span>
                      <div className={`customer-edit-v2-clean-shell partner-edit-v100-email-shell ${editFormErrors.email ? 'is-error' : ''}`} dir="ltr">
                        <input
                          id="editEmail"
                          name="email"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          dir="ltr"
                          value={editingPartner.email || ''}
                          onChange={(event) => {
                            const value = event.currentTarget.value.trim();
                            setEditingPartner(prev => ({ ...prev, email: value }));
                            if (editFormErrors.email) setEditFormErrors(prev => ({ ...prev, email: undefined }));
                          }}
                          className="customer-edit-v2-native-input customer-edit-v2-native-input--ltr partner-edit-v100-email-input"
                          placeholder="example@domain.com"
                        />
                        <span className="customer-edit-v2-clean-divider" aria-hidden="true" />
                        <span className="customer-edit-v2-clean-icon" aria-hidden="true"><i className="fa-regular fa-envelope" /></span>
                      </div>
                      {editFormErrors.email ? <span className="customer-edit-v2-field__error"><i className="fa-solid fa-circle-exclamation" /> {editFormErrors.email}</span> : null}
                    </label>

                    <label className="customer-edit-v2-field customer-edit-v2-field--full">
                      <span className="customer-edit-v2-field__label">آدرس</span>
                      <div className="customer-edit-v2-field__control customer-edit-v2-field__control--textarea">
                        <TextareaField controlOnly
                          id="editAddress"
                          name="address"
                          rows={3}
                          value={editingPartner.address || ''}
                          onChange={handleEditInputChange}
                          className={`customer-edit-v2-input--field customer-edit-v2-textarea ${editFormErrors.address ? 'is-error' : ''}`}
                          placeholder="آدرس یا موقعیت این همکار را وارد کنید"
                        />
                        <span className="customer-edit-v2-field__icon"><i className="fa-solid fa-location-dot" /></span>
                      </div>
                    </label>

                    <label className="customer-edit-v2-field customer-edit-v2-field--full">
                      <span className="customer-edit-v2-field__label">یادداشت داخلی</span>
                      <div className="customer-edit-v2-field__control customer-edit-v2-field__control--textarea">
                        <TextareaField controlOnly
                          id="editNotes"
                          name="notes"
                          rows={3}
                          value={editingPartner.notes || ''}
                          onChange={handleEditInputChange}
                          className={`customer-edit-v2-input--field customer-edit-v2-textarea ${editFormErrors.notes ? 'is-error' : ''}`}
                          placeholder="مثلاً شرایط همکاری، ساعات پاسخ‌گویی یا توضیحات مدیریتی"
                        />
                        <span className="customer-edit-v2-field__icon"><i className="fa-regular fa-note-sticky" /></span>
                      </div>
                    </label>
                  </div>
                </div>
              </section>
            </div>

            <ModalActions
              onCancel={() => setIsEditModalOpen(false)}
              submitText="ذخیره تغییرات همکار"
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

export default PartnerEditProfileModal;
