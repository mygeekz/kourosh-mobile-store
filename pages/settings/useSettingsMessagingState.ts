import { useState } from 'react';
import {
  type TelegramControlCenterState,
  type TelegramDiagnosticsState,
  type TelegramHealthState,
  type TelegramRecentChat,
  type TelegramTemplateVariable,
} from './index';

export function useSettingsMessagingState() {
	// ---- SMS delivery verification modal
	const [smsCheckOpen, setSmsCheckOpen] = useState(false);
	const [smsCheckTitle, setSmsCheckTitle] = useState('بررسی و ادامه ارسال پیامک');
	const [smsCheckBodyId, setSmsCheckBodyId] = useState('');
	const [smsCheckTokenLabels, setSmsCheckTokenLabels] = useState<string[]>([]);
	// ---- SMS preview modal
	const [smsPrevOpen, setSmsPrevOpen] = useState(false);

  const [tgCheckOpen, setTgCheckOpen] = useState(false);
  const [tgCheckTitle, setTgCheckTitle] = useState('');
  const [tgCheckTemplate, setTgCheckTemplate] = useState('');
  const [tgCheckFormat, setTgCheckFormat] = useState<'text'|'markdown'|'html'>('text');
  const [tgCheckAllowedVars, setTgCheckAllowedVars] = useState<TelegramTemplateVariable[]>([]);
	const [smsPrevTitle, setSmsPrevTitle] = useState('پیش‌نمایش پیامک');
	const [smsPrevTemplate, setSmsPrevTemplate] = useState('');
	const [smsPrevTokenLabels, setSmsPrevTokenLabels] = useState<string[]>([]);

	// ---- SMS Health / Bulk Check
	const [smsBulkOpen, setSmsBulkOpen] = useState(false);
	const [smsBulkDefaults, setSmsBulkDefaults] = useState<string[]>([]);

  // ---- Telegram Health / Quick Check
  const [tgHealth, setTgHealth] = useState<TelegramHealthState | null>(null);
  const [tgIsChecking, setTgIsChecking] = useState(false);
  const [tgDiagnostics, setTgDiagnostics] = useState<TelegramDiagnosticsState | null>(null);
  const [tgDiagnosticsLoading, setTgDiagnosticsLoading] = useState(false);
  const [tgDiagnosticsBusyAction, setTgDiagnosticsBusyAction] = useState<string | null>(null);
  const [showTelegramToken, setShowTelegramToken] = useState(false);
  const [tgQuickMsg, setTgQuickMsg] = useState('✅ بررسی و ادامه اتصال تلگرام کوروش');
  const [tgIsSendingQuick, setTgIsSendingQuick] = useState(false);
  const [tgChatLookupLoading, setTgChatLookupLoading] = useState(false);
  const [tgRecentChats, setTgRecentChats] = useState<TelegramRecentChat[]>([]);
  const [tgChatLookupHint, setTgChatLookupHint] = useState('');

  // ---- Telegram مرکز کنترل
  const [tgCC, setTgCC] = useState<TelegramControlCenterState | null>(null);
  const [, setTgCCLoading] = useState(false);
  const [, setTgCCError] = useState<string | null>(null);
  const [, setTgBulkBusy] = useState(false);
  const [tgCleanupDays] = useState(30);
  const [openTelegramCategories, setOpenTelegramCategories] = useState<Record<string, boolean>>({});
  const [openTelegramItems, setOpenTelegramItems] = useState<Record<string, boolean>>({});
  const [openTelegramAudiencePanels, setOpenTelegramAudiencePanels] = useState<Record<string, boolean>>({});
  const [telegramTemplateSearch, setTelegramTemplateSearch] = useState('');
  const [telegramTemplateFilter, setTelegramTemplateFilter] = useState<'all' | 'configured' | 'incomplete'>('all');
  const [telegramStudioMode, setTelegramStudioMode] = useState<'quick' | 'all' | 'incomplete' | 'todo'>('quick');
  const [telegramTodoDoneMap, setTelegramTodoDoneMap] = useState<Record<string, boolean>>({});
  const [telegramTodoLaterMap, setTelegramTodoLaterMap] = useState<Record<string, string>>({});
  const [telegramPinnedQuickActions, setTelegramPinnedQuickActions] = useState<Record<string, boolean>>({});
  const [telegramQuickActionUsageMap, setTelegramQuickActionUsageMap] = useState<Record<string, number>>({});
  const [settingsViewMode, setSettingsViewMode] = useState<'simple' | 'advanced'>(() => {
    try { return localStorage.getItem('settings.view.mode') === 'advanced' ? 'advanced' : 'simple'; } catch { return 'simple'; }
  });
  return { smsCheckOpen, setSmsCheckOpen, smsCheckTitle, setSmsCheckTitle, smsCheckBodyId, setSmsCheckBodyId, smsCheckTokenLabels, setSmsCheckTokenLabels, smsPrevOpen, setSmsPrevOpen, tgCheckOpen, setTgCheckOpen, tgCheckTitle, setTgCheckTitle, tgCheckTemplate, setTgCheckTemplate, tgCheckFormat, setTgCheckFormat, tgCheckAllowedVars, setTgCheckAllowedVars, smsPrevTitle, setSmsPrevTitle, smsPrevTemplate, setSmsPrevTemplate, smsPrevTokenLabels, setSmsPrevTokenLabels, smsBulkOpen, setSmsBulkOpen, smsBulkDefaults, setSmsBulkDefaults, tgHealth, setTgHealth, tgIsChecking, setTgIsChecking, tgDiagnostics, setTgDiagnostics, tgDiagnosticsLoading, setTgDiagnosticsLoading, tgDiagnosticsBusyAction, setTgDiagnosticsBusyAction, showTelegramToken, setShowTelegramToken, tgQuickMsg, setTgQuickMsg, tgIsSendingQuick, setTgIsSendingQuick, tgChatLookupLoading, setTgChatLookupLoading, tgRecentChats, setTgRecentChats, tgChatLookupHint, setTgChatLookupHint, tgCC, setTgCC, openTelegramCategories, setOpenTelegramCategories, openTelegramItems, setOpenTelegramItems, openTelegramAudiencePanels, setOpenTelegramAudiencePanels, telegramTemplateSearch, setTelegramTemplateSearch, telegramTemplateFilter, setTelegramTemplateFilter, telegramStudioMode, setTelegramStudioMode, telegramTodoDoneMap, setTelegramTodoDoneMap, telegramTodoLaterMap, setTelegramTodoLaterMap, telegramPinnedQuickActions, setTelegramPinnedQuickActions, telegramQuickActionUsageMap, setTelegramQuickActionUsageMap, settingsViewMode, setSettingsViewMode, tgCleanupDays, setTgCCLoading, setTgCCError, setTgBulkBusy };
}
