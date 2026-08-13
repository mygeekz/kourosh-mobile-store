import React from 'react';
import Button from '../../components/Button';
import { Dialog as Modal } from '@/components/ui';
import { DialogActions as ModalActions } from '@/components/ui';
import { TextField } from '@/components/ui';
import { SelectField } from '@/components/ui';
import type { SettingsUsersModalsProps } from './settingsPanelTypes';

const SettingsUsersModals: React.FC<SettingsUsersModalsProps> = ({
  isAddUserModalOpen,
  setIsAddUserModalOpen,
  newUser,
  addUserFormErrors,
  handleNewUserChange,
  handleNewUserSubmit,
  roles,
  getRoleLabelFa,
  isSavingUser,
  isEditUserModalOpen,
  setIsEditUserModalOpen,
  editingUser,
  handleEditUserChange,
  handleEditUserSubmit,
  isUpdatingUser,
  isResetPasswordModalOpen,
  setIsResetPasswordModalOpen,
  resettingUser,
  resetPasswordData,
  resetPasswordErrors,
  setResetPasswordData,
  handleResetPasswordSubmit,
  isSubmittingReset,
  isDeleteUserModalOpen,
  setIsDeleteUserModalOpen,
  deletingUser,
  handleDeleteUser,
  isDeletingUser,
}) => {
  const roleError = typeof addUserFormErrors.roleId === 'string' ? addUserFormErrors.roleId : undefined;

  return (
    <>
      {isAddUserModalOpen ? (
        <Modal
          title="افزودن کاربر"
          onClose={() => setIsAddUserModalOpen(false)}
          widthClass="max-w-xl"
          size="md"
          variant="operational"
          iconClass="fa-solid fa-user-plus"
          kicker="حساب جدید"
          ariaDescription="ایجاد حساب کاربری جدید و تعیین نقش دسترسی"
          bodyClassName="settings-user-modal-body"
        >
          <form onSubmit={handleNewUserSubmit} className="settings-user-modal-redesign settings-user-modal-redesign-v2 settings-user-modal-redesign--create">
            <div className="settings-user-modal-note">
              <i className="fa-solid fa-circle-info" />
              <span>نام کاربری باید یکتا و بدون فاصله باشد. نقش انتخابی سطح دسترسی کاربر را تعیین می‌کند.</span>
            </div>
            <div className="settings-user-modal-grid">
              <TextField
                label="نام کاربری"
                icon={<i className="fa-solid fa-user" />}
                error={addUserFormErrors.username}
                wrapperClassName="settings-user-modal-field"
                type="text"
                name="username"
                value={newUser.username}
                onChange={handleNewUserChange}
                autoComplete="off"
                minLength={3}
                maxLength={64}
                dir="ltr"
                placeholder="username"
                required
              />
              <SelectField
                label="نقش"
                icon={<i className="fa-solid fa-user-gear" />}
                error={roleError}
                wrapperClassName="settings-user-modal-field"
                name="roleId"
                value={newUser.roleId}
                onChange={handleNewUserChange}
                required
              >
                <option value="" disabled>انتخاب نقش</option>
                {roles.map((role) => <option key={role.id} value={role.id}>{getRoleLabelFa(role.name)}</option>)}
              </SelectField>
              <TextField
                label="کلمه عبور"
                icon={<i className="fa-solid fa-lock" />}
                error={addUserFormErrors.password}
                wrapperClassName="settings-user-modal-field"
                type="password"
                name="password"
                value={newUser.password || ''}
                onChange={handleNewUserChange}
                autoComplete="new-password"
                minLength={6}
                maxLength={128}
                placeholder="حداقل ۶ کاراکتر"
                required
              />
              <TextField
                label="تکرار کلمه عبور"
                icon={<i className="fa-solid fa-shield-halved" />}
                error={addUserFormErrors.confirmPassword}
                wrapperClassName="settings-user-modal-field"
                type="password"
                name="confirmPassword"
                value={newUser.confirmPassword || ''}
                onChange={handleNewUserChange}
                autoComplete="new-password"
                minLength={6}
                maxLength={128}
                placeholder="تکرار رمز جدید"
                required
              />
            </div>
            <ModalActions
              onCancel={() => setIsAddUserModalOpen(false)}
              submitText="ایجاد کاربر"
              submittingText="در حال ایجاد کاربر..."
              isSubmitting={isSavingUser}
              submitIconClass="fa-solid fa-user-plus"
              className="settings-user-modal-actions"
            />
          </form>
        </Modal>
      ) : null}

      {isEditUserModalOpen && editingUser ? (
        <Modal
          title="ویرایش نقش کاربر"
          onClose={() => setIsEditUserModalOpen(false)}
          widthClass="max-w-lg"
          size="sm"
          variant="operational"
          iconClass="fa-solid fa-user-pen"
          kicker="سطح دسترسی"
          ariaDescription={`ویرایش نقش کاربر ${editingUser.username}`}
          bodyClassName="settings-user-modal-body"
        >
          <form onSubmit={handleEditUserSubmit} className="settings-user-modal-redesign settings-user-modal-redesign-v2 settings-user-modal-redesign--edit">
            <div className="settings-user-modal-user">
              <span><i className="fa-solid fa-circle-user" /></span>
              <div><strong>{editingUser.username}</strong><small>شناسه کاربری ثابت است</small></div>
            </div>
            {editingUser.username === 'admin' ? (
              <div className="settings-user-modal-note settings-user-modal-note--warning">
                <i className="fa-solid fa-shield-halved" />
                <span>نقش مدیر اصلی برای جلوگیری از قطع دسترسی مدیریتی قابل تغییر نیست.</span>
              </div>
            ) : null}
            <SelectField
              label="نقش جدید"
              icon={<i className="fa-solid fa-user-gear" />}
              wrapperClassName="settings-user-modal-field"
              name="roleId"
              value={editingUser.roleId}
              onChange={handleEditUserChange}
              disabled={editingUser.username === 'admin'}
              required
            >
              <option value="" disabled>انتخاب نقش</option>
              {roles.map((role) => <option key={role.id} value={role.id}>{getRoleLabelFa(role.name)}</option>)}
            </SelectField>
            <ModalActions
              onCancel={() => setIsEditUserModalOpen(false)}
              submitText="ذخیره نقش"
              submittingText="در حال ذخیره نقش..."
              isSubmitting={isUpdatingUser}
              submitDisabled={editingUser.username === 'admin'}
              submitIconClass="fa-solid fa-check"
              className="settings-user-modal-actions"
            />
          </form>
        </Modal>
      ) : null}

      {isResetPasswordModalOpen && resettingUser ? (
        <Modal
          title="بازنشانی رمز عبور"
          onClose={() => setIsResetPasswordModalOpen(false)}
          widthClass="max-w-lg"
          size="sm"
          variant="operational"
          tone="warning"
          iconClass="fa-solid fa-key"
          kicker="امنیت حساب"
          ariaDescription={`بازنشانی رمز عبور کاربر ${resettingUser.username}`}
          bodyClassName="settings-user-modal-body"
        >
          <form onSubmit={handleResetPasswordSubmit} className="settings-user-modal-redesign settings-user-modal-redesign-v2 settings-user-modal-redesign--reset">
            <div className="settings-user-modal-user">
              <span><i className="fa-solid fa-user-lock" /></span>
              <div><strong>{resettingUser.username}</strong><small>پس از ثبت، رمز قبلی دیگر معتبر نیست</small></div>
            </div>
            <div className="settings-user-modal-grid settings-user-modal-grid--single">
              <TextField
                label="کلمه عبور جدید"
                icon={<i className="fa-solid fa-lock" />}
                error={resetPasswordErrors.password}
                wrapperClassName="settings-user-modal-field"
                type="password"
                value={resetPasswordData.password}
                onChange={(event) => setResetPasswordData((previous) => ({ ...previous, password: event.target.value }))}
                autoComplete="new-password"
                minLength={6}
                maxLength={128}
                placeholder="حداقل ۶ کاراکتر"
                required
              />
              <TextField
                label="تکرار کلمه عبور"
                icon={<i className="fa-solid fa-shield-halved" />}
                error={resetPasswordErrors.confirmPassword}
                wrapperClassName="settings-user-modal-field"
                type="password"
                value={resetPasswordData.confirmPassword}
                onChange={(event) => setResetPasswordData((previous) => ({ ...previous, confirmPassword: event.target.value }))}
                autoComplete="new-password"
                minLength={6}
                maxLength={128}
                placeholder="تکرار رمز جدید"
                required
              />
            </div>
            <ModalActions
              onCancel={() => setIsResetPasswordModalOpen(false)}
              submitText="ثبت رمز جدید"
              submittingText="در حال بازنشانی رمز..."
              isSubmitting={isSubmittingReset}
              submitVariant="warning"
              submitIconClass="fa-solid fa-key"
              className="settings-user-modal-actions"
            />
          </form>
        </Modal>
      ) : null}

      {isDeleteUserModalOpen && deletingUser ? (
        <Modal
          title="حذف کاربر"
          onClose={() => setIsDeleteUserModalOpen(false)}
          widthClass="max-w-md"
          size="sm"
          variant="compact"
          layout="horizontal"
          tone="danger"
          iconClass="fa-solid fa-user-xmark"
          kicker="عملیات غیرقابل بازگشت"
          ariaDescription={`تأیید حذف کاربر ${deletingUser.username}`}
          bodyClassName="settings-user-modal-body"
        >
          <div className="settings-user-modal-redesign settings-user-modal-redesign-v2 settings-user-modal-redesign--delete">
            <div className="settings-user-delete-summary">
              <span><i className="fa-solid fa-circle-user" /></span>
              <div><strong>{deletingUser.username}</strong><small>{getRoleLabelFa(deletingUser.roleName)}</small></div>
            </div>
            <p>این حساب و داده‌های وابسته به تنظیمات شخصی آن حذف می‌شوند. سوابق اصلی فروش و مالی مستقیماً هدف این عملیات نیستند و محدودیت‌های دیتابیس نیز پیش از حذف اعمال می‌شوند.</p>
            <div className="settings-user-delete-actions">
              <Button type="button" onClick={() => setIsDeleteUserModalOpen(false)} variant="secondary" size="sm">انصراف</Button>
              <Button onClick={handleDeleteUser} disabled={isDeletingUser} loading={isDeletingUser} loadingText="در حال حذف..." variant="danger" size="sm" leftIcon={<i className="fa-solid fa-trash" />} requiredRoles={['Admin']}>
                حذف کاربر
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  );
};

export default SettingsUsersModals;
