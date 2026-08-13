import type {
  TelegramBusinessInfo,
  TelegramCheckItem,
  TelegramConnectionMode,
  TelegramControlCenterState,
  TelegramHealthState,
  TelegramSmartAction,
} from './settingsPanelTypes';

export type TelegramConnectionCheck = {
  key: string;
  label: string;
  description: string;
  icon: string;
  anchor: string;
  done: boolean;
  score: number;
  total: number;
  cta: string;
};

export type TelegramTopConnectionTone = {
  shell: string;
  chip: string;
  bar: string;
  label: string;
  icon: string;
};

export type TelegramSmartCheckTone = {
  wrap: string;
  chip: string;
  bar: string;
  label: string;
  icon: string;
};

export type SettingsTelegramConnectionViewModel = {
  telegramConnectionChecks: TelegramConnectionCheck[];
  telegramTopConnectionSummary: { done: number; score: number; total: number };
  telegramTopConnectionPercent: number;
  telegramTopConnectionTone: TelegramTopConnectionTone;
  telegramTopNextAction: TelegramConnectionCheck;
  getTelegramSmartCheckTone: (score: number, total: number) => TelegramSmartCheckTone;
  telegramDestinationFields: string[];
  telegramDestinationCount: number;
  telegramConfigChecks: TelegramCheckItem[];
  telegramConfigReadyCount: number;
  telegramConfigReadiness: number;
  telegramConnectionMode: TelegramConnectionMode;
  telegramHealthTone: 'emerald' | 'rose' | 'amber' | 'slate' | 'sky';
  telegramFirstMissingCheck: TelegramCheckItem | null;
  telegramConfigCoachMessage: string;
  telegramSmartActions: TelegramSmartAction[];
  telegramSetupItems: TelegramCheckItem[];
  telegramSetupDone: number;
  telegramSetupPercent: number;
  telegramMissingItems: TelegramCheckItem[];
  telegramHasProxy: boolean;
  telegramAudienceDestinationCount: number;
  telegramReadinessLabel: string;
  telegramSetupCoachMessage: string;
};

const hasValue = (value: unknown) => Boolean(String(value ?? '').trim());

export const getTelegramSmartCheckTone = (score: number, total: number): TelegramSmartCheckTone => {
  if (score >= total) return {
    wrap: 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-emerald-950/20',
    chip: 'border-emerald-200 bg-white text-emerald-700 dark:border-emerald-900/40 dark:bg-slate-950 dark:text-emerald-200',
    bar: 'from-emerald-500 via-teal-500 to-green-500',
    label: 'کامل',
    icon: 'fa-circle-check',
  };
  if (score > 0) return {
    wrap: 'border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/20',
    chip: 'border-amber-200 bg-white text-amber-700 dark:border-amber-900/40 dark:bg-slate-950 dark:text-amber-200',
    bar: 'from-amber-500 via-orange-500 to-yellow-500',
    label: 'در حال تکمیل',
    icon: 'fa-hourglass-half',
  };
  return {
    wrap: 'border-rose-200 bg-rose-50/80 dark:border-rose-900/40 dark:bg-rose-950/20',
    chip: 'border-rose-200 bg-white text-rose-700 dark:border-rose-900/40 dark:bg-slate-950 dark:text-rose-200',
    bar: 'from-rose-500 via-pink-500 to-red-500',
    label: 'شروع نشده',
    icon: 'fa-circle-xmark',
  };
};

