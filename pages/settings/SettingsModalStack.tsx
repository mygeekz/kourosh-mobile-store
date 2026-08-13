import React from 'react';
import type { SettingsRenderContext } from './SettingsController';
import type { SettingsSmsModalViewModel } from './settingsSmsModalViewModels';
import SmsPatternTestModal from '../../components/SmsPatternTestModal';
import SmsPatternPreviewModal from '../../components/SmsPatternPreviewModal';
import SmsBulkTestModal from '../../components/SmsBulkTestModal';

type Props = {
  ctx: SettingsRenderContext;
};

const SettingsModalStack: React.FC<Props> = ({ ctx }) => {
  const {
    SettingsRestoreModal,
    SettingsUsersModals,
    TelegramTemplateTestModal,
    addUserFormErrors,
    dbFile,
    deletingUser,
    editingUser,
    getRoleLabelFa,
    getSmsInfoString,
    handleDeleteUser,
    handleEditUserChange,
    handleEditUserSubmit,
    handleNewUserChange,
    handleNewUserSubmit,
    handleResetPasswordSubmit,
    handleRestore,
    isAddUserModalOpen,
    isDeleteUserModalOpen,
    isDeletingUser,
    isEditUserModalOpen,
    isResetPasswordModalOpen,
    isRestoreModalOpen,
    isRestoringDb,
    restoreProgress,
    isSavingUser,
    isSubmittingReset,
    isUpdatingUser,
    key,
    name,
    newUser,
    resetPasswordData,
    resetPasswordErrors,
    resettingUser,
    roles,
    setIsAddUserModalOpen,
    setIsDeleteUserModalOpen,
    setIsEditUserModalOpen,
    setIsResetPasswordModalOpen,
    setIsRestoreModalOpen,
    setResetPasswordData,
    setTgCheckOpen,
    smsModalViewModel,
    tgCheckAllowedVars,
    tgCheckAudience,
    tgCheckFormat,
    tgCheckOpen,
    tgCheckTemplate,
    tgCheckTitle,
  } = ctx;

  const smsModals = smsModalViewModel as SettingsSmsModalViewModel;

  return (
    <>
<SettingsRestoreModal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        dbFileName={dbFile?.name || null}
        onRestore={handleRestore}
        isRestoringDb={isRestoringDb}
        restoreProgress={restoreProgress}
      />

      <SettingsUsersModals
        isAddUserModalOpen={isAddUserModalOpen}
        setIsAddUserModalOpen={setIsAddUserModalOpen}
        newUser={newUser}
        addUserFormErrors={addUserFormErrors}
        handleNewUserChange={handleNewUserChange}
        handleNewUserSubmit={handleNewUserSubmit}
        roles={roles}
        getRoleLabelFa={getRoleLabelFa}
        isSavingUser={isSavingUser}
        isEditUserModalOpen={isEditUserModalOpen}
        setIsEditUserModalOpen={setIsEditUserModalOpen}
        editingUser={editingUser}
        handleEditUserChange={handleEditUserChange}
        handleEditUserSubmit={handleEditUserSubmit}
        isUpdatingUser={isUpdatingUser}
        isResetPasswordModalOpen={isResetPasswordModalOpen}
        setIsResetPasswordModalOpen={setIsResetPasswordModalOpen}
        resettingUser={resettingUser}
        resetPasswordData={resetPasswordData}
        resetPasswordErrors={resetPasswordErrors}
        setResetPasswordData={setResetPasswordData}
        handleResetPasswordSubmit={handleResetPasswordSubmit}
        isSubmittingReset={isSubmittingReset}
        isDeleteUserModalOpen={isDeleteUserModalOpen}
        setIsDeleteUserModalOpen={setIsDeleteUserModalOpen}
        deletingUser={deletingUser}
        handleDeleteUser={handleDeleteUser}
        isDeletingUser={isDeletingUser}
      />

		{/* SMS Pattern Check Modal */}
		<SmsPatternTestModal
			{...smsModals.patternTest}
		/>

		{/* SMS Pattern Preview Modal */}
		<SmsPatternPreviewModal
			{...smsModals.patternPreview}
		/>

		{/* SMS Bulk Check Modal */}
		<SmsBulkTestModal
			{...smsModals.bulkCheck}
		/>

		{/* Telegram Template Check / Preview Modal */}
		<TelegramTemplateTestModal
			isOpen={tgCheckOpen}
			onClose={() => setTgCheckOpen(false)}
			title={tgCheckTitle}
			template={tgCheckTemplate}
			format={tgCheckFormat}
			allowedVars={tgCheckAllowedVars}
			audience={tgCheckAudience}
		/>
    </>
  );
};

export default SettingsModalStack;
