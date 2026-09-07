import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const featureFlagsPath = path.join(root, 'utils/featureFlags.ts');
const routeManifestPath = path.join(root, 'app/routes/routeManifest.tsx');
const routeMatrixPath = path.join(root, 'docs/access/route-access-matrix.json');
const constantsPath = path.join(root, 'constants.tsx');

const featureFlags = fs.readFileSync(featureFlagsPath, 'utf8');
const routeManifest = fs.readFileSync(routeManifestPath, 'utf8');
const constants = fs.readFileSync(constantsPath, 'utf8');
const routeMatrix = JSON.parse(fs.readFileSync(routeMatrixPath, 'utf8'));

const unique = (items) => [...new Set(items)].sort();
const featureDefinitionKeys = unique([...featureFlags.matchAll(/\bkey:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]));
const routeMatrixFeatureKeys = unique(routeMatrix.flatMap((entry) => entry.featureFlags ?? []));
const manifestGatedFeatureKeys = unique([...routeManifest.matchAll(/\bgated\(\s*['"]([^'"]+)['"]/g)].map((match) => match[1]));
const navFeatureKeys = unique([...constants.matchAll(/\bfeatureKey:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]));

const problems = [];

if (!featureFlags.includes("from '../app/routes/routeAccessMatrix'")) {
  problems.push('utils/featureFlags.ts must import routeAccessMatrix for route feature policy.');
}

for (const requiredExport of [
  'featureAccessPolicy',
  'featureAccessPolicyByKey',
  'featureAccessPolicySource',
  'getFeatureFlagsForPath',
  'getFeatureFlagForNavItem',
  'areFeatureFlagsEnabled',
  'isFeatureEnabledForPath',
  'filterNavItemsByFeatures',
]) {
  if (!new RegExp(`export\\s+const\\s+${requiredExport}\\b`).test(featureFlags)) {
    problems.push(`Missing feature policy export: ${requiredExport}.`);
  }
}

const legacyRoutesScanner = /FEATURE_FLAGS\.find\(\(feature\)\s*=>\s*feature\.routes\?\.some/.test(featureFlags);
if (legacyRoutesScanner) {
  problems.push('isFeatureEnabledForPath still scans FEATURE_FLAGS.routes directly instead of deriving path policy from featureAccessPolicy.');
}

const undefinedMatrixFlags = routeMatrixFeatureKeys.filter((key) => !featureDefinitionKeys.includes(key));
if (undefinedMatrixFlags.length > 0) {
  problems.push(`Route matrix references undefined feature flags: ${undefinedMatrixFlags.join(', ')}`);
}

const undefinedManifestFlags = manifestGatedFeatureKeys.filter((key) => !featureDefinitionKeys.includes(key));
if (undefinedManifestFlags.length > 0) {
  problems.push(`Route manifest gates undefined feature flags: ${undefinedManifestFlags.join(', ')}`);
}

const undefinedNavFlags = navFeatureKeys.filter((key) => !featureDefinitionKeys.includes(key));
if (undefinedNavFlags.length > 0) {
  problems.push(`Navigation references undefined feature flags: ${undefinedNavFlags.join(', ')}`);
}

const matrixMissingManifestFlag = manifestGatedFeatureKeys.filter((key) => !routeMatrixFeatureKeys.includes(key));
if (matrixMissingManifestFlag.length > 0) {
  problems.push(`Route manifest gated flags missing from access matrix: ${matrixMissingManifestFlag.join(', ')}`);
}

if (problems.length > 0) {
  console.error('Feature access policy audit failed:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`Feature access policy audit passed: ${featureDefinitionKeys.length} definitions, ${routeMatrixFeatureKeys.length} routed flags, ${navFeatureKeys.length} nav flags.`);
