import React from 'react';

import Notification from '../../components/Notification';
import type { NotificationMessage } from '../../types';

type GlobalToastPayload = {
  id?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  message?: string;
  duration?: number;
};

export const GlobalAppFeedbackBridge: React.FC = () => {
  const [notification, setNotification] = React.useState<null | ({ id?: string } & NotificationMessage)>(null);

  React.useEffect(() => {
    const handleToast = (event: Event) => {
      const detail = (event as CustomEvent<GlobalToastPayload>).detail || {};
      if (!detail.message) return;
      setNotification({
        id: detail.id,
        type: detail.type || 'info',
        text: detail.message,
        closeMs: detail.duration,
      });
    };

    const handleDismiss = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string }>).detail || {};
      setNotification((current) => {
        if (!current) return current;
        if (!detail.id || !current.id || current.id === detail.id) return null;
        return current;
      });
    };

    window.addEventListener('kourosh:app-toast', handleToast as EventListener);
    window.addEventListener('kourosh:app-toast-dismiss', handleDismiss as EventListener);
    return () => {
      window.removeEventListener('kourosh:app-toast', handleToast as EventListener);
      window.removeEventListener('kourosh:app-toast-dismiss', handleDismiss as EventListener);
    };
  }, []);

  return notification ? <Notification message={notification} onClose={() => setNotification(null)} /> : null;
};

