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
  const telegramTransportMode = transportRaw === 'cloud_relay' ? 'relay' : ['disabled', 'direct', 'proxy', 'relay'].includes(transportRaw) ? transportRaw : 'direct';
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
      chip: Boolean(telegramTokenValue) ? 'توکن ثبت اطلاعات شده' : 'نیاز به تنظیم',
      message: Boolean(telegramTokenValue)
        ? 'توکن ربات ذخیره تغییرات شده و هویت اصلی بات حاضر است.'
        : 'بدون توکن، هیچ مسیر تلگرامی فعال نمی‌شود. این اولین قدم ستاپ است.',
      cta: 'پر کردن توکن',
      target: 'telegram_bot_token',
    },
    username: {
      ok: Boolean(telegramUsernameValue),
      tone: telegramTokenValue && !telegramUsernameValue ? 'amber' : Boolean(telegramUsernameValue) ? 'emerald' : 'slate',
      chip: telegramTokenValue && !telegramUsernameValue ? 'نیاز به username' : Boolean(telegramUsernameValue) ? 'آماده لینک‌سازی' : 'اختیاری ولی مهم',
      message: telegramTokenValue && !telegramUsernameValue
        ? 'توکن ثبت اطلاعات شده اما username ربات هنوز خالی است؛ لینک t.me و QR مشتری ناقص می‌ماند.'
        : Boolean(telegramUsernameValue)
        ? 'username ربات ثبت اطلاعات شده و لینک‌سازی مشتری بدون اصطکاک انجام می‌شود.'
        : 'این فیلد برای onboarding حرفه‌ای مشتری و ساخت لینک ربات توصیه می‌شود.',
      cta: telegramTokenValue && !telegramUsernameValue ? 'ثبت اطلاعات username' : 'بررسی و ادامه username',
      target: 'telegram_bot_username',
    },
    chatId: {
      ok: Boolean(telegramChatIdValue),
      tone: Boolean(telegramChatIdValue) ? 'emerald' : 'rose',
      chip: Boolean(telegramChatIdValue) ? 'مقصد اصلی ثبت شد' : 'CTA: ثبت chat_id',
      message: Boolean(telegramChatIdValue)
        ? 'چت اصلی تعریف شده و ربات برای ارسال پایه مقصد دارد.'
        : 'chat_id اصلی خالی است؛ برای شروع ارسال و مسیر جایگزین، همین الان آن را ثبت اطلاعات کن.',
      cta: Boolean(telegramChatIdValue) ? 'باز کردن chat_id' : 'ثبت اطلاعات chat_id',
      target: 'telegram_chat_id',
    },
    baseUrl: {
      ok: telegramMiniAppReady,
      tone: telegramMiniAppReady ? 'emerald' : 'amber',
      chip: telegramPublicAccessMode === 'disabled'
        ? 'Mini App خاموش'
        : telegramPublicAccessMode === 'self_hosted'
          ? telegramMiniAppPublicUrlValue ? 'Self-Hosted آماده' : 'Public URL لازم است'
          : telegramPublicAccessMode === 'external_tunnel'
            ? telegramMiniAppPublicUrlValue ? 'Tunnel آماده' : 'URL تانل لازم است'
            : relayMiniAppReady ? 'Relay آماده' : 'Relay آماده نیست',
      message: telegramPublicAccessMode === 'disabled'
        ? 'Mini App عمداً خاموش است و به Public URL یا Relay نیاز ندارد.'
        : telegramPublicAccessMode === 'self_hosted'
          ? telegramMiniAppPublicUrlValue
            ? 'Mini App فقط از URL عمومی صریح میزبانی شخصی استفاده می‌کند.'
            : 'برای Self-Hosted Mini App یک Public HTTPS URL صریح لازم است.'
          : telegramPublicAccessMode === 'external_tunnel'
            ? telegramMiniAppPublicUrlValue ? 'کوروش فقط URL عمومی تانل را می‌شناسد؛ lifecycle تانل خارج از برنامه است.' : 'برای External Tunnel یک Public HTTPS URL صریح لازم است.'
            : 'Mini App Relay فقط از Assigned URL و Provider رله انتخاب‌شده استفاده می‌کند.',
      cta: (telegramPublicAccessMode === 'self_hosted' || telegramPublicAccessMode === 'external_tunnel') && !telegramMiniAppPublicUrlValue ? 'ثبت Public URL Mini App' : 'بررسی Mini App',
      target: 'telegram_miniapp_public_url',
    },
    proxy: {
      ok: telegramTransportMode !== 'proxy' || (Boolean(telegramProxyValue) && Boolean(tgHealth?.ok)),
      tone: telegramTransportMode === 'proxy' ? (tgHealth?.ok ? 'emerald' : tgHealth ? 'rose' : 'amber') : 'sky',
      chip: telegramTransportMode === 'proxy' ? (tgHealth?.ok ? 'Proxy سالم' : telegramProxyValue ? 'Proxy نیاز به بررسی' : 'Proxy لازم است') : telegramTransportMode === 'relay' ? 'Relay' : telegramTransportMode === 'disabled' ? 'تلگرام خاموش' : 'Direct',
      message: telegramTransportMode === 'proxy'
        ? (telegramProxyValue ? 'این حالت فقط از Proxy ثبت‌شده عبور می‌کند و fallback مستقیم ندارد.' : 'برای Proxy mode یک Proxy معتبر لازم است.')
        : telegramTransportMode === 'relay' ? 'این حالت فقط از Relay Provider انتخاب‌شده عبور می‌کند و fallback مستقیم ندارد.' : telegramTransportMode === 'disabled' ? 'Telegram network runtime عمداً غیرفعال است.' : 'Direct mode مستقیماً به Telegram متصل می‌شود و Proxy برنامه را استفاده نمی‌کند.',
      cta: telegramTransportMode === 'proxy' ? 'بررسی مسیر Proxy' : 'بررسی روش اتصال',
      target: telegramTransportMode === 'proxy' ? 'telegram_proxy' : 'telegram_transport_mode',
    },
    rules: {
      ok: Boolean(telegramQuietStartValue || telegramQuietEndValue || telegramDailyLimitValue || telegramSilentHoursValue),
      tone: Boolean(telegramQuietStartValue || telegramQuietEndValue || telegramDailyLimitValue || telegramSilentHoursValue) ? 'emerald' : 'amber',
      chip: Boolean(telegramQuietStartValue || telegramQuietEndValue || telegramDailyLimitValue || telegramSilentHoursValue) ? 'قوانین ثبت‌شده' : 'بدون Guard Rail',
      message: Boolean(telegramQuietStartValue || telegramQuietEndValue || telegramDailyLimitValue || telegramSilentHoursValue)
        ? 'حداقل یکی از guard railهای ارسال تنظیم شده و ریسک اسپم کمتر است.'
        : 'برای تجربه حرفه‌ای‌تر، quiet hours یا سقف پیام روزانه را هم تنظیم کن.',
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
