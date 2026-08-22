import { useEffect, useState } from 'react';
import { apiFetch } from '../../utils/apiFetch';
import type { SettingsTelegramPanelProps, TelegramAudience, TelegramAudienceTemplateEntry, TelegramBusinessInfo, TelegramMessageFormat } from './settingsPanelTypes';
import Button from '../../components/Button';
import FormSection from '../../components/FormSection';
import { ModalField } from '@/components/ui';
import { SelectField, TextareaField } from '@/components/ui';
import TelegramLogsPanel from '../../components/TelegramLogsPanel';
import { TextField } from '@/components/ui';
import { Surface } from '@/components/ui';
import { IconGlyph } from '@/components/ui';
import ToggleSwitch from '../../components/ToggleSwitch';


export default function SettingsTelegramPanel(props: SettingsTelegramPanelProps) {
  const {
    tab,
    settingsViewMode,
    businessInfo,
    handleTelegramSettingsSubmit,
    handleBusinessInfoChange,
    setBusinessInfo,
    setNotification,
    applyTelegramAiSuggestion,
    applyTelegramPreset,
    buildTelegramAudiencePreset,
    bumpTelegramQuickActionUsage,
    checkTelegramHealth,
    clearTelegramStudioFilters,
    deferTelegramTodo,
    fetchTelegramRecentChats,
    filteredTelegramGroupedDefs,
    focusTelegramAudience,
    getTelegramAiAssistantCopy,
    getTelegramAudienceFormatKey,
    getTelegramAudienceKey,
    getTelegramCategoryStatus,
    getTelegramItemStatus,
    getTelegramMiniStatusClasses,
    getTelegramPriorityMeta,
    getTelegramProgressTone,
    getTelegramTodoNextStep,
    inputClass,
    jumpToFirstIncompleteTelegramTemplate,
    jumpToTelegramConfigField,
    jumpToTelegramSection,
    jumpToTelegramSetupField,
    jumpToTelegramTemplate,
    labelClass,
    markTelegramTodoDone,
    openSmsPatternCheck,
    openTelegramAudiencePanels,
    openTelegramCategories,
    openTelegramItems,
    openTelegramTemplateCheck,
    openUrgentTelegramTodos,
    reactivateTelegramTodo,
    renderTelegramFieldLabel,
    renderTelegramPlainFieldLabel,
    resetTelegramQuickActionPersonalization,
    resetTelegramTodoAssistant,
    runTelegramAdminAction,
    runTelegramDiagnostics,
    sendTelegramQuickCheck,
    setAllTelegramCategories,
    setAllTelegramItems,
    setOpenTelegramItems,
    setShowTelegramToken,
    setTelegramStudioMode,
    setTelegramTemplateFilter,
    setTelegramTemplateSearch,
    setTgQuickMsg,
    showTelegramToken,
    telegramAudienceDestinationCount,
    telegramChatIdValue,
    telegramCoachMessage,
    telegramConfigChecks,
    telegramConfigReadiness,
    telegramConfigReadyCount,
    telegramConnectionMode,
    telegramDestinationCount,
    telegramDiagnosticsViewModel,
    telegramEffectiveFilter,
    telegramFieldInsights,
    telegramHasProxy,
    telegramMissingItems,
    telegramPinnedQuickActions,
    telegramProxyValue,
    telegramQuickActionUsageMap,
    telegramRecentChatsViewModel,
    telegramReadinessLabel,
    telegramReadinessScore,
    telegramSetupCoachMessage,
    telegramSetupDone,
    telegramSetupItems,
    telegramSetupPercent,
    telegramSmartActions,
    telegramSpotlightTarget,
    telegramStudioMode,
    telegramTemplateDefs,
    telegramTemplateFilter,
    telegramTemplateSearch,
    telegramTodoDoneMap,
    telegramTodoSummary,
    telegramTodoTopItems,
    telegramTokenValue,
    telegramUsernameValue,
    telegramسراسریCompletionPercent,
    telegramسراسریSummary,
    tgAudienceMeta,
    tgCategoryMeta,
    tgChatLookupLoading,
    tgDiagnostics,
    tgDiagnosticsBusyAction,
    tgDiagnosticsLoading,
    tgHealth,
    tgIsChecking,
    tgIsSendingQuick,
    tgQuickMsg,
    toggleTelegramAudiencePanel,
    toggleTelegramCategory,
    toggleTelegramItem,
    toggleTelegramQuickActionPin,
    visibleTelegramItemsCount,
  } = props;

  const telegramInfo = businessInfo as TelegramBusinessInfo;
  const [cloudEnrollmentCode, setCloudEnrollmentCode] = useState('');
  const [cloudRecoveryCode, setCloudRecoveryCode] = useState('');
  const [cloudActionBusy, setCloudActionBusy] = useState(false);
  const [cloudEnrollmentAvailable, setCloudEnrollmentAvailable] = useState<boolean | null>(null);
  const [miniAppPublicSyncStatus, setMiniAppPublicSyncStatus] = useState<null | {
    phase?: string; publicUrl?: string | null; gateway?: string; tunnel?: string; telegramMenu?: string; message?: string | null;
  }>(null);

  useEffect(() => {
    if (tab !== 'telegram') return;
    let active = true;
    apiFetch('/api/settings/relay-connector/status', { cache: 'no-store' })
      .then(async (response) => ({ response, body: await response.json().catch(() => ({})) }))
      .then(({ response, body }) => { if (active) setCloudEnrollmentAvailable(Boolean(response.ok && body?.data?.enrollmentAvailable)); })
      .catch(() => { if (active) setCloudEnrollmentAvailable(false); });
    return () => { active = false; };
  }, [tab]);

  useEffect(() => {
    if (tab !== 'telegram') return;
    let active = true;
    let timer = 0;
    const loadPublicSyncStatus = async () => {
      try {
        const response = await apiFetch('/api/settings/miniapp-public-sync/status', { cache: 'no-store' });
        const body = await response.json().catch(() => ({}));
        if (!active || !response.ok || body?.success === false) return;
        const data = body?.data || {};
        setMiniAppPublicSyncStatus(data);
        const publicUrl = String(data?.publicUrl || '').trim();
        if (publicUrl && ['PUBLIC_URL_READY', 'MENU_SYNC_PENDING', 'MENU_SYNCED', 'ERROR'].includes(String(data?.phase || ''))) {
          setBusinessInfo((previous) => {
            const current = previous as TelegramBusinessInfo;
            if (current.miniapp_public_access_mode === 'stable_tunnel') return previous;
            if (String(current.telegram_miniapp_public_url || '').trim() === publicUrl && current.miniapp_public_access_mode === 'external_tunnel') return previous;
            return { ...current, miniapp_public_access_mode: 'external_tunnel', telegram_miniapp_public_url: publicUrl };
          });
        }
      } catch {}
      if (active) timer = window.setTimeout(loadPublicSyncStatus, 2500);
    };
    void loadPublicSyncStatus();
    return () => { active = false; if (timer) window.clearTimeout(timer); };
  }, [tab, setBusinessInfo]);

  const runCloudCredentialAction = async (kind: 'enroll' | 'rotate') => {
    const code = (kind === 'enroll' ? cloudEnrollmentCode : cloudRecoveryCode).trim();
    if (!code) {
      setNotification({ type: 'error', text: kind === 'enroll' ? 'کد فعال‌سازی سرویس رله را وارد کنید.' : 'کد بازیابی سرویس رله را وارد کنید.' });
      return;
    }
    setCloudActionBusy(true);
    try {
      const response = await apiFetch(kind === 'enroll' ? '/api/settings/relay-connector/enroll' : '/api/settings/relay-connector/rotate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(kind === 'enroll' ? { enrollmentCode: code } : { recoveryCode: code }),
          relayProvider,
          customRelayControlUrl: String(telegramInfo.custom_relay_control_url || '').trim(),
          customRelayConnectorUrl: String(telegramInfo.custom_relay_connector_url || '').trim(),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.success === false) throw new Error(String(body?.message || 'عملیات سرویس رله انجام نشد.'));
      const assignedPublicUrl = String(body?.data?.assignedPublicUrl || telegramInfo.kourosh_cloud_assigned_public_url || '');
      const runtimeState = String(body?.data?.status?.state || body?.data?.status?.runtime?.state || 'connecting');
      setBusinessInfo((prev) => ({
        ...(prev as TelegramBusinessInfo),
        relay_provider: relayProvider,
        relay_assignment_provider: relayProvider,
        kourosh_cloud_provisioned: '1',
        kourosh_cloud_connection_state: runtimeState,
        kourosh_cloud_assigned_store_id: String(body?.data?.assignedStoreId || (prev as TelegramBusinessInfo).kourosh_cloud_assigned_store_id || ''),
        kourosh_cloud_assigned_public_url: assignedPublicUrl || (prev as TelegramBusinessInfo).kourosh_cloud_assigned_public_url,
      }));
      setNotification({ type: 'success', text: String(body?.message || 'عملیات سرویس رله با موفقیت انجام شد.') });
    } catch (error) {
      setNotification({ type: 'error', text: error instanceof Error ? error.message : 'عملیات سرویس رله انجام نشد.' });
    } finally {
      if (kind === 'enroll') setCloudEnrollmentCode(''); else setCloudRecoveryCode('');
      setCloudActionBusy(false);
    }
  };
  const transportRaw = String(telegramInfo.telegram_transport_mode || 'direct').trim();
  const telegramTransportMode = transportRaw === 'cloud_relay' ? 'relay' : ['disabled', 'direct', 'proxy', 'relay'].includes(transportRaw) ? transportRaw : 'direct';
  const telegramMiniAppUrl = String(telegramInfo.telegram_miniapp_public_url || '').trim();
  const explicitMiniAppMode = String(telegramInfo.miniapp_public_access_mode || '').trim();
  const legacyPublicMode = String(telegramInfo.telegram_public_access_mode || '').trim();
  const telegramPublicAccessMode = ['disabled', 'self_hosted', 'external_tunnel', 'stable_tunnel', 'relay'].includes(explicitMiniAppMode)
    ? explicitMiniAppMode
    : legacyPublicMode === 'cloud_managed' ? 'relay' : legacyPublicMode === 'self_hosted' ? 'self_hosted' : legacyPublicMode === 'disabled' ? 'disabled' : telegramMiniAppUrl ? 'self_hosted' : 'disabled';
  const relayProvider = String(telegramInfo.relay_provider || '').trim() === 'custom' ? 'custom' : 'managed_kourosh';
  const rawAssignmentProvider = String(telegramInfo.relay_assignment_provider || '').trim();
  const relayAssignmentProvider = rawAssignmentProvider === 'custom' || rawAssignmentProvider === 'managed_kourosh'
    ? rawAssignmentProvider
    : String(telegramInfo.kourosh_cloud_provisioned || '') === '1' ? 'managed_kourosh' : '';
  const cloudProvisioned = String(telegramInfo.kourosh_cloud_provisioned || '') === '1' && relayAssignmentProvider === relayProvider;
  const cloudConnectionState = String(cloudProvisioned ? (telegramInfo.kourosh_cloud_connection_state || 'provisioned') : 'not_provisioned');
  const cloudConnected = cloudConnectionState === 'connected';
  const cloudTelegramReady = cloudConnected && String(telegramInfo.kourosh_cloud_telegram_relay_healthy || '') === '1';
  const cloudMiniAppReady = cloudConnected && String(telegramInfo.kourosh_cloud_miniapp_relay_healthy || '') === '1' && Boolean(String(telegramInfo.kourosh_cloud_assigned_public_url || '').trim());
  const hasMainMiniApp = Boolean(tgDiagnostics?.bot?.data?.result?.has_main_web_app);
  const stableMiniAppConfigured = telegramPublicAccessMode === 'stable_tunnel' && Boolean(telegramMiniAppUrl) && Boolean(String(telegramInfo.miniapp_live_origin_url || '').trim());
  const cloudStateLabel = !cloudProvisioned
    ? 'آماده‌سازی نشده'
    : cloudConnectionState === 'connected'
      ? 'متصل'
      : cloudConnectionState === 'connecting' || cloudConnectionState === 'authenticating'
        ? 'در حال اتصال'
        : cloudConnectionState === 'degraded' || cloudConnectionState === 'backoff'
          ? 'اختلال / تلاش مجدد'
          : 'آماده / آفلاین';
  const telegramMiniAppState = telegramPublicAccessMode === 'disabled'
    ? { label: 'خاموش — Public URL لازم نیست', tone: 'text-slate-600 dark:text-slate-300' }
    : telegramPublicAccessMode === 'self_hosted'
      ? { label: telegramMiniAppUrl ? 'میزبانی شخصی آماده تنظیم Gateway' : 'Public HTTPS URL لازم است', tone: telegramMiniAppUrl ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300' }
      : telegramPublicAccessMode === 'external_tunnel'
        ? { label: telegramMiniAppUrl ? 'URL تانل موقت ثبت شده' : 'Public HTTPS URL تانل لازم است', tone: telegramMiniAppUrl ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300' }
        : telegramPublicAccessMode === 'stable_tunnel'
          ? { label: stableMiniAppConfigured ? 'URL ثابت Production آماده است' : 'URL ثابت عمومی و Live Origin لازم است', tone: stableMiniAppConfigured ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300' }
          : { label: cloudMiniAppReady ? 'Mini App Relay آماده' : `Relay: ${cloudStateLabel}`, tone: cloudMiniAppReady ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300' };

  return (
    <>
          {tab === 'telegram' && (
            <form id="telegram-settings-form" onSubmit={handleTelegramSettingsSubmit} className={`telegram-redesign-v1 telegram-redesign-v2 telegram-apple-base-v29 settings-panel-root settings-ops-panel space-y-5 ${settingsViewMode === 'simple' ? 'telegram-simple-mode' : 'telegram-advanced-mode'}`} data-ui-settings-panel="telegram" data-ui-settings-telegram="v2" data-ui-ops-panel="telegram">
              <section className="telegram-executive-shell ops-command-center" data-ui-ops-surface="telegram-command-center">
                <div className="telegram-executive-hero">
                  <div className="telegram-executive-copy">
                    <span className="telegram-executive-kicker"><i className="fa-brands fa-telegram" /> مرکز پیام‌رسانی تلگرام</span>
                    <h2>مرکز یکپارچه اتصال، ارسال و پایش تلگرام</h2>
                    <p>تنظیمات ربات، مقصدها، قوانین ارسال، قالب‌ها و گزارش‌های واقعی در یک جریان کنترل‌شده مدیریت می‌شوند.</p>
                  </div>

                  <div className="telegram-executive-pulse" aria-label="خلاصه وضعیت تلگرام">
                    <div className="telegram-executive-pulse__score">
                      <span>آمادگی سیستم</span>
                      <strong>{telegramConfigReadiness.toLocaleString('fa-IR')}٪</strong>
                      <i
                        className="telegram-executive-pulse__track"
                        style={{ '--telegram-readiness-width': `${Math.min(100, Math.max(0, Number(telegramConfigReadiness) || 0))}%` } as React.CSSProperties}
                      >
                        <span />
                      </i>
                    </div>
                    <div className="telegram-executive-pulse__meta">
                      <span><i className={telegramTokenValue ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-exclamation'} /> {tgHealth?.ok ? 'اتصال تأیید شده' : telegramTokenValue ? 'توکن ثبت شده' : 'توکن لازم است'}</span>
                      <span><i className="fa-solid fa-route" /> {telegramDestinationCount ? `${telegramDestinationCount.toLocaleString('fa-IR')} مقصد` : 'بدون مقصد اختصاصی'}</span>
                      <span><i className="fa-solid fa-shield-halved" /> {telegramConnectionMode}</span>
                    </div>
                  </div>

                </div>

                <div className="telegram-executive-grid">
                  <article className="telegram-executive-card ops-status-card">
                    <div className="telegram-card-head"><span><i className="fa-solid fa-robot" /></span><div><strong>ربات</strong><small>{telegramTokenValue ? `@${telegramUsernameValue || 'بدون نام کاربری'}` : 'توکن ثبت نشده'}</small></div></div>
                    <span className={tgHealth?.ok ? 'telegram-state is-ok' : telegramTokenValue ? 'telegram-state is-info' : 'telegram-state is-risk'}>{tgHealth?.ok ? 'سالم' : telegramTokenValue ? 'نیازمند بررسی' : 'نیازمند توکن'}</span>
                  </article>
                  <article className="telegram-executive-card ops-status-card">
                    <div className="telegram-card-head"><span><i className="fa-solid fa-route" /></span><div><strong>مقصدها</strong><small>{telegramAudienceDestinationCount.toLocaleString('fa-IR')} مسیر ارسال</small></div></div>
                    <span className={telegramAudienceDestinationCount ? 'telegram-state is-ok' : 'telegram-state is-idle'}>{telegramAudienceDestinationCount ? 'ثبت شده' : 'بدون مقصد'}</span>
                  </article>
                  <article className="telegram-executive-card ops-status-card">
                    <div className="telegram-card-head"><span><i className="fa-solid fa-user-shield" /></span><div><strong>اتصال مشتری</strong><small>{String(telegramInfo.telegram_link_otp_enabled ?? '1') !== '0' ? 'احراز با پیامک' : 'اتصال مستقیم'}</small></div></div>
                    <span className="telegram-state is-info">{String(telegramInfo.telegram_link_otp_enabled ?? '1') !== '0' ? 'کد پیامکی' : 'مستقیم'}</span>
                  </article>
                </div>

                <section className="mt-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70" aria-labelledby="telegram-connectivity-v151-heading">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 id="telegram-connectivity-v151-heading" className="text-sm font-black text-slate-950 dark:text-white">راهبرد اتصال تلگرام و Mini App</h3>
                      <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">مسیر خروجی Telegram و مسیر دسترسی عمومی Mini App مستقل‌اند. ابر کوروش فقط یکی از گزینه‌های رله است و برای کار Local اجباری نیست.</p>
                    </div>
                    <span className="inline-flex items-center gap-2 text-xs font-black text-slate-600 dark:text-slate-300"><i className="fa-solid fa-route" /> Local-First</span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2" data-ui-settings-grid="form">
                    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                      <label className="block text-sm font-black text-slate-900 dark:text-white" htmlFor="telegram_transport_mode"><i className="fa-solid fa-paper-plane ml-2" />روش اتصال تلگرام</label>
                      <SelectField id="telegram_transport_mode" name="telegram_transport_mode" value={telegramTransportMode} onChange={handleBusinessInfoChange} wrapperClassName="mt-3 mb-0">
                        <option value="disabled">غیرفعال</option>
                        <option value="direct">مستقیم</option>
                        <option value="proxy">پراکسی</option>
                        <option value="relay">رله</option>
                      </SelectField>
                      <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">
                        {telegramTransportMode === 'disabled' ? 'هیچ runtime شبکه Telegram اجرا نمی‌شود.' : telegramTransportMode === 'direct' ? 'فقط اتصال مستقیم سیستم به Telegram؛ پراکسی برنامه در این حالت استفاده نمی‌شود.' : telegramTransportMode === 'proxy' ? 'تمام درخواست‌های Telegram فقط از پراکسی تنظیم‌شده عبور می‌کنند و fallback مستقیم ندارند.' : 'Telegram از Connector امن و سرویس رله انتخاب‌شده عبور می‌کند؛ fallback مستقیم انجام نمی‌شود.'}
                      </p>
                      {telegramTransportMode === 'proxy' && <div className="mt-2 text-xs font-black text-amber-700 dark:text-amber-300">Proxy: {telegramHasProxy ? 'تنظیم شده' : 'آدرس پراکسی لازم است'}</div>}
                      {telegramTransportMode === 'relay' && <div className={`mt-2 text-xs font-black ${cloudTelegramReady ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>Relay: {cloudStateLabel}{cloudTelegramReady ? ' · Telegram سالم' : ''}</div>}
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                      <label className="block text-sm font-black text-slate-900 dark:text-white" htmlFor="miniapp_public_access_mode"><i className="fa-solid fa-window-maximize ml-2" />دسترسی عمومی Mini App</label>
                      <SelectField id="miniapp_public_access_mode" name="miniapp_public_access_mode" value={telegramPublicAccessMode} onChange={handleBusinessInfoChange} wrapperClassName="mt-3 mb-0">
                        <option value="disabled">غیرفعال</option>
                        <option value="self_hosted">میزبانی شخصی</option>
                        <option value="external_tunnel">تانل موقت / عیب‌یابی</option>
                        <option value="stable_tunnel">تانل پایدار</option>
                        <option value="relay">رله</option>
                      </SelectField>
                      <div className={`mt-2 text-xs font-black ${telegramMiniAppState.tone}`}>{telegramMiniAppState.label}</div>
                      <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">حالت پایدار از URL ثابت استفاده می‌کند؛ تانل موقت فقط برای عیب‌یابی و بررسی اتصال باقی می‌ماند.</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <label className="block text-sm font-black text-slate-900 dark:text-white" htmlFor="relay_provider"><i className="fa-solid fa-cloud-arrow-up ml-2" />سرویس رله</label>
                        <SelectField id="relay_provider" name="relay_provider" value={relayProvider} onChange={handleBusinessInfoChange} wrapperClassName="mt-3 mb-0">
                          <option value="managed_kourosh">ابر کوروش</option>
                          <option value="custom">رله شخصی / Self-Hosted</option>
                        </SelectField>
                        <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">Provider فقط زمانی استفاده می‌شود که Telegram یا Mini App روی حالت «رله» باشد. انتخاب Provider به‌تنهایی هیچ‌کدام را فعال نمی‌کند.</p>
                      </div>
                      <span className={`text-xs font-black ${cloudConnected ? 'text-emerald-700 dark:text-emerald-300' : cloudProvisioned ? 'text-amber-700 dark:text-amber-300' : 'text-slate-600 dark:text-slate-300'}`}>{!cloudProvisioned ? 'Provision نشده' : cloudConnected ? 'متصل' : cloudConnectionState === 'connecting' || cloudConnectionState === 'authenticating' ? 'در حال اتصال' : 'آفلاین / اختلال'}</span>
                    </div>

                    {relayProvider === 'custom' && (
                      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2" data-ui-settings-grid="form">
                        <div>
                          <label className={labelClass} htmlFor="custom_relay_control_url">Control Plane HTTPS URL</label>
                          <TextField type="url" id="custom_relay_control_url" name="custom_relay_control_url" value={String(telegramInfo.custom_relay_control_url || '')} onChange={handleBusinessInfoChange} className={`${inputClass} ux-ltr-token`} dir="ltr" placeholder="https://control.example.com/" inputMode="url" />
                        </div>
                        <div>
                          <label className={labelClass} htmlFor="custom_relay_connector_url">Connector WSS URL</label>
                          <TextField type="url" id="custom_relay_connector_url" name="custom_relay_connector_url" value={String(telegramInfo.custom_relay_connector_url || '')} onChange={handleBusinessInfoChange} className={`${inputClass} ux-ltr-token`} dir="ltr" placeholder="wss://connector.example.com/connector" inputMode="url" />
                        </div>
                        <p className="text-xs leading-6 text-slate-500 dark:text-slate-400 lg:col-span-2">رله شخصی از همان پروتکل امن، Ed25519، Enrollment و Tenant Isolation استفاده می‌کند و هیچ Kourosh Cloud account یا Kourosh-owned hostname لازم ندارد.</p>
                      </div>
                    )}

                    {!cloudProvisioned && ((relayProvider === 'managed_kourosh' && cloudEnrollmentAvailable === true) || (relayProvider === 'custom' && Boolean(String(telegramInfo.custom_relay_control_url || '').trim()) && Boolean(String(telegramInfo.custom_relay_connector_url || '').trim()))) && (
                      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end">
                        <div className="min-w-0 flex-1">
                          <label className={labelClass} htmlFor="kourosh_cloud_enrollment_code">کد فعال‌سازی رله</label>
                          <TextField type="password" id="kourosh_cloud_enrollment_code" value={cloudEnrollmentCode} onChange={(event) => setCloudEnrollmentCode(event.target.value)} className={`${inputClass} ux-ltr-token`} dir="ltr" autoComplete="off" placeholder="کد یک‌بارمصرف" />
                        </div>
                        <Button type="button" onClick={() => runCloudCredentialAction('enroll')} disabled={cloudActionBusy || !cloudEnrollmentCode.trim()} loading={cloudActionBusy}>فعال‌سازی رله</Button>
                      </div>
                    )}
                    {!cloudProvisioned && relayProvider === 'managed_kourosh' && cloudEnrollmentAvailable === false && <p className="mt-3 text-xs leading-6 text-slate-500 dark:text-slate-400">Control Plane ابر کوروش در Runtime این distribution تنظیم نشده است؛ Local Kourosh بدون آن کاملاً قابل استفاده است.</p>}
                    {cloudProvisioned && (
                      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end">
                        <div className="min-w-0 flex-1">
                          <label className={labelClass} htmlFor="kourosh_cloud_recovery_code">کد بازیابی / چرخش کلید Connector</label>
                          <TextField type="password" id="kourosh_cloud_recovery_code" value={cloudRecoveryCode} onChange={(event) => setCloudRecoveryCode(event.target.value)} className={`${inputClass} ux-ltr-token`} dir="ltr" autoComplete="off" placeholder="کد بازیابی یک‌بارمصرف" />
                        </div>
                        <Button type="button" variant="secondary" onClick={() => runCloudCredentialAction('rotate')} disabled={cloudActionBusy || !cloudRecoveryCode.trim()} loading={cloudActionBusy}>چرخش کلید اتصال</Button>
                      </div>
                    )}
                    {cloudProvisioned && String(telegramInfo.kourosh_cloud_assigned_public_url || '').trim() && <p className="mt-3 text-xs leading-6 text-slate-500 dark:text-slate-400" dir="ltr">{String(telegramInfo.kourosh_cloud_assigned_public_url || '')}</p>}
                  </div>

                  {(telegramPublicAccessMode === 'self_hosted' || telegramPublicAccessMode === 'external_tunnel' || telegramPublicAccessMode === 'stable_tunnel') && (
                    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.45fr)]" data-ui-settings-grid="form">
                      <div>
                        <label className={labelClass} htmlFor="telegram_miniapp_public_url"><i className="fa-solid fa-globe ml-2" />{telegramPublicAccessMode === 'stable_tunnel' ? 'نشانی Canonical ثابت Mini App' : telegramPublicAccessMode === 'external_tunnel' ? 'Public HTTPS URL تانل موقت' : 'Public HTTPS URL میزبانی شخصی'}</label>
                        <TextField type="url" id="telegram_miniapp_public_url" name="telegram_miniapp_public_url" value={telegramMiniAppUrl} onChange={handleBusinessInfoChange} className={`${inputClass} ux-ltr-token`} dir="ltr" placeholder="https://miniapp.example.com/miniapp.html" inputMode="url" />
                        <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">فقط URL صریح همین strategy استفاده می‌شود؛ هیچ fallback به Local URL، app_base_url یا Relay URL وجود ندارد.</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 p-4 text-xs leading-6 text-slate-600 dark:border-slate-800 dark:text-slate-300">
                        <div className="font-black text-slate-900 dark:text-white">وضعیت Mini App عمومی</div>
                        <div className="mt-2">Mini App عمومی: {['PUBLIC_URL_READY', 'MENU_SYNC_PENDING', 'MENU_SYNCED'].includes(String(miniAppPublicSyncStatus?.phase || '')) ? '● متصل' : telegramMiniAppUrl ? 'در حال بررسی' : 'URL لازم است'}</div>
                        <div>Gateway: {miniAppPublicSyncStatus?.gateway === 'ready' ? '● آماده' : telegramMiniAppUrl ? 'در حال بررسی' : 'نامشخص'}</div>
                        <div>Tunnel: {miniAppPublicSyncStatus?.tunnel === 'ready' ? '● متصل' : miniAppPublicSyncStatus?.tunnel === 'starting' ? 'در حال اتصال' : 'نامشخص'}</div>
                        <div>Telegram Menu: {miniAppPublicSyncStatus?.telegramMenu === 'synced' ? '● همگام' : miniAppPublicSyncStatus?.telegramMenu === 'pending' ? '● در انتظار اتصال تلگرام' : miniAppPublicSyncStatus?.telegramMenu === 'error' ? 'نیازمند تلاش مجدد' : 'نامشخص'}</div>
                        {miniAppPublicSyncStatus?.message ? <div className="mt-2 text-slate-500 dark:text-slate-400">{miniAppPublicSyncStatus.message}</div> : null}
                      </div>
                    </div>
                  )}

                  {telegramPublicAccessMode === 'stable_tunnel' && (
                    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2" data-ui-settings-grid="form">
                      <div>
                        <label className={labelClass} htmlFor="miniapp_live_origin_url"><i className="fa-solid fa-link ml-2" />نشانی HTTPS مبدأ زنده فروشگاه</label>
                        <TextField type="url" id="miniapp_live_origin_url" name="miniapp_live_origin_url" value={String(telegramInfo.miniapp_live_origin_url || '')} onChange={handleBusinessInfoChange} className={`${inputClass} ux-ltr-token`} dir="ltr" placeholder="https://live-store.example.com/" inputMode="url" />
                        <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">این آدرس فقط مسیر زنده فروشگاه است و با نشانی عمومی مینی‌اپ یکی نیست.</p>
                      </div>
                      {settingsViewMode === 'advanced' && (
                        <div>
                          <label className={labelClass} htmlFor="miniapp_stable_tunnel_provider">Provider دسترسی ثابت</label>
                          <SelectField id="miniapp_stable_tunnel_provider" name="miniapp_stable_tunnel_provider" value={String(telegramInfo.miniapp_stable_tunnel_provider || 'cloudflare_named')} onChange={handleBusinessInfoChange}>
                            <option value="cloudflare_named">Cloudflare Named Tunnel</option>
                            <option value="external">External Stable Tunnel</option>
                          </SelectField>
                          <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">جزئیات Credential فقط در Runtime محلی نگه‌داری می‌شود و داخل مرورگر یا Settings ذخیره نمی‌شود.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {telegramPublicAccessMode === 'stable_tunnel' && (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
                      <div className="font-black text-slate-800 dark:text-slate-100">Main Mini App / BotFather</div>
                      <div className="mt-1">{hasMainMiniApp ? '● Main Mini App در Telegram فعال است.' : '● Main Mini App هنوز در BotFather فعال تشخیص داده نشده است.'}</div>
                      <div>URL قابل ثبت یک‌باره: <span className="ux-ltr-token font-bold" dir="ltr">{telegramMiniAppUrl || '—'}</span></div>
                      <div>Menu Button کوروش روی همین URL ثابت همگام می‌شود؛ Restart ویندوز، کوروش یا Named Tunnel نباید این URL را تغییر دهد.</div>
                      <div className="mt-1 text-slate-500 dark:text-slate-400">تنظیم Main Mini App در BotFather یک عملیات دستی یک‌باره است؛ کوروش آن را هنگام هر Restart بازنویسی نمی‌کند.</div>
                    </div>
                  )}

                  {telegramPublicAccessMode === 'disabled' && <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">Mini App عمداً خاموش است؛ Public Hostname یا Relay لازم نیست و Telegram strategy مستقل باقی می‌ماند.</div>}
                  {telegramPublicAccessMode === 'relay' && <div className={`mt-4 rounded-2xl border p-3 text-xs font-black ${cloudMiniAppReady ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300'}`}>{cloudMiniAppReady ? `Mini App Relay آماده است · ${String(telegramInfo.kourosh_cloud_assigned_public_url || '')}` : `Mini App Relay هنوز operational نیست · ${cloudStateLabel}`}</div>}
                </section>

                {/* تنظیمات پایه ربات در راهنمای اتصال پایین صفحه باقی مانده است. */}

                {settingsViewMode !== 'advanced' ? (
                <div className="telegram-chatid-guide">
                  <div className="telegram-chatid-guide__head">
                    <div>
                      <strong>راهنمای دریافت Chat ID مدیر</strong>
                      <p>Start ربات، دریافت خودکار Chat ID، انتخاب گفت‌وگوی مدیر.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {telegramRecentChatsViewModel.hasBotUsername ? (
                        <a
                          href={telegramRecentChatsViewModel.botUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-9 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                        >
                          <i className="fa-brands fa-telegram" />
                          باز کردن ربات
                        </a>
                      ) : null}
                      <Button type="button" onClick={fetchTelegramRecentChats} disabled={tgChatLookupLoading || !telegramRecentChatsViewModel.canFetchRecentChats} loading={tgChatLookupLoading} loadingText="در حال خواندن…" variant="primary" size="sm">
                        <span className="inline-flex items-center gap-2">
                          <i className="fa-solid fa-download" aria-hidden="true" />
                          <span>ذخیره و دریافت Chat ID</span>
                        </span>
                      </Button>
                    </div>
                  </div>
                  <ol className="telegram-chatid-guide__steps">
                    <li><span>۱</span>توکن و نام کاربری را ثبت کن.</li>
                    <li><span>۲</span>ربات را Start کن.</li>
                    <li><span>۳</span>دریافت را بزن و چت مدیر را انتخاب کن.</li>
                  </ol>
                  {telegramRecentChatsViewModel.hasLookupHint ? <div className="telegram-chatid-guide__hint">{telegramRecentChatsViewModel.lookupHint}</div> : null}
                  {telegramRecentChatsViewModel.hasRecentChats ? (
                    <div className="telegram-chatid-results">
                      {telegramRecentChatsViewModel.chats.map((chat) => (
                        <button
                          key={chat.key}
                          type="button"
                          onClick={() => setBusinessInfo((prev) => ({ ...(prev as TelegramBusinessInfo), telegram_chat_id: chat.chatId }))}
                          className={chat.isActive ? 'is-active' : ''}
                          data-skip-global-button="true"
                        >
                          <span className="telegram-chatid-results__title">{chat.title}</span>
                          <span className="telegram-chatid-results__meta" dir="ltr">{chat.meta}</span>
                          <small>{chat.sourceLabel}</small>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                ) : null}

                </section>
                {settingsViewMode === 'advanced' ? (
                  <>
                    <div className="telegram-access-group-v41" data-telegram-access-group="true">
                      <div className="telegram-access-group-v41__header">
                        <IconGlyph size="md" tone="accent"><i className="fa-solid fa-link" /></IconGlyph>
                        <div>
                          <strong>شناسه مدیر و اتصال مشتری</strong>
                          <p>دریافت Chat ID مدیر و انتخاب روش اتصال مشتری در همین بخش مدیریت می‌شود.</p>
                        </div>
                      </div>
                      <div className="telegram-access-group-v41__body">
                <div className="telegram-chatid-guide telegram-chatid-guide--v41">
                  <div className="telegram-chatid-guide__head">
                    <div>
                      <strong>راهنمای دریافت Chat ID مدیر</strong>
                      <p>Start ربات، دریافت خودکار Chat ID، انتخاب گفت‌وگوی مدیر.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {telegramRecentChatsViewModel.hasBotUsername ? (
                        <a
                          href={telegramRecentChatsViewModel.botUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-9 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                        >
                          <i className="fa-brands fa-telegram" />
                          باز کردن ربات
                        </a>
                      ) : null}
                      <Button type="button" onClick={fetchTelegramRecentChats} disabled={tgChatLookupLoading || !telegramRecentChatsViewModel.canFetchRecentChats} loading={tgChatLookupLoading} loadingText="در حال خواندن…" variant="primary" size="sm">
                        <span className="inline-flex items-center gap-2">
                          <i className="fa-solid fa-download" aria-hidden="true" />
                          <span>ذخیره و دریافت Chat ID</span>
                        </span>
                      </Button>
                    </div>
                  </div>
                  <ol className="telegram-chatid-guide__steps">
                    <li><span>۱</span>توکن و نام کاربری را ثبت کن.</li>
                    <li><span>۲</span>ربات را Start کن.</li>
                    <li><span>۳</span>دریافت را بزن و چت مدیر را انتخاب کن.</li>
                  </ol>
                  {telegramRecentChatsViewModel.hasLookupHint ? <div className="telegram-chatid-guide__hint">{telegramRecentChatsViewModel.lookupHint}</div> : null}
                  {telegramRecentChatsViewModel.hasRecentChats ? (
                    <div className="telegram-chatid-results">
                      {telegramRecentChatsViewModel.chats.map((chat) => (
                        <button
                          key={chat.key}
                          type="button"
                          onClick={() => setBusinessInfo((prev) => ({ ...(prev as TelegramBusinessInfo), telegram_chat_id: chat.chatId }))}
                          className={chat.isActive ? 'is-active' : ''}
                          data-skip-global-button="true"
                        >
                          <span className="telegram-chatid-results__title">{chat.title}</span>
                          <span className="telegram-chatid-results__meta" dir="ltr">{chat.meta}</span>
                          <small>{chat.sourceLabel}</small>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>


                    <div className="telegram-executive-connect telegram-executive-connect--v41">
                  <div>
                    <strong>روش اتصال مشتری به ربات</strong>
                    <p>با توجه به شرایط شبکه و پیامک، مدیر می‌تواند بین احراز هویت با کد پیامکی یا اتصال مستقیم پس از اشتراک شماره انتخاب کند.</p>
                  </div>
                  <div className="telegram-connect-toggle" role="radiogroup" aria-label="روش اتصال مشتری">
                    {[
                      { value: '1', label: 'با کد پیامکی', sub: 'امن‌تر، همراه با کد یک‌بارمصرف' },
                      { value: '0', label: 'اتصال مستقیم', sub: 'بدون ارسال پیامک' },
                    ].map((item) => {
                      const active = String(telegramInfo.telegram_link_otp_enabled ?? '1') === item.value;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setBusinessInfo((prev) => ({ ...(prev as TelegramBusinessInfo), telegram_link_otp_enabled: item.value }))}
                          className={active ? 'is-active' : ''}
                          data-skip-global-button="true"
                        >
                          <strong>{item.label}</strong>
                          <small>{item.sub}</small>
                        </button>
                      );
                    })}
                  </div>
                </div>

                      </div>
                    </div>

                <div className="telegram-auto-message-group-v38" data-telegram-auto-message-group="true">
                  <div className="telegram-auto-message-group-v38__header">
                    <IconGlyph size="md" tone="accent"><i className="fa-solid fa-comments" /></IconGlyph>
                    <div>
                      <strong>پیام‌های خودکار تلگرام</strong>
                      <p>لحن پیام‌ها و تولید متن‌های استاندارد در همین بخش مدیریت می‌شود.</p>
                    </div>
                  </div>
                  <div className="telegram-auto-message-group-v38__body">
                <div className="telegram-auto-copy-panel telegram-template-policy-panel telegram-tone-panel">
                  <div>
                    <strong>لحن پیام‌های خودکار</strong>
                    <p>در نمای ساده، کاربر متن‌ها را دستی نمی‌نویسد؛ سیستم بر اساس لحن انتخابی، متن استاندارد رویدادها را تولید می‌کند.</p>
                  </div>
                  <div className="telegram-template-policy-toggle" role="radiogroup" aria-label="لحن پیام تلگرام">
                    {[
                      { value: 'formal', label: 'رسمی', sub: 'مالی و گزارش‌ها' },
                      { value: 'friendly', label: 'دوستانه', sub: 'نرم با مشتری' },
                      { value: 'short', label: 'کوتاه', sub: 'حداقلی و سریع' },
                    ].map((item) => {
                      const active = String(telegramInfo.telegram_template_policy || 'formal') === item.value;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setBusinessInfo((prev) => ({ ...(prev as TelegramBusinessInfo), telegram_template_policy: item.value }))}
                          className={active ? 'is-active' : ''}
                          data-skip-global-button="true"
                        >
                          <strong>{item.label}</strong>
                          <small>{item.sub}</small>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="telegram-auto-copy-panel telegram-system-template-panel">
                  <div>
                    <strong>متن پیام‌ها توسط سیستم تولید می‌شود</strong>
                    <p>برای رویدادهای اقساط، تعمیرات، فاکتور، وضعیت حساب و چک، متن استاندارد آماده است. در حالت ساده نیازی نیست کاربر متن بنویسد.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      leftIcon={<i className="fa-solid fa-wand-magic-sparkles" />}
                      onClick={() => {
                        telegramTemplateDefs.forEach((item) => {
                          (['customer','partner','manager'] as TelegramAudience[]).forEach((aud) => applyTelegramPreset(item.key, aud));
                        });
                        setNotification({ type: 'success', text: `متن‌های تلگرام با لحن ${String(telegramInfo.telegram_template_policy || 'formal') === 'friendly' ? 'دوستانه' : String(telegramInfo.telegram_template_policy || 'formal') === 'short' ? 'کوتاه' : 'رسمی'} آماده شد. برای ثبت نهایی، دکمه ذخیره تغییرات بالای صفحه را بزنید.` });
                      }}
                    >
                      تولید متن‌های استاندارد
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={checkTelegramHealth} disabled={tgIsChecking} loading={tgIsChecking} loadingText="در حال بررسی…" leftIcon={!tgIsChecking ? <i className="fa-solid fa-heart-pulse" /> : undefined}>
                      بررسی اتصال
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={sendTelegramQuickCheck} disabled={tgIsSendingQuick || !telegramChatIdValue} loading={tgIsSendingQuick} loadingText="در حال ارسال…" leftIcon={!tgIsSendingQuick ? <i className="fa-solid fa-paper-plane" /> : undefined}>
                      ارسال بررسی
                    </Button>
                  </div>
                </div>

                  </div>
                </div>

              <div className="telegram-detail-mode space-y-6">
              <div className="premium-form-section space-y-5 overflow-hidden">
                <Surface surface="glass" variant="panel" scheme="adaptive" className="rounded-[28px]" contentClassName="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-bold text-sky-700 shadow-sm dark:border-sky-900/50 dark:bg-slate-900/70 dark:text-sky-200">
                        <i className="fa-solid fa-star" />
                        مرکز عملیات تلگرام
                      </div>
                      <div>
                        <div className="text-xl font-black text-slate-900 dark:text-white">مرکز کنترل تلگرام</div>
                        <p className="mt-1 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                          مدیریت هوشمند اتصال، مقصدهای ارسال و اطمینان از تحویل پیام‌های مهم فروشگاه.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/70 bg-white/80 p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
                        <div className="flex items-center gap-2 font-black text-slate-900 dark:text-white">
                          <i className="fa-solid fa-wand-magic-sparkles text-sky-500" />
                          وضعیت راه‌اندازی
                        </div>
                        <div className="mt-2 leading-7 text-slate-600 dark:text-slate-300">{telegramSetupCoachMessage}</div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {telegramMissingItems[0] ? (
                            <Button type="button" onClick={() => jumpToTelegramSetupField(telegramMissingItems[0].target || 'telegram_bot_token')} size="sm" leftIcon={<i className="fa-solid fa-bolt" />}>
                              برو به {telegramMissingItems[0].title}
                            </Button>
                          ) : (
                            <Button type="button" onClick={sendTelegramQuickCheck} disabled={tgIsSendingQuick} loading={tgIsSendingQuick} loadingText="در حال ارسال…" variant="success" size="sm" leftIcon={!tgIsSendingQuick ? <i className="fa-solid fa-paper-plane" /> : undefined}>
                              ارسال ارسال آزمایشی
                            </Button>
                          )}
                          <Button type="button" onClick={checkTelegramHealth} disabled={tgIsChecking} loading={tgIsChecking} loadingText="در حال بررسی و ادامه…" variant="ghost" size="sm" leftIcon={!tgIsChecking ? <i className="fa-solid fa-heart-pulse" /> : undefined}>
                            بررسی و ادامه اتصال
                          </Button>
                          <Button type="button" onClick={() => jumpToTelegramSetupField('telegram_chat_ids_reports')} variant="ghost" size="sm" leftIcon={<i className="fa-solid fa-route" />}>
                            مقصدهای تفکیکی
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="w-full max-w-sm rounded-3xl border border-white/70 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">امتیاز آمادگی</div>
                          <div className="mt-1 text-3xl font-black text-slate-900 dark:text-white">{telegramSetupPercent}<span className="text-lg">٪</span></div>
                        </div>
                        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${telegramSetupPercent >= 85 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200' : telegramSetupPercent >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200'}`}>
                          <i className={`fa-solid ${telegramSetupPercent >= 85 ? 'fa-circle-check' : telegramSetupPercent >= 50 ? 'fa-hourglass-half' : 'fa-triangle-exclamation'}`} />
                          {telegramReadinessLabel}
                        </span>
                      </div>
                      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <div className={`h-full rounded-full transition-all ${telegramSetupPercent >= 85 ? 'bg-emerald-500' : telegramSetupPercent >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${telegramSetupPercent}%` }} />
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3" data-ui-settings-grid="form">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                          <div className="text-xs text-slate-500">فیلدهای کامل</div>
                          <div className="mt-1 text-lg font-black text-slate-900 dark:text-white">{telegramSetupDone}/{telegramSetupItems.length}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                          <div className="text-xs text-slate-500">مقصدهای ثبت اطلاعات‌شده</div>
                          <div className="mt-1 text-lg font-black text-slate-900 dark:text-white">{telegramAudienceDestinationCount.toLocaleString('fa-IR')}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                          <div className="text-xs text-slate-500">مسیر اتصال</div>
                          <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{telegramConnectionMode}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                          <div className="text-xs text-slate-500">Health</div>
                          <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{tgHealth ? (tgHealth.ok ? 'سالم' : 'نیاز به بررسی و ادامه') : 'هنوز بررسی و ادامه نشده'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Surface>

                <div className="telegram-control-merged-grid grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" data-telegram-merged-control="v22-from-phase16" data-ui-settings-grid="cards">
                  {telegramSetupItems.map((item) => {
                    const smartKeyBySetupKey: Record<string, string> = {
                      token: 'token',
                      username: 'check',
                      chat: 'chat',
                      base: 'route',
                      routing: 'routing',
                      policy: 'otp',
                    };
                    const smartItem = telegramSmartActions.find((action) => action.key === smartKeyBySetupKey[item.key]);
                    const mergedOk = item.done && (smartItem ? smartItem.ok : true);
                    const mergedValue = smartItem?.value || item.hint;
                    const mergedValueText = String(mergedValue || '');
                    const mergedValueDir = /^[\w@#:/.-]+$/.test(mergedValueText.trim()) ? 'ltr' : 'rtl';
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => jumpToTelegramSetupField(item.target || 'telegram_bot_token')}
                        className={`tg-apple-setup-card telegram-control-merged-card group w-full text-right ${mergedOk ? 'is-done' : 'is-pending'}`}
                        data-telegram-control-card={item.key}
                      >
                        <div className="tg-apple-setup-card__inner telegram-control-merged-card__inner">
                          <div className="tg-apple-setup-card__head telegram-control-merged-card__head" dir="rtl">
                            <IconGlyph size="md" tone={mergedOk ? 'success' : 'neutral'} aria-hidden="true">
                              <i className={`fa-solid ${item.icon}`} />
                            </IconGlyph>
                            <span className={`tg-apple-mini-status tg-apple-setup-card__status telegram-control-merged-card__status ${mergedOk ? 'is-done' : 'is-pending'}`}>
                              <i className={`fa-solid ${mergedOk ? 'fa-circle-check' : 'fa-circle-dot'}`} />
                              {mergedOk ? 'آماده' : 'نیاز به تکمیل'}
                            </span>
                          </div>
                          <div className="tg-apple-setup-card__body telegram-control-merged-card__body" dir="rtl">
                            <div className="tg-apple-setup-card__title telegram-control-merged-card__title font-black text-slate-900 dark:text-white">{item.title}</div>
                            <div className="tg-apple-setup-card__hint telegram-control-merged-card__hint mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{item.hint}</div>
                            <div className="telegram-control-merged-card__value" dir="rtl">
                              <span className="telegram-control-merged-card__value-label">وضعیت عملیاتی</span>
                              <span className="telegram-control-merged-card__value-text" dir={mergedValueDir}>{mergedValueText}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              
<div className="telegram-monitor-section-v2 telegram-monitor-apple-surface-v28">
  <div className="telegram-monitor-v2-head">
    <div className="telegram-monitor-v2-titlebox">
      <span className="telegram-monitor-v2-kicker">
        <i className="fa-solid fa-signal" />
        مرکز پایش تلگرام
      </span>
      <h2>وضعیت اتصال و ارسال</h2>
      <p>ربات، Webhook، Polling و دریافت پیام کاربر در این بخش پایش می‌شود؛ کارت‌های عملیاتی با مرکز کنترل بالا ادغام شده‌اند.</p>
    </div>

    <div className="telegram-monitor-v2-score">
      <span>آمادگی</span>
      <strong>{telegramConfigReadiness.toLocaleString('fa-IR')}٪</strong>
      <div className="telegram-monitor-v2-score__track" style={{ '--telegram-monitor-readiness-width': `${Math.min(100, Math.max(0, Number(telegramConfigReadiness) || 0))}%` } as React.CSSProperties}>
                        <i />
                      </div>
      <small>{telegramConfigReadyCount.toLocaleString('fa-IR')} / {telegramConfigChecks.length.toLocaleString('fa-IR')} آماده</small>
    </div>
  </div>

  <div className="telegram-monitor-apple-statusbar telegram-monitor-neutral-panel mt-4 rounded-[24px] border p-4 shadow-sm">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${tgHealth?.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200' : tgHealth ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200' : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300'}`}>
          <i className={`fa-solid ${tgHealth?.ok ? 'fa-circle-check' : tgHealth ? 'fa-triangle-exclamation' : 'fa-wave-square'}`} />
          {tgHealth?.ok ? 'ربات سالم' : tgHealth ? 'نیاز به بررسی' : 'بررسی نشده'}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
          <i className={`fa-solid ${String(telegramInfo.telegram_proxy || '').trim() ? 'fa-shuffle' : 'fa-shield-halved'}`} />
          {telegramConnectionMode}
        </span>
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${telegramDestinationCount ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200' : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300'}`}>
          <i className="fa-solid fa-route" />
          {telegramDestinationCount ? `${telegramDestinationCount.toLocaleString('fa-IR')} مقصد فعال` : 'مقصد تنظیم نشده'}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" onClick={() => jumpToTelegramConfigField('telegram_miniapp_public_url')} variant="secondary" size="xs" className="rounded-full !px-3 !py-1.5" leftIcon={<i className="fa-solid fa-link" />}>
          رفتن به تنظیم Mini App
        </Button>
        <Button type="button" onClick={() => jumpToTelegramConfigField('telegram_chat_ids_reports')} variant="ghost" size="xs" className="rounded-full !px-3 !py-1.5" leftIcon={<i className="fa-solid fa-route" />}>
          مقصدها
        </Button>
        <Button type="button" onClick={() => jumpToTelegramConfigField('sms_otp_meli_body_id')} variant="ghost" size="xs" className="rounded-full !px-3 !py-1.5" leftIcon={<i className="fa-solid fa-mobile-screen-button" />}>
          OTP
        </Button>
      </div>
    </div>
  </div>

  <div className="telegram-monitor-apple-diagnostics telegram-monitor-neutral-panel mt-4 rounded-[24px] border p-4 shadow-sm">
    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black telegram-monitor-neutral-pill">
          <i className="fa-solid fa-screwdriver-wrench" />
          مرکز کنترل دستیار تلگرام
        </div>
        <h3 className="text-base font-black text-slate-900 dark:text-white">Webhook / Polling و منوی واقعی پایین چت</h3>
        <p className="max-w-3xl text-xs leading-6 text-slate-600 dark:text-slate-300">
          برای اطمینان از عملکرد کامل دستیار، مسیر ارسال، دریافت پیام کاربر، منوی تلگرام و حالت لوکال از همین بخش کنترل می‌شود.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="secondary" size="xs" className="rounded-full !px-3 !py-1.5" onClick={runTelegramDiagnostics} disabled={tgDiagnosticsLoading} loading={tgDiagnosticsLoading} loadingText="در حال بررسی…" leftIcon={!tgDiagnosticsLoading ? <i className="fa-solid fa-magnifying-glass-chart" /> : undefined}>
          بررسی سلامت دستیار
        </Button>
        <Button type="button" variant="ghost" size="xs" className="rounded-full !px-3 !py-1.5" onClick={() => runTelegramAdminAction('enable-polling')} disabled={tgDiagnosticsBusyAction !== null} loading={tgDiagnosticsBusyAction === 'enable-polling'} loadingText="فعال‌سازی…" leftIcon={tgDiagnosticsBusyAction !== 'enable-polling' ? <i className="fa-solid fa-tower-broadcast" /> : undefined}>
          فعال‌سازی دریافت لوکال
        </Button>
        <Button type="button" variant="ghost" size="xs" className="rounded-full !px-3 !py-1.5" onClick={() => runTelegramAdminAction('reset-bot-menu')} disabled={tgDiagnosticsBusyAction !== null} loading={tgDiagnosticsBusyAction === 'reset-bot-menu'} loadingText="پاک‌سازی…" leftIcon={tgDiagnosticsBusyAction !== 'reset-bot-menu' ? <i className="fa-solid fa-broom" /> : undefined}>
          پاک‌سازی منوی تلگرام
        </Button>
        <Button type="button" variant="ghost" size="xs" className="rounded-full !px-3 !py-1.5" onClick={() => runTelegramAdminAction('send-guest-menu-test')} disabled={tgDiagnosticsBusyAction !== null} loading={tgDiagnosticsBusyAction === 'send-guest-menu-test'} loadingText="ارسال…" leftIcon={tgDiagnosticsBusyAction !== 'send-guest-menu-test' ? <i className="fa-solid fa-keyboard" /> : undefined}>
          ارسال منوی کنترل
        </Button>
        <Button type="button" variant="secondary" size="xs" className="rounded-full !px-3 !py-1.5" onClick={() => runTelegramAdminAction('send-real-menu')} disabled={tgDiagnosticsBusyAction !== null} loading={tgDiagnosticsBusyAction === 'send-real-menu'} loadingText="ارسال…" leftIcon={tgDiagnosticsBusyAction !== 'send-real-menu' ? <i className="fa-solid fa-paper-plane" /> : undefined}>
          ارسال پنل کاربر
        </Button>
        <Button type="button" variant="secondary" size="xs" className="rounded-full !px-3 !py-1.5" onClick={() => runTelegramAdminAction('send-customer-menu')} disabled={tgDiagnosticsBusyAction !== null} loading={tgDiagnosticsBusyAction === 'send-customer-menu'} loadingText="ارسال…" leftIcon={tgDiagnosticsBusyAction !== 'send-customer-menu' ? <i className="fa-solid fa-user" /> : undefined}>
          منوی مشتری با شماره
        </Button>
        <Button type="button" variant="secondary" size="xs" className="rounded-full !px-3 !py-1.5" onClick={() => runTelegramAdminAction('send-partner-menu')} disabled={tgDiagnosticsBusyAction !== null} loading={tgDiagnosticsBusyAction === 'send-partner-menu'} loadingText="ارسال…" leftIcon={tgDiagnosticsBusyAction !== 'send-partner-menu' ? <i className="fa-solid fa-handshake" /> : undefined}>
          منوی همکار با شماره
        </Button>
      </div>
    </div>

    {telegramDiagnosticsViewModel.hasDiagnostics && (
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-4" data-ui-settings-grid="cards">
        {telegramDiagnosticsViewModel.diagnosticCards.map((card) => (
          <div key={card.key} className="rounded-2xl border border-white/80 bg-white/85 p-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="text-xs font-bold text-slate-500">{card.label}</div>
            <div className={`mt-1 ${card.key === 'webhook-url' ? 'break-all text-xs' : card.key === 'pending-updates' ? 'text-lg' : card.key === 'polling' ? 'text-sm' : 'text-xs'} font-black text-slate-900 dark:text-white`}>{card.value}</div>
          </div>
        ))}
        {telegramDiagnosticsViewModel.webhookErrorMessage && (
          <div className="settings-grid-span-full rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs leading-6 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-200">
            <strong>خطای Webhook: </strong>{telegramDiagnosticsViewModel.webhookErrorMessage}
          </div>
        )}
        <details className="settings-grid-span-full rounded-2xl border border-slate-200 bg-white/85 p-3 text-left text-xs dark:border-slate-800 dark:bg-slate-950/60" dir="ltr">
          <summary className="cursor-pointer font-bold text-slate-700 dark:text-slate-200">Raw diagnostics JSON</summary>
          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-5 text-slate-600 dark:text-slate-300">{telegramDiagnosticsViewModel.rawJson}</pre>
        </details>
      </div>
    )}
  </div>

  <div className="telegram-monitor-merged-summary mt-4" data-telegram-monitor-merged="true">
    <i className="fa-solid fa-layer-group" aria-hidden="true" />
    <div>
      <strong>کارت‌های وضعیت با مرکز کنترل تلگرام ادغام شدند.</strong>
      <span> این بخش فقط پایش فنی Webhook، Polling و دیاگنوستیک را نگه می‌دارد تا دو ردیف کارت مشابه تکرار نشود.</span>
    </div>
  </div>
</div><div className="telegram-connection-bundle-v73 telegram-connection-bundle-v77" data-telegram-connection-bundle="v73">
                <div id="tg-anchor-bot-core" className="telegram-guide-card telegram-guide-card-v64 telegram-connection-bundle-v73__guide">
                  <div className="telegram-guide-card__inner telegram-guide-card-v64__inner settings-tab-row flex w-full items-start justify-start gap-3 text-right">
                    <IconGlyph size="lg" tone="info" className="mt-0.5">
                      <i className="fa-solid fa-circle-info" />
                    </IconGlyph>
                    <div className="telegram-guide-card__content space-y-2 leading-7">
                      <div className="telegram-guide-card__title font-black text-slate-900 dark:text-slate-50">راهنمای اتصال تلگرام</div>
                      <p className="telegram-guide-card__text">
                        در حالت «مستقیم»، کوروش فقط از اتصال مستقیم سیستم به Telegram استفاده می‌کند و پراکسی ثبت‌شده در برنامه را نادیده می‌گیرد.
                      </p>
                      <p className="telegram-guide-card__text">
                        فیلد <strong>پراکسی تلگرام</strong> فقط در حالت «پراکسی» استفاده می‌شود؛ درخواست‌ها فقط از همین مسیر عبور می‌کنند و در صورت خرابی، fallback خودکار به اتصال مستقیم انجام نمی‌شود. فرمت‌های <span dir="ltr">SOCKS5</span>، <span dir="ltr">HTTP</span> و <span dir="ltr">HTTPS</span> پشتیبانی می‌شوند.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="telegram-detail-core-grid telegram-connection-bundle-v73__core grid grid-cols-1 gap-4 md:grid-cols-2 items-stretch" data-ui-settings-grid="form">
                  <ModalField label={renderTelegramFieldLabel('توکن ربات تلگرام', telegramFieldInsights.token, 'fa-key')} iconClass="fa-solid fa-key" hint={<span className="flex flex-wrap items-center gap-2"><span>{telegramFieldInsights.token.message}</span>{!telegramFieldInsights.token.ok ? <Button type="button" onClick={() => jumpToTelegramSetupField(telegramFieldInsights.token.target || 'telegram_bot_token')} variant="warning" size="xs" className="rounded-full !px-2.5 !py-1 !text-[10px]" leftIcon={<i className="fa-solid fa-wand-magic-sparkles" />}>{telegramFieldInsights.token.cta}</Button> : null}<span className="basis-full h-0" aria-hidden="true" /><Button type="button" variant="ghost" size="xs" className="rounded-lg" onClick={() => setShowTelegramToken((s) => !s)} leftIcon={<i className={`fa-solid ${showTelegramToken ? 'fa-eye-slash' : 'fa-eye'}`} />}>{showTelegramToken ? 'پنهان کن' : 'نمایش توکن'}</Button><span>برای امنیت، توکن به صورت پیش‌فرض مخفی است.</span></span>}>
                    <TextField type={showTelegramToken ? 'text' : 'password'} id="telegram_bot_token" name="telegram_bot_token" value={businessInfo.telegram_bot_token || ''} onChange={handleBusinessInfoChange} className={`${inputClass} ux-ltr-token`} dir="ltr" placeholder="123456:ABC-DEF..." />
                  </ModalField>

                  <ModalField label={renderTelegramFieldLabel('نام کاربری ربات', telegramFieldInsights.username, 'fa-at')} iconClass="fa-brands fa-telegram" hint={<span className="flex flex-wrap items-center gap-2"><span>{telegramFieldInsights.username.message} بدون @ وارد شود؛ مثلاً <span dir="ltr">my_store_bot</span>.</span>{telegramTokenValue && !telegramUsernameValue ? <Button type="button" onClick={() => jumpToTelegramSetupField('telegram_bot_username')} variant="warning" size="xs" className="rounded-full !px-2.5 !py-1 !text-[10px]" leftIcon={<i className="fa-solid fa-at" />}>{telegramFieldInsights.username.cta}</Button> : null}</span>}>
                    <TextField type="text" id="telegram_bot_username" name="telegram_bot_username" value={telegramInfo.telegram_bot_username || ''} onChange={handleBusinessInfoChange} className={`${inputClass} ux-ltr-token`} dir="ltr" placeholder="my_store_bot" />
                  </ModalField>

                  <ModalField className="telegram-field--wide telegram-chat-id-field-v77" label={renderTelegramFieldLabel('شناسه چت (chat_id)', telegramFieldInsights.chatId, 'fa-comments')} iconClass="fa-solid fa-comments" hint={<span className="flex flex-wrap items-center gap-2"><span>{telegramFieldInsights.chatId.message}</span>{!telegramFieldInsights.chatId.ok ? <Button type="button" onClick={() => jumpToTelegramSetupField('telegram_chat_id')} variant="warning" size="xs" className="rounded-full !px-2.5 !py-1 !text-[10px]" leftIcon={<i className="fa-solid fa-paper-plane" />}>{telegramFieldInsights.chatId.cta}</Button> : null}</span>}>
                    <TextField type="text" id="telegram_chat_id" name="telegram_chat_id" value={businessInfo.telegram_chat_id || ''} onChange={handleBusinessInfoChange} className={`${inputClass} ux-ltr-token`} dir="ltr" placeholder="-1001234567890 یا 12345678" />
                  </ModalField>

                </div>

                {telegramTransportMode === 'proxy' && <div id="tg-anchor-proxy" className="telegram-connection-bundle-v73__proxy space-y-3">
                  <ModalField className="telegram-proxy-field-v77" label={renderTelegramFieldLabel('پراکسی تلگرام — فقط حالت پراکسی', telegramFieldInsights.proxy, 'fa-shield-halved')} iconClass="fa-solid fa-shield-halved" hint={<span className="flex flex-wrap items-center gap-2"><span>{telegramFieldInsights.proxy.message}</span>{telegramProxyValue && !tgHealth?.ok ? <Button type="button" onClick={checkTelegramHealth} variant="warning" size="xs" className="rounded-full !px-2.5 !py-1 !text-[10px]" leftIcon={<i className="fa-solid fa-heart-pulse" />}>بررسی اتصال</Button> : null}</span>}>
                    <TextField
                      type="text"
                      id="telegram_proxy"
                      name="telegram_proxy"
                      value={telegramInfo.telegram_proxy || ''}
                      onChange={handleBusinessInfoChange}
                      className={inputClass}
                      dir="ltr"
                      placeholder="socks5://127.0.0.1:10808 یا http://127.0.0.1:10809"
                    />
                    <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400" dir="ltr">scheme://[username:password@]host:port</p>
                  </ModalField>
                </div>}
                </div>

                <div id="tg-anchor-rules"><FormSection title="قوانین ارسال" description="محدودیت‌ها و بازه‌های سکوت را برای ارسال تلگرام مشخص کن." iconClass="fa-solid fa-sliders" className="space-y-3">
                  <div className={`rounded-2xl border px-4 py-3 text-xs leading-6 ${getTelegramMiniStatusClasses(telegramFieldInsights.rules.tone)}`}>
                    <div className="flex flex-wrap items-center gap-2 font-black">
                      <i className={`fa-solid ${telegramFieldInsights.rules.ok ? 'fa-circle-check' : 'fa-bolt'}`} />
                      {telegramFieldInsights.rules.chip}
                    </div>
                    <div className="mt-1">{telegramFieldInsights.rules.message}</div>
                  </div>
                  <div className="telegram-send-rules-grid-v49 grid grid-cols-1 md:grid-cols-3 gap-4" data-ui-settings-grid="form">
                    <ModalField className="telegram-send-rule-field-v49" label={renderTelegramPlainFieldLabel('شروع سکوت ارسال (ساعت)', 'fa-moon')} iconClass="fa-solid fa-moon" hint="از این ساعت به بعد، پیام‌های تلگرام ارسال نمی‌شوند و تا پایان بازه نگه داشته می‌شوند. مثال: ۲۱ یعنی از ساعت ۲۱:۰۰.">
                      <TextField type="number" min={0} max={23} id="telegram_quiet_start_hour" name="telegram_quiet_start_hour" value={telegramInfo.telegram_quiet_start_hour ?? ''} onChange={handleBusinessInfoChange} className={`${inputClass} ux-ltr-token`} dir="ltr" placeholder="21" />
                    </ModalField>
                    <ModalField className="telegram-send-rule-field-v49" label={renderTelegramPlainFieldLabel('پایان سکوت ارسال (ساعت)', 'fa-sun')} iconClass="fa-solid fa-sun" hint="از این ساعت به بعد ارسال دوباره مجاز می‌شود. مثال: ۱۰ یعنی از ساعت ۱۰:۰۰ صبح پیام‌ها می‌توانند ارسال شوند.">
                      <TextField type="number" min={0} max={23} id="telegram_quiet_end_hour" name="telegram_quiet_end_hour" value={telegramInfo.telegram_quiet_end_hour ?? ''} onChange={handleBusinessInfoChange} className={`${inputClass} ux-ltr-token`} dir="ltr" placeholder="10" />
                    </ModalField>
                    <ModalField className="telegram-send-rule-field-v49" label={renderTelegramPlainFieldLabel('حداکثر پیام در روز (هر مشتری)', 'fa-gauge-high')} iconClass="fa-solid fa-gauge-high" hint="۰ یعنی بدون محدودیت روزانه؛ برای جلوگیری از ارسال تکراری، پیشنهاد: ۱ پیام برای هر مشتری.">
                      <TextField type="number" min={0} step={1} id="telegram_max_per_day_per_customer" name="telegram_max_per_day_per_customer" value={telegramInfo.telegram_max_per_day_per_customer ?? 1} onChange={handleBusinessInfoChange} className={`${inputClass} ux-ltr-token`} dir="ltr" />
                    </ModalField>
                  </div>
                  <div className="telegram-send-rules-note-v80">
                    <i className="fa-solid fa-circle-info" />
                    <span>بازه سکوت فقط با دو فیلد «شروع سکوت ارسال» و «پایان سکوت ارسال» تنظیم می‌شود؛ پیام‌های داخل این بازه متوقف و بعد از پایان سکوت ارسال می‌شوند.</span>
                  </div>
                </FormSection></div>

                <div id="tg-anchor-destinations"><FormSection title="مقصدهای تفکیکی تلگرام" description="برای هر بخش می‌توانی چند chat_id وارد کنی. اگر خالی باشد از شناسه چت اصلی استفاده می‌شود." iconClass="fa-solid fa-route" className="space-y-3">
                  <div className="telegram-detail-core-grid grid grid-cols-1 gap-4 md:grid-cols-2 items-stretch" data-ui-settings-grid="form">
                    <ModalField label={<span className="flex flex-wrap items-center gap-2"><span>گزارشات</span><span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black ${getTelegramMiniStatusClasses(String(businessInfo.telegram_chat_ids_reports || '').trim() ? 'emerald' : 'slate')}`}><i className={`fa-solid ${String(businessInfo.telegram_chat_ids_reports || '').trim() ? 'fa-circle-check' : 'fa-circle-info'}`} />{String(businessInfo.telegram_chat_ids_reports || '').trim() ? 'تنظیم شده' : 'Fallback به چت اصلی'}</span></span>} iconClass="fa-solid fa-chart-column" hint="اگر خالی باشد گزارشات به chat_id اصلی می‌روند.">
                      <TextareaField controlOnly id="telegram_chat_ids_reports" name="telegram_chat_ids_reports" value={businessInfo.telegram_chat_ids_reports || ''} onChange={handleBusinessInfoChange} className={`${inputClass} ux-ltr-token`} dir="ltr" rows={3} placeholder={"-1001234567890\n672412513"} />
                    </ModalField>
                    <ModalField label={<span className="flex flex-wrap items-center gap-2"><span>اقساط</span><span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black ${getTelegramMiniStatusClasses(String(businessInfo.telegram_chat_ids_installments || '').trim() ? 'emerald' : 'slate')}`}><i className={`fa-solid ${String(businessInfo.telegram_chat_ids_installments || '').trim() ? 'fa-circle-check' : 'fa-circle-info'}`} />{String(businessInfo.telegram_chat_ids_installments || '').trim() ? 'مسیر اختصاصی دارد' : 'Fallback به چت اصلی'}</span></span>} iconClass="fa-solid fa-receipt" hint="برای مسیر اقساط و یادآوری‌ها بهتر است chat_id جدا داشته باشی.">
                      <TextareaField controlOnly id="telegram_chat_ids_installments" name="telegram_chat_ids_installments" value={businessInfo.telegram_chat_ids_installments || ''} onChange={handleBusinessInfoChange} className={`${inputClass} ux-ltr-token`} dir="ltr" rows={3} placeholder={"-1001234567890\n672412513"} />
                    </ModalField>
                    <ModalField label={<span className="flex flex-wrap items-center gap-2"><span>فروش</span><span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black ${getTelegramMiniStatusClasses(String(businessInfo.telegram_chat_ids_sales || '').trim() ? 'emerald' : 'slate')}`}><i className={`fa-solid ${String(businessInfo.telegram_chat_ids_sales || '').trim() ? 'fa-circle-check' : 'fa-circle-info'}`} />{String(businessInfo.telegram_chat_ids_sales || '').trim() ? 'مسیر فروش آماده' : 'Fallback به چت اصلی'}</span></span>} iconClass="fa-solid fa-cart-shopping" hint="اگر تیم فروش یا مدیر مقصد جدا دارد، اینجا همان مسیر را وارد کن.">
                      <TextareaField controlOnly id="telegram_chat_ids_sales" name="telegram_chat_ids_sales" value={businessInfo.telegram_chat_ids_sales || ''} onChange={handleBusinessInfoChange} className={`${inputClass} ux-ltr-token`} dir="ltr" rows={3} placeholder={"-1001234567890\n672412513"} />
                    </ModalField>
                    <ModalField label={<span className="flex flex-wrap items-center gap-2"><span>سایر نوتیفیکیشن‌ها</span><span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black ${getTelegramMiniStatusClasses(String(businessInfo.telegram_chat_ids_notifications || '').trim() ? 'emerald' : 'slate')}`}><i className={`fa-solid ${String(businessInfo.telegram_chat_ids_notifications || '').trim() ? 'fa-circle-check' : 'fa-circle-info'}`} />{String(businessInfo.telegram_chat_ids_notifications || '').trim() ? 'مسیر هشدار فعال' : 'Fallback به چت اصلی'}</span></span>} iconClass="fa-solid fa-bell" hint="برای هشدارهای مدیریتی و رویدادهای متفرقه مقصد جدا مفید است.">
                      <TextareaField controlOnly id="telegram_chat_ids_notifications" name="telegram_chat_ids_notifications" value={businessInfo.telegram_chat_ids_notifications || ''} onChange={handleBusinessInfoChange} className={`${inputClass} ux-ltr-token`} dir="ltr" rows={3} placeholder={"-1001234567890\n672412513"} />
                    </ModalField>
                  </div>
                </FormSection></div>

                <div id="tg-anchor-quick-check" className="telegram-quick-check-v64 telegram-quick-check-v69">
                  <div className="telegram-quick-check-v69__card">
                    <div className="telegram-quick-check-v69__header">
                      <IconGlyph size="md" tone="accent"><i className="fa-solid fa-paper-plane" /></IconGlyph>
                      <div className="telegram-quick-check-v69__title">ارسال آزمایشی</div>
                      <span className={`telegram-quick-check-v69__status ${tgQuickMsg.trim() ? 'is-ready' : 'is-pending'}`}>
                        <i className={`fa-solid ${tgQuickMsg.trim() ? 'fa-circle-check' : 'fa-bolt'}`} />
                        {tgQuickMsg.trim() ? 'آماده ارسال' : 'نیازمند متن'}
                      </span>
                    </div>
                    <div className="telegram-quick-check-v64__grid telegram-quick-check-v69__grid grid grid-cols-1 lg:grid-cols-3 gap-4 items-end" data-ui-settings-grid="form">
                      <div className="settings-grid-span-full telegram-quick-check-v64__field telegram-quick-check-v69__field">
                        <div className="telegram-quick-check-v69__inputWrap">
                          <span className="telegram-quick-check-v69__inputIcon"><i className="fa-solid fa-comment-dots" /></span>
                          <TextField controlOnly id="telegram_quick_msg" className={inputClass} dir="rtl" value={tgQuickMsg} onChange={(e) => setTgQuickMsg(e.target.value)} />
                        </div>
                      </div>
                      <div className="telegram-quick-check-v64__action telegram-quick-check-v69__action flex gap-2">
                        <Button type="button" onClick={sendTelegramQuickCheck} disabled={tgIsSendingQuick} loading={tgIsSendingQuick} loadingText="در حال ارسال…" className="premium-submit-btn w-full justify-center" leftIcon={!tgIsSendingQuick ? <i className="fa-solid fa-paper-plane" /> : undefined}>
                          ارسال بررسی و ادامه
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {tgHealth ? (
                  <div className={`rounded-xl border p-3 text-sm ${tgHealth.ok ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-900/30' : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-900/20 dark:text-rose-200 dark:border-rose-900/30'}`}>
                    <div className="font-semibold">{tgHealth.msg}</div>
                    {tgHealth.ok && tgHealth.bot ? (
                      <div className="mt-1 text-xs" dir="ltr">@{tgHealth.bot?.username} — {tgHealth.bot?.first_name}</div>
                    ) : null}
                  </div>
                ) : null}
              </div>

{/* OTP پیامکی برای اتصال تلگرام */}
<Surface id="tg-anchor-otp" surface="glass" variant="panel" scheme="adaptive" className="rounded-[30px]" contentClassName="p-5">
  <div className="flex flex-wrap items-start justify-between gap-4">
    <div className="max-w-3xl">
      <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-3 py-1 text-xs font-black text-violet-700 shadow-sm dark:border-violet-900/40 dark:bg-slate-900/70 dark:text-violet-200">
        <i className="fa-solid fa-shield-heart" />
        کد اتصال مشتری
      </div>
      <div className="mt-3 text-lg font-black text-slate-900 dark:text-white">اتصال امن تلگرام با OTP پیامکی</div>
      <div className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
        برای لینک کردن مشتری به ربات، یک OTP پیامکی ارسال می‌شود و کاربر بعد از تأیید، به‌صورت امن به تلگرام متصل می‌گردد. اینجا فقط تنظیمات پیامکِ اتصال نگه‌داری می‌شود، نه محتوای اعلان‌های مشتری.
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      {String(telegramInfo.sms_otp_meli_body_id || '').trim() ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-200">
          <i className="fa-solid fa-circle-check" />
          BodyId ثبت شده
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700 dark:border-rose-900/30 dark:bg-rose-900/20 dark:text-rose-200">
          <i className="fa-solid fa-triangle-exclamation" />
          BodyId خالی است
        </span>
      )}
      <button
        type="button"
        onClick={() => openSmsPatternCheck('بررسی و ادامه: OTP اتصال تلگرام', String(telegramInfo.sms_otp_meli_body_id || ''), ['کد'])}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        disabled={!String(telegramInfo.sms_otp_meli_body_id || '').trim()}
        title={!String(telegramInfo.sms_otp_meli_body_id || '').trim() ? 'ابتدا BodyId را وارد کنید' : 'ارسال بررسی و ادامه کد اتصال'}
      >
        <i className="fa-solid fa-paper-plane" />
        بررسی و ادامه کد اتصال
      </button>
    </div>
  </div>

  <div className="mt-5 grid grid-cols-1 xl:grid-cols-[1.1fr,0.9fr] gap-4" data-ui-settings-grid="cards">
    <div className="rounded-3xl border border-white/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/75">
      <div className="telegram-detail-core-grid grid grid-cols-1 gap-4 md:grid-cols-2 items-stretch" data-ui-settings-grid="form">
        <div>
          <label htmlFor="sms_otp_meli_body_id" className={labelClass}>شناسه الگوی پیامک اتصال (BodyId)</label>
          <TextField controlOnly
            type="text"
            id="sms_otp_meli_body_id"
            name="sms_otp_meli_body_id"
            value={telegramInfo.sms_otp_meli_body_id || ''}
            onChange={handleBusinessInfoChange}
            className={inputClass}
            dir="ltr"
            placeholder="مثلاً 123456"
          />
          <div className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">
            در الگوی ملی‌پیامک یک متغیر برای «کد» تعریف کن. برنامه مقدار کد را به عنوان اولین توکن ارسال می‌کند.
          </div>
        </div>

        <div>
          <label htmlFor="sms_otp_exp_minutes" className={labelClass}>اعتبار کد (دقیقه)</label>
          <TextField controlOnly
            type="number"
            min={1}
            step={1}
            id="sms_otp_exp_minutes"
            name="sms_otp_exp_minutes"
            value={telegramInfo.sms_otp_exp_minutes || '5'}
            onChange={handleBusinessInfoChange}
            className={inputClass}
            dir="ltr"
            placeholder="5"
          />
          <div className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">
            پیشنهاد: ۵ تا ۱۰ دقیقه. اگر خالی بماند، پیش‌فرض ۵ دقیقه اعمال می‌شود.
          </div>
        </div>
      </div>
    </div>

    <div className="rounded-3xl border border-white/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/75">
      <div className="flex items-center justify-between">
        <div className="text-sm font-black text-slate-900 dark:text-white">چک‌لیست سریع</div>
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <i className="fa-solid fa-list-check" />
          آماده‌سازی
        </span>
      </div>
      <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
        <div className="flex items-start gap-2">
          <i className="fa-solid fa-circle-check mt-0.5 text-emerald-500" />
          <span>یک BodyId اختصاصی برای OTP تعریف کن تا پیامک اتصال با قالب ثابت و قابل پیگیری ارسال شود.</span>
        </div>
        <div className="flex items-start gap-2">
          <i className="fa-solid fa-circle-check mt-0.5 text-emerald-500" />
          <span>اعتبار کد را کوتاه نگه دار تا ریسک استفاده‌ی مجدد کاهش پیدا کند.</span>
        </div>
        <div className="flex items-start gap-2">
          <i className="fa-solid fa-circle-check mt-0.5 text-emerald-500" />
          <span>بعد از ذخیره تغییرات، با دکمه بررسی و ادامه کد اتصال مطمئن شو قالب و ارسال پیامک درست کار می‌کند.</span>
        </div>
      </div>
    </div>
  </div>
</Surface>

{/* اعلان‌های مشتریان */}
<Surface id="tg-anchor-notifications" surface="glass" variant="panel" scheme="adaptive" className="rounded-[26px]" contentClassName="p-4">
  <div className="telegram-studio-toolbar flex flex-wrap items-center justify-between gap-3">
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <IconGlyph size="md" tone="info">
          <i className="fa-solid fa-bell" />
        </IconGlyph>
        <div className="min-w-0">
          <div className="text-sm font-black text-slate-900 dark:text-white">اعلان‌های مشتریان در تلگرام</div>
          <div className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
            کنترل پیام‌های بعد از اتصال مشتری؛ مثل اقساط و وضعیت تعمیرات.
          </div>
        </div>
      </div>
    </div>
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black ${(() => { const installmentsOn = String(telegramInfo.telegram_notify_installments || '1').trim() !== '0'; const repairsOn = String(telegramInfo.telegram_notify_repairs || '1').trim() !== '0'; return installmentsOn && repairsOn ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200' : installmentsOn || repairsOn ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200'; })()}`}>
      <i className={`fa-solid ${(() => { const installmentsOn = String(telegramInfo.telegram_notify_installments || '1').trim() !== '0'; const repairsOn = String(telegramInfo.telegram_notify_repairs || '1').trim() !== '0'; return installmentsOn && repairsOn ? 'fa-circle-check' : installmentsOn || repairsOn ? 'fa-circle-half-stroke' : 'fa-circle-pause'; })()}`} />
      {(() => { const installmentsOn = String(telegramInfo.telegram_notify_installments || '1').trim() !== '0'; const repairsOn = String(telegramInfo.telegram_notify_repairs || '1').trim() !== '0'; return installmentsOn && repairsOn ? 'هر دو فعال' : installmentsOn || repairsOn ? 'بخشی فعال' : 'خاموش'; })()}
    </span>
  </div>

  <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2" data-ui-settings-grid="cards">
    <Surface surface="glass" variant="subtle" scheme="adaptive" className="rounded-[22px]" contentClassName="p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <IconGlyph size="lg" tone="info" className="mt-0.5">
            <i className="fa-solid fa-calendar-check" />
          </IconGlyph>
          <div className="min-w-0">
            <div className="text-sm font-black text-slate-900 dark:text-white">اقساط</div>
            <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">یادآوری سررسید و تکرار پیام‌های معوقه.</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2.5 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <span className="text-xs font-black text-slate-700 dark:text-slate-200">
            {String(telegramInfo.telegram_notify_installments || '1').trim() !== '0' ? 'فعال' : 'خاموش'}
          </span>
          <ToggleSwitch
            checked={String(telegramInfo.telegram_notify_installments || '1').trim() !== '0'}
            onCheckedChange={(checked) => setBusinessInfo((prev) => ({ ...(prev as TelegramBusinessInfo), telegram_notify_installments: checked ? '1' : '0' }))}
            ariaLabel="اعلان اقساط تلگرام"
            size="sm"
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2" data-ui-settings-grid="form">
        <div>
          <label className={labelClass}>یادآوری قبل از سررسید</label>
          <TextField controlOnly
            type="text"
            name="telegram_installment_remind_days"
            value={telegramInfo.telegram_installment_remind_days || '7,3,0'}
            onChange={handleBusinessInfoChange}
            className={inputClass}
            dir="ltr"
            placeholder="مثلاً 7,3,0"
          />
          <div className="mt-1.5 text-[11px] leading-5 text-slate-500 dark:text-slate-400">مثلاً ۷، ۳ و روز سررسید.</div>
        </div>
        <div>
          <label className={labelClass}>تکرار معوقه</label>
          <TextField controlOnly
            type="number"
            name="telegram_installment_overdue_repeat_days"
            value={telegramInfo.telegram_installment_overdue_repeat_days || 3}
            onChange={handleBusinessInfoChange}
            className={inputClass}
            dir="ltr"
            min={1}
            max={30}
          />
          <div className="mt-1.5 text-[11px] leading-5 text-slate-500 dark:text-slate-400">هر چند روز یک‌بار تا پرداخت.</div>
        </div>
      </div>
    </Surface>

    <Surface surface="glass" variant="subtle" scheme="adaptive" className="rounded-[22px]" contentClassName="p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <IconGlyph size="lg" tone="accent" className="mt-0.5">
            <i className="fa-solid fa-screwdriver-wrench" />
          </IconGlyph>
          <div className="min-w-0">
            <div className="text-sm font-black text-slate-900 dark:text-white">تعمیرات</div>
            <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">پیام آماده تحویل با کنترل تکرار روزانه.</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2.5 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <span className="text-xs font-black text-slate-700 dark:text-slate-200">
            {String(telegramInfo.telegram_notify_repairs || '1').trim() !== '0' ? 'فعال' : 'خاموش'}
          </span>
          <ToggleSwitch
            checked={String(telegramInfo.telegram_notify_repairs || '1').trim() !== '0'}
            onCheckedChange={(checked) => setBusinessInfo((prev) => ({ ...(prev as TelegramBusinessInfo), telegram_notify_repairs: checked ? '1' : '0' }))}
            ariaLabel="اعلان تعمیرات تلگرام"
            size="sm"
          />
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white/75 px-3 py-2.5 text-xs leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
        وقتی روشن باشد، مشتری بعد از آماده شدن دستگاه پیام تلگرام دریافت می‌کند؛ پیامک فقط برای کد اتصال می‌ماند.
      </div>
    </Surface>
  </div>
</Surface>

              <Surface surface="glass" variant="panel" scheme="adaptive" className="telegram-template-center telegram-template-center--compact telegram-template-apple-v62 rounded-[24px]" data-telegram-template-center="apple-v62">
                <div className="telegram-template-compact-hero relative px-4 py-4 md:px-5 md:py-4 border-b border-slate-200/70 dark:border-slate-800/70 bg-slate-50/80 dark:bg-slate-950">
                  <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-sky-500/8 to-transparent pointer-events-none" />
                  <div className="telegram-template-compact-hero__row relative flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-3 text-slate-900 dark:text-white">
                        <IconGlyph size="lg" tone="info">
                          <i className="fa-brands fa-telegram text-xl" />
                        </IconGlyph>
                        <div>
                          <div className="text-lg font-black">مرکز مدیریت قالب‌های تلگرام</div>
                          <div className="mt-0.5 text-xs leading-6 text-slate-500 dark:text-slate-400">مدیریت سریع قالب‌های مشتری، همکار و مدیر با پریست، ارسال آزمایشی.</div>
                        </div>
                      </div>
                      <div className="telegram-template-compact-chips mt-3 flex flex-wrap gap-1.5 text-xs font-bold">
                        <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200"><i className="fa-solid fa-wand-magic-sparkles" /> پریست آماده</span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-200"><i className="fa-solid fa-bolt" /> بررسی و ادامه یک‌کلیکی</span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"><i className="fa-solid fa-layer-group" /> دسته‌بندی‌شده</span>
                      </div>
                    </div>
                    <div className="telegram-template-compact-stats grid min-w-0 grid-cols-2 gap-2" data-ui-settings-grid="cards">
                      <div className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">تعداد قالب‌ها</div>
                        <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{visibleTelegramItemsCount.toLocaleString('fa-IR')}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">قالب‌های تنظیم‌شده</div>
                        <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{telegramTemplateDefs.filter((item) => String(telegramInfo[item.key] || '').trim()).length.toLocaleString('fa-IR')}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="telegram-template-compact-body p-4 md:p-5 space-y-4">
                  <div className="telegram-template-command-strip grid grid-cols-1 gap-2 md:grid-cols-3" data-ui-settings-grid="cards">
                    <button
                      type="button"
                      onClick={() => { setTelegramStudioMode('all'); jumpToTelegramSection('tg-anchor-mission-control'); }}
                      className={`telegram-template-command-card telegram-template-command-card--operations rounded-[20px] border px-4 py-3 text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${telegramStudioMode === 'all' ? 'border-sky-300 bg-gradient-to-br from-sky-50 via-white to-cyan-50 text-sky-900 ring-2 ring-sky-200/60 dark:border-sky-700 dark:from-sky-950/30 dark:via-slate-950 dark:to-cyan-950/20 dark:text-sky-100 dark:ring-sky-900/30' : 'border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-slate-950/70'}`}
                    >
                      <div className="telegram-template-command-card__top">
                        <IconGlyph size="md" tone="info">
                          <i className="fa-solid fa-layer-group" />
                        </IconGlyph>
                        <span className="telegram-template-command-card__badge">
                          مرکز عملیات
                        </span>
                      </div>
                      <div className="telegram-template-command-card__content">
                        <div className="telegram-template-command-card__title">مرکز فرمان قالب‌های تلگرام</div>
                        <div className="telegram-template-command-card__desc">مسیر سریع برای وضعیت‌ها، ناقص‌ها و ادامه کار.</div>
                      </div>
                      <div className="telegram-template-command-card__metrics telegram-template-command-card__metrics--triple">
                        <span><b>{telegramTemplateDefs.length.toLocaleString('fa-IR')}</b> رویداد</span>
                        <span><b>{telegramTemplateDefs.filter((item) => ['customer','partner','manager'].some((aud) => String(telegramInfo[getTelegramAudienceKey(item.key, aud as TelegramAudience)] || '').trim())).length.toLocaleString('fa-IR')}</b> تکمیل</span>
                        <span><b>{(telegramTemplateDefs.length * 3).toLocaleString('fa-IR')}</b> مخاطب</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setTelegramStudioMode('quick'); jumpToTelegramSection('tg-anchor-telegram-quick'); }}
                      className={`telegram-template-command-card telegram-template-command-card--quick rounded-[20px] border px-4 py-3 text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${telegramStudioMode === 'quick' ? 'border-amber-300 bg-gradient-to-br from-amber-50 via-white to-orange-50 text-amber-900 ring-2 ring-amber-200/60 dark:border-amber-700 dark:from-amber-950/30 dark:via-slate-950 dark:to-orange-950/20 dark:text-amber-100 dark:ring-amber-900/30' : 'border-slate-200/80 bg-slate-50/80 dark:border-slate-800/80 dark:bg-slate-900/60'}`}
                    >
                      <div className="telegram-template-command-card__top">
                        <IconGlyph size="md" tone="warning"><i className="fa-solid fa-star" /></IconGlyph>
                        <span className="telegram-template-command-card__badge telegram-template-command-card__badge--amber">
                          سریع‌ترین شروع
                        </span>
                      </div>
                      <div className="telegram-template-command-card__content">
                        <div className="telegram-template-command-card__title">مهم‌ترین‌ها</div>
                        <div className="telegram-template-command-card__desc">اول رویدادهای پرتکرار را تکمیل کن.</div>
                      </div>
                      <div className="telegram-template-command-card__progress" aria-hidden="true">
                        <span style={{ width: `${Math.max(18, telegramسراسریCompletionPercent)}%` }} />
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setTelegramStudioMode('todo'); jumpToTelegramSection('tg-anchor-telegram-todo'); }}
                      className={`telegram-template-command-card telegram-template-command-card--todo rounded-[20px] border px-4 py-3 text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${telegramStudioMode === 'todo' ? 'border-violet-300 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 text-violet-900 ring-2 ring-violet-200/60 dark:border-violet-700 dark:from-violet-950/30 dark:via-slate-950 dark:to-fuchsia-950/20 dark:text-violet-100 dark:ring-violet-900/30' : 'border-slate-200/80 bg-slate-50/80 dark:border-slate-800/80 dark:bg-slate-900/60'}`}
                    >
                      <div className="telegram-template-command-card__top">
                        <IconGlyph size="md" tone="accent"><i className="fa-solid fa-list-check" /></IconGlyph>
                        <span className="telegram-template-command-card__badge telegram-template-command-card__badge--violet">
                          {telegramTodoSummary.urgent.toLocaleString('fa-IR')} فوری
                        </span>
                      </div>
                      <div className="telegram-template-command-card__content">
                        <div className="telegram-template-command-card__title">موارد ناقص</div>
                        <div className="telegram-template-command-card__desc">ناقص‌های اولویت‌بالا را سریع پیگیری کن.</div>
                      </div>
                      <div className="telegram-template-command-card__metrics telegram-template-command-card__metrics--dual">
                        <span><b>{telegramTodoSummary.later.toLocaleString('fa-IR')}</b> برای بعد</span>
                        <span><b>{Object.keys(telegramTodoDoneMap).length.toLocaleString('fa-IR')}</b> انجام‌شده</span>
                      </div>
                    </button>
                  </div>

                  <div id="tg-anchor-mission-control" className="telegram-template-progress-panel scroll-mt-28 rounded-[22px] border border-slate-200/80 bg-slate-50/75 p-3.5 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/45">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[11px] font-black text-slate-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
                          <i className="fa-solid fa-chart-line" />
                          خلاصه پیشرفت
                        </div>
                        <div className="mt-2 text-sm font-black text-slate-900 dark:text-slate-100">نمای زنده وضعیت کل مرکز قالب‌ها</div>
                        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">با یک کلیک وضعیت مناسب را باز کن.</div>
                      </div>
                      <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${getTelegramProgressTone(telegramسراسریCompletionPercent).badge}`}>
                        <i className={`fa-solid ${getTelegramProgressTone(telegramسراسریCompletionPercent).icon}`} />
                        پیشرفت کل مرکز قالب‌ها: {telegramسراسریCompletionPercent.toLocaleString('fa-IR')}٪
                      </div>
                    </div>
                    <div className="telegram-template-progress-actions mt-3 grid grid-cols-1 gap-2 md:grid-cols-3" data-ui-settings-grid="actions">
                      <button
                        type="button"
                        onClick={() => { setTelegramStudioMode('all'); setTelegramTemplateFilter('configured'); }}
                        className="telegram-template-summary-card telegram-template-summary-card--success"
                      >
                        <IconGlyph size="md" tone="success"><i className="fa-solid fa-circle-check" /></IconGlyph>
                        <span className="telegram-template-summary-card__badge">کامل</span>
                        <span className="telegram-template-summary-card__title">کاملاً کامل</span>
                        <span className="telegram-template-summary-card__desc">فیلتر تنظیم‌شده‌ها را باز می‌کند.</span>
                        <span className="telegram-template-summary-card__value">{telegramسراسریSummary.complete.toLocaleString('fa-IR')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setTelegramStudioMode('todo'); setTelegramTemplateFilter('incomplete'); }}
                        className="telegram-template-summary-card telegram-template-summary-card--warning"
                      >
                        <IconGlyph size="md" tone="warning"><i className="fa-solid fa-hourglass-half" /></IconGlyph>
                        <span className="telegram-template-summary-card__badge">نیازمند تکمیل</span>
                        <span className="telegram-template-summary-card__title">نیمه‌کامل</span>
                        <span className="telegram-template-summary-card__desc">می‌بردت به کارهای مانده هوشمند.</span>
                        <span className="telegram-template-summary-card__value">{telegramسراسریSummary.partial.toLocaleString('fa-IR')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setTelegramStudioMode('incomplete'); setTelegramTemplateFilter('incomplete'); }}
                        className="telegram-template-summary-card telegram-template-summary-card--danger"
                      >
                        <IconGlyph size="md" tone="danger"><i className="fa-solid fa-circle-xmark" /></IconGlyph>
                        <span className="telegram-template-summary-card__badge">خالی</span>
                        <span className="telegram-template-summary-card__title">خالی</span>
                        <span className="telegram-template-summary-card__desc">فقط ناقص‌ها را باز می‌کند.</span>
                        <span className="telegram-template-summary-card__value">{telegramسراسریSummary.empty.toLocaleString('fa-IR')}</span>
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-center" data-ui-settings-grid="form">
                      <div>
                        <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          <span>پیشرفت کل مخاطب‌ها</span>
                          <span>{telegramسراسریSummary.configuredAudiences.toLocaleString('fa-IR')} / {(telegramTemplateDefs.length * 3).toLocaleString('fa-IR')}</span>
                        </div>
                        <div className={`h-3 overflow-hidden rounded-full ${getTelegramProgressTone(telegramسراسریCompletionPercent).rail}`}>
                          <div className={`h-full rounded-full bg-gradient-to-r ${getTelegramProgressTone(telegramسراسریCompletionPercent).bar} transition-all`} style={{ width: `${telegramسراسریCompletionPercent}%` }} />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" onClick={jumpToFirstIncompleteTelegramTemplate} variant="ghost" size="xs" className="rounded-2xl" leftIcon={<i className="fa-solid fa-location-crosshairs" />}>اولین ناقص</Button>
                        <Button type="button" onClick={() => openUrgentTelegramTodos()} variant="secondary" size="xs" className="rounded-2xl" leftIcon={<i className="fa-solid fa-bolt" />}>فقط مهم‌ها</Button>
                      </div>
                    </div>
                  </div>

                  <div id="tg-anchor-telegram-quick" className="telegram-studio-unified-panel telegram-smart-suggestion-v68 scroll-mt-28 rounded-[26px] border border-sky-200/80 bg-gradient-to-br from-sky-50 via-white to-violet-50/80 p-4 shadow-sm dark:border-sky-900/30 dark:from-sky-950/30 dark:via-slate-950 dark:to-violet-950/20" data-telegram-smart-suggestion="v68">
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]" data-ui-settings-grid="cards">
                      <div className="telegram-studio-unified-hero min-w-0 rounded-[22px] border border-white/80 bg-white/80 p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/30">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/90 px-3 py-1.5 text-xs font-black text-sky-700 shadow-sm dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200">
                            <i className="fa-solid fa-star" />
                            پیشنهاد هوشمند
                          </div>
                          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-200">
                            <i className="fa-solid fa-brain" />
                            اولویت‌بندی هوشمند
                          </div>
                        </div>
                        <div className="mt-3 text-base font-black text-slate-900 dark:text-slate-100">سیستم آماده است که قدم بعدی را به کاربر پیشنهاد بدهد.</div>
                        <div className="mt-1 text-sm leading-7 text-slate-600 dark:text-slate-300">{telegramCoachMessage}</div>
                        <div className="telegram-monitor-actions">
                          <Button type="button" onClick={() => setTelegramStudioMode('todo')} variant="secondary" size="xs" className="rounded-2xl" leftIcon={<i className="fa-solid fa-list-check" />}>باز کردن کارهای مانده</Button>
                          <Button type="button" onClick={() => setTelegramStudioMode('quick')} variant="warning" size="xs" className="rounded-2xl" leftIcon={<i className="fa-solid fa-star" />}>رفتن به مهم‌ترین‌ها</Button>
                          <Button type="button" onClick={() => setTelegramTemplateFilter('incomplete')} variant="danger" size="xs" className="rounded-2xl" leftIcon={<i className="fa-solid fa-filter-circle-xmark" />}>تمرکز روی ناقص‌ها</Button>
                        </div>
                      </div>
                      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1" data-ui-settings-grid="form">
                        <button type="button" onClick={() => setTelegramStudioMode('todo')} className="telegram-studio-stat-card rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-right shadow-sm transition hover:-translate-y-0.5 hover:bg-white dark:border-slate-800/80 dark:bg-slate-950/50">
                          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">امتیاز آمادگی</div>
                          <div className="mt-1 flex items-center gap-2 text-2xl font-black text-slate-900 dark:text-slate-50">
                            <i className="fa-solid fa-gauge-high text-sky-500" />
                            {telegramReadinessScore.toLocaleString('fa-IR')}٪
                          </div>
                          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                            <div className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-violet-500 transition-all" style={{ width: `${telegramReadinessScore}%` }} />
                          </div>
                        </button>
                        <button type="button" onClick={() => { if (telegramTodoSummary.urgent > 0) openUrgentTelegramTodos(); else jumpToFirstIncompleteTelegramTemplate(); }} className="telegram-studio-stat-card rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-right shadow-sm transition hover:-translate-y-0.5 hover:bg-white dark:border-slate-800/80 dark:bg-slate-950/50">
                          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">پیشنهاد بعدی</div>
                          <div className="mt-1 text-sm font-black text-slate-900 dark:text-slate-50">{telegramTodoSummary.urgent > 0 ? 'تکمیل اولویت‌بالاها' : telegramسراسریSummary.empty > 0 ? 'پر کردن رویدادهای خالی' : 'بهینه‌سازی متن‌ها'}</div>
                          <div className="mt-1 text-[11px] leading-6 text-slate-500 dark:text-slate-400">{telegramTodoSummary.urgent > 0 ? `الان ${telegramTodoSummary.urgent.toLocaleString('fa-IR')} رویداد مهم هنوز ناقص است.` : telegramسراسریSummary.empty > 0 ? `هنوز ${telegramسراسریSummary.empty.toLocaleString('fa-IR')} رویداد کاملاً خالی مانده است.` : 'تمرکز روی ارسال آزمایشی و یکنواخت‌سازی لحن پیام‌ها.'}</div>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="telegram-template-mode-panel telegram-studio-mode-panel space-y-3 rounded-[20px] border border-slate-200/80 bg-slate-50/70 px-3.5 py-3 dark:border-slate-800/80 dark:bg-slate-900/50">
                    <div className="telegram-studio-mode-selector">
                      <div className="telegram-template-mode-buttons grid w-full grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4" data-ui-settings-grid="actions">
                        {[
                          { key: 'quick', label: 'مهم‌ترین‌ها', icon: 'fa-solid fa-star', hint: 'رویدادهای پرتکرار و ضروری' },
                          { key: 'todo', label: 'کارهای مانده هوشمند', icon: 'fa-solid fa-list-check', hint: 'ناقص‌های مهم‌تر در اولویت' },
                          { key: 'all', label: 'همه رویدادها', icon: 'fa-solid fa-layer-group', hint: 'نمایش کامل مرکز قالب‌ها' },
                          { key: 'incomplete', label: 'فقط ناقص‌ها', icon: 'fa-solid fa-triangle-exclamation', hint: 'قالب‌های نیازمند تکمیل' },
                        ].map((mode) => {
                          const isActive = telegramStudioMode === mode.key;
                          return (
                            <button
                              key={mode.key}
                              type="button"
                              onClick={() => setTelegramStudioMode(mode.key as 'quick' | 'all' | 'incomplete' | 'todo')}
                              className={`telegram-studio-mode-tile ${isActive ? 'is-active' : ''}`}
                            >
                              <span className="telegram-studio-mode-tile__dot" aria-hidden="true" />
                              <IconGlyph size="sm" aria-hidden="true"><i className={mode.icon} /></IconGlyph>
                              <span className="telegram-studio-mode-tile__title">{mode.label}</span>
                              <span className="telegram-studio-mode-tile__hint">{mode.hint}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="telegram-template-status-grid grid grid-cols-1 gap-2 md:grid-cols-4" data-ui-settings-grid="cards">
                      <Surface surface="glass" variant="subtle" scheme="adaptive" className="telegram-studio-mini-surface rounded-2xl" contentClassName="px-4 py-3">
                        <div className="telegram-studio-mini-card__top"><IconGlyph size="sm"><i className="fa-solid fa-star" /></IconGlyph><div className="telegram-studio-mini-card__meta">نمای فعال</div></div>
                        <div className="telegram-studio-mini-card__value">{telegramStudioMode === 'quick' ? 'مهم‌ترین‌ها' : telegramStudioMode === 'todo' ? 'کارهای مانده هوشمند' : telegramStudioMode === 'all' ? 'همه رویدادها' : 'فقط ناقص‌ها'}</div>
                      </Surface>
                      <Surface surface="glass" variant="subtle" scheme="adaptive" className="telegram-studio-mini-surface rounded-2xl" contentClassName="px-4 py-3">
                        <div className="telegram-studio-mini-card__top"><IconGlyph size="sm"><i className="fa-solid fa-eye" /></IconGlyph><div className="telegram-studio-mini-card__meta">رویدادهای قابل مشاهده</div></div>
                        <div className="telegram-studio-mini-card__value">{visibleTelegramItemsCount.toLocaleString('fa-IR')} مورد</div>
                      </Surface>
                      <Surface surface="glass" variant="subtle" scheme="adaptive" className="telegram-studio-mini-surface rounded-2xl" contentClassName="px-4 py-3">
                        <div className="telegram-studio-mini-card__top"><IconGlyph size="sm"><i className="fa-solid fa-filter" /></IconGlyph><div className="telegram-studio-mini-card__meta">فیلتر فعال</div></div>
                        <div className="telegram-studio-mini-card__value">{telegramEffectiveFilter === 'all' ? 'همه وضعیت‌ها' : telegramEffectiveFilter === 'configured' ? 'فقط تنظیم‌شده‌ها' : 'فقط ناقص‌ها'}</div>
                      </Surface>
                      <Surface surface="glass" variant="subtle" scheme="adaptive" className="telegram-studio-mini-surface rounded-2xl" contentClassName="px-4 py-3">
                        <div className="telegram-studio-mini-card__top"><IconGlyph size="sm"><i className="fa-solid fa-bolt" /></IconGlyph><div className="telegram-studio-mini-card__meta">کارهای باز / فوری</div></div>
                        <div className="telegram-studio-mini-card__value">{telegramTodoSummary.open.toLocaleString('fa-IR')} / {telegramTodoSummary.urgent.toLocaleString('fa-IR')}</div>
                        <div className="telegram-studio-mini-card__desc">اولی همه ناقص‌ها، دومی فقط اولویت‌بالاها</div>
                      </Surface>
                    </div>

                    <div className="telegram-studio-toolbar flex flex-wrap items-center justify-between gap-3">
                      <div className="telegram-studio-toolbar__title"><i className="fa-solid fa-sliders" /> کنترل نمایش قالب‌ها</div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" onClick={() => setAllTelegramCategories(true)} variant="secondary" size="xs" leftIcon={<i className="fa-solid fa-angles-down" />}>
                          باز کردن همه دسته‌ها
                        </Button>
                        <Button type="button" onClick={() => setAllTelegramCategories(false)} variant="secondary" size="xs" leftIcon={<i className="fa-solid fa-angles-up" />}>
                          بستن همه دسته‌ها
                        </Button>
                        <Button type="button" onClick={() => setAllTelegramItems(true)} variant="secondary" size="xs" leftIcon={<i className="fa-solid fa-folder-open" />}>
                          باز کردن رویدادها
                        </Button>
                        <Button type="button" onClick={() => setAllTelegramItems(false)} variant="secondary" size="xs" leftIcon={<i className="fa-solid fa-folder-closed" />}>
                          بستن رویدادها
                        </Button>
                      </div>
                    </div>

                    <Surface surface="glass" variant="subtle" scheme="adaptive" className="telegram-template-filter-row telegram-studio-filter-row telegram-template-filter-row-v70 rounded-[18px]" contentClassName="grid grid-cols-1 gap-2 p-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
                      <TextField
                        value={telegramTemplateSearch}
                        onChange={(e) => setTelegramTemplateSearch(e.target.value)}
                        preview="جستجو در رویدادها، دسته‌ها و متغیرها..."
                        icon={<i className="fa-solid fa-magnifying-glass" />}
                        wrapperClassName="mb-0 telegram-studio-search-field"
                        className="rounded-2xl"
                      />
                      <SelectField
                        value={telegramStudioMode === 'incomplete' ? 'incomplete' : telegramTemplateFilter}
                        onChange={(e) => setTelegramTemplateFilter(e.target.value as 'all' | 'configured' | 'incomplete')}
                        disabled={telegramStudioMode === 'incomplete' || telegramStudioMode === 'todo'}
                        wrapperClassName="mb-0"
                        className="rounded-2xl text-sm font-bold"
                      >
                        <option value="all">همه رویدادها</option>
                        <option value="configured">فقط تنظیم‌شده‌ها</option>
                        <option value="incomplete">فقط ناقص‌ها</option>
                      </SelectField>
                      <Button
                        type="button"
                        onClick={clearTelegramStudioFilters}
                        variant="secondary"
                        size="sm"
                        leftIcon={<i className="fa-solid fa-rotate-left" />}
                      >
                        پاک کردن فیلترها
                      </Button>
                    </Surface>
                  </div>

                  {telegramStudioMode === 'todo' && telegramTodoTopItems.length > 0 && (
                    <div id="tg-anchor-telegram-todo" className="scroll-mt-28 rounded-[24px] border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-rose-50/60 p-4 shadow-sm dark:border-amber-900/30 dark:from-slate-950 dark:via-slate-950 dark:to-rose-950/10">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="text-sm font-black text-slate-900 dark:text-slate-100">راهنمای کارهای مانده</div>
                          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">قدم بعدی را همین‌جا ببین، روی ناقص مهم بعدی بپر و فقط اولویت‌بالاها را یکجا باز کن.</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            onClick={resetTelegramTodoAssistant}
                            variant="secondary"
                            size="xs"
                            leftIcon={<i className="fa-solid fa-star" />}
                          >
                            ریست دستیار
                          </Button>
                          <Button
                            type="button"
                            onClick={jumpToFirstIncompleteTelegramTemplate}
                            variant="primary"
                            size="xs"
                            leftIcon={<i className="fa-solid fa-location-crosshairs" />}
                          >
                            برو به اولین ناقص
                          </Button>
                          <Button
                            type="button"
                            onClick={() => openUrgentTelegramTodos()}
                            variant="danger"
                            size="xs"
                            leftIcon={<i className="fa-solid fa-bolt" />}
                          >
                            باز کردن فقط اولویت‌بالاها
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3" data-ui-settings-grid="cards">
                        {telegramTodoTopItems.map((entry, index) => (
                          <div key={`todo-card-${entry.item.key}`} className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm ring-1 ring-slate-200/60 dark:border-slate-800/80 dark:bg-slate-950/40 dark:ring-slate-800/60">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-slate-900 px-2 text-[11px] font-black text-white dark:bg-slate-100 dark:text-slate-900">{(index + 1).toLocaleString('fa-IR')}</span>
                                  <div className="text-sm font-black text-slate-900 dark:text-slate-100">{entry.item.label}</div>
                                  <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-black text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-200">
                                    <i className="fa-solid fa-star" />
                                    کمک هوشمند
                                  </span>
                                </div>
                                <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{entry.item.category} • {entry.priority.label}</div>
                              </div>
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${entry.priority.chip}`}>
                                <i className={`fa-solid ${entry.priority.icon}`} />
                                {entry.missingCount.toLocaleString('fa-IR')} ناقص
                              </span>
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-violet-200/70 bg-violet-50/70 px-3 py-2 dark:border-violet-900/30 dark:bg-violet-950/20">
                              <div>
                                <div className="text-[11px] font-black text-violet-800 dark:text-violet-100">پیشنهاد هوشمند</div>
                                <div className="mt-1 text-xs text-violet-700 dark:text-violet-200">{getTelegramAiAssistantCopy(entry)}</div>
                              </div>
                              <div className="shrink-0 text-left">
                                <div className="text-[10px] font-bold text-violet-700 dark:text-violet-200">سطح اطمینان</div>
                                <div className="mt-1 text-lg font-black text-violet-900 dark:text-violet-50">{entry.aiConfidence.toLocaleString('fa-IR')}٪</div>
                              </div>
                            </div>
                            <div className="mt-3 rounded-2xl border border-amber-200/70 bg-amber-50/70 px-3 py-2 text-xs font-bold text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-100">
                              <i className="fa-solid fa-list-check ml-2" />
                              گام بعدی: {getTelegramTodoNextStep(entry)}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <Button
                                type="button"
                                onClick={() => { const audience = entry.firstMissing?.aud; if (audience) applyTelegramAiSuggestion(entry.item.key, audience); }}
                                variant="primary"
                                size="xs"
                                leftIcon={<i className="fa-solid fa-wand-magic-sparkles" />}
                              >
                                اعمال پیشنهاد
                              </Button>
                              <Button
                                type="button"
                                onClick={() => deferTelegramTodo(entry.item.key)}
                                variant="secondary"
                                size="xs"
                                leftIcon={<i className="fa-regular fa-clock" />}
                              >
                                در ادامه
                              </Button>
                              <Button
                                type="button"
                                onClick={() => markTelegramTodoDone(entry.item.key)}
                                variant="success"
                                size="xs"
                                leftIcon={<i className="fa-solid fa-check-double" />}
                              >
                                انجام شد
                              </Button>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {entry.missingAudiences.map((audience) => (
                                <Button
                                  key={`todo-jump-${entry.item.key}-${audience.aud}`}
                                  type="button"
                                  onClick={() => jumpToTelegramTemplate(entry.item.key, audience.aud)}
                                  variant="secondary"
                                  size="xs"
                                  leftIcon={<i className={`fa-solid ${tgAudienceMeta[audience.aud].icon}`} />}
                                >
                                  تکمیل {tgAudienceMeta[audience.aud].label}
                                </Button>
                              ))}
                              {(entry.deferredUntil || entry.isDone) && (
                                <Button
                                  type="button"
                                  onClick={() => reactivateTelegramTodo(entry.item.key)}
                                  variant="warning"
                                  size="xs"
                                  leftIcon={<i className="fa-solid fa-arrow-rotate-left" />}
                                >
                                  بازگردانی
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {(telegramTodoSummary.later > 0 || Object.keys(telegramTodoDoneMap).length > 0) && (
                        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                          {telegramTodoSummary.later > 0 && <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"><i className="fa-regular fa-clock" /> {telegramTodoSummary.later.toLocaleString('fa-IR')} مورد برای بعد</span>}
                          {Object.keys(telegramTodoDoneMap).length > 0 && <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"><i className="fa-solid fa-check-double" /> {Object.keys(telegramTodoDoneMap).length.toLocaleString('fa-IR')} مورد انجام‌شده/مخفی</span>}
                        </div>
                      )}
                    </div>
                  )}

                  {filteredTelegramGroupedDefs.length === 0 && (
                    <div className="telegram-empty-state rounded-[24px] border border-dashed border-slate-300 bg-slate-50/70 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900/30">
                      <IconGlyph size="lg" className="mx-auto" aria-hidden="true"><i className="fa-solid fa-folder-open" /></IconGlyph>
                      <div className="telegram-empty-state__title text-base font-black text-slate-800 dark:text-slate-100">موردی پیدا نشد</div>
                      <div className="telegram-empty-state__desc mt-2 text-sm text-slate-500 dark:text-slate-400">عبارت جستجو یا فیلتر را تغییر بده تا رویدادهای بیشتری نمایش داده شوند.</div>
                      <div className="telegram-empty-state__actions mt-4 flex flex-wrap items-center justify-center gap-2">
                        <Button type="button" onClick={clearTelegramStudioFilters} variant="secondary" size="xs" leftIcon={<i className="fa-solid fa-rotate-left" />}>پاک کردن فیلترها</Button>
                        <Button type="button" onClick={() => setTelegramTemplateSearch('')} variant="ghost" size="xs" leftIcon={<i className="fa-solid fa-magnifying-glass" />}>خالی کردن جستجو</Button>
                      </div>
                    </div>
                  )}

                  {filteredTelegramGroupedDefs.map(([category, items], categoryIndex) => {
                    const catMeta = tgCategoryMeta[category] || { icon: 'fa-layer-group', tone: 'from-slate-500/10 to-transparent', description: 'قالب‌های این دسته را از اینجا به‌صورت متمرکز مدیریت کن.', quickHint: 'اول ناقص‌های همین دسته را تکمیل کن.', heroChip: 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200', heroBar: 'from-slate-500 via-zinc-500 to-neutral-500' };
                    const configuredCount = items.filter((item) => ['customer','partner','manager'].some((aud) => String(telegramInfo[getTelegramAudienceKey(item.key, aud as TelegramAudience)] || '').trim())).length;
                    const categoryStatus = getTelegramCategoryStatus(items);
                    const categoryTone = getTelegramProgressTone(categoryStatus.percent);
                    const isCategoryOpen = openTelegramCategories[category] ?? categoryIndex === 0;
                    const categoryQuickActionMap: Record<string, Array<{ key: string; label: string; icon: string; accent: string }>> = {
                      'اقساط': [
                        { key: 'telegram_installment_due_notice_message', label: 'برو به سررسید قسط', icon: 'fa-calendar-day', accent: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200' },
                        { key: 'telegram_installment_overdue_message', label: 'برو به دیرکرد اقساط', icon: 'fa-bell', accent: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200' },
                      ],
                      'تعمیرات': [
                        { key: 'telegram_repair_cost_notice_message', label: 'برو به اعلام هزینه', icon: 'fa-sack-dollar', accent: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-200' },
                        { key: 'telegram_repair_ready_message', label: 'برو به آماده تحویل', icon: 'fa-box-open', accent: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-900/40 dark:bg-fuchsia-950/30 dark:text-fuchsia-200' },
                      ],
                      'حساب': [
                        { key: 'telegram_account_balance_message', label: 'برو به بدهی / طلب', icon: 'fa-scale-balanced', accent: 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200' },
                      ],
                      'چک‌ها': [
                        { key: 'telegram_check_bounced_message', label: 'برو به چک برگشتی', icon: 'fa-file-circle-xmark', accent: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200' },
                      ],
                      'فاکتورها': [
                        { key: 'telegram_invoice_created_message', label: 'برو به ثبت اطلاعات فاکتور', icon: 'fa-file-invoice', accent: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200' },
                        { key: 'telegram_invoice_payment_received_message', label: 'برو به پرداخت فاکتور', icon: 'fa-money-bill-wave', accent: 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900/40 dark:bg-teal-950/30 dark:text-teal-200' },
                      ],
                    };
                    const categoryQuickActions = (categoryQuickActionMap[category] || [])
                      .map((action) => {
                        const targetItem = items.find((entry) => entry.key === action.key);
                        if (!targetItem) return null;
                        const missingAudience = getTelegramItemStatus(action.key).audiences.find((entry) => !entry.configured)?.aud || 'customer';
                        return { ...action, missingAudience };
                      })
                      .filter(Boolean)
                      .sort((a, b) => {
                        const aPinned = telegramPinnedQuickActions[a!.key] ? 1 : 0;
                        const bPinned = telegramPinnedQuickActions[b!.key] ? 1 : 0;
                        if (aPinned !== bPinned) return bPinned - aPinned;
                        const aUsage = telegramQuickActionUsageMap[a!.key] || 0;
                        const bUsage = telegramQuickActionUsageMap[b!.key] || 0;
                        if (aUsage !== bUsage) return bUsage - aUsage;
                        const aPercent = getTelegramItemStatus(a!.key).percent;
                        const bPercent = getTelegramItemStatus(b!.key).percent;
                        return aPercent - bPercent;
                      }) as Array<{ key: string; label: string; icon: string; accent: string; missingAudience: TelegramAudience }>;
                    const pinnedQuickActionsCount = categoryQuickActions.filter((action) => telegramPinnedQuickActions[action.key]).length;
                    return (
                      <div key={category} className="telegram-accordion-panel telegram-accordion-panel-v70 overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_18px_55px_-38px_rgba(15,23,42,0.42)] dark:border-slate-800/80 dark:bg-slate-950/55">
                        <Button
                          type="button"
                          onClick={() => toggleTelegramCategory(category)}
                          variant="ghost"
                          size="sm"
                          className="telegram-accordion-panel__header h-auto w-full rounded-none px-4 py-3 text-right shadow-none md:px-5"
                        >
                          <div className="telegram-accordion-header__identity min-w-0">
                            <IconGlyph size="lg" tone="accent">
                              <i className={`fa-solid ${catMeta.icon}`} />
                            </IconGlyph>
                            <div className="min-w-0">
                              <div className="telegram-accordion-header__title text-base font-black text-slate-950 dark:text-white">{category}</div>
                              <div className="telegram-accordion-header__subtitle text-[12px] font-semibold leading-6 text-slate-500 dark:text-slate-400">{catMeta.description}</div>
                            </div>
                          </div>

                          <div className="telegram-accordion-header__metrics" aria-label="خلاصه وضعیت دسته">
                            <span className="telegram-accordion-header__metric">
                              <span>رویدادها</span>
                              <strong>{items.length.toLocaleString('fa-IR')}</strong>
                            </span>
                            <span className="telegram-accordion-header__metric">
                              <span>تکمیل‌شده</span>
                              <strong>{configuredCount.toLocaleString('fa-IR')}</strong>
                            </span>
                            <span className="telegram-accordion-header__metric">
                              <span>آماده</span>
                              <strong>{categoryStatus.configuredAudiences.toLocaleString('fa-IR')}</strong>
                            </span>
                            <span className="telegram-accordion-header__metric">
                              <span>پیشرفت</span>
                              <strong>{categoryStatus.percent.toLocaleString('fa-IR')}٪</strong>
                            </span>
                          </div>

                          <div className="telegram-accordion-header__actions">
                            <div className={`telegram-accordion-header__badge inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${categoryTone.badge}`}>
                              <i className={`fa-solid ${categoryTone.icon}`} />
                              {categoryTone.label}
                            </div>
                            <IconGlyph size="lg">
                              <i className={`fa-solid ${isCategoryOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
                            </IconGlyph>
                          </div>
                        </Button>

                        {isCategoryOpen && (
                          <div className="telegram-accordion-panel__body border-t border-slate-200/70 bg-slate-50/50 p-3 dark:border-slate-800/70 dark:bg-slate-950/30 md:p-4">
                            <div className="space-y-3">
                              <div className="telegram-accordion-hero overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-sm dark:border-slate-800/80 dark:bg-slate-950/50">
                                <div className={`telegram-accordion-hero__summary relative px-4 py-4 md:px-5 md:py-4 bg-gradient-to-br ${catMeta.tone}`}>
                                  <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-white/40 to-transparent pointer-events-none dark:from-slate-950/30" />
                                  <div className="relative grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start" data-ui-settings-grid="cards">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${catMeta.heroChip}`}>
                                          <i className={`fa-solid ${catMeta.icon}`} />
                                          هاب {category}
                                        </span>
                                        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${categoryTone.badge}`}>
                                          <i className={`fa-solid ${categoryTone.icon}`} />
                                          {categoryTone.label}
                                        </span>
                                      </div>
                                      <div className="mt-3 text-lg font-black text-slate-900 dark:text-white">مرکز مدیریت دسته {category}</div>
                                      <div className="mt-1 text-sm leading-7 text-slate-600 dark:text-slate-300">{catMeta.description}</div>
                                      <div className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-white/80 bg-white/75 px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-800/80 dark:bg-slate-950/40 dark:text-slate-200">
                                        <i className="fa-solid fa-lightbulb" />
                                        {catMeta.quickHint}
                                      </div>
                                    </div>
                                    <div className="telegram-accordion-hero__kpis grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-4" data-ui-settings-grid="cards">
                                      <div className="rounded-2xl border border-white/80 bg-white/80 px-3 py-3 dark:border-slate-800/80 dark:bg-slate-950/40">
                                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">رویدادها</div>
                                        <div className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">{items.length.toLocaleString('fa-IR')}</div>
                                      </div>
                                      <div className="rounded-2xl border border-white/80 bg-white/80 px-3 py-3 dark:border-slate-800/80 dark:bg-slate-950/40">
                                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">تکمیل‌شده</div>
                                        <div className="mt-1 text-lg font-black text-emerald-700 dark:text-emerald-200">{configuredCount.toLocaleString('fa-IR')}</div>
                                      </div>
                                      <div className="rounded-2xl border border-white/80 bg-white/80 px-3 py-3 dark:border-slate-800/80 dark:bg-slate-950/40">
                                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">بخش‌های آماده</div>
                                        <div className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">{categoryStatus.configuredAudiences.toLocaleString('fa-IR')}</div>
                                      </div>
                                      <div className="rounded-2xl border border-white/80 bg-white/80 px-3 py-3 dark:border-slate-800/80 dark:bg-slate-950/40">
                                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">پیشرفت</div>
                                        <div className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">{categoryStatus.percent.toLocaleString('fa-IR')}٪</div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="telegram-accordion-hero__progress relative mt-4">
                                    <div className={`h-2 overflow-hidden rounded-full ${categoryTone.rail}`}>
                                      <div className={`h-full rounded-full bg-gradient-to-r ${catMeta.heroBar} transition-all`} style={{ width: `${categoryStatus.percent}%` }} />
                                    </div>
                                  </div>
                                </div>
                                <div className="telegram-accordion-actions flex flex-wrap gap-2 border-t border-slate-200/70 bg-white/90 px-4 py-3 dark:border-slate-800/70 dark:bg-slate-950/40 md:px-5">
                                  <Button
                                    type="button"
                                    onClick={() => setOpenTelegramItems((prev) => ({ ...prev, ...Object.fromEntries((items).map((entry) => [entry.key, true])) }))}
                                    variant="secondary"
                                    size="xs"
                                    leftIcon={<i className="fa-solid fa-layer-group" />}
                                  >
                                    باز کردن رویدادهای این دسته
                                  </Button>
                                  <Button
                                    type="button"
                                    onClick={() => setOpenTelegramItems((prev) => ({ ...prev, ...Object.fromEntries((items).map((entry) => [entry.key, false])) }))}
                                    variant="secondary"
                                    size="xs"
                                    leftIcon={<i className="fa-solid fa-layer-group" />}
                                  >
                                    بستن رویدادهای این دسته
                                  </Button>
                                  <Button
                                    type="button"
                                    onClick={() => {
                                      const firstIncomplete = (items).find((entry) => !getTelegramItemStatus(entry.key).allConfigured);
                                      if (firstIncomplete) {
                                        focusTelegramAudience(firstIncomplete.key, (getTelegramItemStatus(firstIncomplete.key).audiences.find((entry) => !entry.configured)?.aud || 'customer') as TelegramAudience);
                                      }
                                    }}
                                    variant="primary"
                                    size="xs"
                                    leftIcon={<i className="fa-solid fa-location-crosshairs" />}
                                  >
                                    برو به اولین ناقص دسته
                                  </Button>
                                  <Button
                                    type="button"
                                    onClick={() => {
                                      const priorityItems = (items).filter((entry) => getTelegramPriorityMeta(entry.key).level === 1);
                                      if (priorityItems.length) {
                                        setOpenTelegramItems((prev) => ({ ...prev, ...Object.fromEntries(priorityItems.map((entry) => [entry.key, true])) }));
                                      }
                                    }}
                                    variant="danger"
                                    size="xs"
                                    leftIcon={<i className="fa-solid fa-bolt" />}
                                  >
                                    فقط اولویت‌بالاها
                                  </Button>
                                </div>
                                {categoryQuickActions.length > 0 && (
                                  <div className="telegram-quick-action-section border-t border-dashed border-slate-200/80 bg-slate-50/70 px-4 py-3 dark:border-slate-800/80 dark:bg-slate-950/20 md:px-5">
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <i className="fa-solid fa-wand-magic-sparkles" />
                                        میان‌برهای هوشمند این دسته
                                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                                          <i className="fa-solid fa-hand-pointer" />
                                          کلیک برای هدایت مستقیم
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                                          <i className="fa-solid fa-thumbtack" />
                                          پین‌شده: {pinnedQuickActionsCount.toLocaleString('fa-IR')}
                                        </span>
                                      </div>
                                      <Button
                                        type="button"
                                        onClick={resetTelegramQuickActionPersonalization}
                                        variant="secondary"
                                        size="xs"
                                        leftIcon={<i className="fa-solid fa-rotate-left" />}
                                      >
                                        ریست شخصی‌سازی
                                      </Button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" data-ui-settings-grid="cards">
                                      {categoryQuickActions.map((action) => {
                                        const actionStatus = getTelegramItemStatus(action.key);
                                        const actionTone = getTelegramProgressTone(actionStatus.percent);
                                        const nextAudience = actionStatus.audiences.find((entry) => !entry.configured)?.aud || action.missingAudience;
                                        const nextAudienceLabel = tgAudienceMeta[nextAudience].label;
                                        const isPinned = !!telegramPinnedQuickActions[action.key];
                                        const usageCount = telegramQuickActionUsageMap[action.key] || 0;
                                        return (
                                          <div
                                            key={action.key}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => {
                                              bumpTelegramQuickActionUsage(action.key);
                                              focusTelegramAudience(action.key, nextAudience);
                                            }}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                bumpTelegramQuickActionUsage(action.key);
                                                focusTelegramAudience(action.key, nextAudience);
                                              }
                                            }}
                                            className={`telegram-quick-action-card group relative overflow-hidden rounded-[22px] border bg-white/95 p-4 text-right shadow-sm transition dark:bg-slate-950/50 ${action.accent}`}
                                            title={`رفتن به ${action.label.replace('برو به ', '')} • مقصد بعدی: ${nextAudienceLabel}`}
                                          >
                                            <div className="relative flex items-start justify-between gap-3">
                                              <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <IconGlyph size="lg" tone="accent" className="transition group-hover:scale-105">
                                                    <i className={`fa-solid ${action.icon}`} />
                                                  </IconGlyph>
                                                  <div className="min-w-0">
                                                    <div className="text-sm font-black text-slate-900 dark:text-slate-50">{action.label}</div>
                                                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">پرش سریع به مهم‌ترین رویداد این دسته</div>
                                                  </div>
                                                </div>
                                              </div>
                                              <div className="flex flex-col items-end gap-2">
                                                <Button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleTelegramQuickActionPin(action.key);
                                                  }}
                                                  variant={isPinned ? 'warning' : 'ghost'}
                                                  size="xs"
                                                  className="rounded-full px-2.5 py-1 text-[10px]"
                                                  title={isPinned ? 'حذف مورد از پین‌ها' : 'پین کردن این میان‌بر'}
                                                  leftIcon={<i className="fa-solid fa-thumbtack" />}
                                                >
                                                  {isPinned ? 'پین‌شده' : 'پین'}
                                                </Button>
                                                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black ${actionTone.badge}`}>
                                                  <i className={`fa-solid ${actionTone.icon}`} />
                                                  {actionTone.label}
                                                </span>
                                              </div>
                                            </div>
                                            <div className="relative mt-3 flex flex-wrap items-center gap-2">
                                              <span className="inline-flex items-center gap-1 rounded-full border border-white/80 bg-white/80 px-2.5 py-1 text-[10px] font-black text-slate-600 dark:border-slate-800/80 dark:bg-slate-950/40 dark:text-slate-300">
                                                <i className="fa-solid fa-fire" />
                                                استفاده: {usageCount.toLocaleString('fa-IR')}
                                              </span>
                                              {isPinned && (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                                                  <i className="fa-solid fa-star" />
                                                  ثابت در بالا
                                                </span>
                                              )}
                                            </div>
                                            <div className="telegram-accordion-hero__progress relative mt-4">
                                              <div className={`h-2.5 overflow-hidden rounded-full ${actionTone.rail}`}>
                                                <div className={`h-full rounded-full bg-gradient-to-r ${actionTone.bar} transition-all`} style={{ width: `${Math.max(6, actionStatus.percent)}%` }} />
                                              </div>
                                            </div>
                                            <div className="relative mt-3 flex flex-wrap items-center gap-2">
                                              {actionStatus.audiences.map((entry) => {
                                                const audienceMeta = tgAudienceMeta[entry.aud];
                                                return (
                                                  <span
                                                    key={`quick-action-${action.key}-${entry.aud}`}
                                                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black ${entry.configured ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200'}`}
                                                  >
                                                    <i className={`fa-solid ${audienceMeta.icon}`} />
                                                    {audienceMeta.label}
                                                  </span>
                                                );
                                              })}
                                            </div>
                                            <div className="relative mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/80 px-3 py-2 text-[11px] font-bold text-slate-700 dark:border-slate-800/80 dark:bg-slate-950/40 dark:text-slate-200">
                                              <span className="inline-flex items-center gap-2">
                                                <i className="fa-solid fa-location-arrow" />
                                                مقصد بعدی: {nextAudienceLabel}
                                              </span>
                                              <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                                <i className="fa-solid fa-arrow-up-left-from-circle" />
                                                پرش هوشمند
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                              {items.map((item) => {
                                const audienceDefs: TelegramAudienceTemplateEntry[] = (['customer', 'partner', 'manager'] as TelegramAudience[]).map((aud) => {
                                  const audienceKey = getTelegramAudienceKey(item.key, aud);
                                  const formatKey = getTelegramAudienceFormatKey(item.key, aud);
                                  const value = String(telegramInfo[audienceKey] || '');
                                  const format = String(telegramInfo[formatKey] || (aud === 'manager' ? 'html' : 'text')) as TelegramMessageFormat;
                                  return { aud, audienceKey, formatKey, value, format, isConfigured: !!value.trim() };
                                });
                                const isConfigured = audienceDefs.some((entry) => entry.isConfigured);
                                const itemStatus = getTelegramItemStatus(item.key);
                                const itemTone = getTelegramProgressTone(itemStatus.percent);
                                const isItemOpen = openTelegramItems[item.key] ?? false;
                                return (
                                  <Surface id={`tg-item-${item.key}`} key={item.key} surface="glass" variant="subtle" scheme="adaptive" className="telegram-template-item-card overflow-hidden rounded-[18px] scroll-mt-28" wrapContent={false}>
                                    <div
                                      role="button"
                                      tabIndex={0}
                                      onClick={() => toggleTelegramItem(item.key)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          toggleTelegramItem(item.key);
                                        }
                                      }}
                                      className="telegram-template-item-card__trigger flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-3 text-right transition hover:bg-slate-50/80    dark:hover:bg-slate-900/50  md:px-4"
                                    >
                                      <div className="flex min-w-0 items-center gap-3">
                                        <IconGlyph size="md" tone={isConfigured ? 'success' : 'neutral'}>
                                          <i className={item.iconClass} />
                                        </IconGlyph>
                                        <div className="min-w-0">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <div className="text-sm font-black text-slate-900 dark:text-white">{item.label}</div>
                                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${itemTone.badge}`}>
                                              <i className={`fa-solid ${itemTone.icon}`} />
                                              {itemTone.label}
                                            </span>
                                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${getTelegramPriorityMeta(item.key).chip}`}>
                                              <i className={`fa-solid ${getTelegramPriorityMeta(item.key).icon}`} />
                                              {getTelegramPriorityMeta(item.key).label}
                                            </span>
                                          </div>
                                          <div className="mt-0.5 line-clamp-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">{item.preview}</div>
                                          {telegramStudioMode === 'todo' && !itemStatus.allConfigured && (
                                            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                                              <i className="fa-solid fa-list-check" />
                                              کار باقی‌مانده: {`${(3 - itemStatus.configuredCount).toLocaleString('fa-IR')} بخش هنوز کامل نشده`}
                                            </div>
                                          )}
                                          <div className="mt-2 flex flex-wrap gap-1.5">
                                            {itemStatus.audiences.map((audienceStatus) => (
                                              <button
                                                key={`${item.key}-${audienceStatus.aud}-summary`}
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  focusTelegramAudience(item.key, audienceStatus.aud as TelegramAudience);
                                                }}
                                                className={`group relative inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-bold transition hover:-translate-y-0.5  ${audienceStatus.configured ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200'}`}
                                                title={`رفتن به پنل ${tgAudienceMeta[audienceStatus.aud].label}`}
                                              >
                                                <i className={`fa-solid ${tgAudienceMeta[audienceStatus.aud].icon}`} />
                                                {tgAudienceMeta[audienceStatus.aud].label}: {audienceStatus.label}
                                                <span className="pointer-events-none absolute -top-11 right-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-xl border border-slate-200 bg-slate-950 px-3 py-1.5 text-[10px] font-bold text-white shadow-xl group-hover:block group-focus-visible:block dark:border-slate-700">
                                                  کلیک کن؛ مستقیم روی بخش {tgAudienceMeta[audienceStatus.aud].label} می‌برمت.
                                                </span>
                                              </button>
                                            ))}
                                          </div>
                                         <div className="mt-2 max-w-sm">
                                            <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                              <span>پیشرفت این رویداد</span>
                                              <span>{itemStatus.configuredCount.toLocaleString('fa-IR')} / ۳</span>
                                            </div>
                                            <div className={`h-2.5 overflow-hidden rounded-full ${itemTone.rail}`}>
                                              <div className={`h-full rounded-full bg-gradient-to-r ${itemTone.bar} transition-all`} style={{ width: `${itemStatus.percent}%` }} />
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      <IconGlyph size="md">
                                        <i className={`fa-solid ${isItemOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
                                      </IconGlyph>
                                    </div>

                                    {isItemOpen && (
                                      <div className="telegram-template-item-card__body border-t border-slate-200/70 p-3 dark:border-slate-800/70 md:p-4">
                                        <div className="telegram-template-audience-brief mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-3 py-2.5 dark:border-slate-800/80 dark:bg-slate-900/40">
                                          <div>
                                            <div className="text-sm font-black text-slate-800 dark:text-slate-100">قالب‌های جدا برای مشتری، همکار و مدیر</div>
                                            <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">هر مخاطب فیلد مستقل خودش را دارد تا متن‌ها با هم قاطی نشوند.</div>
                                          </div>
                                          <div className="flex flex-wrap gap-2">
                                            {audienceDefs.map((entry) => (
                                              <button
                                                key={`${item.key}-badge-${entry.aud}`}
                                                type="button"
                                                onClick={() => focusTelegramAudience(item.key, entry.aud)}
                                                className={`group relative inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold shadow-sm transition hover:-translate-y-0.5  ${tgAudienceMeta[entry.aud].chip}`}
                                                title={`باز کردن بخش ${tgAudienceMeta[entry.aud].label}`}
                                              >
                                                <i className={`fa-solid ${tgAudienceMeta[entry.aud].icon}`} />
                                                {tgAudienceMeta[entry.aud].label}
                                                <i className="fa-solid fa-arrow-up-from-bracket text-[10px] opacity-70" />
                                                <span className="pointer-events-none absolute -top-11 right-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-xl border border-slate-200 bg-slate-950 px-3 py-1.5 text-[10px] font-bold text-white shadow-xl group-hover:block group-focus-visible:block dark:border-slate-700">
                                                  با یک کلیک همین پنل را باز می‌کنم و اسکرول می‌دهم.
                                                </span>
                                              </button>
                                            ))}
                                          </div>
                                          <div className="mt-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                            روی تگ‌های مشتری، همکار و مدیر بزن تا همان آکاردئون باز شود و با هایلایت نرم دقیقاً روی همان بخش بروی.
                                          </div>
                                        </div>

                                        <div className="space-y-3">
                                          {audienceDefs.map((entry, entryIndex) => {
                                            const panelKey = `${item.key}-${entry.aud}`;
                                            const isAudienceOpen = openTelegramAudiencePanels[panelKey] ?? entryIndex === 0;
                                            return (
                                              <div id={`tg-audience-${item.key}-${entry.aud}`} key={`${item.key}-${entry.aud}`} className={`telegram-audience-template-panel min-w-0 overflow-hidden rounded-[18px] border border-slate-200/80 bg-slate-50/85 shadow-sm ring-1 ring-white/70 dark:border-slate-800/80 dark:bg-slate-900/70 dark:ring-white/5 scroll-mt-32 transition duration-500 ${telegramSpotlightTarget === `tg-audience-${item.key}-${entry.aud}` ? 'ring-4 ring-sky-300/80 shadow-[0_0_0_6px_rgba(14,165,233,0.12)] animate-pulse' : ''}`}>
                                                <Button
                                                  type="button"
                                                  onClick={() => toggleTelegramAudiencePanel(panelKey)}
                                                  variant="ghost"
                                                  size="sm"
                                                  className="telegram-audience-template-panel__trigger h-auto w-full justify-between rounded-none px-3 py-3 text-right shadow-none"
                                                >
                                                  <div className="flex min-w-0 items-center gap-3">
                                                    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${tgAudienceMeta[entry.aud].chip}`}>
                                                      <i className={`fa-solid ${tgAudienceMeta[entry.aud].icon}`} />
                                                      {tgAudienceMeta[entry.aud].label}
                                                    </span>
                                                    <div className="min-w-0">
                                                      <div className="text-sm font-black text-slate-800 dark:text-slate-100">قالب و تنظیمات {tgAudienceMeta[entry.aud].label}</div>
                                                      <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{entry.isConfigured ? 'این قالب شخصی‌سازی شده است.' : 'در حال حاضر از متن پیش‌فرض استفاده می‌شود.'}</div>
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${entry.isConfigured ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'}`}>
                                                      <i className={`fa-solid ${entry.isConfigured ? 'fa-circle-check' : 'fa-wand-magic-sparkles'}`} />
                                                      {entry.isConfigured ? 'آماده' : 'پیش‌فرض'}
                                                    </span>
                                                    <IconGlyph size="md">
                                                      <i className={`fa-solid ${isAudienceOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
                                                    </IconGlyph>
                                                  </div>
                                                </Button>

                                                {isAudienceOpen && (
                                                  <div className="telegram-audience-template-panel__body border-t border-slate-200/70 px-3 pb-3 pt-2.5 dark:border-slate-800/70">
                                                    <div className="text-xs leading-6 text-slate-500 dark:text-slate-400">
                                                      قالب و متن مخصوص {tgAudienceMeta[entry.aud].label} را جداگانه اینجا تنظیم کن.
                                                    </div>

                                                    <div className="telegram-audience-template-actions mt-3 rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/60">
                                                      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_140px_140px] gap-2" data-ui-settings-grid="form">
                                                        <Button
                                                          type="button"
                                                          onClick={() => applyTelegramPreset(item.key, entry.aud)}
                                                          variant="warning"
                                                          size="xs"
                                                          className="rounded-xl"
                                                          leftIcon={<i className="fa-solid fa-bolt" />}
                                                        >
                                                          اعمال پریست
                                                        </Button>
                                                        <Button
                                                          type="button"
                                                          onClick={() => openTelegramTemplateCheck(`بررسی و ادامه: ${item.label} / ${tgAudienceMeta[entry.aud].label}`, entry.value || buildTelegramAudiencePreset(item.key, entry.aud) || item.preview, entry.format, [...item.allowedVars], entry.aud)}
                                                          variant="secondary"
                                                          size="xs"
                                                          className="rounded-xl"
                                                          leftIcon={<i className="fa-solid fa-paper-plane" />}
                                                        >
                                                          بررسی و ادامه
                                                        </Button>
                                                        <SelectField
                                                          name={entry.formatKey}
                                                          value={entry.format}
                                                          onChange={handleBusinessInfoChange}
                                                          wrapperClassName="mb-0"
                                                          className="rounded-xl text-xs font-bold"
                                                        >
                                                          <option value="text">Text</option>
                                                          <option value="markdown">Markdown</option>
                                                          <option value="html">HTML</option>
                                                        </SelectField>
                                                      </div>
                                                    </div>

                                                    <div className="mt-3">
                                                      <div className="mb-2 flex items-center justify-between gap-2">
                                                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">درج سریع متغیرها</span>
                                                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">{item.allowedVars.length.toLocaleString('fa-IR')} متغیر</span>
                                                      </div>
                                                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2" data-ui-settings-grid="actions">
                                                        {item.allowedVars.map((v) => (
                                                          <Button
                                                            key={`${entry.audienceKey}-${v.key}`}
                                                            type="button"
                                                            onClick={() => setBusinessInfo((prev) => ({ ...(prev as TelegramBusinessInfo), [entry.audienceKey]: `${String((prev as TelegramBusinessInfo)?.[entry.audienceKey] || '')}{${v.key}}` }))}
                                                            variant="ghost"
                                                            size="xs"
                                                            className="w-full justify-between rounded-xl px-2.5 py-2 text-[11px]"
                                                            title={v.example ? `مثال: ${v.example}` : v.label || v.key}
                                                            rightIcon={<i className="fa-solid fa-plus text-[10px]" />}
                                                          >
                                                            <span dir="ltr">{`{${v.key}}`}</span>
                                                          </Button>
                                                        ))}
                                                      </div>
                                                    </div>

                                                    <div className="telegram-template-textarea-shell mt-3 rounded-[20px] border border-slate-200/70 bg-white/80 p-2 dark:border-slate-800/70 dark:bg-slate-950/50">
                                                      <TextareaField controlOnly
                                                        id={entry.audienceKey}
                                                        name={entry.audienceKey}
                                                        value={entry.value}
                                                        onChange={handleBusinessInfoChange}
                                                        className="telegram-template-textarea min-h-[132px] w-full rounded-[14px] border border-slate-200/70 bg-white px-3 py-2.5 text-sm leading-7 text-slate-800 outline-none transition placeholder:text-slate-400    dark:border-slate-800/70 dark:bg-slate-950/70 dark:text-slate-100  "
                                                        dir="rtl"
                                                        placeholder={buildTelegramAudiencePreset(item.key, entry.aud) || item.preview}
                                                      />
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </Surface>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Surface>

              <TelegramLogsPanel />
                  </>
                ) : null}
            </form>
          )}

    </>
  );
}
