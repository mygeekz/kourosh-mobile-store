import React from 'react';
import type { SettingsRenderContext } from './SettingsController';
import SettingsWorkspaceSection from './SettingsWorkspaceSection';
import SettingsModalStack from './SettingsModalStack';
import SettingsPartnerNotice from './SettingsPartnerNotice';

type Props = {
  ctx: SettingsRenderContext;
};

const SettingsRender: React.FC<Props> = ({ ctx }) => {
  const {
    Notification,
    PageShell,
    SettingsAccountPanel,
    SettingsBusinessPanel,
    SettingsDataPanel,
    SettingsHeaderBar,
    SettingsLocalPanel,
    SettingsModulesPanel,
    SettingsPricingPanel,
    SettingsRemindersPanel,
    SettingsRestoreModal,
    SettingsSaveFooter,
    SettingsSmartPanel,
    SettingsSmsPanel,
    SettingsStylePanel,
    SettingsTelegramPanel,
    SettingsUsersModals,
    SettingsUsersPanel,
    TelegramTemplateTestModal,
    addUserFormErrors,
    applyCommercialPlan,
    backupEnabled,
    backupList,
    backupRetention,
    backupScheduleIntervalHours,
    backupScheduleMode,
    backupScheduleTime,
    backupScheduleWeekdays,
    backupTimezone,
    businessInfo,
    commercialPlanUiCopy,
    dbFile,
    dbFileInputRef,
    deletingUser,
    editingUser,
    fetchData,
    filteredUsers,
    formatPricingDatePreview,
    getFeatureRuntimeBadges,
    getRoleLabelFa,
    handleBusinessInfoChange,
    handleBusinessInfoSubmit,
    handleSaveLocalDomainSettings,
    handleTelegramSettingsSubmit,
    initialBusinessInfo,
    isAddUserModalOpen,
    isChangingPassword,
    isDeleteUserModalOpen,
    isDeletingUser,
    isEditUserModalOpen,
    isFeatureSettingEnabled,
    isGeneratingLocalCert,
    isLoadingBackups,
    isResetPasswordModalOpen,
    isRestoreModalOpen,
    isRestoringDb,
    isSaving,
    isSavingBackupSchedule,
    isSavingUser,
    isSubmittingReset,
    isUpdatingUser,
    isUploadingAvatar,
    isUploadingLogo,
    canManageStoreOwnership,
    partnerSetupNeedsAttention,
    partnerShareChipIcon,
    infoChanged,
    localCertError,
    localCertMessage,
    logoFile,
    logoInputRef,
    logoPreview,
    meAvatarFile,
    meAvatarInputRef,
    meAvatarPreview,
    moduleRuntimeSummary,
    name,
    newPassword,
    newPassword2,
    newUser,
    normalizePricingDateInput,
    notification,
    oldPassword,
    openSmsPatternCheck,
    openSmsPatternPreview,
    openTelegramAudiencePanels,
    openTelegramCategories,
    openTelegramItems,
    openTelegramTemplateCheck,
    partnerShareStatus,
    pricingDecisionActionFilter,
    pricingDecisionDateFrom,
    pricingDecisionDateTo,
    pricingDecisionDeltaFilter,
    pricingDecisionSearch,
    pricingSettings,
    pricingStrategyLabels,
    resetPasswordData,
    resetPasswordErrors,
    resettingUser,
    roles,
    scrollToSection,
    setBackupEnabled,
    setBackupRetention,
    setBackupScheduleIntervalHours,
    setBackupScheduleMode,
    setBackupScheduleWeekdays,
    setBackupTimezone,
    setBusinessInfo,
    setFeatureByKey,
    setIsAddUserModalOpen,
    setIsDeleteUserModalOpen,
    setIsEditUserModalOpen,
    setIsResetPasswordModalOpen,
    setIsRestoreModalOpen,
    setLogoFile,
    setNewPassword,
    setNewPassword2,
    setNotification,
    setOldPassword,
    setOpenTelegramItems,
    setPricingDecisionActionFilter,
    setPricingDecisionDateFrom,
    setPricingDecisionDateTo,
    setPricingDecisionDeltaFilter,
    setPricingDecisionSearch,
    setResetPasswordData,
    setSettingsViewMode,
    setShowAccountPasswordFields,
    setShowTelegramToken,
    openSmsBulkCheck,
    openSmsBulkPanel,
    setSmsCheckOpen,
    setSmsPrevOpen,
    setTab,
    setTelegramStudioMode,
    setTelegramTemplateFilter,
    setTelegramTemplateSearch,
    setTgCheckOpen,
    setTgQuickMsg,
    setUserRoleFilter,
    setUserSearchQuery,
    settingsViewMode,
    showAccountPasswordFields,
    showTelegramToken,
    smsBulkDefaults,
    smsBulkOpen,
    smsCheckBodyId,
    smsCheckOpen,
    smsCheckTitle,
    smsCheckTokenLabels,
    smsPrevOpen,
    smsPrevTemplate,
    smsPrevTitle,
    smsPrevTokenLabels,
    tab,
    telegramInfo,
    telegramPinnedQuickActions,
    telegramQuickActionUsageMap,
    telegramStudioMode,
    telegramTemplateFilter,
    telegramTemplateSearch,
    telegramTodoDoneMap,
    tgChatLookupHint,
    tgChatLookupLoading,
    tgCheckAllowedVars,
    tgCheckAudience,
    tgCheckFormat,
    tgCheckOpen,
    tgCheckTemplate,
    tgCheckTitle,
    tgDiagnostics,
    tgDiagnosticsBusyAction,
    tgDiagnosticsLoading,
    tgHealth,
    tgIsChecking,
    tgIsSendingQuick,
    tgQuickMsg,
    tgRecentChats,
    userRoleFilter,
    userRoleSummaries,
    userSearchQuery,
    userStatsCards,
    users,
  } = ctx;

  return (
    <PageShell title="تنظیمات" description="پیکربندی سیستم، کاربران و تنظیمات کسب‌وکار." icon={<i className="fa-solid fa-gear" />} className="settings-shell-page">
    <div className={`settings-shell settings-redesign-v1 text-right max-w-7xl mx-auto px-4 ${tab === 'style' ? 'settings-shell--style' : ''} ${settingsViewMode === 'simple' ? 'settings-view-simple' : 'settings-view-advanced'}`} dir="rtl" data-ui-settings-shell="true" data-settings-view-mode={settingsViewMode} data-settings-active-tab={tab}>
      <Notification message={notification} onClose={() => setNotification(null)} />

      {tab !== 'style' ? <SettingsHeaderBar
        infoChanged={infoChanged}
        isSaving={isSaving}
        settingsViewMode={settingsViewMode}
        setSettingsViewMode={setSettingsViewMode}
        onRevert={() => {
          setBusinessInfo(initialBusinessInfo);
          setLogoFile(null);
        }}
        onSave={() => {
          const form = document.getElementById('settings-form') as HTMLFormElement | null;
          if (tab === 'business' && form) form.requestSubmit();
          if (tab === 'modules') handleBusinessInfoSubmit();
          if (tab === 'sms') handleBusinessInfoSubmit();
          if (tab === 'telegram') handleTelegramSettingsSubmit();
          if (tab === 'local') handleSaveLocalDomainSettings();
        }}
      /> : null}

      <SettingsPartnerNotice
        visible={canManageStoreOwnership && partnerSetupNeedsAttention}
        chipIcon={partnerShareChipIcon}
        status={partnerShareStatus}
      />

      <SettingsWorkspaceSection ctx={ctx} />


            <SettingsModalStack ctx={ctx} />

    </div>
  </PageShell>
  );
};

export default SettingsRender;
