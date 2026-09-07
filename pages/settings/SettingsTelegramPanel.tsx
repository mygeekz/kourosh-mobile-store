import { useEffect, useState } from 'react';
import { apiFetch } from '../../utils/apiFetch';
import type { SettingsTelegramPanelProps, TelegramAudience, TelegramAudienceTemplateEntry, TelegramBusinessInfo, TelegramMessageFormat } from './settingsPanelTypes';
import Button from '../../components/Button';
import FormSection from '../../components/FormSection';
import { FormGrid, FormGridItem, ModalField, SelectField, TextareaField } from '@/components/ui';
import FormErrorSummary from '../../components/FormErrorSummary';
import TelegramLogsPanel from '../../components/TelegramLogsPanel';
import { TextField } from '@/components/ui';
import { Surface } from '@/components/ui';
import { IconGlyph } from '@/components/ui';
import ToggleSwitch from '../../components/ToggleSwitch';
import MiniAppDiagnosticCenter from '../../components/MiniAppDiagnosticCenter';


export default function SettingsTelegramPanel(props: SettingsTelegramPanelProps) {
  const {
    tab,
    settingsViewMode,
    businessInfo,
    telegramFormErrors,
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
  const [miniAppSnapshotStatus, setMiniAppSnapshotStatus] = useState<null | {
    enabled?: boolean; state?: string; reason?: string; lastRunAt?: string | null; lastSuccessAt?: string | null; lastErrorCode?: string | null; syncedSubjects?: number; failedSubjects?: number; nextRunAt?: string | null;
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

  useEffect(() => {
    if (tab !== 'telegram') return;
    let active = true;
    let timer = 0;
    const loadSnapshotStatus = async () => {
      try {
        const response = await apiFetch('/api/settings/miniapp-snapshot/status', { cache: 'no-store' });
        const body = await response.json().catch(() => ({}));
        if (active && response.ok && body?.success !== false) setMiniAppSnapshotStatus(body?.data || null);
      } catch {}
      if (active) timer = window.setTimeout(loadSnapshotStatus, 5000);
    };
    void loadSnapshotStatus();
    return () => { active = false; if (timer) window.clearTimeout(timer); };
  }, [tab]);

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
  const telegramTransportMode = transportRaw === 'cloud_relay' ? 'relay' : ['disabled', 'direct', 'system', 'proxy', 'relay'].includes(transportRaw) ? transportRaw : 'direct';
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
    ? { label: 'خاموش — نشانی عمومی لازم نیست', tone: 'text-slate-600 dark:text-slate-300' }
    : telegramPublicAccessMode === 'self_hosted'
      ? { label: telegramMiniAppUrl ? 'میزبانی شخصی آماده اتصال است' : 'نشانی عمومی امن لازم است', tone: telegramMiniAppUrl ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300' }
      : telegramPublicAccessMode === 'external_tunnel'
        ? { label: telegramMiniAppUrl ? 'نشانی اتصال خارجی ثبت شده' : 'نشانی امن اتصال خارجی لازم است', tone: telegramMiniAppUrl ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300' }
        : telegramPublicAccessMode === 'stable_tunnel'
          ? { label: stableMiniAppConfigured ? 'نشانی ثابت آماده استفاده است' : 'نشانی عمومی ثابت و مبدأ زنده لازم است', tone: stableMiniAppConfigured ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300' }
          : { label: cloudMiniAppReady ? 'رله Mini App آماده' : `رله: ${cloudStateLabel}`, tone: cloudMiniAppReady ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300' };

  return (
    <>
          {tab === 'telegram' && (
            <form noValidate id="telegram-settings-form-standard" onSubmit={handleTelegramSettingsSubmit} className={"settings-panel-root space-y-5"} data-ui-settings-panel="telegram" data-ui-settings-telegram="standard-v245">
              <FormErrorSummary
                errors={telegramFormErrors}
                labels={{
                  telegram_bot_token: 'توکن ربات تلگرام',
                  telegram_bot_username: 'نام کاربری ربات',
                  telegram_chat_id: 'شناسه چت اصلی',
                  telegram_proxy: 'پراکسی تلگرام',
                  telegram_miniapp_public_url: 'نشانی عمومی Mini App',
                  miniapp_live_origin_url: 'مبدأ زنده فروشگاه',
                  custom_relay_control_url: 'نشانی مدیریت رله',
                  custom_relay_connector_url: 'نشانی اتصال رله',
                  telegram_quiet_start_hour: 'شروع سکوت ارسال',
                  telegram_quiet_end_hour: 'پایان سکوت ارسال',
                  telegram_max_per_day_per_customer: 'حداکثر پیام روزانه',
                  telegram_chat_ids_reports: 'مقصد گزارشات',
                  telegram_chat_ids_installments: 'مقصد اقساط',
                  telegram_chat_ids_sales: 'مقصد فروش',
                  telegram_chat_ids_notifications: 'مقصد اعلان‌ها',
                }}
              />
              <section className="space-y-4">
                <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2 md:items-center dark:border-slate-800 dark:bg-slate-950">
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200"><i className="fa-brands fa-telegram" /> مرکز پیام‌رسانی تلگرام</span>
                    <h2 className="mt-3 text-lg font-black leading-8 text-slate-950 sm:text-xl dark:text-white">مرکز یکپارچه اتصال، ارسال و پایش تلگرام</h2>
                    <p className="mt-1 text-xs font-medium leading-6 text-slate-600 sm:text-sm dark:text-slate-300">تنظیمات ربات، مقصدها، قوانین ارسال، قالب‌ها و گزارش‌های واقعی در یک جریان کنترل‌شده مدیریت می‌شوند.</p>
                  </div>

                  <div className="grid min-w-0 gap-3 border-t border-slate-200 pt-4 md:border-r md:border-t-0 md:pr-4 md:pt-0 dark:border-slate-800" aria-label="خلاصه وضعیت تلگرام">
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">آمادگی سیستم</span>
                        <strong className="text-xl font-black tabular-nums text-slate-950 dark:text-white">{telegramConfigReadiness.toLocaleString('fa-IR')}٪</strong>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" aria-hidden="true">
                        <span className="block h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, Math.max(0, Number(telegramConfigReadiness) || 0))}%` }} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-xs font-bold text-slate-600 sm:grid-cols-3 md:grid-cols-1 dark:text-slate-300">
                      <span><i className={telegramTokenValue ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-exclamation'} /> {tgHealth?.ok ? 'اتصال تأیید شده' : telegramTokenValue ? 'توکن ثبت شده' : 'توکن لازم است'}</span>
                      <span><i className="fa-solid fa-route" /> {telegramDestinationCount ? `${telegramDestinationCount.toLocaleString('fa-IR')} مقصد` : 'بدون مقصد اختصاصی'}</span>
                      <span><i className="fa-solid fa-shield-halved" /> {telegramConnectionMode}</span>
                    </div>
                  </div>

                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <article className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200"><i className="fa-solid fa-robot" /></span><div className="min-w-0"><strong className="block text-sm font-black text-slate-900 dark:text-white">ربات</strong><small className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{telegramTokenValue ? `@${telegramUsernameValue || 'بدون نام کاربری'}` : 'توکن ثبت نشده'}</small></div></div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-black ${tgHealth?.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300' : telegramTokenValue ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-300' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300'}`}>{tgHealth?.ok ? 'سالم' : telegramTokenValue ? 'نیازمند بررسی' : 'نیازمند توکن'}</span>
                  </article>
                  <article className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200"><i className="fa-solid fa-route" /></span><div className="min-w-0"><strong className="block text-sm font-black text-slate-900 dark:text-white">مقصدها</strong><small className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{telegramAudienceDestinationCount.toLocaleString('fa-IR')} مسیر ارسال</small></div></div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-black ${telegramAudienceDestinationCount ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>{telegramAudienceDestinationCount ? 'ثبت شده' : 'بدون مقصد'}</span>
                  </article>
                  <article className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200"><i className="fa-solid fa-user-shield" /></span><div className="min-w-0"><strong className="block text-sm font-black text-slate-900 dark:text-white">اتصال مشتری</strong><small className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{String(telegramInfo.telegram_link_otp_enabled ?? '1') !== '0' ? 'احراز با پیامک' : 'اتصال مستقیم'}</small></div></div>
                    <span className="shrink-0 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-black text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-300">{String(telegramInfo.telegram_link_otp_enabled ?? '1') !== '0' ? 'کد پیامکی' : 'مستقیم'}</span>
                  </article>
                </div>

                <section className="mt-5 space-y-4 border-t border-slate-200 pt-5 dark:border-slate-800" aria-labelledby="telegram-connectivity-v151-heading" data-ui-telegram-connectivity="flat">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 id="telegram-connectivity-v151-heading" className="text-sm font-black text-slate-950 dark:text-white">راهبرد اتصال تلگرام و Mini App</h3>
                      <p className="mt-1 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">اتصال تلگرام و دسترسی عمومی Mini App به‌صورت مستقل مدیریت می‌شوند. در صورت نیاز می‌توان از رله کوروش یا اتصال مستقیم فروشگاه استفاده کرد.</p>
                    </div>
                    <span className="inline-flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-200"><i className="fa-solid fa-route" /> اتصال محلی</span>
                  </div>

                  <div className="grid grid-cols-1 overflow-hidden rounded-2xl bg-slate-50/90 ring-1 ring-inset ring-slate-200 lg:grid-cols-2 dark:bg-slate-900/55 dark:ring-slate-800">
                    <div className="p-4 lg:border-l lg:border-slate-200 dark:lg:border-slate-800">
                      <label className="block text-sm font-black text-slate-900 dark:text-white" htmlFor="telegram_transport_mode"><i className="fa-solid fa-paper-plane ml-2" />روش اتصال تلگرام</label>
                      <SelectField id="telegram_transport_mode" name="telegram_transport_mode" value={telegramTransportMode} onChange={handleBusinessInfoChange} wrapperClassName="mt-3 mb-0">
                        <option value="disabled">غیرفعال</option>
                        <option value="direct">مستقیم</option>
                        <option value="system">VPN / پراکسی سیستم</option>
                        <option value="proxy">پراکسی دستی</option>
                        <option value="relay">رله</option>
                      </SelectField>
                      <p className="mt-2 text-xs font-medium leading-6 text-slate-600 dark:text-slate-300">
                        {telegramTransportMode === 'disabled' ? 'ارتباط تلگرام غیرفعال است.' : telegramTransportMode === 'direct' ? 'ارتباط مستقیماً با Telegram برقرار می‌شود و هیچ پراکسی برنامه یا سیستم به‌صورت صریح استفاده نمی‌شود.' : telegramTransportMode === 'system' ? 'کوروش مسیر VPN/پراکسی سیستم را به‌صورت خودکار پیدا می‌کند؛ Proxy محیط Node، تنظیمات Windows و WinHTTP بررسی می‌شوند و در نهایت مسیر عادی VPN/TUN امتحان می‌شود.' : telegramTransportMode === 'proxy' ? 'تمام ارتباطات تلگرام فقط از پراکسی دستی ثبت‌شده عبور می‌کنند.' : 'ارتباط تلگرام از سرویس رله امن انتخاب‌شده عبور می‌کند.'}
                      </p>
                      {telegramTransportMode === 'system' && <div className={`mt-2 text-xs font-black ${tgHealth?.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>مسیر سیستم: {tgHealth?.ok ? tgHealth.msg : 'برای تشخیص مسیر فعال VPN/Windows، «بررسی اتصال» را اجرا کنید.'}</div>}
                      {telegramTransportMode === 'proxy' && <div className="mt-2 text-xs font-black text-amber-700 dark:text-amber-300">پراکسی: {telegramHasProxy ? 'تنظیم شده' : 'آدرس پراکسی لازم است'}</div>}
                      {telegramTransportMode === 'relay' && <div className={`mt-2 text-xs font-black ${cloudTelegramReady ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>رله: {cloudStateLabel}{cloudTelegramReady ? ' · ارتباط تلگرام سالم' : ''}</div>}
                    </div>

                    <div className="p-4">
                      <label className="block text-sm font-black text-slate-900 dark:text-white" htmlFor="miniapp_public_access_mode"><i className="fa-solid fa-window-maximize ml-2" />دسترسی عمومی Mini App</label>
                      <SelectField id="miniapp_public_access_mode" name="miniapp_public_access_mode" value={telegramPublicAccessMode} onChange={handleBusinessInfoChange} wrapperClassName="mt-3 mb-0">
                        <option value="disabled">غیرفعال</option>
                        <option value="self_hosted">میزبانی شخصی</option>
                        <option value="external_tunnel">اتصال موقت</option>
                        <option value="stable_tunnel">اتصال ثابت</option>
                        <option value="relay">رله</option>
                      </SelectField>
                      <div className={`mt-2 text-xs font-black ${telegramMiniAppState.tone}`}>{telegramMiniAppState.label}</div>
                      <p className="mt-2 text-xs font-medium leading-6 text-slate-600 dark:text-slate-300">حالت ثابت از یک نشانی دائمی استفاده می‌کند؛ اتصال موقت فقط برای بررسی کوتاه‌مدت ارتباط مناسب است.</p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50/75 p-4 ring-1 ring-inset ring-slate-200/80 dark:bg-slate-900/45 dark:ring-slate-800">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <label className="block text-sm font-black text-slate-900 dark:text-white" htmlFor="relay_provider"><i className="fa-solid fa-cloud-arrow-up ml-2" />سرویس رله</label>
                        <SelectField id="relay_provider" name="relay_provider" value={relayProvider} onChange={handleBusinessInfoChange} wrapperClassName="mt-3 mb-0">
                          <option value="managed_kourosh">ابر کوروش</option>
                          <option value="custom">رله شخصی</option>
                        </SelectField>
                        <p className="mt-2 text-xs font-medium leading-6 text-slate-600 dark:text-slate-300">سرویس رله فقط زمانی استفاده می‌شود که تلگرام یا Mini App روی حالت «رله» باشد. انتخاب سرویس به‌تنهایی هیچ‌کدام را فعال نمی‌کند.</p>
                      </div>
                      <span className={`text-xs font-black ${cloudConnected ? 'text-emerald-700 dark:text-emerald-300' : cloudProvisioned ? 'text-amber-700 dark:text-amber-300' : 'text-slate-600 dark:text-slate-300'}`}>{!cloudProvisioned ? 'فعال نشده' : cloudConnected ? 'متصل' : cloudConnectionState === 'connecting' || cloudConnectionState === 'authenticating' ? 'در حال اتصال' : 'آفلاین / اختلال'}</span>
                    </div>

                    {relayProvider === 'custom' && (
                      <FormGrid columns={2} className="mt-4">
                        <div>
                          <label className={labelClass} htmlFor="custom_relay_control_url">نشانی مدیریت رله</label>
                          <TextField type="url" id="custom_relay_control_url" name="custom_relay_control_url" value={String(telegramInfo.custom_relay_control_url || '')} onChange={handleBusinessInfoChange} valueKind="url" placeholder="https://control.example.com/" inputMode="url" error={telegramFormErrors.custom_relay_control_url} />
                        </div>
                        <div>
                          <label className={labelClass} htmlFor="custom_relay_connector_url">نشانی اتصال رله</label>
                          <TextField type="url" id="custom_relay_connector_url" name="custom_relay_connector_url" value={String(telegramInfo.custom_relay_connector_url || '')} onChange={handleBusinessInfoChange} valueKind="url" placeholder="wss://connector.example.com/connector" inputMode="url" error={telegramFormErrors.custom_relay_connector_url} />
                        </div>
                        <FormGridItem span="full"><p className="text-xs font-medium leading-6 text-slate-600 dark:text-slate-300">رله شخصی با ارتباط رمزنگاری‌شده و جداسازی اطلاعات هر فروشگاه کار می‌کند و به سرویس ابر کوروش وابسته نیست.</p></FormGridItem>
                      </FormGrid>
                    )}

                    {!cloudProvisioned && ((relayProvider === 'managed_kourosh' && cloudEnrollmentAvailable === true) || (relayProvider === 'custom' && Boolean(String(telegramInfo.custom_relay_control_url || '').trim()) && Boolean(String(telegramInfo.custom_relay_connector_url || '').trim()))) && (
                      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end">
                        <div className="min-w-0 flex-1">
                          <label className={labelClass} htmlFor="kourosh_cloud_enrollment_code">کد فعال‌سازی رله</label>
                          <TextField type="password" id="kourosh_cloud_enrollment_code" value={cloudEnrollmentCode} onChange={(event) => setCloudEnrollmentCode(event.target.value)} valueKind="code" autoComplete="off" placeholder="کد یک‌بارمصرف" />
                        </div>
                        <Button type="button" onClick={() => runCloudCredentialAction('enroll')} disabled={cloudActionBusy || !cloudEnrollmentCode.trim()} loading={cloudActionBusy}>فعال‌سازی رله</Button>
                      </div>
                    )}
                    {!cloudProvisioned && relayProvider === 'managed_kourosh' && cloudEnrollmentAvailable === false && <p className="mt-3 text-xs font-medium leading-6 text-slate-600 dark:text-slate-300">سرویس مدیریت رله کوروش برای این نصب آماده نشده است؛ استفاده محلی از کوروش بدون آن کاملاً امکان‌پذیر است.</p>}
                    {cloudProvisioned && (
                      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end">
                        <div className="min-w-0 flex-1">
                          <label className={labelClass} htmlFor="kourosh_cloud_recovery_code">کد بازیابی / نوسازی کلید اتصال</label>
                          <TextField type="password" id="kourosh_cloud_recovery_code" value={cloudRecoveryCode} onChange={(event) => setCloudRecoveryCode(event.target.value)} valueKind="code" autoComplete="off" placeholder="کد بازیابی یک‌بارمصرف" />
                        </div>
                        <Button type="button" variant="secondary" onClick={() => runCloudCredentialAction('rotate')} disabled={cloudActionBusy || !cloudRecoveryCode.trim()} loading={cloudActionBusy}>نوسازی کلید اتصال</Button>
                      </div>
                    )}
                    {cloudProvisioned && String(telegramInfo.kourosh_cloud_assigned_public_url || '').trim() && <p className="mt-3 text-xs font-medium leading-6 text-slate-600 dark:text-slate-300" dir="ltr">{String(telegramInfo.kourosh_cloud_assigned_public_url || '')}</p>}
                  </div>

                  {(telegramPublicAccessMode === 'self_hosted' || telegramPublicAccessMode === 'external_tunnel' || telegramPublicAccessMode === 'stable_tunnel') && (
                    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div>
                        <label className={labelClass} htmlFor="telegram_miniapp_public_url"><i className="fa-solid fa-globe ml-2" />{telegramPublicAccessMode === 'stable_tunnel' ? 'نشانی ثابت Mini App' : telegramPublicAccessMode === 'external_tunnel' ? 'نشانی امن اتصال خارجی' : 'نشانی عمومی امن میزبانی شخصی'}</label>
                        <TextField type="url" id="telegram_miniapp_public_url" name="telegram_miniapp_public_url" value={telegramMiniAppUrl} onChange={handleBusinessInfoChange} valueKind="url" placeholder="https://miniapp.example.com/miniapp.html" inputMode="url" error={telegramFormErrors.telegram_miniapp_public_url} />
                        <p className="mt-2 text-xs font-medium leading-6 text-slate-600 dark:text-slate-300">فقط نشانی ثبت‌شده برای همین روش اتصال استفاده می‌شود و مسیر دیگری به‌صورت خودکار جایگزین نخواهد شد.</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50/80 p-4 text-xs font-medium leading-6 text-slate-700 ring-1 ring-inset ring-slate-200/80 dark:bg-slate-900/45 dark:text-slate-200 dark:ring-slate-800">
                        <div className="font-black text-slate-900 dark:text-white">وضعیت Mini App عمومی</div>
                        <div className="mt-2">Mini App عمومی: {['PUBLIC_URL_READY', 'MENU_SYNC_PENDING', 'MENU_SYNCED'].includes(String(miniAppPublicSyncStatus?.phase || '')) ? '● متصل' : telegramMiniAppUrl ? 'در حال بررسی' : 'نشانی لازم است'}</div>
                        <div>درگاه ارتباط: {miniAppPublicSyncStatus?.gateway === 'ready' ? '● آماده' : telegramMiniAppUrl ? 'در حال بررسی' : 'نامشخص'}</div>
                        <div>اتصال عمومی: {miniAppPublicSyncStatus?.tunnel === 'ready' ? '● متصل' : miniAppPublicSyncStatus?.tunnel === 'starting' ? 'در حال اتصال' : 'نامشخص'}</div>
                        <div>منوی تلگرام: {miniAppPublicSyncStatus?.telegramMenu === 'synced' ? '● همگام' : miniAppPublicSyncStatus?.telegramMenu === 'pending' ? '● در انتظار اتصال تلگرام' : miniAppPublicSyncStatus?.telegramMenu === 'error' ? 'نیازمند تلاش مجدد' : 'نامشخص'}</div>
                        {telegramPublicAccessMode === 'stable_tunnel' ? (
                          <>
                            <div>همگام‌سازی اطلاعات: {miniAppSnapshotStatus?.state === 'idle' ? '● فعال' : miniAppSnapshotStatus?.state === 'syncing' ? 'در حال همگام‌سازی' : miniAppSnapshotStatus?.state === 'degraded' ? '● خطا' : miniAppSnapshotStatus?.enabled ? 'در حال آماده‌سازی' : 'غیرفعال'}</div>
                            <div>آخرین همگام‌سازی: {miniAppSnapshotStatus?.lastSuccessAt ? new Date(miniAppSnapshotStatus.lastSuccessAt).toLocaleString('fa-IR') : 'هنوز انجام نشده'}</div>
                            {miniAppSnapshotStatus?.lastErrorCode ? <div className="mt-1 font-bold text-rose-700 dark:text-rose-300">آخرین همگام‌سازی با خطا مواجه شد؛ برای تلاش دوباره اتصال را بررسی کنید.</div> : null}
                          </>
                        ) : null}
                        {miniAppPublicSyncStatus?.message ? <div className="mt-2 text-slate-700 dark:text-slate-300">{miniAppPublicSyncStatus.message}</div> : null}
                      </div>
                    </div>
                  )}

                  {telegramPublicAccessMode === 'stable_tunnel' && (
                    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div>
                        <label className={labelClass} htmlFor="miniapp_live_origin_url"><i className="fa-solid fa-link ml-2" />نشانی HTTPS مبدأ زنده فروشگاه</label>
                        <TextField type="url" id="miniapp_live_origin_url" name="miniapp_live_origin_url" value={String(telegramInfo.miniapp_live_origin_url || '')} onChange={handleBusinessInfoChange} valueKind="url" placeholder="https://live-store.example.com/" inputMode="url" error={telegramFormErrors.miniapp_live_origin_url} />
                        <p className="mt-2 text-xs font-medium leading-6 text-slate-600 dark:text-slate-300">این آدرس فقط مسیر زنده فروشگاه است و با نشانی عمومی مینی‌اپ یکی نیست.</p>
                      </div>
                      {settingsViewMode === 'advanced' && (
                        <div>
                          <label className={labelClass} htmlFor="miniapp_stable_tunnel_provider">سرویس دسترسی ثابت</label>
                          <SelectField id="miniapp_stable_tunnel_provider" name="miniapp_stable_tunnel_provider" value={String(telegramInfo.miniapp_stable_tunnel_provider || 'cloudflare_named')} onChange={handleBusinessInfoChange}>
                            <option value="cloudflare_named">Cloudflare — اتصال ثابت</option>
                            <option value="external">سرویس ثابت خارجی</option>
                          </SelectField>
                          <p className="mt-2 text-xs font-medium leading-6 text-slate-600 dark:text-slate-300">اطلاعات محرمانه اتصال فقط در محیط محلی فروشگاه نگه‌داری می‌شود و در تنظیمات مرورگر ذخیره نمی‌شود.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {telegramPublicAccessMode === 'stable_tunnel' && (
                    <div className="rounded-2xl bg-slate-50/75 p-3 text-xs font-medium leading-6 text-slate-700 ring-1 ring-inset ring-slate-200/80 dark:bg-slate-900/45 dark:text-slate-200 dark:ring-slate-800">
                      <div className="font-black text-slate-800 dark:text-slate-100">Mini App اصلی در تلگرام</div>
                      <div className="mt-1">{hasMainMiniApp ? '● Mini App اصلی در تلگرام فعال است.' : '● Mini App اصلی هنوز در تنظیمات ربات فعال نشده است.'}</div>
                      <div>نشانی ثبت‌شده: <span className="font-bold tabular-nums" dir="ltr">{telegramMiniAppUrl || '—'}</span></div>
                      <div>دکمه منوی کوروش با همین نشانی ثابت همگام می‌شود و با راه‌اندازی دوباره برنامه تغییر نمی‌کند.</div>
                      <div className="mt-1 text-slate-700 dark:text-slate-300">فعال‌سازی Mini App اصلی در تنظیمات ربات فقط یک‌بار انجام می‌شود و پس از آن نشانی ثابت باقی می‌ماند.</div>
                    </div>
                  )}

                  {telegramPublicAccessMode === 'disabled' && <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">Mini App خاموش است؛ تا زمان فعال‌سازی، نیازی به نشانی عمومی یا سرویس رله ندارد.</div>}
                  {telegramPublicAccessMode === 'relay' && <div className={`mt-4 rounded-2xl border p-3 text-xs font-black ${cloudMiniAppReady ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300'}`}>{cloudMiniAppReady ? `رله Mini App آماده است · ${String(telegramInfo.kourosh_cloud_assigned_public_url || '')}` : `رله Mini App آماده نیست · ${cloudStateLabel}`}</div>}
                </section>

                <MiniAppDiagnosticCenter setNotification={setNotification} />

                {/* تنظیمات پایه ربات در راهنمای اتصال پایین صفحه باقی مانده است. */}

                {settingsViewMode !== 'advanced' ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <strong className="block text-sm font-black text-slate-900 dark:text-white">راهنمای ثبت شناسه چت مدیر</strong>
                      <p className="mt-1 text-xs leading-6 text-slate-600 dark:text-slate-300">ربات را شروع کنید، شناسه چت را دریافت کنید و گفت‌وگوی مدیر را انتخاب کنید.</p>
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
                          <span>ذخیره و دریافت شناسه گفتگو</span>
                        </span>
                      </Button>
                    </div>
                  </div>
                  <ol className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <li className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white font-black text-sky-700 dark:bg-slate-950 dark:text-sky-300">۱</span>توکن و نام کاربری را ثبت کن.</li>
                    <li className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white font-black text-sky-700 dark:bg-slate-950 dark:text-sky-300">۲</span>ربات را در تلگرام شروع کن.</li>
                    <li className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white font-black text-sky-700 dark:bg-slate-950 dark:text-sky-300">۳</span>دریافت را بزن و چت مدیر را انتخاب کن.</li>
                  </ol>
                  {telegramRecentChatsViewModel.hasLookupHint ? <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold leading-6 text-slate-600 dark:bg-slate-900 dark:text-slate-300">{telegramRecentChatsViewModel.lookupHint}</div> : null}
                  {telegramRecentChatsViewModel.hasRecentChats ? (
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {telegramRecentChatsViewModel.chats.map((chat) => (
                        <button
                          key={chat.key}
                          type="button"
                          onClick={() => setBusinessInfo((prev) => ({ ...(prev as TelegramBusinessInfo), telegram_chat_id: chat.chatId }))}
                          className={`rounded-xl border p-3 text-right transition ${chat.isActive ? 'border-sky-300 bg-sky-50 ring-1 ring-sky-200 dark:border-sky-800 dark:bg-sky-950/30 dark:ring-sky-900' : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900'}`}
                          data-skip-global-button="true"
                        >
                          <span className="block font-black text-slate-900 dark:text-white">{chat.title}</span>
                          <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400" dir="ltr">{chat.meta}</span>
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
                    <div className="space-y-3" data-telegram-access-group="true">
                      <div className="flex items-start gap-3">
                        <IconGlyph size="md" tone="accent"><i className="fa-solid fa-link" /></IconGlyph>
                        <div>
                          <strong>شناسه مدیر و اتصال مشتری</strong>
                          <p>دریافت شناسه گفتگوی مدیر و انتخاب روش اتصال مشتری در همین بخش مدیریت می‌شود.</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <strong className="block text-sm font-black text-slate-900 dark:text-white">راهنمای ثبت شناسه چت مدیر</strong>
                      <p className="mt-1 text-xs leading-6 text-slate-600 dark:text-slate-300">ربات را شروع کنید، شناسه چت را دریافت کنید و گفت‌وگوی مدیر را انتخاب کنید.</p>
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
                          <span>ذخیره و دریافت شناسه گفتگو</span>
                        </span>
                      </Button>
                    </div>
                  </div>
                  <ol className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <li className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white font-black text-sky-700 dark:bg-slate-950 dark:text-sky-300">۱</span>توکن و نام کاربری را ثبت کن.</li>
                    <li className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white font-black text-sky-700 dark:bg-slate-950 dark:text-sky-300">۲</span>ربات را در تلگرام شروع کن.</li>
                    <li className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white font-black text-sky-700 dark:bg-slate-950 dark:text-sky-300">۳</span>دریافت را بزن و چت مدیر را انتخاب کن.</li>
                  </ol>
                  {telegramRecentChatsViewModel.hasLookupHint ? <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold leading-6 text-slate-600 dark:bg-slate-900 dark:text-slate-300">{telegramRecentChatsViewModel.lookupHint}</div> : null}
                  {telegramRecentChatsViewModel.hasRecentChats ? (
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {telegramRecentChatsViewModel.chats.map((chat) => (
                        <button
                          key={chat.key}
                          type="button"
                          onClick={() => setBusinessInfo((prev) => ({ ...(prev as TelegramBusinessInfo), telegram_chat_id: chat.chatId }))}
                          className={`rounded-xl border p-3 text-right transition ${chat.isActive ? 'border-sky-300 bg-sky-50 ring-1 ring-sky-200 dark:border-sky-800 dark:bg-sky-950/30 dark:ring-sky-900' : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900'}`}
                          data-skip-global-button="true"
                        >
                          <span className="block font-black text-slate-900 dark:text-white">{chat.title}</span>
                          <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400" dir="ltr">{chat.meta}</span>
                          <small>{chat.sourceLabel}</small>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>


                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <div>
                    <strong className="block text-sm font-black text-slate-900 dark:text-white">روش اتصال مشتری به ربات</strong>
                    <p className="mt-1 text-xs leading-6 text-slate-600 dark:text-slate-300">با توجه به شرایط شبکه و پیامک، مدیر می‌تواند بین احراز هویت با کد پیامکی یا اتصال مستقیم پس از اشتراک شماره انتخاب کند.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="روش اتصال مشتری">
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
                          className={`flex min-h-12 flex-col items-start justify-center rounded-xl border px-3 py-2 text-right transition ${active ? 'border-sky-300 bg-sky-50 ring-1 ring-sky-200 dark:border-sky-800 dark:bg-sky-950/30 dark:ring-sky-900' : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900'}`}
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

                <div className="space-y-3" data-telegram-auto-message-group="true">
                  <div className="flex items-start gap-3">
                    <IconGlyph size="md" tone="accent"><i className="fa-solid fa-comments" /></IconGlyph>
                    <div>
                      <strong>پیام‌های خودکار تلگرام</strong>
                      <p>لحن پیام‌ها و تولید متن‌های استاندارد در همین بخش مدیریت می‌شود.</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <div>
                    <strong className="block text-sm font-black text-slate-900 dark:text-white">لحن پیام‌های خودکار</strong>
                    <p className="mt-1 text-xs leading-6 text-slate-600 dark:text-slate-300">در نمای ساده، کاربر متن‌ها را دستی نمی‌نویسد؛ سیستم بر اساس لحن انتخابی، متن استاندارد رویدادها را تولید می‌کند.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="لحن پیام تلگرام">
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
                          className={`flex min-h-12 flex-col items-start justify-center rounded-xl border px-3 py-2 text-right transition ${active ? 'border-sky-300 bg-sky-50 ring-1 ring-sky-200 dark:border-sky-800 dark:bg-sky-950/30 dark:ring-sky-900' : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900'}`}
                          data-skip-global-button="true"
                        >
                          <strong>{item.label}</strong>
                          <small>{item.sub}</small>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
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

              <div className="space-y-6">
              <div className="premium-form-section space-y-5 overflow-hidden">
                <Surface surface="glass" variant="panel" scheme="adaptive" className="rounded-2xl" contentClassName="p-4">
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
                            <Button type="button" onClick={sendTelegramQuickCheck} disabled={tgIsSendingQuick} loading={tgIsSendingQuick} loadingText="در حال ارسال…" variant="primary" size="sm" leftIcon={!tgIsSendingQuick ? <i className="fa-solid fa-paper-plane" /> : undefined}>
                              بررسی ارسال پیام
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
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                          <div className="text-xs text-slate-500">فیلدهای کامل</div>
                          <div className="mt-1 text-lg font-black text-slate-900 dark:text-white">{telegramSetupDone}/{telegramSetupItems.length}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                          <div className="text-xs text-slate-500">مقصدهای ثبت‌شده</div>
                          <div className="mt-1 text-lg font-black text-slate-900 dark:text-white">{telegramAudienceDestinationCount.toLocaleString('fa-IR')}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                          <div className="text-xs text-slate-500">مسیر اتصال</div>
                          <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{telegramConnectionMode}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                          <div className="text-xs text-slate-500">سلامت اتصال</div>
                          <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{tgHealth ? (tgHealth.ok ? 'سالم' : 'نیاز به بررسی و ادامه') : 'هنوز بررسی و ادامه نشده'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Surface>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" data-telegram-merged-control="v22-from-phase16">
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
                        className={`group flex min-h-0 w-full flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-right transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700 ${mergedOk ? 'border-emerald-200' : 'border-amber-200'}`}
                        data-telegram-control-card={item.key}
                      >
                        <div className="flex h-full flex-col gap-3">
                          <div className="flex items-center justify-between gap-2" dir="rtl">
                            <IconGlyph size="md" tone={mergedOk ? 'success' : 'neutral'} aria-hidden="true">
                              <i className={`fa-solid ${item.icon}`} />
                            </IconGlyph>
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-black ${mergedOk ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300'}`}>
                              <i className={`fa-solid ${mergedOk ? 'fa-circle-check' : 'fa-circle-dot'}`} />
                              {mergedOk ? 'آماده' : 'نیاز به تکمیل'}
                            </span>
                          </div>
                          <div className="min-w-0" dir="rtl">
                            <div className="font-black text-slate-900 dark:text-white">{item.title}</div>
                            <div className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{item.hint}</div>
                            <div className="mt-3 flex items-center justify-between gap-2 text-xs" dir="rtl">
                              <span className="font-semibold text-slate-500 dark:text-slate-400">وضعیت عملیاتی</span>
                              <span className="font-black text-slate-800 dark:text-slate-100" dir={mergedValueDir}>{mergedValueText}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              
<div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex min-w-0 items-start gap-3">
      <IconGlyph size="md" tone="info"><i className="fa-solid fa-signal" /></IconGlyph>
      <div className="min-w-0">
        <h2 className="text-base font-black text-slate-950 dark:text-white">وضعیت اتصال و ارسال</h2>
        <p className="mt-1 text-xs font-medium leading-6 text-slate-600 dark:text-slate-300">وضعیت اتصال ربات، دریافت پیام‌ها و دسترسی کاربران از این بخش بررسی می‌شود.</p>
      </div>
    </div>

    <div className="w-full sm:w-48">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">آمادگی</span>
        <strong className="text-lg font-black tabular-nums text-slate-950 dark:text-white">{telegramConfigReadiness.toLocaleString('fa-IR')}٪</strong>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" aria-hidden="true">
        <span className="block h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, Math.max(0, Number(telegramConfigReadiness) || 0))}%` }} />
      </div>
      <small className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{telegramConfigReadyCount.toLocaleString('fa-IR')} / {telegramConfigChecks.length.toLocaleString('fa-IR')} آماده</small>
    </div>
  </div>

  <div className="mt-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
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
        <Button type="button" onClick={() => jumpToTelegramConfigField('telegram_miniapp_public_url')} variant="secondary" size="xs" leftIcon={<i className="fa-solid fa-link" />}>
          رفتن به تنظیم Mini App
        </Button>
        <Button type="button" onClick={() => jumpToTelegramConfigField('telegram_chat_ids_reports')} variant="ghost" size="xs" leftIcon={<i className="fa-solid fa-route" />}>
          مقصدها
        </Button>
        <Button type="button" onClick={() => jumpToTelegramConfigField('sms_otp_meli_body_id')} variant="ghost" size="xs" leftIcon={<i className="fa-solid fa-mobile-screen-button" />}>
          تأیید پیامکی
        </Button>
      </div>
    </div>
  </div>

  <div className="mt-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
          <i className="fa-solid fa-screwdriver-wrench" />
          مدیریت ارتباط تلگرام
        </div>
        <h3 className="text-base font-black text-slate-900 dark:text-white">دریافت پیام‌ها و منوی کاربران</h3>
        <p className="max-w-3xl text-xs leading-6 text-slate-600 dark:text-slate-300">
          برای اطمینان از عملکرد کامل، مسیر ارسال، دریافت پیام کاربران و منوی تلگرام از همین بخش بررسی می‌شود.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="secondary" size="xs" onClick={runTelegramDiagnostics} disabled={tgDiagnosticsLoading} loading={tgDiagnosticsLoading} loadingText="در حال بررسی…" leftIcon={!tgDiagnosticsLoading ? <i className="fa-solid fa-magnifying-glass-chart" /> : undefined}>
          بررسی اتصال
        </Button>
        <Button type="button" variant="ghost" size="xs" onClick={() => runTelegramAdminAction('enable-polling')} disabled={tgDiagnosticsBusyAction !== null} loading={tgDiagnosticsBusyAction === 'enable-polling'} loadingText="فعال‌سازی…" leftIcon={tgDiagnosticsBusyAction !== 'enable-polling' ? <i className="fa-solid fa-tower-broadcast" /> : undefined}>
          فعال‌سازی دریافت پیام
        </Button>
        <Button type="button" variant="ghost" size="xs" onClick={() => runTelegramAdminAction('reset-bot-menu')} disabled={tgDiagnosticsBusyAction !== null} loading={tgDiagnosticsBusyAction === 'reset-bot-menu'} loadingText="پاک‌سازی…" leftIcon={tgDiagnosticsBusyAction !== 'reset-bot-menu' ? <i className="fa-solid fa-broom" /> : undefined}>
          پاک‌سازی منوی تلگرام
        </Button>
        <Button type="button" variant="ghost" size="xs" onClick={() => runTelegramAdminAction('send-guest-menu-test')} disabled={tgDiagnosticsBusyAction !== null} loading={tgDiagnosticsBusyAction === 'send-guest-menu-test'} loadingText="ارسال…" leftIcon={tgDiagnosticsBusyAction !== 'send-guest-menu-test' ? <i className="fa-solid fa-keyboard" /> : undefined}>
          ارسال منوی اولیه
        </Button>
        <Button type="button" variant="secondary" size="xs" onClick={() => runTelegramAdminAction('send-real-menu')} disabled={tgDiagnosticsBusyAction !== null} loading={tgDiagnosticsBusyAction === 'send-real-menu'} loadingText="ارسال…" leftIcon={tgDiagnosticsBusyAction !== 'send-real-menu' ? <i className="fa-solid fa-paper-plane" /> : undefined}>
          ارسال منوی کاربر
        </Button>
        <Button type="button" variant="secondary" size="xs" onClick={() => runTelegramAdminAction('send-customer-menu')} disabled={tgDiagnosticsBusyAction !== null} loading={tgDiagnosticsBusyAction === 'send-customer-menu'} loadingText="ارسال…" leftIcon={tgDiagnosticsBusyAction !== 'send-customer-menu' ? <i className="fa-solid fa-user" /> : undefined}>
          منوی مشتری با شماره
        </Button>
        <Button type="button" variant="secondary" size="xs" onClick={() => runTelegramAdminAction('send-partner-menu')} disabled={tgDiagnosticsBusyAction !== null} loading={tgDiagnosticsBusyAction === 'send-partner-menu'} loadingText="ارسال…" leftIcon={tgDiagnosticsBusyAction !== 'send-partner-menu' ? <i className="fa-solid fa-handshake" /> : undefined}>
          منوی همکار با شماره
        </Button>
      </div>
    </div>

    {telegramDiagnosticsViewModel.hasDiagnostics && (
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-4">
        {telegramDiagnosticsViewModel.diagnosticCards.map((card) => (
          <div key={card.key} className="rounded-2xl border border-white/80 bg-white/85 p-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="text-xs font-bold text-slate-500">{card.label}</div>
            <div className={`mt-1 ${card.key === 'webhook-url' ? 'break-all text-xs' : card.key === 'pending-updates' ? 'text-lg' : card.key === 'polling' ? 'text-sm' : 'text-xs'} font-black text-slate-900 dark:text-white`}>{card.value}</div>
          </div>
        ))}
        {telegramDiagnosticsViewModel.webhookErrorMessage && (
          <div className="col-span-full rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs leading-6 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-200">
            <strong>خطای دریافت پیام: </strong>{telegramDiagnosticsViewModel.webhookErrorMessage}
          </div>
        )}
      </div>
    )}
  </div>

</div><div className="space-y-4" data-telegram-connection-bundle="v73">
                <div id="telegram-section-bot-core" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex w-full items-start justify-start gap-3 text-right">
                    <IconGlyph size="lg" tone="info" className="mt-0.5">
                      <i className="fa-solid fa-circle-info" />
                    </IconGlyph>
                    <div className="min-w-0 space-y-2 leading-7">
                      <div className="font-black text-slate-900 dark:text-slate-50">راهنمای اتصال تلگرام</div>
                      <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                        حالت «VPN / پراکسی سیستم» برای سیستم‌هایی مثل iRSpeedy طراحی شده است؛ کوروش Proxyهای محیط Node، تنظیمات Windows و WinHTTP را خودکار بررسی می‌کند و در صورت نبود Proxy صریح، مسیر VPN/TUN سیستم را امتحان می‌کند.
                      </p>
                      <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                        حالت «مستقیم» هیچ پراکسی صریحی مصرف نمی‌کند. فیلد <strong>پراکسی تلگرام</strong> فقط در حالت «پراکسی دستی» استفاده می‌شود.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 items-stretch">
                  <ModalField error={telegramFormErrors.telegram_bot_token} required label={renderTelegramFieldLabel('توکن ربات تلگرام', telegramFieldInsights.token, 'fa-key')} iconClass="fa-solid fa-key" hint={<span className="flex flex-wrap items-center gap-2"><span>{telegramFieldInsights.token.message}</span>{!telegramFieldInsights.token.ok ? <Button type="button" onClick={() => jumpToTelegramSetupField(telegramFieldInsights.token.target || 'telegram_bot_token')} variant="secondary" size="xs" leftIcon={<i className="fa-solid fa-wand-magic-sparkles" />}>{telegramFieldInsights.token.cta}</Button> : null}<span className="basis-full h-0" aria-hidden="true" /><Button type="button" variant="ghost" size="xs" onClick={() => setShowTelegramToken((s) => !s)} leftIcon={<i className={`fa-solid ${showTelegramToken ? 'fa-eye-slash' : 'fa-eye'}`} />}>{showTelegramToken ? 'پنهان کن' : 'نمایش توکن'}</Button><span>برای امنیت، توکن به صورت پیش‌فرض مخفی است.</span></span>}>
                    <TextField type={showTelegramToken ? 'text' : 'password'} id="telegram_bot_token" name="telegram_bot_token" value={businessInfo.telegram_bot_token || ''} onChange={handleBusinessInfoChange} valueKind="code" placeholder="123456:ABC-DEF..." />
                  </ModalField>

                  <ModalField error={telegramFormErrors.telegram_bot_username} label={renderTelegramFieldLabel('نام کاربری ربات', telegramFieldInsights.username, 'fa-at')} iconClass="fa-brands fa-telegram" hint={<span className="flex flex-wrap items-center gap-2"><span>{telegramFieldInsights.username.message} بدون @ وارد شود؛ مثلاً <span dir="ltr">my_store_bot</span>.</span>{telegramTokenValue && !telegramUsernameValue ? <Button type="button" onClick={() => jumpToTelegramSetupField('telegram_bot_username')} variant="secondary" size="xs" leftIcon={<i className="fa-solid fa-at" />}>{telegramFieldInsights.username.cta}</Button> : null}</span>}>
                    <TextField type="text" id="telegram_bot_username" name="telegram_bot_username" value={telegramInfo.telegram_bot_username || ''} onChange={handleBusinessInfoChange} valueKind="code" placeholder="my_store_bot" />
                  </ModalField>

                  <ModalField error={telegramFormErrors.telegram_chat_id} label={renderTelegramFieldLabel('شناسه چت (chat_id)', telegramFieldInsights.chatId, 'fa-comments')} iconClass="fa-solid fa-comments" hint={<span className="flex flex-wrap items-center gap-2"><span>{telegramFieldInsights.chatId.message}</span>{!telegramFieldInsights.chatId.ok ? <Button type="button" onClick={() => jumpToTelegramSetupField('telegram_chat_id')} variant="secondary" size="xs" leftIcon={<i className="fa-solid fa-paper-plane" />}>{telegramFieldInsights.chatId.cta}</Button> : null}</span>}>
                    <TextField type="text" id="telegram_chat_id" name="telegram_chat_id" value={businessInfo.telegram_chat_id || ''} onChange={handleBusinessInfoChange} valueKind="code" placeholder="-1001234567890 یا 12345678" />
                  </ModalField>

                </div>

                {telegramTransportMode === 'proxy' && <div id="telegram-section-proxy" className="space-y-3">
                  <ModalField error={telegramFormErrors.telegram_proxy} label={renderTelegramFieldLabel('پراکسی تلگرام — فقط حالت پراکسی', telegramFieldInsights.proxy, 'fa-shield-halved')} iconClass="fa-solid fa-shield-halved" hint={<span className="flex flex-wrap items-center gap-2"><span>{telegramFieldInsights.proxy.message}</span>{telegramProxyValue && !tgHealth?.ok ? <Button type="button" onClick={checkTelegramHealth} variant="secondary" size="xs" leftIcon={<i className="fa-solid fa-heart-pulse" />}>بررسی اتصال</Button> : null}</span>}>
                    <TextField
                      type="text"
                      id="telegram_proxy"
                      name="telegram_proxy"
                      value={telegramInfo.telegram_proxy || ''}
                      onChange={handleBusinessInfoChange}
                      valueKind="url"
                      placeholder="socks5://127.0.0.1:10808 یا http://127.0.0.1:10809"
                    />
                    <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400" dir="ltr">scheme://[username:password@]host:port</p>
                  </ModalField>
                </div>}
                </div>

                <div id="telegram-section-rules"><FormSection title="قوانین ارسال" description="محدودیت‌ها و بازه‌های سکوت را برای ارسال تلگرام مشخص کن." iconClass="fa-solid fa-sliders" className="space-y-3">
                  <div className={`rounded-2xl border px-4 py-3 text-xs leading-6 ${getTelegramMiniStatusClasses(telegramFieldInsights.rules.tone)}`}>
                    <div className="flex flex-wrap items-center gap-2 font-black">
                      <i className={`fa-solid ${telegramFieldInsights.rules.ok ? 'fa-circle-check' : 'fa-bolt'}`} />
                      {telegramFieldInsights.rules.chip}
                    </div>
                    <div className="mt-1">{telegramFieldInsights.rules.message}</div>
                  </div>
                  <FormGrid columns={3}>
                    <ModalField error={telegramFormErrors.telegram_quiet_start_hour} label={renderTelegramPlainFieldLabel('شروع سکوت ارسال (ساعت)', 'fa-moon')} iconClass="fa-solid fa-moon" hint="از این ساعت به بعد، پیام‌های تلگرام ارسال نمی‌شوند و تا پایان بازه نگه داشته می‌شوند. مثال: ۲۱ یعنی از ساعت ۲۱:۰۰.">
                      <TextField type="number" min={0} max={23} id="telegram_quiet_start_hour" name="telegram_quiet_start_hour" value={telegramInfo.telegram_quiet_start_hour ?? ''} onChange={handleBusinessInfoChange} valueKind="number" placeholder="21" />
                    </ModalField>
                    <ModalField error={telegramFormErrors.telegram_quiet_end_hour} label={renderTelegramPlainFieldLabel('پایان سکوت ارسال (ساعت)', 'fa-sun')} iconClass="fa-solid fa-sun" hint="از این ساعت به بعد ارسال دوباره مجاز می‌شود. مثال: ۱۰ یعنی از ساعت ۱۰:۰۰ صبح پیام‌ها می‌توانند ارسال شوند.">
                      <TextField type="number" min={0} max={23} id="telegram_quiet_end_hour" name="telegram_quiet_end_hour" value={telegramInfo.telegram_quiet_end_hour ?? ''} onChange={handleBusinessInfoChange} valueKind="number" placeholder="10" />
                    </ModalField>
                    <ModalField error={telegramFormErrors.telegram_max_per_day_per_customer} label={renderTelegramPlainFieldLabel('حداکثر پیام در روز (هر مشتری)', 'fa-gauge-high')} iconClass="fa-solid fa-gauge-high" hint="۰ یعنی بدون محدودیت روزانه؛ برای جلوگیری از ارسال تکراری، پیشنهاد: ۱ پیام برای هر مشتری.">
                      <TextField type="number" min={0} step={1} id="telegram_max_per_day_per_customer" name="telegram_max_per_day_per_customer" value={telegramInfo.telegram_max_per_day_per_customer ?? 1} onChange={handleBusinessInfoChange} valueKind="number" />
                    </ModalField>
                  </FormGrid>
                  <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-6 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                    <i className="fa-solid fa-circle-info" />
                    <span>بازه سکوت فقط با دو فیلد «شروع سکوت ارسال» و «پایان سکوت ارسال» تنظیم می‌شود؛ پیام‌های داخل این بازه متوقف و بعد از پایان سکوت ارسال می‌شوند.</span>
                  </div>
                </FormSection></div>

                <div id="telegram-section-destinations"><FormSection title="مقصدهای تفکیکی تلگرام" description="برای هر بخش می‌توانی چند chat_id وارد کنی. اگر خالی باشد از شناسه چت اصلی استفاده می‌شود." iconClass="fa-solid fa-route" className="space-y-3">
                  <FormGrid columns={2} align="stretch">
                    <ModalField error={telegramFormErrors.telegram_chat_ids_reports} label={<span className="flex flex-wrap items-center gap-2"><span>گزارشات</span><span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-black ${getTelegramMiniStatusClasses(String(businessInfo.telegram_chat_ids_reports || '').trim() ? 'emerald' : 'slate')}`}><i className={`fa-solid ${String(businessInfo.telegram_chat_ids_reports || '').trim() ? 'fa-circle-check' : 'fa-circle-info'}`} />{String(businessInfo.telegram_chat_ids_reports || '').trim() ? 'تنظیم شده' : 'استفاده از چت اصلی'}</span></span>} iconClass="fa-solid fa-chart-column" hint="اگر خالی باشد گزارشات به chat_id اصلی می‌روند.">
                      <TextareaField controlOnly id="telegram_chat_ids_reports" name="telegram_chat_ids_reports" value={businessInfo.telegram_chat_ids_reports || ''} onChange={handleBusinessInfoChange} dir="ltr" rows={3} placeholder={"-1001234567890\n672412513"} />
                    </ModalField>
                    <ModalField error={telegramFormErrors.telegram_chat_ids_installments} label={<span className="flex flex-wrap items-center gap-2"><span>اقساط</span><span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-black ${getTelegramMiniStatusClasses(String(businessInfo.telegram_chat_ids_installments || '').trim() ? 'emerald' : 'slate')}`}><i className={`fa-solid ${String(businessInfo.telegram_chat_ids_installments || '').trim() ? 'fa-circle-check' : 'fa-circle-info'}`} />{String(businessInfo.telegram_chat_ids_installments || '').trim() ? 'مسیر اختصاصی دارد' : 'استفاده از چت اصلی'}</span></span>} iconClass="fa-solid fa-receipt" hint="برای مسیر اقساط و یادآوری‌ها بهتر است chat_id جدا داشته باشی.">
                      <TextareaField controlOnly id="telegram_chat_ids_installments" name="telegram_chat_ids_installments" value={businessInfo.telegram_chat_ids_installments || ''} onChange={handleBusinessInfoChange} dir="ltr" rows={3} placeholder={"-1001234567890\n672412513"} />
                    </ModalField>
                    <ModalField error={telegramFormErrors.telegram_chat_ids_sales} label={<span className="flex flex-wrap items-center gap-2"><span>فروش</span><span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-black ${getTelegramMiniStatusClasses(String(businessInfo.telegram_chat_ids_sales || '').trim() ? 'emerald' : 'slate')}`}><i className={`fa-solid ${String(businessInfo.telegram_chat_ids_sales || '').trim() ? 'fa-circle-check' : 'fa-circle-info'}`} />{String(businessInfo.telegram_chat_ids_sales || '').trim() ? 'مسیر فروش آماده' : 'استفاده از چت اصلی'}</span></span>} iconClass="fa-solid fa-cart-shopping" hint="اگر تیم فروش یا مدیر مقصد جدا دارد، اینجا همان مسیر را وارد کن.">
                      <TextareaField controlOnly id="telegram_chat_ids_sales" name="telegram_chat_ids_sales" value={businessInfo.telegram_chat_ids_sales || ''} onChange={handleBusinessInfoChange} dir="ltr" rows={3} placeholder={"-1001234567890\n672412513"} />
                    </ModalField>
                    <ModalField error={telegramFormErrors.telegram_chat_ids_notifications} label={<span className="flex flex-wrap items-center gap-2"><span>سایر نوتیفیکیشن‌ها</span><span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-black ${getTelegramMiniStatusClasses(String(businessInfo.telegram_chat_ids_notifications || '').trim() ? 'emerald' : 'slate')}`}><i className={`fa-solid ${String(businessInfo.telegram_chat_ids_notifications || '').trim() ? 'fa-circle-check' : 'fa-circle-info'}`} />{String(businessInfo.telegram_chat_ids_notifications || '').trim() ? 'مسیر هشدار فعال' : 'استفاده از چت اصلی'}</span></span>} iconClass="fa-solid fa-bell" hint="برای هشدارهای مدیریتی و رویدادهای متفرقه مقصد جدا مفید است.">
                      <TextareaField controlOnly id="telegram_chat_ids_notifications" name="telegram_chat_ids_notifications" value={businessInfo.telegram_chat_ids_notifications || ''} onChange={handleBusinessInfoChange} dir="ltr" rows={3} placeholder={"-1001234567890\n672412513"} />
                    </ModalField>
                  </FormGrid>
                </FormSection></div>

                <div id="telegram-section-quick-check" >
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex flex-wrap items-center gap-3">
                      <IconGlyph size="md" tone="accent"><i className="fa-solid fa-paper-plane" /></IconGlyph>
                      <div className="font-black text-slate-900 dark:text-white">بررسی ارسال</div>
                      <span className={`ms-auto inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-black ${tgQuickMsg.trim() ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300'}`}>
                        <i className={`fa-solid ${tgQuickMsg.trim() ? 'fa-circle-check' : 'fa-bolt'}`} />
                        {tgQuickMsg.trim() ? 'آماده ارسال' : 'نیازمند متن'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
                      <div className="lg:col-span-2">
                        <div className="relative">
                          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400"><i className="fa-solid fa-comment-dots" /></span>
                          <TextField controlOnly id="telegram_quick_msg" value={tgQuickMsg} onChange={(e) => setTgQuickMsg(e.target.value)} />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" onClick={sendTelegramQuickCheck} disabled={tgIsSendingQuick} loading={tgIsSendingQuick} loadingText="در حال ارسال…" className="w-full justify-center" leftIcon={!tgIsSendingQuick ? <i className="fa-solid fa-paper-plane" /> : undefined}>
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

{/* تأیید پیامکی پیامکی برای اتصال تلگرام */}
<Surface id="telegram-section-otp" surface="glass" variant="panel" scheme="adaptive" className="rounded-2xl" contentClassName="p-4">
  <div className="flex flex-wrap items-start justify-between gap-4">
    <div className="max-w-3xl">
      <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-3 py-1 text-xs font-black text-violet-700 shadow-sm dark:border-violet-900/40 dark:bg-slate-900/70 dark:text-violet-200">
        <i className="fa-solid fa-shield-heart" />
        کد اتصال مشتری
      </div>
      <div className="mt-3 text-lg font-black text-slate-900 dark:text-white">اتصال امن تلگرام با تأیید پیامکی پیامکی</div>
      <div className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
        برای لینک کردن مشتری به ربات، یک تأیید پیامکی پیامکی ارسال می‌شود و کاربر بعد از تأیید، به‌صورت امن به تلگرام متصل می‌گردد. اینجا فقط تنظیمات پیامکِ اتصال نگه‌داری می‌شود، نه محتوای اعلان‌های مشتری.
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      {String(telegramInfo.sms_otp_meli_body_id || '').trim() ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-200">
          <i className="fa-solid fa-circle-check" />
          الگوی پیامک ثبت شده
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700 dark:border-rose-900/30 dark:bg-rose-900/20 dark:text-rose-200">
          <i className="fa-solid fa-triangle-exclamation" />
          الگوی پیامک ثبت نشده
        </span>
      )}
      <button
        type="button"
        onClick={() => openSmsPatternCheck('پیش‌نمایش و تست: تأیید پیامکی اتصال تلگرام', String(telegramInfo.sms_otp_meli_body_id || ''), ['کد'], 'کد تأیید اتصال تلگرام: {1}')}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        disabled={!String(telegramInfo.sms_otp_meli_body_id || '').trim()}
        title={!String(telegramInfo.sms_otp_meli_body_id || '').trim() ? 'ابتدا شناسه الگوی پیامک را وارد کنید' : 'بررسی ارسال کد اتصال'}
      >
        <i className="fa-solid fa-paper-plane" />
        بررسی و ادامه کد اتصال
      </button>
    </div>
  </div>

  <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-4">
    <div className="rounded-3xl border border-white/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/75">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 items-stretch">
        <div>
          <label htmlFor="sms_otp_meli_body_id" className={labelClass}>شناسه الگوی پیامک اتصال (BodyId)</label>
          <TextField controlOnly
            type="text"
            id="sms_otp_meli_body_id"
            name="sms_otp_meli_body_id"
            value={telegramInfo.sms_otp_meli_body_id || ''}
            onChange={handleBusinessInfoChange}
            valueKind="code"
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
            valueKind="number"
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
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <i className="fa-solid fa-list-check" />
          آماده‌سازی
        </span>
      </div>
      <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
        <div className="flex items-start gap-2">
          <i className="fa-solid fa-circle-check mt-0.5 text-emerald-500" />
          <span>یک الگوی اختصاصی برای تأیید پیامکی تعریف کنید تا کد اتصال با قالب ثابت و قابل پیگیری ارسال شود.</span>
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
<Surface id="telegram-section-notifications" surface="glass" variant="panel" scheme="adaptive" className="rounded-2xl" contentClassName="p-4">
  <div className="flex flex-wrap items-center justify-between gap-3">
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

  <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
    <Surface surface="glass" variant="subtle" scheme="adaptive" className="rounded-2xl" contentClassName="p-3.5">
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

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className={labelClass}>یادآوری قبل از سررسید</label>
          <TextField controlOnly
            type="text"
            name="telegram_installment_remind_days"
            value={telegramInfo.telegram_installment_remind_days || '7,3,0'}
            onChange={handleBusinessInfoChange}
            valueKind="code"
            placeholder="مثلاً 7,3,0"
          />
          <div className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">مثلاً ۷، ۳ و روز سررسید.</div>
        </div>
        <div>
          <label className={labelClass}>تکرار معوقه</label>
          <TextField controlOnly
            type="number"
            name="telegram_installment_overdue_repeat_days"
            value={telegramInfo.telegram_installment_overdue_repeat_days || 3}
            onChange={handleBusinessInfoChange}
            valueKind="number"
            min={1}
            max={30}
          />
          <div className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">هر چند روز یک‌بار تا پرداخت.</div>
        </div>
      </div>
    </Surface>

    <Surface surface="glass" variant="subtle" scheme="adaptive" className="rounded-2xl" contentClassName="p-3.5">
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

              <Surface surface="glass" variant="panel" scheme="adaptive" className="space-y-4 rounded-2xl" data-telegram-template-center="apple-v62">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 relative px-4 py-4 md:px-5 md:py-4 border-b border-slate-200/70 dark:border-slate-800/70 bg-slate-50/80 dark:bg-slate-950">
                  
                  <div className="relative flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-3 text-slate-900 dark:text-white">
                        <IconGlyph size="lg" tone="info">
                          <i className="fa-brands fa-telegram text-xl" />
                        </IconGlyph>
                        <div>
                          <div className="text-lg font-black">مرکز مدیریت قالب‌های تلگرام</div>
                          <div className="mt-0.5 text-xs leading-6 text-slate-500 dark:text-slate-400">مدیریت سریع قالب‌های مشتری، همکار و مدیر با پریست، بررسی ارسال.</div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-bold">
                        <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200"><i className="fa-solid fa-wand-magic-sparkles" /> پریست آماده</span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-200"><i className="fa-solid fa-bolt" /> بررسی و ادامه یک‌کلیکی</span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"><i className="fa-solid fa-layer-group" /> دسته‌بندی‌شده</span>
                      </div>
                    </div>
                    <div className="grid min-w-0 grid-cols-2 gap-2">
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

                <div className="p-4 md:p-5 space-y-4">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label="دسترسی سریع مرکز قالب‌ها">
                    {[
                      { key: 'all', label: 'مرکز قالب‌ها', icon: 'fa-solid fa-layer-group', target: 'telegram-section-mission-control' },
                      { key: 'quick', label: 'مهم‌ترین‌ها', icon: 'fa-solid fa-star', target: 'telegram-section-telegram-quick' },
                      { key: 'todo', label: 'موارد ناقص', icon: 'fa-solid fa-list-check', target: 'telegram-section-telegram-todo' },
                    ].map((item) => {
                      const active = telegramStudioMode === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setTelegramStudioMode(item.key as 'all' | 'quick' | 'todo');
                            jumpToTelegramSection(item.target);
                          }}
                          className={`flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-right text-sm font-black transition ${active ? 'border-sky-300 bg-sky-50 text-sky-900 ring-1 ring-sky-200 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100 dark:ring-sky-900' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900'}`}
                        >
                          <IconGlyph size="sm" aria-hidden="true"><i className={item.icon} /></IconGlyph>
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div id="telegram-section-mission-control" className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-slate-50/75 p-3.5 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/45">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
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
                    <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                      <button
                        type="button"
                        onClick={() => { setTelegramStudioMode('all'); setTelegramTemplateFilter('configured'); }}
                        className="flex min-w-0 items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-right transition hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30"
                      >
                        <IconGlyph size="sm" tone="success"><i className="fa-solid fa-circle-check" /></IconGlyph>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-black text-slate-900 dark:text-white">کامل</span>
                          <span className="block truncate text-xs text-slate-600 dark:text-slate-300">قالب‌های آماده ارسال</span>
                        </span>
                        <span className="text-lg font-black text-slate-900 dark:text-white">{telegramسراسریSummary.complete.toLocaleString('fa-IR')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setTelegramStudioMode('todo'); setTelegramTemplateFilter('incomplete'); }}
                        className="flex min-w-0 items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-right transition hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/20 dark:hover:bg-amber-950/30"
                      >
                        <IconGlyph size="sm" tone="warning"><i className="fa-solid fa-hourglass-half" /></IconGlyph>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-black text-slate-900 dark:text-white">نیازمند تکمیل</span>
                          <span className="block truncate text-xs text-slate-600 dark:text-slate-300">قالب‌های نیمه‌کامل</span>
                        </span>
                        <span className="text-lg font-black text-slate-900 dark:text-white">{telegramسراسریSummary.partial.toLocaleString('fa-IR')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setTelegramStudioMode('incomplete'); setTelegramTemplateFilter('incomplete'); }}
                        className="flex min-w-0 items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-right transition hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:hover:bg-rose-950/30"
                      >
                        <IconGlyph size="sm" tone="danger"><i className="fa-solid fa-circle-xmark" /></IconGlyph>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-black text-slate-900 dark:text-white">خالی</span>
                          <span className="block truncate text-xs text-slate-600 dark:text-slate-300">قالب‌های ثبت‌نشده</span>
                        </span>
                        <span className="text-lg font-black text-slate-900 dark:text-white">{telegramسراسریSummary.empty.toLocaleString('fa-IR')}</span>
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-center">
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                          <span>پیشرفت کل مخاطب‌ها</span>
                          <span>{telegramسراسریSummary.configuredAudiences.toLocaleString('fa-IR')} / {(telegramTemplateDefs.length * 3).toLocaleString('fa-IR')}</span>
                        </div>
                        <div className={`h-3 overflow-hidden rounded-full ${getTelegramProgressTone(telegramسراسریCompletionPercent).rail}`}>
                          <div className={`h-full rounded-full bg-gradient-to-r ${getTelegramProgressTone(telegramسراسریCompletionPercent).bar} transition-all`} style={{ width: `${telegramسراسریCompletionPercent}%` }} />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" onClick={jumpToFirstIncompleteTelegramTemplate} variant="ghost" size="xs" leftIcon={<i className="fa-solid fa-location-crosshairs" />}>اولین ناقص</Button>
                        <Button type="button" onClick={() => openUrgentTelegramTodos()} variant="secondary" size="xs" leftIcon={<i className="fa-solid fa-bolt" />}>فقط مهم‌ها</Button>
                      </div>
                    </div>
                  </div>

                  <div id="telegram-section-telegram-quick" className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950" data-telegram-smart-suggestion="v68">
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                      <div className="min-w-0 rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
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
                        <div className="flex flex-wrap items-center gap-2">
                          <Button type="button" onClick={() => setTelegramStudioMode('todo')} variant="secondary" size="xs" leftIcon={<i className="fa-solid fa-list-check" />}>باز کردن کارهای مانده</Button>
                          <Button type="button" onClick={() => setTelegramStudioMode('quick')} variant="secondary" size="xs" leftIcon={<i className="fa-solid fa-star" />}>رفتن به مهم‌ترین‌ها</Button>
                          <Button type="button" onClick={() => setTelegramTemplateFilter('incomplete')} variant="secondary" size="xs" leftIcon={<i className="fa-solid fa-filter-circle-xmark" />}>تمرکز روی ناقص‌ها</Button>
                        </div>
                      </div>
                      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                        <button type="button" onClick={() => setTelegramStudioMode('todo')} className="rounded-2xl border border-slate-200 bg-white p-3 text-right transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900">
                          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">امتیاز آمادگی</div>
                          <div className="mt-1 flex items-center gap-2 text-2xl font-black text-slate-900 dark:text-slate-50">
                            <i className="fa-solid fa-gauge-high text-sky-500" />
                            {telegramReadinessScore.toLocaleString('fa-IR')}٪
                          </div>
                          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                            <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${telegramReadinessScore}%` }} />
                          </div>
                        </button>
                        <button type="button" onClick={() => { if (telegramTodoSummary.urgent > 0) openUrgentTelegramTodos(); else jumpToFirstIncompleteTelegramTemplate(); }} className="rounded-2xl border border-slate-200 bg-white p-3 text-right transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900">
                          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">پیشنهاد بعدی</div>
                          <div className="mt-1 text-sm font-black text-slate-900 dark:text-slate-50">{telegramTodoSummary.urgent > 0 ? 'تکمیل اولویت‌بالاها' : telegramسراسریSummary.empty > 0 ? 'پر کردن رویدادهای خالی' : 'بهینه‌سازی متن‌ها'}</div>
                          <div className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{telegramTodoSummary.urgent > 0 ? `الان ${telegramTodoSummary.urgent.toLocaleString('fa-IR')} رویداد مهم هنوز ناقص است.` : telegramسراسریSummary.empty > 0 ? `هنوز ${telegramسراسریSummary.empty.toLocaleString('fa-IR')} رویداد کاملاً خالی مانده است.` : 'تمرکز روی بررسی ارسال و یکنواخت‌سازی لحن پیام‌ها.'}</div>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                    <div >
                      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="نمای مرکز قالب‌ها">
                        {[
                          { key: 'quick', label: 'مهم‌ترین‌ها', icon: 'fa-solid fa-star', hint: 'رویدادهای پرتکرار و ضروری' },
                          { key: 'todo', label: 'کارهای مانده', icon: 'fa-solid fa-list-check', hint: 'ناقص‌های مهم‌تر در اولویت' },
                          { key: 'all', label: 'همه رویدادها', icon: 'fa-solid fa-layer-group', hint: 'نمایش کامل مرکز قالب‌ها' },
                          { key: 'incomplete', label: 'فقط ناقص‌ها', icon: 'fa-solid fa-triangle-exclamation', hint: 'قالب‌های نیازمند تکمیل' },
                        ].map((mode) => {
                          const isActive = telegramStudioMode === mode.key;
                          return (
                            <button
                              key={mode.key}
                              type="button"
                              title={mode.hint}
                              onClick={() => setTelegramStudioMode(mode.key as 'quick' | 'all' | 'incomplete' | 'todo')}
                              className={`flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-right text-sm font-black transition ${isActive ? 'border-sky-300 bg-sky-50 text-sky-900 ring-1 ring-sky-200 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100 dark:ring-sky-900' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900'}`}
                            >
                              <IconGlyph size="sm" aria-hidden="true"><i className={mode.icon} /></IconGlyph>
                              <span className="truncate">{mode.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 md:grid-cols-4 dark:border-slate-800 dark:bg-slate-800" aria-label="خلاصه مرکز قالب‌ها">
                      <div className="min-w-0 bg-white p-2.5 dark:bg-slate-950">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"><i className="fa-solid fa-star" /><span>نمای فعال</span></div>
                        <div className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white">{telegramStudioMode === 'quick' ? 'مهم‌ترین‌ها' : telegramStudioMode === 'todo' ? 'کارهای مانده' : telegramStudioMode === 'all' ? 'همه رویدادها' : 'فقط ناقص‌ها'}</div>
                      </div>
                      <div className="min-w-0 bg-white p-2.5 dark:bg-slate-950">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"><i className="fa-solid fa-eye" /><span>قابل مشاهده</span></div>
                        <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{visibleTelegramItemsCount.toLocaleString('fa-IR')} مورد</div>
                      </div>
                      <div className="min-w-0 bg-white p-2.5 dark:bg-slate-950">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"><i className="fa-solid fa-filter" /><span>فیلتر</span></div>
                        <div className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white">{telegramEffectiveFilter === 'all' ? 'همه وضعیت‌ها' : telegramEffectiveFilter === 'configured' ? 'تنظیم‌شده‌ها' : 'ناقص‌ها'}</div>
                      </div>
                      <div className="min-w-0 bg-white p-2.5 dark:bg-slate-950">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"><i className="fa-solid fa-bolt" /><span>باز / فوری</span></div>
                        <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{telegramTodoSummary.open.toLocaleString('fa-IR')} / {telegramTodoSummary.urgent.toLocaleString('fa-IR')}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white"><i className="fa-solid fa-sliders" /> کنترل نمایش قالب‌ها</div>
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

                    <Surface surface="glass" variant="subtle" scheme="adaptive" className="rounded-xl" contentClassName="grid grid-cols-1 gap-2 p-3 lg:grid-cols-3">
                      <TextField
                        value={telegramTemplateSearch}
                        onChange={(e) => setTelegramTemplateSearch(e.target.value)}
                        preview="جستجو در رویدادها، دسته‌ها و متغیرها..."
                        icon={<i className="fa-solid fa-magnifying-glass" />}
                        wrapperClassName="mb-0"
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
                    <div id="telegram-section-telegram-todo" className="scroll-mt-28 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 shadow-sm dark:border-amber-900/30 dark:bg-amber-950/10">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="text-sm font-black text-slate-900 dark:text-slate-100">راهنمای کارهای مانده</div>
                          <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">قدم بعدی را همین‌جا ببین، روی ناقص مهم بعدی بپر و فقط اولویت‌بالاها را یکجا باز کن.</div>
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
                            variant="secondary"
                            size="xs"
                            leftIcon={<i className="fa-solid fa-bolt" />}
                          >
                            باز کردن فقط اولویت‌بالاها
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
                        {telegramTodoTopItems.map((entry, index) => (
                          <div key={`todo-card-${entry.item.key}`} className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm ring-1 ring-slate-200/60 dark:border-slate-800/80 dark:bg-slate-950/40 dark:ring-slate-800/60">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-slate-900 px-2 text-xs font-black text-white dark:bg-slate-100 dark:text-slate-900">{(index + 1).toLocaleString('fa-IR')}</span>
                                  <div className="text-sm font-black text-slate-900 dark:text-slate-100">{entry.item.label}</div>
                                  <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-black text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-200">
                                    <i className="fa-solid fa-star" />
                                    کمک هوشمند
                                  </span>
                                </div>
                                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{entry.item.category} • {entry.priority.label}</div>
                              </div>
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${entry.priority.chip}`}>
                                <i className={`fa-solid ${entry.priority.icon}`} />
                                {entry.missingCount.toLocaleString('fa-IR')} ناقص
                              </span>
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-violet-200/70 bg-violet-50/70 px-3 py-2 dark:border-violet-900/30 dark:bg-violet-950/20">
                              <div>
                                <div className="text-xs font-black text-violet-800 dark:text-violet-100">پیشنهاد هوشمند</div>
                                <div className="mt-1 text-xs text-violet-700 dark:text-violet-200">{getTelegramAiAssistantCopy(entry)}</div>
                              </div>
                              <div className="shrink-0 text-left">
                                <div className="text-xs font-bold text-violet-700 dark:text-violet-200">سطح اطمینان</div>
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
                                  variant="secondary"
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
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900/30">
                      <IconGlyph size="lg" className="mx-auto" aria-hidden="true"><i className="fa-solid fa-folder-open" /></IconGlyph>
                      <div className="text-base font-black text-slate-800 dark:text-slate-100">موردی پیدا نشد</div>
                      <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">عبارت جستجو یا فیلتر را تغییر بده تا رویدادهای بیشتری نمایش داده شوند.</div>
                      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
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
                      <div key={category} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800/80 dark:bg-slate-950/55">
                        <Button
                          type="button"
                          onClick={() => toggleTelegramCategory(category)}
                          variant="ghost"
                          size="sm"
                          className="h-auto w-full rounded-none px-4 py-3 text-right shadow-none md:px-5"
                        >
                          <div className="min-w-0">
                            <IconGlyph size="lg" tone="accent">
                              <i className={`fa-solid ${catMeta.icon}`} />
                            </IconGlyph>
                            <div className="min-w-0">
                              <div className="text-base font-black text-slate-950 dark:text-white">{category}</div>
                              <div className="text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">{catMeta.description}</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4" aria-label="خلاصه وضعیت دسته">
                            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                              <span>رویدادها</span>
                              <strong>{items.length.toLocaleString('fa-IR')}</strong>
                            </span>
                            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                              <span>تکمیل‌شده</span>
                              <strong>{configuredCount.toLocaleString('fa-IR')}</strong>
                            </span>
                            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                              <span>آماده</span>
                              <strong>{categoryStatus.configuredAudiences.toLocaleString('fa-IR')}</strong>
                            </span>
                            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                              <span>پیشرفت</span>
                              <strong>{categoryStatus.percent.toLocaleString('fa-IR')}٪</strong>
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <div className={` inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${categoryTone.badge}`}>
                              <i className={`fa-solid ${categoryTone.icon}`} />
                              {categoryTone.label}
                            </div>
                            <IconGlyph size="lg">
                              <i className={`fa-solid ${isCategoryOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
                            </IconGlyph>
                          </div>
                        </Button>

                        {isCategoryOpen && (
                          <div className="border-t border-slate-200/70 bg-slate-50/50 p-3 dark:border-slate-800/70 dark:bg-slate-950/30 md:p-4">
                            <div className="space-y-3">
                              <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800/80 dark:bg-slate-950/50">
                                <div className={` relative px-4 py-4 md:px-5 md:py-4 bg-gradient-to-br ${catMeta.tone}`}>
                                  
                                  <div className="relative grid gap-4 xl:grid-cols-2 xl:items-start">
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
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-4">
                                      <div className="rounded-2xl border border-white/80 bg-white/80 px-3 py-3 dark:border-slate-800/80 dark:bg-slate-950/40">
                                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400">رویدادها</div>
                                        <div className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">{items.length.toLocaleString('fa-IR')}</div>
                                      </div>
                                      <div className="rounded-2xl border border-white/80 bg-white/80 px-3 py-3 dark:border-slate-800/80 dark:bg-slate-950/40">
                                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400">تکمیل‌شده</div>
                                        <div className="mt-1 text-lg font-black text-emerald-700 dark:text-emerald-200">{configuredCount.toLocaleString('fa-IR')}</div>
                                      </div>
                                      <div className="rounded-2xl border border-white/80 bg-white/80 px-3 py-3 dark:border-slate-800/80 dark:bg-slate-950/40">
                                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400">بخش‌های آماده</div>
                                        <div className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">{categoryStatus.configuredAudiences.toLocaleString('fa-IR')}</div>
                                      </div>
                                      <div className="rounded-2xl border border-white/80 bg-white/80 px-3 py-3 dark:border-slate-800/80 dark:bg-slate-950/40">
                                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400">پیشرفت</div>
                                        <div className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">{categoryStatus.percent.toLocaleString('fa-IR')}٪</div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="relative mt-4">
                                    <div className={`h-2 overflow-hidden rounded-full ${categoryTone.rail}`}>
                                      <div className={`h-full rounded-full bg-gradient-to-r ${catMeta.heroBar} transition-all`} style={{ width: `${categoryStatus.percent}%` }} />
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2 border-t border-slate-200/70 bg-white/90 px-4 py-3 dark:border-slate-800/70 dark:bg-slate-950/40 md:px-5">
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
                                    variant="secondary"
                                    size="xs"
                                    leftIcon={<i className="fa-solid fa-bolt" />}
                                  >
                                    فقط اولویت‌بالاها
                                  </Button>
                                </div>
                                {categoryQuickActions.length > 0 && (
                                  <div className="border-t border-dashed border-slate-200/80 bg-slate-50/70 px-4 py-3 dark:border-slate-800/80 dark:bg-slate-950/20 md:px-5">
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs font-black text-slate-500 dark:text-slate-400">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <i className="fa-solid fa-wand-magic-sparkles" />
                                        میان‌برهای هوشمند این دسته
                                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                                          <i className="fa-solid fa-hand-pointer" />
                                          کلیک برای هدایت مستقیم
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
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
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
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
                                            className={` group relative overflow-hidden rounded-2xl border bg-white/95 p-4 text-right shadow-sm transition dark:bg-slate-950/50 ${action.accent}`}
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
                                                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">پرش سریع به مهم‌ترین رویداد این دسته</div>
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
                                                  className="rounded-full px-2.5 py-1 text-xs"
                                                  title={isPinned ? 'حذف مورد از پین‌ها' : 'پین کردن این میان‌بر'}
                                                  leftIcon={<i className="fa-solid fa-thumbtack" />}
                                                >
                                                  {isPinned ? 'پین‌شده' : 'پین'}
                                                </Button>
                                                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-black ${actionTone.badge}`}>
                                                  <i className={`fa-solid ${actionTone.icon}`} />
                                                  {actionTone.label}
                                                </span>
                                              </div>
                                            </div>
                                            <div className="relative mt-3 flex flex-wrap items-center gap-2">
                                              <span className="inline-flex items-center gap-1 rounded-full border border-white/80 bg-white/80 px-2.5 py-1 text-xs font-black text-slate-600 dark:border-slate-800/80 dark:bg-slate-950/40 dark:text-slate-300">
                                                <i className="fa-solid fa-fire" />
                                                استفاده: {usageCount.toLocaleString('fa-IR')}
                                              </span>
                                              {isPinned && (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                                                  <i className="fa-solid fa-star" />
                                                  ثابت در بالا
                                                </span>
                                              )}
                                            </div>
                                            <div className="relative mt-4">
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
                                                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-black ${entry.configured ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200'}`}
                                                  >
                                                    <i className={`fa-solid ${audienceMeta.icon}`} />
                                                    {audienceMeta.label}
                                                  </span>
                                                );
                                              })}
                                            </div>
                                            <div className="relative mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/80 px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-800/80 dark:bg-slate-950/40 dark:text-slate-200">
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
                                  <Surface id={`telegram-template-item-${item.key}`} key={item.key} surface="glass" variant="subtle" scheme="adaptive" className="overflow-hidden rounded-xl scroll-mt-28" wrapContent={false}>
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
                                      className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-3 text-right transition hover:bg-slate-50/80 dark:hover:bg-slate-900/50 md:px-4"
                                    >
                                      <div className="flex min-w-0 items-center gap-3">
                                        <IconGlyph size="md" tone={isConfigured ? 'success' : 'neutral'}>
                                          <i className={item.iconClass} />
                                        </IconGlyph>
                                        <div className="min-w-0">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <div className="text-sm font-black text-slate-900 dark:text-white">{item.label}</div>
                                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${itemTone.badge}`}>
                                              <i className={`fa-solid ${itemTone.icon}`} />
                                              {itemTone.label}
                                            </span>
                                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${getTelegramPriorityMeta(item.key).chip}`}>
                                              <i className={`fa-solid ${getTelegramPriorityMeta(item.key).icon}`} />
                                              {getTelegramPriorityMeta(item.key).label}
                                            </span>
                                          </div>
                                          <div className="mt-0.5 line-clamp-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.preview}</div>
                                          {telegramStudioMode === 'todo' && !itemStatus.allConfigured && (
                                            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
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
                                                className={`group relative inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-bold transition hover:-translate-y-0.5  ${audienceStatus.configured ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200'}`}
                                                title={`رفتن به پنل ${tgAudienceMeta[audienceStatus.aud].label}`}
                                              >
                                                <i className={`fa-solid ${tgAudienceMeta[audienceStatus.aud].icon}`} />
                                                {tgAudienceMeta[audienceStatus.aud].label}: {audienceStatus.label}
                                                <span className="pointer-events-none absolute -top-11 right-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-xl border border-slate-200 bg-slate-950 px-3 py-1.5 text-xs font-bold text-white shadow-xl group-hover:block group-focus-visible:block dark:border-slate-700">
                                                  کلیک کن؛ مستقیم روی بخش {tgAudienceMeta[audienceStatus.aud].label} می‌برمت.
                                                </span>
                                              </button>
                                            ))}
                                          </div>
                                         <div className="mt-2 max-w-sm">
                                            <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
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
                                      <div className="border-t border-slate-200/70 p-3 dark:border-slate-800/70 md:p-4">
                                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-3 py-2.5 dark:border-slate-800/80 dark:bg-slate-900/40">
                                          <div>
                                            <div className="text-sm font-black text-slate-800 dark:text-slate-100">قالب‌های جدا برای مشتری، همکار و مدیر</div>
                                            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">هر مخاطب فیلد مستقل خودش را دارد تا متن‌ها با هم قاطی نشوند.</div>
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
                                                <i className="fa-solid fa-arrow-up-from-bracket text-xs opacity-70" />
                                                <span className="pointer-events-none absolute -top-11 right-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-xl border border-slate-200 bg-slate-950 px-3 py-1.5 text-xs font-bold text-white shadow-xl group-hover:block group-focus-visible:block dark:border-slate-700">
                                                  با یک کلیک همین پنل را باز می‌کنم و اسکرول می‌دهم.
                                                </span>
                                              </button>
                                            ))}
                                          </div>
                                          <div className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                                            روی تگ‌های مشتری، همکار و مدیر بزن تا همان آکاردئون باز شود و با هایلایت نرم دقیقاً روی همان بخش بروی.
                                          </div>
                                        </div>

                                        <div className="space-y-3">
                                          {audienceDefs.map((entry, entryIndex) => {
                                            const panelKey = `${item.key}-${entry.aud}`;
                                            const isAudienceOpen = openTelegramAudiencePanels[panelKey] ?? entryIndex === 0;
                                            return (
                                              <div id={`telegram-template-audience-${item.key}-${entry.aud}`} key={`${item.key}-${entry.aud}`} className={` min-w-0 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/85 shadow-sm ring-1 ring-white/70 dark:border-slate-800/80 dark:bg-slate-900/70 dark:ring-white/5 scroll-mt-32 transition duration-500 ${telegramSpotlightTarget === `telegram-template-audience-${item.key}-${entry.aud}` ? 'ring-2 ring-sky-300 shadow-sm' : ''}`}>
                                                <Button
                                                  type="button"
                                                  onClick={() => toggleTelegramAudiencePanel(panelKey)}
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-auto w-full justify-between rounded-none px-3 py-3 text-right shadow-none"
                                                >
                                                  <div className="flex min-w-0 items-center gap-3">
                                                    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${tgAudienceMeta[entry.aud].chip}`}>
                                                      <i className={`fa-solid ${tgAudienceMeta[entry.aud].icon}`} />
                                                      {tgAudienceMeta[entry.aud].label}
                                                    </span>
                                                    <div className="min-w-0">
                                                      <div className="text-sm font-black text-slate-800 dark:text-slate-100">قالب و تنظیمات {tgAudienceMeta[entry.aud].label}</div>
                                                      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{entry.isConfigured ? 'این قالب شخصی‌سازی شده است.' : 'در حال حاضر از متن پیش‌فرض استفاده می‌شود.'}</div>
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${entry.isConfigured ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'}`}>
                                                      <i className={`fa-solid ${entry.isConfigured ? 'fa-circle-check' : 'fa-wand-magic-sparkles'}`} />
                                                      {entry.isConfigured ? 'آماده' : 'پیش‌فرض'}
                                                    </span>
                                                    <IconGlyph size="md">
                                                      <i className={`fa-solid ${isAudienceOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
                                                    </IconGlyph>
                                                  </div>
                                                </Button>

                                                {isAudienceOpen && (
                                                  <div className="border-t border-slate-200/70 px-3 pb-3 pt-2.5 dark:border-slate-800/70">
                                                    <div className="text-xs leading-6 text-slate-500 dark:text-slate-400">
                                                      قالب و متن مخصوص {tgAudienceMeta[entry.aud].label} را جداگانه اینجا تنظیم کن.
                                                    </div>

                                                    <div className="mt-3 rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/60">
                                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                        <Button
                                                          type="button"
                                                          onClick={() => applyTelegramPreset(item.key, entry.aud)}
                                                          variant="secondary"
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
                                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">درج سریع متغیرها</span>
                                                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{item.allowedVars.length.toLocaleString('fa-IR')} متغیر</span>
                                                      </div>
                                                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                                        {item.allowedVars.map((v) => (
                                                          <Button
                                                            key={`${entry.audienceKey}-${v.key}`}
                                                            type="button"
                                                            onClick={() => setBusinessInfo((prev) => ({ ...(prev as TelegramBusinessInfo), [entry.audienceKey]: `${String((prev as TelegramBusinessInfo)?.[entry.audienceKey] || '')}{${v.key}}` }))}
                                                            variant="ghost"
                                                            size="xs"
                                                            className="w-full justify-between rounded-xl px-2.5 py-2 text-xs"
                                                            title={v.example ? `مثال: ${v.example}` : v.label || v.key}
                                                            rightIcon={<i className="fa-solid fa-plus text-xs" />}
                                                          >
                                                            <span dir="ltr">{`{${v.key}}`}</span>
                                                          </Button>
                                                        ))}
                                                      </div>
                                                    </div>

                                                    <div className="mt-3 rounded-2xl border border-slate-200/70 bg-white/80 p-2 dark:border-slate-800/70 dark:bg-slate-950/50">
                                                      <TextareaField controlOnly
                                                        id={entry.audienceKey}
                                                        name={entry.audienceKey}
                                                        value={entry.value}
                                                        onChange={handleBusinessInfoChange}
                                                        className="min-h-32 w-full rounded-xl border border-slate-200/70 bg-white px-3 py-2.5 text-sm leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 dark:border-slate-800/70 dark:bg-slate-950/70 dark:text-slate-100"
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
