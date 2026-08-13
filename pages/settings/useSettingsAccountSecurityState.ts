import { useState } from 'react';
import { type NotificationMessage } from '../../types';

export function useSettingsAccountSecurityState() {
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [showAccountPasswordFields, setShowAccountPasswordFields] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  return {
    newPassword,
    setNewPassword,
    newPassword2,
    setNewPassword2,
    showAccountPasswordFields,
    setShowAccountPasswordFields,
    isChangingPassword,
    setIsChangingPassword,
    notification,
    setNotification,
  };
}
