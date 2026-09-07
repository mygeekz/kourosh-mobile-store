import { useSettingsAccountSecurityState } from './useSettingsAccountSecurityState';
import { useSettingsBackupState } from './useSettingsBackupState';
import { useSettingsLocalCertificateState } from './useSettingsLocalCertificateState';
import { useSettingsUserManagementState } from './useSettingsUserManagementState';

export function useSettingsAccountBackupUserState() {
  const accountSecurityState = useSettingsAccountSecurityState();
  const backupState = useSettingsBackupState();
  const localCertificateState = useSettingsLocalCertificateState();
  const userManagementState = useSettingsUserManagementState();

  return {
    ...accountSecurityState,
    ...backupState,
    ...localCertificateState,
    ...userManagementState,
  };
}
