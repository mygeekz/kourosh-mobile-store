import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const files = {
  settingsFeaturePolicy: path.join(root, 'utils/settingsFeaturePolicy.ts'),
  settingsPage: path.join(root, 'pages/Settings.tsx'),
  modulesPanel: path.join(root, 'pages/settings/SettingsModulesPanel.tsx'),
  featureFlags: path.join(root, 'utils/featureFlags.ts'),
  routeMatrixJson: path.join(root, 'docs/access/route-access-matrix.json'),
};

const read = (filePath) => fs.readFileSync(filePath, 'utf8');
const problems = [];

for (const [name, filePath] of Object.entries(files)) {
  if (!fs.existsSync(filePath)) problems.push(`Missing settings feature policy file: ${name} (${path.relative(root, filePath)})`);
}

if (problems.length === 0) {
  const settingsFeaturePolicy = read(files.settingsFeaturePolicy);
  const settingsPage = read(files.settingsPage);
  const modulesPanel = read(files.modulesPanel);
  const featureFlags = read(files.featureFlags);
  const routeMatrix = JSON.parse(read(files.routeMatrixJson));

  for (const requiredExport of [
    'settingsFeaturePolicySource',
    'settingsTabFeatureRequirements',
    'apiGuardedFeatureKeys',
    'getSettingsFeatureImpact',
    'getSettingsFeatureRuntimeBadges',
    'getSettingsFeatureImpactText',
    'isSettingsTabEnabledByFeaturePolicy',
  ]) {
    if (!new RegExp(`export\\s+(?:function|const)\\s+${requiredExport}\\b`).test(settingsFeaturePolicy)) {
      problems.push(`Missing settings feature policy export: ${requiredExport}.`);
    }
  }

  if (!settingsFeaturePolicy.includes("from './featureFlags'") || !settingsFeaturePolicy.includes("from '../app/routes/routeAccessMatrix'")) {
    problems.push('utils/settingsFeaturePolicy.ts must compose featureFlags and routeAccessMatrix instead of inventing isolated toggle impact rules.');
  }

  if (!settingsPage.includes('../utils/settingsFeaturePolicy')) {
    problems.push('pages/Settings.tsx must consume utils/settingsFeaturePolicy.ts for settings-tab and runtime-badge decisions.');
  }

  if (!modulesPanel.includes('../../utils/settingsFeaturePolicy')) {
    problems.push('SettingsModulesPanel must consume utils/settingsFeaturePolicy.ts for feature impact copy.');
  }

  if (/const\s+apiGuardedModuleKeys\s*=/.test(settingsPage)) {
    problems.push('pages/Settings.tsx still owns apiGuardedModuleKeys; move runtime impact policy to utils/settingsFeaturePolicy.ts.');
  }

  if (/const\s+settingsTabFeatureRequirements\s*=/.test(settingsPage)) {
    problems.push('pages/Settings.tsx still owns settingsTabFeatureRequirements; move settings-tab policy to utils/settingsFeaturePolicy.ts.');
  }

  const featureDefinitionKeys = [...new Set([...featureFlags.matchAll(/\bkey:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]))];
  const policyFeatureRefs = [...new Set([...settingsFeaturePolicy.matchAll(/['"]([a-z][a-z0-9_]+)['"]/g)].map((match) => match[1]))]
    .filter((key) => key.startsWith('feature_') === false)
    .filter((key) => [
      'cash_sales', 'installments', 'products_inventory', 'mobile_phones', 'purchases_stock_counts', 'people_crm',
      'repairs_services', 'notifications_outbox', 'sms', 'telegram', 'advanced_reports', 'smart_insights',
      'ai_pricing', 'audit_log', 'local_domain_pwa', 'dashboard_experience',
    ].includes(key));
  const undefinedPolicyFeatureRefs = policyFeatureRefs.filter((key) => !featureDefinitionKeys.includes(key));
  if (undefinedPolicyFeatureRefs.length > 0) {
    problems.push(`Settings feature policy references undefined feature flags: ${undefinedPolicyFeatureRefs.join(', ')}`);
  }

  const routeFeatureRefs = [...new Set(routeMatrix.flatMap((entry) => entry.featureFlags ?? []))];
  const routeRefsMissingFeatureDefinition = routeFeatureRefs.filter((key) => !featureDefinitionKeys.includes(key));
  if (routeRefsMissingFeatureDefinition.length > 0) {
    problems.push(`Route matrix feature refs missing definitions: ${routeRefsMissingFeatureDefinition.join(', ')}`);
  }

  if (!modulesPanel.includes('اثر خاموش/روشن شدن')) {
    problems.push('SettingsModulesPanel should explain feature toggle impact so admins understand route/menu/settings/API consequences.');
  }

  console.log(`Settings feature policy audit inspected ${featureDefinitionKeys.length} feature definitions and ${routeFeatureRefs.length} routed feature keys.`);
}

if (problems.length > 0) {
  console.error('Settings feature policy audit failed:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log('Settings feature policy audit passed: settings tabs, module impact badges and feature-toggle copy share one policy layer.');
