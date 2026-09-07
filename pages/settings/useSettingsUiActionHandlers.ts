type SettingsUiActionHandlerParams = {
  backupScheduleTime: string;
  sanitizeTime: (value: string) => string;
  setBackupScheduleTime: (value: string) => void;
};

export function useSettingsUiActionHandlers({
  backupScheduleTime,
  sanitizeTime,
  setBackupScheduleTime,
}: SettingsUiActionHandlerParams) {
  const handleBackupTimeInputChange = (value: string) => {
    const cleaned = value.replace(/[^\d:]/g, '').slice(0, 5);
    setBackupScheduleTime(cleaned);
  };

  const handleBackupTimeInputBlur = () => {
    setBackupScheduleTime(sanitizeTime(backupScheduleTime));
  };

  const jumpToTelegramConfigField = (targetId: string) => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(targetId) as (HTMLElement | null);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => {
      if (typeof el.focus === 'function') el.focus();
      el.classList.add('ring-4', 'ring-sky-200', 'ring-offset-2', 'ring-offset-white');
      window.setTimeout(() => el.classList.remove('ring-4', 'ring-sky-200', 'ring-offset-2', 'ring-offset-white'), 1600);
    }, 120);
  };

  const jumpToTelegramSetupField = (fieldId: string) => {
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        const el = document.getElementById(fieldId) as HTMLInputElement | HTMLTextAreaElement | null;
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
        try { el.select?.(); } catch {}
      });
    }
  };

  const jumpToTelegramSection = (sectionId: string) => {
    if (typeof window === 'undefined') return;
    window.setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  return {
    handleBackupTimeInputChange,
    handleBackupTimeInputBlur,
    jumpToTelegramConfigField,
    jumpToTelegramSetupField,
    jumpToTelegramSection,
  };
}
