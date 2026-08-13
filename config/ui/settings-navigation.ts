import type { NavItem } from '../../types';

export const SETTINGS_TAB_KEYS = [
  'account',
  'business',
  'style',
  'modules',
  'local',
  'pricing',
  'smart',
  'sms',
  'telegram',
  'reminders',
  'users',
  'data',
] as const;

export type SettingsTabKey = (typeof SETTINGS_TAB_KEYS)[number];

export const isSettingsTabKey = (value: unknown): value is SettingsTabKey =>
  typeof value === 'string' && (SETTINGS_TAB_KEYS as readonly string[]).includes(value);

/**
 * Canonical settings navigation source.
 * These entries render inside the application sidebar; Settings pages must not
 * create a second navigation rail.
 */
export const SETTINGS_NAV_ITEMS: NavItem[] = [
  { id: 'settings-account', name: 'حساب کاربری', icon: 'fa-solid fa-user-shield', path: '/settings/account' },
  { id: 'settings-business', name: 'اطلاعات کسب‌وکار', icon: 'fa-solid fa-store', path: '/settings/business' },
  { id: 'settings-style', name: 'استایل', icon: 'fa-solid fa-palette', path: '/settings/style' },
  { id: 'settings-modules', name: 'ماژول‌های تجاری', icon: 'fa-solid fa-toggle-on', path: '/settings/modules' },
  { id: 'settings-local', name: 'دسترسی محلی و PWA', icon: 'fa-solid fa-network-wired', path: '/settings/local', featureKey: 'local_domain_pwa' },
  { id: 'settings-pricing', name: 'هوش قیمت‌گذاری', icon: 'fa-solid fa-tags', path: '/settings/pricing', featureKey: 'ai_pricing' },
  { id: 'settings-smart', name: 'هوشمندسازی', icon: 'fa-solid fa-microchip', path: '/settings/smart', featureKey: 'smart_insights' },
  { id: 'settings-sms', name: 'پیامک', icon: 'fa-solid fa-message', path: '/settings/sms', featureKey: 'sms' },
  { id: 'settings-telegram', name: 'تلگرام', icon: 'fa-brands fa-telegram', path: '/settings/telegram', featureKey: 'telegram' },
  { id: 'settings-reminders', name: 'قوانین اعلان', icon: 'fa-solid fa-bell', path: '/settings/reminders', featureKey: 'notifications_outbox' },
  { id: 'settings-users', name: 'کاربران و نقش‌ها', icon: 'fa-solid fa-users-gear', path: '/settings/users' },
  { id: 'settings-data', name: 'مدیریت داده‌ها', icon: 'fa-solid fa-database', path: '/settings/data' },
  { id: 'settings-ownership', name: 'ساختار شرکا', icon: 'fa-solid fa-handshake', path: '/settings/store-ownership' },
];