export const buildSettingsTelegramConnectionViewModel = ({
  businessInfo,
  telegramInfo,
  tgHealth,
  tgCC,
}: {
  businessInfo: TelegramBusinessInfo;
  telegramInfo: TelegramBusinessInfo;
  tgHealth: TelegramHealthState | null;
  tgCC: TelegramControlCenterState | null;
}): SettingsTelegramConnectionViewModel => {
  const telegramMiniAppPublicUrl = String(telegramInfo.telegram_miniapp_public_url || '').trim();
  const transportRaw = String(telegramInfo.telegram_transport_mode || 'direct').trim();
  const telegramTransportMode = transportRaw === 'cloud_relay' ? 'relay' : ['disabled', 'direct', 'proxy', 'relay'].includes(transportRaw) ? transportRaw : 'direct';
  const explicitMiniAppMode = String(telegramInfo.miniapp_public_access_mode || '').trim();
  const legacyMiniAppMode = String(telegramInfo.telegram_public_access_mode || '').trim();
  const telegramPublicAccessMode = ['disabled', 'self_hosted', 'external_tunnel', 'relay'].includes(explicitMiniAppMode)
    ? explicitMiniAppMode
    : legacyMiniAppMode === 'cloud_managed' ? 'relay' : legacyMiniAppMode === 'self_hosted' ? 'self_hosted' : legacyMiniAppMode === 'disabled' ? 'disabled' : telegramMiniAppPublicUrl ? 'self_hosted' : 'disabled';
  const relayConnected = String(telegramInfo.kourosh_cloud_connection_state || '') === 'connected';
  const relayTelegramReady = relayConnected && String(telegramInfo.kourosh_cloud_telegram_relay_healthy || '') === '1';
  const relayMiniAppReady = relayConnected &&
    String(telegramInfo.kourosh_cloud_miniapp_relay_healthy || '') === '1' &&
    Boolean(String(telegramInfo.kourosh_cloud_assigned_public_url || '').trim());
  const telegramMiniAppReady = telegramPublicAccessMode === 'disabled' ||
    ((telegramPublicAccessMode === 'self_hosted' || telegramPublicAccessMode === 'external_tunnel') && Boolean(telegramMiniAppPublicUrl)) ||
    (telegramPublicAccessMode === 'relay' && relayMiniAppReady);
  const telegramRouteReady = telegramTransportMode === 'disabled' ||
    (telegramTransportMode === 'direct' && Boolean(String(telegramInfo.telegram_bot_token || '').trim())) ||
    (telegramTransportMode === 'proxy' && Boolean(String(telegramInfo.telegram_proxy || '').trim()) && Boolean(tgHealth?.ok)) ||
    (telegramTransportMode === 'relay' && relayTelegramReady);
  const telegramRouteLabel = telegramTransportMode === 'disabled' ? 'غیرفعال' : telegramTransportMode === 'proxy' ? 'پراکسی' : telegramTransportMode === 'relay' ? 'رله' : 'مستقیم';

  const telegramConnectionChecks: TelegramConnectionCheck[] = [
    {
      key: 'bot-core',
      label: 'هویت ربات',
      description: 'توکن و نام کاربری ربات باید کامل باشند تا لینک‌سازی و ارسال بدون خطا در عملیات انجام شود.',
      icon: 'fa-robot',
      anchor: 'tg-anchor-bot-core',
      done: telegramTransportMode === 'disabled' || Boolean(String(telegramInfo.telegram_bot_token || '').trim() && String(telegramInfo.telegram_bot_username || '').trim()),
      score: telegramTransportMode === 'disabled' ? 2 : [Boolean(String(telegramInfo.telegram_bot_token || '').trim()), Boolean(String(telegramInfo.telegram_bot_username || '').trim())].filter(Boolean).length,
      total: 2,
      cta: 'رفتن به هویت ربات',
    },
    {
      key: 'main-route',
      label: 'مسیر اصلی ارسال',
      description: 'chat_id اصلی مسیر پایه پیام‌های ربات است و به Public Mini App وابسته نیست.',
      icon: 'fa-paper-plane',
      anchor: 'tg-anchor-main-route',
      done: telegramTransportMode === 'disabled' || Boolean(String(telegramInfo.telegram_chat_id || '').trim()),
      score: telegramTransportMode === 'disabled' || Boolean(String(telegramInfo.telegram_chat_id || '').trim()) ? 1 : 0,
      total: 1,
      cta: 'تنظیم مسیر اصلی',
    },
    {
      key: 'mini-app',
      label: 'دسترسی Mini App',
      description: telegramPublicAccessMode === 'disabled' ? 'Mini App عمداً خاموش است؛ Public URL لازم نیست.' : telegramPublicAccessMode === 'self_hosted' ? 'میزبانی شخصی فقط URL عمومی صریح خودش را استفاده می‌کند.' : telegramPublicAccessMode === 'external_tunnel' ? 'تانل خارجی فقط URL عمومی HTTPS ثبت‌شده را استفاده می‌کند و lifecycle تانل خارج از کوروش است.' : 'Mini App Relay به Provider انتخاب‌شده، اتصال امن و Assigned URL وابسته است.',
      icon: 'fa-window-maximize',
      anchor: 'telegram-connectivity-v151-heading',
      done: telegramMiniAppReady,
      score: telegramMiniAppReady ? 1 : 0,
      total: 1,
      cta: 'تنظیم Mini App',
    },
    {
      key: 'routing',
      label: 'سلامت مسیر ارتباط',
      description: telegramTransportMode === 'disabled' ? 'اتصال تلگرام عمداً غیرفعال است.' : telegramTransportMode === 'direct' ? 'مسیر مستقیم فقط Telegram Bot API را استفاده می‌کند و Proxy برنامه را نادیده می‌گیرد.' : telegramTransportMode === 'proxy' ? 'مسیر Proxy فقط از Proxy تنظیم‌شده عبور می‌کند و fallback مستقیم ندارد.' : 'مسیر Relay فقط از Provider رله انتخاب‌شده عبور می‌کند و fallback مستقیم ندارد.',
      icon: 'fa-route',
      anchor: 'tg-anchor-proxy',
      done: telegramRouteReady,
      score: telegramRouteReady ? 2 : (telegramTransportMode === 'disabled' ? 2 : 0),
      total: 2,
      cta: 'بررسی و ادامه مسیر ارتباط',
    },
    {
      key: 'rules',
      label: 'قوانین ارسال',
      description: 'Quiet Hours و سقف پیام روزانه باعث می‌شوند ربات رفتارش قابل کنترل بماند.',
      icon: 'fa-sliders',
      anchor: 'tg-anchor-rules',
      done: telegramTransportMode === 'disabled' || Boolean(
        String(telegramInfo.telegram_quiet_start_hour ?? '').trim() &&
        String(telegramInfo.telegram_quiet_end_hour ?? '').trim() &&
        String(telegramInfo.telegram_max_per_day_per_customer ?? '').trim()
      ),
      score: telegramTransportMode === 'disabled' ? 2 : Math.min(2, [
        Boolean(String(telegramInfo.telegram_quiet_start_hour ?? '').trim()),
        Boolean(String(telegramInfo.telegram_quiet_end_hour ?? '').trim()),
        Boolean(String(telegramInfo.telegram_max_per_day_per_customer ?? '').trim()),
      ].filter(Boolean).length),
      total: 2,
      cta: 'باز کردن قوانین ارسال',
    },
    {
      key: 'destinations',
      label: 'مقصدهای تفکیکی',
      description: 'اگر گزارش‌ها و اعلان‌ها chat_id جدا داشته باشند، کنترل‌سنتر حرفه‌ای‌تر و تمیزتر می‌شود.',
      icon: 'fa-diagram-project',
      anchor: 'tg-anchor-destinations',
      done: telegramTransportMode === 'disabled' || [
        telegramInfo.telegram_chat_ids_reports,
        telegramInfo.telegram_chat_ids_installments,
        telegramInfo.telegram_chat_ids_sales,
        telegramInfo.telegram_chat_ids_notifications,
      ].filter((v) => String(v || '').trim()).length >= 2,
      score: telegramTransportMode === 'disabled' ? 4 : [
        telegramInfo.telegram_chat_ids_reports,
        telegramInfo.telegram_chat_ids_installments,
        telegramInfo.telegram_chat_ids_sales,
        telegramInfo.telegram_chat_ids_notifications,
      ].filter((v) => String(v || '').trim()).length,
      total: 4,
      cta: 'رفتن به مقصدها',
    },
    {
      key: 'quick-check',
      label: 'بررسی و ادامه ارسال',
      description: 'بعد از ذخیره تغییرات، ارسال بررسی و ادامه را انجام بده تا مسیر ارسال و متن پیام کنترل شود.',
      icon: 'fa-vial-circle-check',
      anchor: 'tg-anchor-quick-check',
      done: telegramTransportMode === 'disabled' || Boolean(tgHealth?.ok || tgCC?.health?.botApi?.ok),
      score: telegramTransportMode === 'disabled' || tgHealth?.ok || tgCC?.health?.botApi?.ok ? 1 : 0,
      total: 1,
      cta: 'رفتن به بررسی و ادامه ارسال',
    },
  ];

  const telegramTopConnectionSummary = telegramConnectionChecks.reduce((acc, item) => {
    acc.done += item.done ? 1 : 0;
    acc.score += item.score;
    acc.total += item.total;
    return acc;
  }, { done: 0, score: 0, total: 0 });

  const telegramTopConnectionPercent = telegramTopConnectionSummary.total
    ? Math.round((telegramTopConnectionSummary.score / telegramTopConnectionSummary.total) * 100)
    : 0;

  const telegramTopConnectionTone: TelegramTopConnectionTone = telegramTopConnectionPercent >= 85
    ? {
        shell: 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-emerald-950/20',
        chip: 'border-emerald-200 bg-white text-emerald-700 dark:border-emerald-900/40 dark:bg-slate-950 dark:text-emerald-200',
        bar: 'from-emerald-500 via-teal-500 to-cyan-500',
        label: 'آماده و پایدار',
        icon: 'fa-star',
      }
    : telegramTopConnectionPercent >= 45
      ? {
          shell: 'border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/20',
          chip: 'border-amber-200 bg-white text-amber-700 dark:border-amber-900/40 dark:bg-slate-950 dark:text-amber-200',
          bar: 'from-amber-500 via-orange-500 to-yellow-500',
          label: 'نیمه‌تنظیم',
          icon: 'fa-wand-magic-sparkles',
        }
      : {
          shell: 'border-rose-200 bg-rose-50/80 dark:border-rose-900/40 dark:bg-rose-950/20',
          chip: 'border-rose-200 bg-white text-rose-700 dark:border-rose-900/40 dark:bg-slate-950 dark:text-rose-200',
          bar: 'from-rose-500 via-pink-500 to-red-500',
          label: 'نیازمند تکمیل',
          icon: 'fa-bolt',
        };

  const telegramTopNextAction = telegramConnectionChecks.find((item) => !item.done) || telegramConnectionChecks[telegramConnectionChecks.length - 1];

  const telegramDestinationFields = [
    String(telegramInfo.telegram_chat_ids_reports || '').trim(),
    String(telegramInfo.telegram_chat_ids_installments || '').trim(),
    String(telegramInfo.telegram_chat_ids_sales || '').trim(),
    String(telegramInfo.telegram_chat_ids_notifications || '').trim(),
  ].filter(Boolean);
  const telegramDestinationCount = telegramDestinationFields.length;
  const telegramConfigChecks: TelegramCheckItem[] = [
    { key: 'token', label: 'توکن ربات', ok: telegramTransportMode === 'disabled' || Boolean(String(businessInfo.telegram_bot_token || '').trim()), targetId: 'telegram_bot_token' },
    { key: 'username', label: 'نام کاربری ربات', ok: telegramTransportMode === 'disabled' || Boolean(String(telegramInfo.telegram_bot_username || '').trim()), targetId: 'telegram_bot_username' },
    { key: 'chat', label: 'شناسه چت اصلی', ok: telegramTransportMode === 'disabled' || Boolean(String(businessInfo.telegram_chat_id || '').trim()), targetId: 'telegram_chat_id' },
    { key: 'miniapp', label: 'Mini App', ok: telegramMiniAppReady, targetId: 'telegram_miniapp_public_url' },
    { key: 'route', label: 'مسیر اتصال', ok: telegramRouteReady, targetId: telegramTransportMode === 'proxy' ? 'telegram_proxy' : 'telegram_transport_mode' },
    { key: 'quiet', label: 'قوانین سکوت', ok: telegramTransportMode === 'disabled' || (telegramInfo.telegram_quiet_start_hour !== '' && telegramInfo.telegram_quiet_start_hour != null && telegramInfo.telegram_quiet_end_hour !== '' && telegramInfo.telegram_quiet_end_hour != null), targetId: 'telegram_quiet_start_hour' },
    { key: 'destinations', label: 'مقصدهای تفکیکی', ok: telegramTransportMode === 'disabled' || telegramDestinationCount > 0, targetId: 'telegram_chat_ids_reports' },
    { key: 'otp', label: 'OTP اتصال', ok: telegramTransportMode === 'disabled' || Boolean(String(telegramInfo.sms_otp_meli_body_id || '').trim()), targetId: 'sms_otp_meli_body_id' },
  ];
  const telegramConfigReadyCount = telegramConfigChecks.filter((item) => item.ok).length;
  const telegramConfigReadiness = Math.round((telegramConfigReadyCount / Math.max(telegramConfigChecks.length, 1)) * 100);
  const telegramConnectionMode: TelegramConnectionMode = telegramRouteLabel;
  const telegramHealthTone = tgHealth?.ok ? 'emerald' : tgHealth ? 'rose' : telegramConfigReadiness >= 75 ? 'sky' : telegramConfigReadiness >= 45 ? 'amber' : 'rose';
  const telegramFirstMissingCheck = telegramConfigChecks.find((item) => !item.ok) || null;
  const telegramConfigCoachMessage = tgHealth?.ok
    ? 'اتصال ربات سالم است؛ حالا روی مسیرهای مقصد، OTP و بررسی و ادامه ارسال تمرکز کن تا تجربه ارسال یکدست شود.'
    : telegramFirstMissingCheck
      ? `برای کامل‌تر شدن این بخش، اول «${telegramFirstMissingCheck.label}» را تکمیل کن.`
      : 'تنظیمات اصلی کامل‌اند؛ یک بررسی و ادامه ارسال انجام بده و سپس کنترل‌سنتر را بررسی و ادامه کن.';

  const telegramSmartActions: TelegramSmartAction[] = [
    { key: 'token', label: 'توکن و هویت ربات', value: String(telegramInfo.telegram_bot_username || '').trim() ? `@${String(telegramInfo.telegram_bot_username || '').trim()}` : 'هنوز ثبت اطلاعات نشده', icon: 'fa-key', ok: Boolean(String(businessInfo.telegram_bot_token || '').trim() && String(telegramInfo.telegram_bot_username || '').trim()), targetId: !String(businessInfo.telegram_bot_token || '').trim() ? 'telegram_bot_token' : 'telegram_bot_username' },
    { key: 'chat', label: 'چت مقصد اصلی', value: String(businessInfo.telegram_chat_id || '').trim() ? 'متصل' : 'نیاز به ثبت اطلاعات chat_id', icon: 'fa-comments', ok: Boolean(String(businessInfo.telegram_chat_id || '').trim()), targetId: 'telegram_chat_id' },
    { key: 'route', label: 'مسیر ارتباط', value: telegramConnectionMode, icon: telegramTransportMode === 'proxy' ? 'fa-shuffle' : telegramTransportMode === 'relay' ? 'fa-cloud-arrow-up' : telegramTransportMode === 'disabled' ? 'fa-ban' : 'fa-paper-plane', ok: telegramRouteReady, targetId: telegramTransportMode === 'proxy' ? 'telegram_proxy' : 'telegram_transport_mode' },
    { key: 'routing', label: 'مقصدهای تفکیکی', value: telegramDestinationCount ? `${telegramDestinationCount.toLocaleString('fa-IR')} بخش آماده` : 'هنوز تنظیم نشده', icon: 'fa-route', ok: telegramDestinationCount > 0, targetId: 'telegram_chat_ids_reports' },
    { key: 'otp', label: 'OTP اتصال مشتری', value: String(telegramInfo.sms_otp_meli_body_id || '').trim() ? 'BodyId ثبت اطلاعات شده' : 'نیاز به BodyId', icon: 'fa-mobile-screen-button', ok: Boolean(String(telegramInfo.sms_otp_meli_body_id || '').trim()), targetId: 'sms_otp_meli_body_id' },
    { key: 'check', label: 'بررسی و ادامه ارسال', value: tgHealth?.ok ? 'ربات پاسخ می‌دهد' : 'برای اطمینان ارسال را بررسی و ادامه کن', icon: 'fa-paper-plane', ok: Boolean(tgHealth?.ok), targetId: 'telegram_quick_msg' },
  ];

  const telegramSetupItems: TelegramCheckItem[] = [
    {
      key: 'token',
      title: 'توکن ربات',
      done: telegramTransportMode === 'disabled' || Boolean(String(businessInfo.telegram_bot_token || '').trim()),
      hint: 'برای اتصال ربات به Bot API لازم است.',
      icon: 'fa-key',
      target: 'telegram_bot_token',
    },
    {
      key: 'username',
      title: 'یوزرنیم ربات',
      done: telegramTransportMode === 'disabled' || Boolean(String(telegramInfo.telegram_bot_username || '').trim()),
      hint: 'برای لینک مشتری و ساخت لینک t.me لازم است.',
      icon: 'fa-at',
      target: 'telegram_bot_username',
    },
    {
      key: 'chat',
      title: 'چت اصلی',
      done: telegramTransportMode === 'disabled' || Boolean(String(businessInfo.telegram_chat_id || '').trim()),
      hint: 'پیام‌ها در نبود مقصد تفکیکی، اینجا ارسال می‌شوند.',
      icon: 'fa-comments',
      target: 'telegram_chat_id',
    },
    {
      key: 'miniapp',
      title: 'Mini App',
      done: telegramMiniAppReady,
      hint: telegramPublicAccessMode === 'disabled' ? 'خاموش است؛ دامنه عمومی لازم نیست.' : telegramPublicAccessMode === 'self_hosted' ? 'Public HTTPS URL صریح لازم است.' : telegramPublicAccessMode === 'external_tunnel' ? 'Public HTTPS URL تانل لازم است؛ خود تانل خارج از کوروش مدیریت می‌شود.' : 'Relay به Provider انتخاب‌شده، اتصال امن و سلامت Mini App Relay وابسته است.',
      icon: 'fa-window-maximize',
      target: 'telegram_miniapp_public_url',
    },
    {
      key: 'routing',
      title: 'مقصدهای تفکیکی',
      done: telegramTransportMode === 'disabled' || [businessInfo.telegram_chat_ids_reports, businessInfo.telegram_chat_ids_installments, businessInfo.telegram_chat_ids_sales, businessInfo.telegram_chat_ids_notifications].some((v) => Boolean(String(v || '').trim())),
      hint: 'مسیر اعلان‌ها را برای هر بخش جدا می‌کند.',
      icon: 'fa-route',
      target: 'telegram_chat_ids_reports',
    },
    {
      key: 'policy',
      title: 'قوانین ارسال',
      done: telegramTransportMode === 'disabled' || Boolean(String(telegramInfo.telegram_quiet_start_hour ?? '').trim() || String(telegramInfo.telegram_quiet_end_hour ?? '').trim() || String(telegramInfo.telegram_max_per_day_per_customer ?? '').trim() || String(businessInfo.telegram_silent_hours || '').trim()),
      hint: 'ساعات سکوت و سقف ارسال را کنترل می‌کند.',
      icon: 'fa-sliders',
      target: 'telegram_quiet_start_hour',
    },
  ];
  const telegramSetupDone = telegramSetupItems.filter((item) => item.done).length;
  const telegramSetupPercent = Math.round((telegramSetupDone / Math.max(telegramSetupItems.length, 1)) * 100);
  const telegramMissingItems = telegramSetupItems.filter((item) => !item.done);
  const telegramHasProxy = Boolean(String(telegramInfo.telegram_proxy || '').trim());
  const telegramAudienceDestinationCount = [businessInfo.telegram_chat_ids_reports, businessInfo.telegram_chat_ids_installments, businessInfo.telegram_chat_ids_sales, businessInfo.telegram_chat_ids_notifications]
    .map((v) => String(v || '').split(/\r?\n|,/).map((x) => x.trim()).filter(Boolean).length)
    .reduce((sum, n) => sum + n, 0);
  const telegramReadinessLabel = telegramSetupPercent >= 85 ? 'آماده عملیات' : telegramSetupPercent >= 50 ? 'نیمه‌پیکربندی' : 'نیاز به تکمیل';
  const telegramSetupCoachMessage = telegramMissingItems.length === 0
    ? 'تنظیمات پایه کامل شده‌اند. اکنون مسیر ارسال پیام و مرکز کنترل را بررسی و ادامه کن.'
    : `برای تکمیل سریع‌تر، اول «${telegramMissingItems[0]?.title || 'توکن ربات'}» را تنظیم کن؛ بعد یک بررسی و ادامه ارسال انجام بده.`;

  return {
    telegramConnectionChecks,
    telegramTopConnectionSummary,
    telegramTopConnectionPercent,
    telegramTopConnectionTone,
    telegramTopNextAction,
    getTelegramSmartCheckTone,
    telegramDestinationFields,
    telegramDestinationCount,
    telegramConfigChecks,
    telegramConfigReadyCount,
    telegramConfigReadiness,
    telegramConnectionMode,
    telegramHealthTone,
    telegramFirstMissingCheck,
    telegramConfigCoachMessage,
    telegramSmartActions,
    telegramSetupItems,
    telegramSetupDone,
    telegramSetupPercent,
    telegramMissingItems,
    telegramHasProxy,
    telegramAudienceDestinationCount,
    telegramReadinessLabel,
    telegramSetupCoachMessage,
  };
};
