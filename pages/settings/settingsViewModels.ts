import { ALL_FEATURE_FLAGS, FEATURE_FLAGS } from '../../utils/featureFlags';
import { settingsTabFeatureRequirements } from '../../utils/settingsFeaturePolicy';
import type { BusinessInformationSettings } from '../../types';
import type { TelegramBusinessInfo, TelegramHealthState } from './settingsPanelTypes';
import type { TabKey } from './settingsHelpers';
import { buildSettingsLocalDomainViewModel } from './settingsLocalBusinessViewModels';

export const buildModuleRuntimeSummary = (
  isFeatureSettingEnabled: (feature: { settingKey: string; defaultEnabled?: boolean }) => boolean,
  isSettingsTabRuntimeEnabled: (tabKey: TabKey) => boolean
) => {
  const enabledRootModulesCount = FEATURE_FLAGS.filter((feature) => isFeatureSettingEnabled(feature)).length;
  const disabledOptionalModulesCount = FEATURE_FLAGS.filter((feature) => feature.optional !== false && !isFeatureSettingEnabled(feature)).length;
  const enabledMicroFeaturesCount = ALL_FEATURE_FLAGS.filter((feature) => feature.scope === 'feature' && isFeatureSettingEnabled(feature)).length;
  const totalMicroFeaturesCount = ALL_FEATURE_FLAGS.filter((feature) => feature.scope === 'feature').length;
  const disabledSettingsTabsCount = (Object.keys(settingsTabFeatureRequirements) as TabKey[]).filter((key) => !isSettingsTabRuntimeEnabled(key)).length;
  return [
    { label: 'ماژول‌های فعال', value: `${enabledRootModulesCount}/${FEATURE_FLAGS.length}`, hint: 'بخش‌های اصلی فروشگاه در دسترس هستند.', icon: 'fa-cubes-stacked', tone: 'from-emerald-50 to-white text-emerald-700 dark:from-emerald-950/20 dark:to-slate-950 dark:text-emerald-300' },
    { label: 'ماژول‌های خاموش', value: disabledOptionalModulesCount.toLocaleString('fa-IR'), hint: 'بخش‌های غیرضروری از منو و پردازش خارج شده‌اند.', icon: 'fa-power-off', tone: 'from-rose-50 to-white text-rose-700 dark:from-rose-950/20 dark:to-slate-950 dark:text-rose-300' },
    { label: 'قابلیت‌های جزئی فعال', value: `${enabledMicroFeaturesCount}/${totalMicroFeaturesCount}`, hint: 'تنظیمات ریزدانه داخل ماژول‌ها فعال مانده‌اند.', icon: 'fa-sliders', tone: 'from-sky-50 to-white text-sky-700 dark:from-sky-950/20 dark:to-slate-950 dark:text-sky-300' },
    { label: 'تب‌های پنهان‌شده', value: disabledSettingsTabsCount.toLocaleString('fa-IR'), hint: 'تب‌های وابسته به ماژول خاموش نمایش داده نمی‌شوند.', icon: 'fa-eye-slash', tone: 'from-amber-50 to-white text-amber-700 dark:from-amber-950/20 dark:to-slate-950 dark:text-amber-300' },
  ];
};

