import React from 'react';
import type { SettingsUsersModalsProps } from './settingsPanelTypes';
import Modal from '../../components/Modal';
import ModalActions from '../../components/ModalActions';
import ModalField from '../../components/ModalField';
import Button from '../../components/Button';
import TextField from '../../components/ui/TextField';
import SelectField from '../../components/ui/SelectField';


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
  return (
    <>
      {/* Add User Modal */}
      {isAddUserModalOpen && (
        <Modal title="افزودن کاربر جدید" onClose={() => setIsAddUserModalOpen(false)}>
          <form onSubmit={handleNewUserSubmit} className="settings-user-modal-redesign settings-user-modal-redesign--create space-y-3">
            <ModalField label="نام کاربری" iconClass="fa-solid fa-user" error={addUserFormErrors.username}>
              <TextField type="text" name="username" value={newUser.username} onChange={handleNewUserChange} />
            </ModalField>
            <ModalField label="کلمه عبور" iconClass="fa-solid fa-lock" error={addUserFormErrors.password}>
              <TextField type="password" name="password" value={newUser.password} onChange={handleNewUserChange} />
            </ModalField>
            <ModalField label="تکرار کلمه عبور" iconClass="fa-solid fa-shield-halved" error={addUserFormErrors.confirmPassword}>
              <TextField type="password" name="confirmPassword" value={newUser.confirmPassword} onChange={handleNewUserChange} />
            </ModalField>
            <ModalField label="نقش" iconClass="fa-solid fa-user-gear">
              <SelectField name="roleId" value={newUser.roleId} onChange={handleNewUserChange}>
                <option value="" disabled>-- انتخاب نقش --</option>
                {roles.map(r => <option key={r.id} value={r.id}>{getRoleLabelFa(r.name)}</option>)}
              </SelectField>
            </ModalField>
            <ModalActions onCancel={() => setIsAddUserModalOpen(false)} submitText="افزودن کاربر" submittingText="در حال ذخیره تغییرات..." isSubmitting={isSavingUser} />
          </form>
        </Modal>
      )}

      {/* Edit User Modal */}
      {isEditUserModalOpen && editingUser && (
        <Modal title={`ویرایش کاربر: ${editingUser.username}`} onClose={() => setIsEditUserModalOpen(false)}>
          <form onSubmit={handleEditUserSubmit} className="settings-user-modal-redesign settings-user-modal-redesign--edit space-y-3">
            <ModalField label="نام کاربری" iconClass="fa-solid fa-user">
              <TextField type="text" value={editingUser.username} disabled className="bg-gray-100 dark:bg-gray-800" />
            </ModalField>
            <ModalField label="نقش" iconClass="fa-solid fa-user-gear">
              <SelectField name="roleId" value={editingUser.roleId} onChange={handleEditUserChange}>
                <option value="" disabled>-- انتخاب نقش --</option>
                {roles.map(r => <option key={r.id} value={r.id}>{getRoleLabelFa(r.name)}</option>)}
              </SelectField>
            </ModalField>
            <ModalActions onCancel={() => setIsEditUserModalOpen(false)} submitText="ذخیره تغییرات" submittingText="در حال ذخیره تغییرات..." isSubmitting={isUpdatingUser} />
          </form>
        </Modal>
      )}

      {/* Reset Password */}
      {isResetPasswordModalOpen && resettingUser && (
        <Modal title={`بازنشانی رمز عبور برای: ${resettingUser.username}`} onClose={() => setIsResetPasswordModalOpen(false)}>
          <form onSubmit={handleResetPasswordSubmit} className="settings-user-modal-redesign settings-user-modal-redesign--reset space-y-3">
            <ModalField label="کلمه عبور جدید" iconClass="fa-solid fa-lock" error={resetPasswordErrors.password}>
              <TextField type="password" value={resetPasswordData.password} onChange={(e) => setResetPasswordData(p => ({ ...p, password: e.target.value }))} />
            </ModalField>
            <ModalField label="تکرار کلمه عبور" iconClass="fa-solid fa-shield-halved" error={resetPasswordErrors.confirmPassword}>
              <TextField type="password" value={resetPasswordData.confirmPassword} onChange={(e) => setResetPasswordData(p => ({ ...p, confirmPassword: e.target.value }))} />
            </ModalField>
            <ModalActions onCancel={() => setIsResetPasswordModalOpen(false)} submitText="بازنشانی رمز عبور" submittingText="در حال ذخیره تغییرات..." isSubmitting={isSubmittingReset} />
          </form>
        </Modal>
      )}

      {/* Delete User */}
      {isDeleteUserModalOpen && deletingUser && (
        <Modal title={`تأیید حذف کاربر: ${deletingUser.username}`} onClose={() => setIsDeleteUserModalOpen(false)}>
          <p className="settings-user-modal-redesign settings-user-modal-redesign--delete text-sm text-gray-700 dark:text-gray-300 mb-4">آیا از حذف این کاربر مطمئن هستید؟ این عملیات قابل بازگشت نیست.</p>
          <div className="flex justify-end pt-3 gap-3">
            <Button type="button" onClick={() => setIsDeleteUserModalOpen(false)} variant="ghost">انصراف</Button>
            <Button onClick={handleDeleteUser} disabled={isDeletingUser} loading={isDeletingUser} loadingText="در حال حذف..." variant="danger" leftIcon={<i className="fa-solid fa-trash" />} requiredRoles={['Admin']}>
              حذف مورد
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
};

export default SettingsUsersModals;
