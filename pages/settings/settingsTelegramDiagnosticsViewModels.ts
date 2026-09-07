import { formatIranDateTime } from '../../utils/iranDateTime';
import type { TelegramControlCenterState, TelegramDiagnosticsState } from './settingsPanelTypes';

export type TelegramDiagnosticsCardViewModel = {
  key: string;
  label: string;
  value: string;
};

export type SettingsTelegramDiagnosticsViewModel = {
  hasDiagnostics: boolean;
  webhookUrl: string;
  pendingUpdatesLabel: string;
  pollingLabel: string;
  lastInputLabel: string;
  webhookErrorMessage: string;
  diagnosticCards: TelegramDiagnosticsCardViewModel[];
  controlCenterBotApiOk: boolean;
  controlCenterHealthLabel: string;
  controlCenterHealthTone: 'emerald' | 'amber' | 'rose' | 'slate';
};

export const formatTelegramDiagnosticsDateFa = (iso?: string | null) => {
  if (!iso) return '—';
  const formatted = formatIranDateTime(iso, '');
  return formatted || String(iso);
};

export const formatTelegramDiagnosticsAgoFa = (iso?: string | null) => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const diffMs = Date.now() - date.getTime();
  const seconds = Math.max(0, Math.floor(diffMs / 1000));
  if (seconds < 60) return `${seconds} ثانیه پیش`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ساعت پیش`;
  const days = Math.floor(hours / 24);
  return `${days} روز پیش`;
};

export const formatTelegramDiagnosticsLag = (seconds?: number | null) => {
  if (seconds == null) return '—';
  const safeSeconds = Math.max(0, Math.floor(seconds));
  if (safeSeconds < 60) return `${safeSeconds}s`;
  const minutes = Math.floor(safeSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
};

export const buildSettingsTelegramDiagnosticsViewModel = ({
  tgDiagnostics,
  tgCC,
}: {
  tgDiagnostics: TelegramDiagnosticsState | null;
  tgCC: TelegramControlCenterState | null;
}): SettingsTelegramDiagnosticsViewModel => {
  const webhookResult = tgDiagnostics?.webhook?.result;
  const localState = tgDiagnostics?.local;
  const webhookUrl = String(webhookResult?.url || 'ثبت نشده');
  const pendingUpdatesLabel = Number(webhookResult?.pending_update_count || 0).toLocaleString('fa-IR');
  const updateModeRaw = String(localState?.updateMode || '').trim().toLowerCase();
  const updateModeLabel = updateModeRaw === 'polling'
    ? 'دریافت مستقیم'
    : updateModeRaw === 'webhook'
      ? 'دریافت خودکار'
      : updateModeRaw
        ? 'روش اختصاصی'
        : 'نامشخص';
  const pollingLabel = `${localState?.pollingStarted ? 'فعال' : 'غیرفعال'} · ${updateModeLabel}`;
  const reconnectFailures = Number(localState?.pollingConsecutiveFailures || 0);
  const reconnectLabel = reconnectFailures > 0
    ? `در حال برقراری دوباره ارتباط · تلاش ${reconnectFailures.toLocaleString('fa-IR')}`
    : localState?.pollingStarted
      ? 'پایدار'
      : 'غیرفعال';
  const hasMainMiniApp = Boolean(tgDiagnostics?.bot?.data?.result?.has_main_web_app);
  const mainMiniAppLabel = hasMainMiniApp ? 'فعال در تلگرام' : 'غیرفعال در تلگرام';
  const lastInputLabel = String(localState?.lastWebhookAt || 'دیده نشده');
  const webhookErrorMessage = webhookResult?.last_error_message
    ? 'تلگرام در دریافت پیام خطایی گزارش کرده است؛ اتصال ربات را بررسی کنید.'
    : '';
  const controlCenterBotApiOk = Boolean(tgCC?.health?.botApi?.ok);
  const controlCenterHealthTone: SettingsTelegramDiagnosticsViewModel['controlCenterHealthTone'] = controlCenterBotApiOk
    ? 'emerald'
    : tgCC
    ? 'amber'
    : 'slate';

  return {
    hasDiagnostics: Boolean(tgDiagnostics),
    webhookUrl,
    pendingUpdatesLabel,
    pollingLabel,
    lastInputLabel,
    webhookErrorMessage,
    diagnosticCards: [
      { key: 'webhook-url', label: 'نشانی دریافت پیام', value: webhookUrl },
      { key: 'pending-updates', label: 'پیام‌های در انتظار', value: pendingUpdatesLabel },
      { key: 'polling', label: 'دریافت پیام‌ها', value: pollingLabel },
      { key: 'polling-reconnect', label: 'اتصال مجدد', value: reconnectLabel },
      { key: 'main-mini-app', label: 'Mini App اصلی', value: mainMiniAppLabel },
      { key: 'last-input', label: 'آخرین ورودی', value: lastInputLabel },
    ],
    controlCenterBotApiOk,
    controlCenterHealthLabel: controlCenterBotApiOk ? 'ارتباط ربات سالم' : tgCC ? 'نیازمند بررسی اتصال' : 'وضعیت اتصال هنوز بررسی نشده',
    controlCenterHealthTone,
  };
};
