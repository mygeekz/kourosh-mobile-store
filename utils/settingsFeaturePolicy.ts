import { routeAccessMatrix } from '../app/routes/routeAccessMatrix';
import {
  featureAccessPolicyByKey,
  type FeatureFlagDefinition,
} from './featureFlags';

export type SettingsRuntimeBadge = {
  label: string;
  active: boolean;
  icon: string;
};

export type SettingsFeatureImpact = {
  featureKey: string;
  routeCount: number;
  navCount: number;
  settingsTabCount: number;
  apiGuarded: boolean;
  routePaths: readonly string[];
  navIds: readonly string[];
  settingsTabs: readonly string[];
};

export const settingsFeaturePolicySource = {
  routeImpact: 'utils/featureFlags.ts featureAccessPolicyByKey derived from app/routes/routeAccessMatrix.ts',
  settingsTabs: 'utils/settingsFeaturePolicy.ts settingsTabFeatureRequirements',
  apiRuntime: 'utils/settingsFeaturePolicy.ts apiGuardedFeatureKeys',
} as const;

export const settingsTabFeatureRequirements = {
  local: 'local_domain_pwa',
  pricing: 'ai_pricing',
  smart: 'smart_insights',
  sms: 'sms',
  telegram: 'telegram',
  reminders: 'notifications_outbox',
} as const;

export const apiGuardedFeatureKeys = [
  'cash_sales',
  'installments',
  'products_inventory',
  'mobile_phones',
  'purchases_stock_counts',
  'people_crm',
  'repairs_services',
  'notifications_outbox',
  'sms',
  'telegram',
  'advanced_reports',
  'smart_insights',
  'ai_pricing',
  'audit_log',
  'local_domain_pwa',
] as const;

const apiGuardedFeatureKeySet = new Set<string>(apiGuardedFeatureKeys);

const unique = <T,>(items: readonly T[]): T[] => Array.from(new Set(items));

const getSettingsTabsForFeature = (featureKey: string): string[] => Object.entries(settingsTabFeatureRequirements)
  .filter(([, requiredFeatureKey]) => requiredFeatureKey === featureKey)
  .map(([tabKey]) => tabKey);

const routeMatrixPathsForFeature = (featureKey: string): string[] => routeAccessMatrix
  .filter((entry) => (entry.featureFlags as readonly string[]).includes(featureKey))
  .map((entry) => entry.effectivePath)
  .filter((path) => path && path !== '*');

export function getSettingsFeatureImpact(feature: Pick<FeatureFlagDefinition, 'key' | 'routes' | 'navIds'>): SettingsFeatureImpact {
  const policyEntry = featureAccessPolicyByKey[feature.key];
  const routePaths = unique([
    ...(policyEntry?.routes ?? []),
    ...(feature.routes ?? []),
    ...routeMatrixPathsForFeature(feature.key),
  ]).sort();
  const navIds = unique([
    ...(policyEntry?.navIds ?? []),
    ...(feature.navIds ?? []),
  ]).sort();
  const settingsTabs = getSettingsTabsForFeature(feature.key).sort();

  return {
    featureKey: feature.key,
    routeCount: routePaths.length,
    navCount: navIds.length,
    settingsTabCount: settingsTabs.length,
    apiGuarded: apiGuardedFeatureKeySet.has(feature.key),
    routePaths,
    navIds,
    settingsTabs,
  };
}

export function getSettingsFeatureRuntimeBadges(feature: Pick<FeatureFlagDefinition, 'key' | 'routes' | 'navIds'>): SettingsRuntimeBadge[] {
  const impact = getSettingsFeatureImpact(feature);
  return [
    { label: 'منو', active: impact.navCount > 0, icon: 'fa-compass' },
    { label: 'صفحه', active: impact.routeCount > 0, icon: 'fa-window-maximize' },
    { label: 'تنظیمات', active: impact.settingsTabCount > 0, icon: 'fa-sliders' },
    { label: 'درگاه', active: impact.apiGuarded, icon: 'fa-server' },
  ];
}

export function getSettingsFeatureImpactText(feature: Pick<FeatureFlagDefinition, 'key' | 'routes' | 'navIds'>): string {
  const impact = getSettingsFeatureImpact(feature);
  const parts = [
    impact.navCount > 0 ? `${impact.navCount.toLocaleString('fa-IR')} آیتم منو` : null,
    impact.routeCount > 0 ? `${impact.routeCount.toLocaleString('fa-IR')} مسیر` : null,
    impact.settingsTabCount > 0 ? `${impact.settingsTabCount.toLocaleString('fa-IR')} تب تنظیمات` : null,
    impact.apiGuarded ? 'درگاه سرور' : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join('، ') : 'اثر مستقیم ثبت‌شده‌ای روی مسیر یا منو ندارد';
}

export function getSettingsRequiredFeatureForTab(tabKey: string): string | undefined {
  return settingsTabFeatureRequirements[tabKey as keyof typeof settingsTabFeatureRequirements];
}

export function isSettingsTabEnabledByFeaturePolicy(
  tabKey: string,
  isFeatureEnabledByKey: (featureKey: string) => boolean,
): boolean {
  const requiredFeatureKey = getSettingsRequiredFeatureForTab(tabKey);
  return !requiredFeatureKey || isFeatureEnabledByKey(requiredFeatureKey);
}
