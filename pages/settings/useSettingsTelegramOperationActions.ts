import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { BusinessInformationSettings } from '../../types';
import type {
  TelegramAudience,
  TelegramGroupedTemplateDefs,
  TelegramTemplateDef,
  TelegramTemplateFilter,
  TelegramStudioMode,
  TelegramTodoEntry,
} from './settingsPanelTypes';
import { getTelegramAudienceFormatKey, getTelegramAudienceKey, tgAudienceMeta } from './settingsTelegramViewModels';

type BooleanMap = Record<string, boolean>;
type LaterMap = Record<string, string>;
type UsageMap = Record<string, number>;

type UseSettingsTelegramOperationActionsArgs = {
  buildTelegramAudiencePreset: (key: string, audience: TelegramAudience) => string;
  setBusinessInfo: Dispatch<SetStateAction<BusinessInformationSettings>>;
  telegramGroupedDefs: TelegramGroupedTemplateDefs;
  telegramTemplateDefs: TelegramTemplateDef[];
  telegramTodoItems: TelegramTodoEntry[];
  openTelegramCategories: BooleanMap;
  setOpenTelegramCategories: Dispatch<SetStateAction<BooleanMap>>;
  openTelegramItems: BooleanMap;
  setOpenTelegramItems: Dispatch<SetStateAction<BooleanMap>>;
  openTelegramAudiencePanels: BooleanMap;
  setOpenTelegramAudiencePanels: Dispatch<SetStateAction<BooleanMap>>;
  telegramTemplateSearch: string;
  setTelegramTemplateSearch: Dispatch<SetStateAction<string>>;
  telegramTemplateFilter: TelegramTemplateFilter;
  setTelegramTemplateFilter: Dispatch<SetStateAction<'all' | 'configured' | 'incomplete'>>;
  telegramStudioMode: TelegramStudioMode;
  setTelegramStudioMode: Dispatch<SetStateAction<'quick' | 'all' | 'incomplete' | 'todo'>>;
  telegramTodoDoneMap: BooleanMap;
  setTelegramTodoDoneMap: Dispatch<SetStateAction<BooleanMap>>;
  telegramTodoLaterMap: LaterMap;
  setTelegramTodoLaterMap: Dispatch<SetStateAction<LaterMap>>;
  telegramPinnedQuickActions: BooleanMap;
  setTelegramPinnedQuickActions: Dispatch<SetStateAction<BooleanMap>>;
  telegramQuickActionUsageMap: UsageMap;
  setTelegramQuickActionUsageMap: Dispatch<SetStateAction<UsageMap>>;
  settingsViewMode: 'simple' | 'advanced';
};

