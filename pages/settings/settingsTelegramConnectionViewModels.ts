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
  const telegramTransportMode = transportRaw === 'cloud_relay' ? 'relay' : ['disabled', 'direct', 'system', 'proxy', 'relay'].includes(transportRaw) ? transportRaw : 'direct';
  const explicitMiniAppMode = String(telegramInfo.miniapp_public_access_mode || '').trim();
  const legacyMiniAppMode = String(telegramInfo.telegram_public_access_mode || '').trim();
  const telegramPublicAccessMode = ['disabled', 'self_hosted', 'external_tunnel', 'stable_tunnel', 'relay'].includes(explicitMiniAppMode)
    ? explicitMiniAppMode
    : legacyMiniAppMode === 'cloud_managed' ? 'relay' : legacyMiniAppMode === 'self_hosted' ? 'self_hosted' : legacyMiniAppMode === 'disabled' ? 'disabled' : telegramMiniAppPublicUrl ? 'self_hosted' : 'disabled';
  const relayConnected = String(telegramInfo.kourosh_cloud_connection_state || '') === 'connected';
  const relayTelegramReady = relayConnected && String(telegramInfo.kourosh_cloud_telegram_relay_healthy || '') === '1';
  const relayMiniAppReady = relayConnected &&
    String(telegramInfo.kourosh_cloud_miniapp_relay_healthy || '') === '1' &&
    Boolean(String(telegramInfo.kourosh_cloud_assigned_public_url || '').trim());
  const telegramMiniAppReady = telegramPublicAccessMode === 'disabled' ||
    ((telegramPublicAccessMode === 'self_hosted' || telegramPublicAccessMode === 'external_tunnel') && Boolean(telegramMiniAppPublicUrl)) ||
    (telegramPublicAccessMode === 'stable_tunnel' && Boolean(telegramMiniAppPublicUrl) && Boolean(String(telegramInfo.miniapp_live_origin_url || '').trim())) ||
    (telegramPublicAccessMode === 'relay' && relayMiniAppReady);
  const telegramRouteReady = telegramTransportMode === 'disabled' ||
    (telegramTransportMode === 'direct' && Boolean(String(telegramInfo.telegram_bot_token || '').trim())) ||
    (telegramTransportMode === 'system' && Boolean(String(telegramInfo.telegram_bot_token || '').trim()) && Boolean(tgHealth?.ok)) ||
    (telegramTransportMode === 'proxy' && Boolean(String(telegramInfo.telegram_proxy || '').trim()) && Boolean(tgHealth?.ok)) ||
    (telegramTransportMode === 'relay' && relayTelegramReady);
  const telegramRouteLabel = telegramTransportMode === 'disabled' ? 'غیرفعال' : telegramTransportMode === 'system' ? 'VPN / پراکسی سیستم' : telegramTransportMode === 'proxy' ? 'پراکسی دستی' : telegramTransportMode === 'relay' ? 'رله' : 'مستقیم';

  const telegramConnectionChecks: TelegramConnectionCheck[] = [
    {
      key: 'bot-core',
      label: 'هویت ربات',
      description: 'توکن و نام کاربری ربات باید کامل باشند تا لینک‌سازی و ارسال بدون خطا در عملیات انجام شود.',
      icon: 'fa-robot',
      anchor: 'telegram-section-bot-core',
      done: telegramTransportMode === 'disabled' || Boolean(String(telegramInfo.telegram_bot_token || '').trim() && String(telegramInfo.telegram_bot_username || '').trim()),
      score: telegramTransportMode === 'disabled' ? 2 : [Boolean(String(telegramInfo.telegram_bot_token || '').trim()), Boolean(String(telegramInfo.telegram_bot_username || '').trim())].filter(Boolean).length,
      total: 2,
      cta: 'رفتن به هویت ربات',
    },
    {
      key: 'main-route',
      label: 'مسیر اصلی ارسال',
      description: 'شناسه گفتگوی اصلی، مقصد پایه پیام‌های ربات است و مستقل از نشانی عمومی Mini App مدیریت می‌شود.',
      icon: 'fa-paper-plane',
      anchor: 'telegram-section-main-route',
      done: telegramTransportMode === 'disabled' || Boolean(String(telegramInfo.telegram_chat_id || '').trim()),
      score: telegramTransportMode === 'disabled' || Boolean(String(telegramInfo.telegram_chat_id || '').trim()) ? 1 : 0,
      total: 1,
      cta: 'تنظیم مسیر اصلی',
    },
    {
      key: 'mini-app',
      label: 'دسترسی Mini App',
      description: telegramPublicAccessMode === 'disabled' ? 'Mini App خاموش است؛ نشانی عمومی لازم نیست.' : telegramPublicAccessMode === 'self_hosted' ? 'میزبانی شخصی فقط از نشانی عمومی ثبت‌شده استفاده می‌کند.' : telegramPublicAccessMode === 'external_tunnel' ? 'اتصال خارجی فقط از نشانی امن ثبت‌شده استفاده می‌کند.' : telegramPublicAccessMode === 'stable_tunnel' ? 'اتصال پایدار، نشانی عمومی ثابت را از مبدأ زنده فروشگاه جدا نگه می‌دارد و با راه‌اندازی دوباره تغییر نمی‌کند.' : 'رله Mini App به سرویس انتخاب‌شده و نشانی عمومی اختصاص‌یافته وابسته است.',
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
      description: telegramTransportMode === 'disabled' ? 'اتصال تلگرام غیرفعال است.' : telegramTransportMode === 'direct' ? 'اتصال مستقیم بدون استفاده از پراکسی صریح برقرار می‌شود.' : telegramTransportMode === 'system' ? 'اتصال از VPN/پراکسی سیستم به‌صورت خودکار کشف می‌شود و به تنظیم پورت دستی نیاز ندارد.' : telegramTransportMode === 'proxy' ? 'اتصال فقط از پراکسی دستی ثبت‌شده عبور می‌کند.' : 'اتصال رله فقط از سرویس رله انتخاب‌شده عبور می‌کند.',
      icon: 'fa-route',
      anchor: telegramTransportMode === 'proxy' ? 'telegram-section-proxy' : 'telegram-connectivity-v151-heading',
      done: telegramRouteReady,
      score: telegramRouteReady ? 2 : (telegramTransportMode === 'disabled' ? 2 : 0),
      total: 2,
      cta: 'بررسی و ادامه مسیر ارتباط',
    },
    {
      key: 'rules',
      label: 'قوانین ارسال',
      description: 'ساعات عدم ارسال و سقف پیام روزانه کمک می‌کنند ارسال پیام‌ها منظم و قابل‌کنترل بماند.',
      icon: 'fa-sliders',
      anchor: 'telegram-section-rules',
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
      description: 'می‌توانید برای گزارش‌ها و اعلان‌ها مقصدهای جداگانه تعیین کنید تا پیام‌ها منظم‌تر مدیریت شوند.',
      icon: 'fa-diagram-project',
      anchor: 'telegram-section-destinations',
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
      label: 'بررسی ارسال',
      description: 'پس از ذخیره تغییرات، یک پیام بررسی ارسال کنید تا مقصد و متن پیام کنترل شود.',
      icon: 'fa-vial-circle-check',
      anchor: 'telegram-section-quick-check',
      done: telegramTransportMode === 'disabled' || Boolean(tgHealth?.ok || tgCC?.health?.botApi?.ok),
      score: telegramTransportMode === 'disabled' || tgHealth?.ok || tgCC?.health?.botApi?.ok ? 1 : 0,
      total: 1,
      cta: 'رفتن به بررسی ارسال',
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
    { key: 'chat', label: 'شناسه گفتگوی اصلی', ok: telegramTransportMode === 'disabled' || Boolean(String(businessInfo.telegram_chat_id || '').trim()), targetId: 'telegram_chat_id' },
    { key: 'miniapp', label: 'Mini App', ok: telegramMiniAppReady, targetId: 'telegram_miniapp_public_url' },
    { key: 'route', label: 'مسیر اتصال', ok: telegramRouteReady, targetId: telegramTransportMode === 'proxy' ? 'telegram_proxy' : 'telegram_transport_mode' },
    { key: 'quiet', label: 'قوانین سکوت', ok: telegramTransportMode === 'disabled' || (telegramInfo.telegram_quiet_start_hour !== '' && telegramInfo.telegram_quiet_start_hour != null && telegramInfo.telegram_quiet_end_hour !== '' && telegramInfo.telegram_quiet_end_hour != null), targetId: 'telegram_quiet_start_hour' },
    { key: 'destinations', label: 'مقصدهای تفکیکی', ok: telegramTransportMode === 'disabled' || telegramDestinationCount > 0, targetId: 'telegram_chat_ids_reports' },
    { key: 'otp', label: 'کد تأیید اتصال', ok: telegramTransportMode === 'disabled' || Boolean(String(telegramInfo.sms_otp_meli_body_id || '').trim()), targetId: 'sms_otp_meli_body_id' },
  ];
  const telegramConfigReadyCount = telegramConfigChecks.filter((item) => item.ok).length;
  const telegramConfigReadiness = Math.round((telegramConfigReadyCount / Math.max(telegramConfigChecks.length, 1)) * 100);
  const telegramConnectionMode: TelegramConnectionMode = telegramRouteLabel;
  const telegramHealthTone = tgHealth?.ok ? 'emerald' : tgHealth ? 'rose' : telegramConfigReadiness >= 75 ? 'sky' : telegramConfigReadiness >= 45 ? 'amber' : 'rose';
  const telegramFirstMissingCheck = telegramConfigChecks.find((item) => !item.ok) || null;
  const telegramConfigCoachMessage = tgHealth?.ok
    ? 'اتصال ربات سالم است؛ حالا مقصدها، کد تأیید اتصال و بررسی ارسال را تکمیل کنید تا ارسال پیام‌ها یکدست شود.'
    : telegramFirstMissingCheck
      ? `برای کامل‌تر شدن این بخش، ابتدا «${telegramFirstMissingCheck.label}» را تکمیل کنید.`
      : 'تنظیمات اصلی کامل‌اند؛ یک پیام بررسی ارسال کنید و سپس وضعیت ارتباط را کنترل کنید.';

  const telegramSmartActions: TelegramSmartAction[] = [
    { key: 'token', label: 'توکن و هویت ربات', value: String(telegramInfo.telegram_bot_username || '').trim() ? `@${String(telegramInfo.telegram_bot_username || '').trim()}` : 'هنوز ثبت نشده', icon: 'fa-key', ok: Boolean(String(businessInfo.telegram_bot_token || '').trim() && String(telegramInfo.telegram_bot_username || '').trim()), targetId: !String(businessInfo.telegram_bot_token || '').trim() ? 'telegram_bot_token' : 'telegram_bot_username' },
    { key: 'chat', label: 'چت مقصد اصلی', value: String(businessInfo.telegram_chat_id || '').trim() ? 'متصل' : 'نیاز به شناسه گفتگو', icon: 'fa-comments', ok: Boolean(String(businessInfo.telegram_chat_id || '').trim()), targetId: 'telegram_chat_id' },
    { key: 'route', label: 'مسیر ارتباط', value: telegramConnectionMode, icon: telegramTransportMode === 'proxy' ? 'fa-shuffle' : telegramTransportMode === 'system' ? 'fa-wifi' : telegramTransportMode === 'relay' ? 'fa-cloud-arrow-up' : telegramTransportMode === 'disabled' ? 'fa-ban' : 'fa-paper-plane', ok: telegramRouteReady, targetId: telegramTransportMode === 'proxy' ? 'telegram_proxy' : 'telegram_transport_mode' },
    { key: 'routing', label: 'مقصدهای تفکیکی', value: telegramDestinationCount ? `${telegramDestinationCount.toLocaleString('fa-IR')} بخش آماده` : 'هنوز تنظیم نشده', icon: 'fa-route', ok: telegramDestinationCount > 0, targetId: 'telegram_chat_ids_reports' },
    { key: 'otp', label: 'کد تأیید اتصال مشتری', value: String(telegramInfo.sms_otp_meli_body_id || '').trim() ? 'الگوی پیامک ثبت شده' : 'نیازمند الگوی پیامک', icon: 'fa-mobile-screen-button', ok: Boolean(String(telegramInfo.sms_otp_meli_body_id || '').trim()), targetId: 'sms_otp_meli_body_id' },
    { key: 'check', label: 'بررسی ارسال', value: tgHealth?.ok ? 'ربات پاسخ می‌دهد' : 'برای اطمینان، یک پیام بررسی ارسال کنید', icon: 'fa-paper-plane', ok: Boolean(tgHealth?.ok), targetId: 'telegram_quick_msg' },
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
      hint: telegramPublicAccessMode === 'disabled' ? 'خاموش است؛ دامنه عمومی لازم نیست.' : telegramPublicAccessMode === 'self_hosted' ? 'نشانی عمومی امن لازم است.' : telegramPublicAccessMode === 'external_tunnel' ? 'نشانی امن اتصال خارجی لازم است.' : telegramPublicAccessMode === 'stable_tunnel' ? 'نشانی عمومی ثابت و مبدأ زنده امن هر دو لازم‌اند.' : 'رله به سرویس انتخاب‌شده و سلامت اتصال Mini App وابسته است.',
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
    ? 'تنظیمات پایه کامل شده‌اند. اکنون مسیر ارسال پیام و وضعیت ارتباط را بررسی کنید.'
    : `برای تکمیل سریع‌تر، ابتدا «${telegramMissingItems[0]?.title || 'توکن ربات'}» را تنظیم کنید؛ سپس یک پیام بررسی ارسال کنید.`;

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
