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
  rawJson: string;
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
  const pollingLabel = `${localState?.pollingStarted ? 'فعال' : 'غیرفعال'} / ${String(localState?.updateMode || 'نامشخص')}`;
  const reconnectFailures = Number(localState?.pollingConsecutiveFailures || 0);
  const reconnectLabel = reconnectFailures > 0
    ? `در حال اتصال مجدد · تلاش ${reconnectFailures.toLocaleString('fa-IR')}`
    : localState?.pollingStarted
      ? 'پایدار / خودترمیم فعال'
      : 'غیرفعال';
  const hasMainMiniApp = Boolean(tgDiagnostics?.bot?.data?.result?.has_main_web_app);
  const mainMiniAppLabel = hasMainMiniApp ? 'فعال در BotFather' : 'غیرفعال در BotFather';
  const lastInputLabel = String(localState?.lastWebhookAt || 'دیده نشده');
  const webhookErrorMessage = String(webhookResult?.last_error_message || '');
  const rawJson = tgDiagnostics ? JSON.stringify(tgDiagnostics, null, 2) : '';
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
    rawJson,
    diagnosticCards: [
      { key: 'webhook-url', label: 'Webhook URL', value: webhookUrl },
      { key: 'pending-updates', label: 'Pending Updates', value: pendingUpdatesLabel },
      { key: 'polling', label: 'Polling', value: pollingLabel },
      { key: 'polling-reconnect', label: 'اتصال مجدد', value: reconnectLabel },
      { key: 'main-mini-app', label: 'Main Mini App / Launch App', value: mainMiniAppLabel },
      { key: 'last-input', label: 'آخرین ورودی', value: lastInputLabel },
    ],
    controlCenterBotApiOk,
    controlCenterHealthLabel: controlCenterBotApiOk ? 'Bot API سالم' : tgCC ? 'نیازمند بررسی مرکز کنترل' : 'مرکز کنترل هنوز خوانده نشده',
    controlCenterHealthTone,
  };
};