export function useSettingsTelegramOperationActions({
  buildTelegramAudiencePreset,
  setBusinessInfo,
  telegramGroupedDefs,
  telegramTemplateDefs,
  telegramTodoItems,
  openTelegramCategories,
  setOpenTelegramCategories,
  openTelegramItems,
  setOpenTelegramItems,
  openTelegramAudiencePanels,
  setOpenTelegramAudiencePanels,
  telegramTemplateSearch,
  setTelegramTemplateSearch,
  telegramTemplateFilter,
  setTelegramTemplateFilter,
  telegramStudioMode,
  setTelegramStudioMode,
  telegramTodoDoneMap,
  setTelegramTodoDoneMap,
  telegramTodoLaterMap,
  setTelegramTodoLaterMap,
  telegramPinnedQuickActions,
  setTelegramPinnedQuickActions,
  telegramQuickActionUsageMap,
  setTelegramQuickActionUsageMap,
  settingsViewMode,
}: UseSettingsTelegramOperationActionsArgs) {
  const [telegramSpotlightTarget, setTelegramSpotlightTarget] = useState<string | null>(null);

  const applyTelegramPreset = (key: string, audience: TelegramAudience) => {
    const value = buildTelegramAudiencePreset(key, audience).trim();
    if (!value) return;
    const audienceKey = getTelegramAudienceKey(key, audience);
    const formatKey = getTelegramAudienceFormatKey(key, audience);
    setBusinessInfo((prev) => ({
      ...prev,
      [audienceKey]: value,
      [formatKey]: 'html',
    }));
  };

  const toggleTelegramQuickActionPin = (actionKey: string) => {
    setTelegramPinnedQuickActions((prev) => ({ ...prev, [actionKey]: !prev[actionKey] }));
  };

  const bumpTelegramQuickActionUsage = (actionKey: string) => {
    setTelegramQuickActionUsageMap((prev) => ({ ...prev, [actionKey]: (prev[actionKey] || 0) + 1 }));
  };

  const resetTelegramQuickActionPersonalization = () => {
    setTelegramPinnedQuickActions({});
    setTelegramQuickActionUsageMap({});
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem('settings.telegramStudio.ui');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.categories && typeof parsed.categories === 'object') setOpenTelegramCategories(parsed.categories);
      if (parsed?.items && typeof parsed.items === 'object') setOpenTelegramItems(parsed.items);
      if (parsed?.audiences && typeof parsed.audiences === 'object') setOpenTelegramAudiencePanels(parsed.audiences);
      if (typeof parsed?.search === 'string') setTelegramTemplateSearch(parsed.search);
      if (parsed?.filter === 'all' || parsed?.filter === 'configured' || parsed?.filter === 'incomplete') setTelegramTemplateFilter(parsed.filter);
      if (parsed?.mode === 'quick' || parsed?.mode === 'all' || parsed?.mode === 'incomplete' || parsed?.mode === 'todo') setTelegramStudioMode(parsed.mode);
      if (parsed?.todoDone && typeof parsed.todoDone === 'object') setTelegramTodoDoneMap(parsed.todoDone);
      if (parsed?.todoLater && typeof parsed.todoLater === 'object') setTelegramTodoLaterMap(parsed.todoLater);
      if (parsed?.pinnedQuickActions && typeof parsed.pinnedQuickActions === 'object') setTelegramPinnedQuickActions(parsed.pinnedQuickActions);
      if (parsed?.quickActionUsage && typeof parsed.quickActionUsage === 'object') setTelegramQuickActionUsageMap(parsed.quickActionUsage);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('settings.telegramStudio.ui', JSON.stringify({
        categories: openTelegramCategories,
        items: openTelegramItems,
        audiences: openTelegramAudiencePanels,
        search: telegramTemplateSearch,
        filter: telegramTemplateFilter,
        mode: telegramStudioMode,
        todoDone: telegramTodoDoneMap,
        todoLater: telegramTodoLaterMap,
        pinnedQuickActions: telegramPinnedQuickActions,
        quickActionUsage: telegramQuickActionUsageMap,
      }));
    } catch {}
  }, [openTelegramCategories, openTelegramItems, openTelegramAudiencePanels, telegramTemplateSearch, telegramTemplateFilter, telegramStudioMode, telegramTodoDoneMap, telegramTodoLaterMap, telegramPinnedQuickActions, telegramQuickActionUsageMap]);

  useEffect(() => {
    try { localStorage.setItem('settings.view.mode', settingsViewMode); } catch {}
  }, [settingsViewMode]);

  useEffect(() => {
    if (!telegramGroupedDefs.length) return;
    setOpenTelegramCategories((prev) => {
      if (Object.keys(prev).length) return prev;
      const firstCategory = telegramGroupedDefs[0]?.[0];
      return firstCategory ? { [firstCategory]: true } : prev;
    });
  }, [telegramGroupedDefs.length]);

  const toggleTelegramCategory = (category: string) => {
    setOpenTelegramCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const toggleTelegramItem = (itemKey: string) => {
    setOpenTelegramItems((prev) => ({ ...prev, [itemKey]: !prev[itemKey] }));
  };

  const setAllTelegramCategories = (isOpen: boolean) => {
    const next = Object.fromEntries(telegramGroupedDefs.map(([category]) => [category, isOpen]));
    setOpenTelegramCategories(next);
  };

  const setAllTelegramItems = (isOpen: boolean) => {
    const next = Object.fromEntries(telegramTemplateDefs.map((item) => [item.key, isOpen]));
    setOpenTelegramItems(next);
  };

  const clearTelegramStudioFilters = () => {
    setTelegramTemplateSearch('');
    setTelegramTemplateFilter('all');
    setTelegramStudioMode('quick');
  };

  const toggleTelegramAudiencePanel = (panelKey: string) => {
    setOpenTelegramAudiencePanels((prev) => ({ ...prev, [panelKey]: !prev[panelKey] }));
  };

  const spotlightTelegramTarget = (targetId: string) => {
    setTelegramSpotlightTarget(targetId);
    window.setTimeout(() => {
      setTelegramSpotlightTarget((prev) => (prev === targetId ? null : prev));
    }, 2200);
  };

  const jumpToTelegramTemplate = (itemKey: string, audience?: TelegramAudience) => {
    const targetItem = telegramTemplateDefs.find((entry) => entry.key === itemKey);
    if (!targetItem) return;
    setTelegramStudioMode('todo');
    setOpenTelegramCategories((prev) => ({ ...prev, [targetItem.category]: true }));
    setOpenTelegramItems((prev) => ({ ...prev, [itemKey]: true }));
    if (audience) {
      const panelKey = `${itemKey}-${audience}`;
      setOpenTelegramAudiencePanels((prev) => ({ ...prev, [panelKey]: true }));
    }
    const targetId = audience ? `tg-audience-${itemKey}-${audience}` : `tg-item-${itemKey}`;
    setTimeout(() => {
      const element = document.getElementById(targetId);
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      spotlightTelegramTarget(targetId);
    }, 80);
  };

  const focusTelegramAudience = (itemKey: string, audience: TelegramAudience) => {
    const targetItem = telegramTemplateDefs.find((entry) => entry.key === itemKey);
    if (!targetItem) return;
    setOpenTelegramCategories((prev) => ({ ...prev, [targetItem.category]: true }));
    setOpenTelegramItems((prev) => ({ ...prev, [itemKey]: true }));
    const panelKey = `${itemKey}-${audience}`;
    setOpenTelegramAudiencePanels((prev) => ({ ...prev, [panelKey]: true }));
    const targetId = `tg-audience-${itemKey}-${audience}`;
    setTimeout(() => {
      const element = document.getElementById(targetId);
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      spotlightTelegramTarget(targetId);
    }, 90);
  };

  const jumpToFirstIncompleteTelegramTemplate = () => {
    const first = telegramTodoItems[0];
    if (!first) return;
    jumpToTelegramTemplate(first.item.key, first.missingAudiences[0]?.aud);
  };

  const openUrgentTelegramTodos = () => {
    const urgentItems = telegramTodoItems.filter((entry) => entry.priority.level === 1);
    const urgentCategories = Array.from(new Set(urgentItems.map((entry) => entry.item.category)));
    setTelegramStudioMode('todo');
    setOpenTelegramCategories((prev) => ({
      ...prev,
      ...Object.fromEntries(urgentCategories.map((category) => [category, true])),
    }));
    setOpenTelegramItems((prev) => ({
      ...prev,
      ...Object.fromEntries(urgentItems.map((entry) => [entry.item.key, true])),
    }));
    setOpenTelegramAudiencePanels((prev) => ({
      ...prev,
      ...Object.fromEntries(
        urgentItems.flatMap((entry) => entry.missingAudiences.map((aud) => [`${entry.item.key}-${aud.aud}`, true]))
      ),
    }));
    if (urgentItems[0]) {
      setTimeout(() => {
        const element = document.getElementById(`tg-item-${urgentItems[0].item.key}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
  };

  const getTelegramTodoNextStep = (entry: { item: TelegramTemplateDef; missingAudiences: Array<{ aud: TelegramAudience; configured: boolean; label: string }>; missingCount: number }) => {
    const firstMissing = entry.missingAudiences[0];
    if (!firstMissing) return 'فقط بازبینی نهایی باقی مانده';
    return `${tgAudienceMeta[firstMissing.aud].label} را کامل کن`;
  };

  const getTelegramAiAssistantCopy = (entry: { item: TelegramTemplateDef; priority: { label: string; level: number }; firstMissing?: { aud: TelegramAudience } | null; suggestedPreset?: string; aiConfidence: number; deferredUntil?: string | null }) => {
    if (entry.deferredUntil) return `این مورد فعلاً برای بعد نگه داشته شده و هر زمان خواستی می‌توانی دوباره فعالش کنی.`;
    if (!entry.firstMissing) return 'این مورد تقریباً کامل است و فقط یک بازبینی سریع لازم دارد.';
    if (entry.suggestedPreset) return `برای ${tgAudienceMeta[entry.firstMissing.aud].label} یک متن پیشنهادی آماده دارم و با اطمینان ${entry.aiConfidence.toLocaleString('fa-IR')}٪ می‌توانم همان را به‌عنوان نقطه شروع اعمال کنم.`;
    return `بهترین قدم بعدی این است که بخش ${tgAudienceMeta[entry.firstMissing.aud].label} را کامل کنی تا این رویداد از حالت ناقص خارج شود.`;
  };

  const markTelegramTodoDone = (itemKey: string) => {
    setTelegramTodoDoneMap((prev) => ({ ...prev, [itemKey]: true }));
    setTelegramTodoLaterMap((prev) => {
      const next = { ...prev };
      delete next[itemKey];
      return next;
    });
  };

  const deferTelegramTodo = (itemKey: string) => {
    setTelegramTodoLaterMap((prev) => ({ ...prev, [itemKey]: new Date().toISOString() }));
  };

  const reactivateTelegramTodo = (itemKey: string) => {
    setTelegramTodoLaterMap((prev) => {
      const next = { ...prev };
      delete next[itemKey];
      return next;
    });
    setTelegramTodoDoneMap((prev) => {
      const next = { ...prev };
      delete next[itemKey];
      return next;
    });
  };

  const resetTelegramTodoAssistant = () => {
    setTelegramTodoDoneMap({});
    setTelegramTodoLaterMap({});
  };

  const scrollToTelegramAnchor = (anchorId: string) => {
    setTimeout(() => {
      const el = document.getElementById(anchorId);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      spotlightTelegramTarget(anchorId);
    }, 60);
  };

  return {
    applyTelegramPreset,
    bumpTelegramQuickActionUsage,
    clearTelegramStudioFilters,
    deferTelegramTodo,
    focusTelegramAudience,
    getTelegramAiAssistantCopy,
    getTelegramTodoNextStep,
    jumpToFirstIncompleteTelegramTemplate,
    jumpToTelegramTemplate,
    markTelegramTodoDone,
    openUrgentTelegramTodos,
    reactivateTelegramTodo,
    resetTelegramQuickActionPersonalization,
    resetTelegramTodoAssistant,
    scrollToTelegramAnchor,
    setAllTelegramCategories,
    setAllTelegramItems,
    telegramSpotlightTarget,
    toggleTelegramAudiencePanel,
    toggleTelegramCategory,
    toggleTelegramItem,
    toggleTelegramQuickActionPin,
  };
}
