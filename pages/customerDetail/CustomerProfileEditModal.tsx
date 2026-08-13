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
          widthClass="max-w-[980px]"
          wrapperClassName="customer-edit-v2-overlay"
          iconClass="fa-solid fa-user-pen"
          variant="operational"
          layout="split"
        >
          <form onSubmit={handleEditSubmit} className="customer-edit-v2 modal-template-form modal-template-form--profile-edit" dir="rtl">
            <FormErrorSummary
              errors={editFormErrors as any}
              labels={{ fullName: 'نام کامل', phoneNumber: 'شماره تماس' }}
              fieldIdMap={{ fullName: 'editFullName', phoneNumber: 'editPhoneNumber' }}
              className="customer-edit-v2__errors"
            />

            <div className="customer-edit-v2__layout modal-template-form__layout">
              <aside className="customer-edit-v2__summary modal-template-side">
                <div className="customer-edit-v2-card modal-template-card customer-edit-v2-card--hero customer-edit-v2-card--hero-side">
                  <div className="customer-edit-v2-hero">
                    <div className="customer-edit-v2-hero__copy">
                      <span className="customer-edit-v2-hero__eyebrow"><i className="fa-solid fa-user-gear" /> فرم بازبینی پرونده مشتری</span>
                      <h3>{editingCustomer.fullName || 'اکبر آریسان'}</h3>
                      <p>اطلاعات هویتی و راه‌های ارتباطی این مشتری را برای مدیریت دقیق‌تر پرونده به‌روزرسانی کنید.</p>
                      <div className="customer-edit-v2-hero__chips">
                        <span className="customer-edit-v2-chip"><i className="fa-solid fa-lock" /> ثبت امن تغییرات</span>
                        <span className="customer-edit-v2-chip"><i className="fa-solid fa-bolt" /> بروزرسانی سریع پرونده</span>
                      </div>
                    </div>
                    <span className="customer-edit-v2-hero__avatar"><i className="fa-solid fa-user" /></span>
                  </div>
                </div>

                <div className="customer-edit-v2-card modal-template-card customer-edit-v2-card--summary">
                  <div className="customer-edit-v2-card__head">
                    <div>
                      <h4>خلاصه وضعیت اطلاعات</h4>
                      <p>نمای کلی و وضعیت اطلاعات مهم مشتری</p>
                    </div>
                    <span className="customer-edit-v2-card__head-icon"><i className="fa-solid fa-chart-column" /></span>
                  </div>

                  <div className="customer-edit-v2-status-list modal-template-metric-list">
                    <div className="customer-edit-v2-status-item modal-template-metric modal-template-status-metric">
                      <div className="customer-edit-v2-status-item__copy modal-template-metric__copy">
                        <span>شماره تماس</span>
                        <strong dir="ltr">{editingCustomer.phoneNumber || 'ثبت نشده'}</strong>
                        <em className={editingCustomer.phoneNumber?.trim() ? 'is-positive' : 'is-neutral'}><i className={`fa-solid ${editingCustomer.phoneNumber?.trim() ? 'fa-circle-check' : 'fa-circle-minus'}`} /> {editingCustomer.phoneNumber?.trim() ? 'تأیید شده' : 'نیازمند ثبت'}</em>
                      </div>
                      <span className="customer-edit-v2-status-item__icon modal-template-metric__icon"><i className="fa-solid fa-phone" /></span>
                    </div>

                    <div className="customer-edit-v2-status-item modal-template-metric modal-template-status-metric">
                      <div className="customer-edit-v2-status-item__copy modal-template-metric__copy">
                        <span>آدرس</span>
                        <strong>{editingCustomer.address?.trim() ? 'آدرس ثبت شده' : 'آدرس ثبت نشده'}</strong>
                        <em className={editingCustomer.address?.trim() ? 'is-positive' : 'is-neutral'}><i className={`fa-solid ${editingCustomer.address?.trim() ? 'fa-circle-check' : 'fa-circle-minus'}`} /> {editingCustomer.address?.trim() ? 'تکمیل شده' : 'نیازمند تکمیل'}</em>
                      </div>
                      <span className="customer-edit-v2-status-item__icon modal-template-metric__icon"><i className="fa-solid fa-location-dot" /></span>
                    </div>

                    <div className="customer-edit-v2-status-item modal-template-metric modal-template-status-metric">
                      <div className="customer-edit-v2-status-item__copy modal-template-metric__copy">
                        <span>یادداشت داخلی</span>
                        <strong>{editingCustomer.notes?.trim() ? 'یادداشت موجود' : 'بدون یادداشت'}</strong>
                        <em className={editingCustomer.notes?.trim() ? 'is-info' : 'is-neutral'}><i className={`fa-solid ${editingCustomer.notes?.trim() ? 'fa-circle-info' : 'fa-circle-minus'}`} /> {editingCustomer.notes?.trim() ? 'نیازمند بازبینی' : 'در صورت نیاز ثبت شود'}</em>
                      </div>
                      <span className="customer-edit-v2-status-item__icon modal-template-metric__icon is-indigo"><i className="fa-regular fa-note-sticky" /></span>
                    </div>
                  </div>
                </div>
              </aside>

              <section className="customer-edit-v2__main modal-template-main">
                <div className="customer-edit-v2-card modal-template-card customer-edit-v2-card--panel">
                  <div className="customer-edit-v2-panel__head">
                    <h4>هویت و ارتباط</h4>
                    <span><i className="fa-solid fa-user" /></span>
                  </div>
                  <div className="customer-edit-v2-grid customer-edit-v2-grid--two">
                    <label className="customer-edit-v2-field">
                      <span className="customer-edit-v2-field__label">نام کامل <em>*</em></span>
                      <div className={`customer-edit-v2-clean-shell ${editFormErrors.fullName ? 'is-error' : ''}`}>
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
                          wrapperClassName="contents"
                          controlWrapClassName="contents"
                          className="customer-edit-v2-native-input"
                          placeholder="نام و نام خانوادگی مشتری"
                        />
                        <span className="customer-edit-v2-clean-divider" aria-hidden="true" />
                        <span className="customer-edit-v2-clean-icon" aria-hidden="true"><i className="fa-solid fa-user" /></span>
                      </div>
                      {editFormErrors.fullName ? <span className="customer-edit-v2-field__error"><i className="fa-solid fa-circle-exclamation" /> {editFormErrors.fullName}</span> : null}
                    </label>

                    <label className="customer-edit-v2-field">
                      <span className="customer-edit-v2-field__label">شماره تماس <em>*</em></span>
                      <div className={`customer-edit-v2-clean-shell ${editFormErrors.phoneNumber ? 'is-error' : ''}`}>
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
                      <span className="customer-edit-v2-field__label">آدرس</span>
                      <div className="customer-edit-v2-field__control customer-edit-v2-field__control--textarea">
                        <TextareaField controlOnly
                          id="editAddress"
                          name="address"
                          rows={3}
                          value={editingCustomer.address || ''}
                          onChange={handleEditInputChange}
                          className={`customer-edit-v2-input--field customer-edit-v2-textarea ${editFormErrors.address ? 'is-error' : ''}`}
                          placeholder="آدرس ثبت‌شده مشتری"
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
                          value={editingCustomer.notes || ''}
                          onChange={handleEditInputChange}
                          className={`customer-edit-v2-input--field customer-edit-v2-textarea ${editFormErrors.notes ? 'is-error' : ''}`}
                          placeholder="مثلاً توضیح تکمیلی برای پیگیری یا ارتباط با مشتری"
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