export const buildTelegramSetupViewModel = (
  businessInfo: BusinessInformationSettings,
  telegramInfo: TelegramBusinessInfo,
  tgHealth: TelegramHealthState | null
) => {
  const telegramTokenValue = String(businessInfo.telegram_bot_token || '').trim();
  const telegramUsernameValue = String(businessInfo.telegram_bot_username || '').trim();
  const telegramChatIdValue = String(businessInfo.telegram_chat_id || '').trim();
  const telegramMiniAppPublicUrlValue = String(telegramInfo.telegram_miniapp_public_url || '').trim();
  const transportRaw = String(telegramInfo.telegram_transport_mode || 'direct').trim();
  const telegramTransportMode = transportRaw === 'cloud_relay' ? 'relay' : ['disabled', 'direct', 'system', 'proxy', 'relay'].includes(transportRaw) ? transportRaw : 'direct';
  const explicitMiniAppMode = String(telegramInfo.miniapp_public_access_mode || '').trim();
  const legacyMiniAppMode = String(telegramInfo.telegram_public_access_mode || '').trim();
  const telegramPublicAccessMode = ['disabled', 'self_hosted', 'external_tunnel', 'stable_tunnel', 'relay'].includes(explicitMiniAppMode)
    ? explicitMiniAppMode
    : legacyMiniAppMode === 'cloud_managed' ? 'relay' : legacyMiniAppMode === 'self_hosted' ? 'self_hosted' : legacyMiniAppMode === 'disabled' ? 'disabled' : telegramMiniAppPublicUrlValue ? 'self_hosted' : 'disabled';
  const relayMiniAppReady = String(telegramInfo.kourosh_cloud_connection_state || '') === 'connected' &&
    String(telegramInfo.kourosh_cloud_miniapp_relay_healthy || '') === '1' &&
    Boolean(String(telegramInfo.kourosh_cloud_assigned_public_url || '').trim());
  const telegramMiniAppReady = telegramPublicAccessMode === 'disabled' ||
    ((telegramPublicAccessMode === 'self_hosted' || telegramPublicAccessMode === 'external_tunnel') && Boolean(telegramMiniAppPublicUrlValue)) ||
    (telegramPublicAccessMode === 'stable_tunnel' && Boolean(telegramMiniAppPublicUrlValue) && Boolean(String(telegramInfo.miniapp_live_origin_url || '').trim())) ||
    (telegramPublicAccessMode === 'relay' && relayMiniAppReady);
  const telegramProxyValue = String(telegramInfo.telegram_proxy || '').trim();
  const {
    localHostnameValue,
    localSuffixValue,
    localDomainValue,
    localBaseUrlValue,
    localHostsLineValue,
  } = buildSettingsLocalDomainViewModel(businessInfo);
  const telegramQuietStartValue = String(telegramInfo.telegram_quiet_start_hour ?? '').trim();
  const telegramQuietEndValue = String(telegramInfo.telegram_quiet_end_hour ?? '').trim();
  const telegramDailyLimitValue = String(telegramInfo.telegram_max_per_day_per_customer ?? '').trim();
  const telegramSilentHoursValue = String(businessInfo.telegram_silent_hours || '').trim();

  const telegramFieldInsights = {
    token: {
      ok: Boolean(telegramTokenValue),
      tone: Boolean(telegramTokenValue) ? 'emerald' : 'rose',
      chip: Boolean(telegramTokenValue) ? 'توکن ثبت شده' : 'نیاز به تنظیم',
      message: Boolean(telegramTokenValue)
        ? 'توکن ربات ذخیره شده و ربات آماده ارتباط است.'
        : 'برای فعال‌سازی ارتباط تلگرام، ابتدا توکن ربات را وارد کنید.',
      cta: 'ثبت توکن',
      target: 'telegram_bot_token',
    },
    username: {
      ok: Boolean(telegramUsernameValue),
      tone: telegramTokenValue && !telegramUsernameValue ? 'amber' : Boolean(telegramUsernameValue) ? 'emerald' : 'slate',
      chip: telegramTokenValue && !telegramUsernameValue ? 'نیاز به نام کاربری' : Boolean(telegramUsernameValue) ? 'آماده استفاده' : 'پیشنهادی',
      message: telegramTokenValue && !telegramUsernameValue
        ? 'توکن ثبت شده اما نام کاربری ربات هنوز وارد نشده است؛ لینک مستقیم ربات تا زمان تکمیل این مورد آماده نیست.'
        : Boolean(telegramUsernameValue)
        ? 'نام کاربری ربات ثبت شده و لینک مستقیم ربات آماده است.'
        : 'ثبت نام کاربری برای ساخت لینک مستقیم ربات توصیه می‌شود.',
      cta: telegramTokenValue && !telegramUsernameValue ? 'ثبت نام کاربری' : 'بررسی نام کاربری',
      target: 'telegram_bot_username',
    },
    chatId: {
      ok: Boolean(telegramChatIdValue),
      tone: Boolean(telegramChatIdValue) ? 'emerald' : 'rose',
      chip: Boolean(telegramChatIdValue) ? 'مقصد اصلی ثبت شد' : 'نیاز به شناسه چت',
      message: Boolean(telegramChatIdValue)
        ? 'چت اصلی تعریف شده و ربات برای ارسال پایه مقصد دارد.'
        : 'شناسه چت اصلی وارد نشده است؛ برای شروع ارسال پیام آن را ثبت کنید.',
      cta: Boolean(telegramChatIdValue) ? 'مشاهده شناسه چت' : 'ثبت شناسه چت',
      target: 'telegram_chat_id',
    },
    baseUrl: {
      ok: telegramMiniAppReady,
      tone: telegramMiniAppReady ? 'emerald' : 'amber',
      chip: telegramPublicAccessMode === 'disabled'
        ? 'Mini App خاموش'
        : telegramPublicAccessMode === 'self_hosted'
          ? telegramMiniAppPublicUrlValue ? 'میزبانی شخصی آماده' : 'نشانی عمومی لازم است'
          : telegramPublicAccessMode === 'external_tunnel'
            ? telegramMiniAppPublicUrlValue ? 'اتصال موقت آماده' : 'نشانی اتصال لازم است'
            : relayMiniAppReady ? 'رله آماده' : 'رله آماده نیست',
      message: telegramPublicAccessMode === 'disabled'
        ? 'Mini App خاموش است و تا زمان فعال‌سازی به نشانی عمومی یا رله نیاز ندارد.'
        : telegramPublicAccessMode === 'self_hosted'
          ? telegramMiniAppPublicUrlValue
            ? 'Mini App از نشانی عمومی ثبت‌شده برای میزبانی شخصی استفاده می‌کند.'
            : 'برای میزبانی شخصی Mini App یک نشانی عمومی امن لازم است.'
          : telegramPublicAccessMode === 'external_tunnel'
            ? telegramMiniAppPublicUrlValue ? 'کوروش از نشانی عمومی ثبت‌شده برای اتصال موقت استفاده می‌کند.' : 'برای اتصال موقت یک نشانی عمومی امن لازم است.'
            : 'رله Mini App فقط از نشانی اختصاص‌یافته و سرویس رله انتخاب‌شده استفاده می‌کند.',
      cta: (telegramPublicAccessMode === 'self_hosted' || telegramPublicAccessMode === 'external_tunnel') && !telegramMiniAppPublicUrlValue ? 'ثبت نشانی Mini App' : 'بررسی Mini App',
      target: 'telegram_miniapp_public_url',
    },
    proxy: {
      ok: telegramTransportMode !== 'proxy' || (Boolean(telegramProxyValue) && Boolean(tgHealth?.ok)),
      tone: (telegramTransportMode === 'proxy' || telegramTransportMode === 'system') ? (tgHealth?.ok ? 'emerald' : tgHealth ? 'rose' : 'amber') : 'sky',
      chip: telegramTransportMode === 'proxy' ? (tgHealth?.ok ? 'پراکسی سالم' : telegramProxyValue ? 'پراکسی نیاز به بررسی' : 'پراکسی لازم است') : telegramTransportMode === 'system' ? (tgHealth?.ok ? 'مسیر سیستم سالم' : 'VPN / پراکسی سیستم') : telegramTransportMode === 'relay' ? 'رله' : telegramTransportMode === 'disabled' ? 'تلگرام خاموش' : 'مستقیم',
      message: telegramTransportMode === 'proxy'
        ? (telegramProxyValue ? 'این حالت فقط از پراکسی ثبت‌شده استفاده می‌کند.' : 'در حالت پراکسی، یک نشانی معتبر لازم است.')
        : telegramTransportMode === 'system' ? 'کوروش مسیر VPN/پراکسی سیستم را خودکار تشخیص می‌دهد و بدون نیاز به واردکردن پورت دستی از مسیرهای معتبر موجود استفاده می‌کند.' : telegramTransportMode === 'relay' ? 'این حالت فقط از سرویس رله انتخاب‌شده استفاده می‌کند.' : telegramTransportMode === 'disabled' ? 'ارتباط تلگرام غیرفعال است.' : 'حالت مستقیم بدون استفاده از پراکسی صریح به تلگرام متصل می‌شود.',
      cta: telegramTransportMode === 'proxy' ? 'بررسی مسیر پراکسی' : telegramTransportMode === 'system' ? 'بررسی مسیر VPN / سیستم' : 'بررسی روش اتصال',
      target: telegramTransportMode === 'proxy' ? 'telegram_proxy' : 'telegram_transport_mode',
    },
    rules: {
      ok: Boolean(telegramQuietStartValue || telegramQuietEndValue || telegramDailyLimitValue || telegramSilentHoursValue),
      tone: Boolean(telegramQuietStartValue || telegramQuietEndValue || telegramDailyLimitValue || telegramSilentHoursValue) ? 'emerald' : 'amber',
      chip: Boolean(telegramQuietStartValue || telegramQuietEndValue || telegramDailyLimitValue || telegramSilentHoursValue) ? 'قوانین ثبت‌شده' : 'بدون محدودیت ارسال',
      message: Boolean(telegramQuietStartValue || telegramQuietEndValue || telegramDailyLimitValue || telegramSilentHoursValue)
        ? 'حداقل یکی از محدودیت‌های ارسال تنظیم شده است و کنترل پیام‌ها بهتر انجام می‌شود.'
        : 'برای کنترل بهتر ارسال، ساعات سکوت یا سقف پیام روزانه را تنظیم کنید.',
      cta: 'رفتن به قوانین ارسال',
      target: 'telegram_quiet_start_hour',
    },
  } as const;

  return {
    telegramTokenValue,
    telegramUsernameValue,
    telegramChatIdValue,
    telegramMiniAppPublicUrlValue,
    telegramPublicAccessMode,
    telegramProxyValue,
    localHostnameValue,
    localSuffixValue,
    localDomainValue,
    localBaseUrlValue,
    localHostsLineValue,
    telegramFieldInsights,
  };
};
