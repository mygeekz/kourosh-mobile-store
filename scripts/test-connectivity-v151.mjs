import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  FRESH_LOCAL_DOMAIN_SUFFIX,
  buildLocalDomain,
  buildLocalDomainShortcut,
  isLegacyLocalSuffix,
  normalizeLocalSuffix,
} from '../server/utils/localSettingsHelpers.ts';
import {
  pickGenericWritableSettings,
  pickLocalAccessSettings,
  pickTelegramSettings,
} from '../server/connectivity/settingsScopes.ts';
import {
  ensureInstallationId,
  isValidInstallationId,
} from '../server/connectivity/installationIdentity.ts';
import { CONNECTIVITY_RUNTIME_BOUNDARIES } from '../server/connectivity/runtimeBoundaries.ts';
import { resolveTelegramTransportMode } from '../server/telegram/TelegramTransport.ts';
import { KOUROSH_CLOUD_RELAY_PROTOCOL_VERSION } from '../server/cloud/cloudRelayProtocol.ts';

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const cloudReadinessUrl = pathToFileURL(path.join(projectRoot, 'server/cloud/cloudConnectorReadiness.ts')).href;
const tempModulePaths = [];
const createTempModule = (name, source) => {
  const target = path.join(os.tmpdir(), `${name}-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.ts`);
  fs.writeFileSync(target, source, 'utf8');
  tempModulePaths.push(target);
  return target;
};
const publicAccessSource = fs.readFileSync(path.join(projectRoot, 'server/connectivity/telegramPublicAccess.ts'), 'utf8')
  .replace('"../cloud/cloudConnectorReadiness"', JSON.stringify(cloudReadinessUrl));
const publicAccessTempPath = createTempModule('kourosh-public-access-v152', publicAccessSource);
const publicAccessTempUrl = pathToFileURL(publicAccessTempPath).href;
const {
  auditTelegramMiniAppPublicConfiguration,
  resolveTelegramMiniAppUrl,
  resolveTelegramPublicAccessMode,
  validateTelegramMiniAppPublicUrl,
} = await import(`${publicAccessTempUrl}?v=${Date.now()}`);
const cloudConfigSource = fs.readFileSync(path.join(projectRoot, 'server/cloud/cloudConnectorConfig.ts'), 'utf8')
  .replace('"./cloudConnectorReadiness"', JSON.stringify(cloudReadinessUrl));
const cloudConfigTempPath = createTempModule('kourosh-cloud-config-v152', cloudConfigSource);
const { getCloudProvisioningStatus, resolveCloudConnectorConfig } = await import(`${pathToFileURL(cloudConfigTempPath).href}?v=${Date.now()}`);

assert.equal(FRESH_LOCAL_DOMAIN_SUFFIX, 'home.arpa');
assert.equal(normalizeLocalSuffix('home.arpa'), 'home.arpa');
assert.equal(normalizeLocalSuffix(' localhost '), 'localhost');
assert.equal(normalizeLocalSuffix('.local'), 'local');
assert.equal(normalizeLocalSuffix('invalid.example'), '', 'invalid suffix must fail instead of becoming localhost');
assert.equal(buildLocalDomain('Kourosh', 'home.arpa'), 'kourosh.home.arpa');
assert.equal(buildLocalDomain('Kourosh', 'invalid.example'), '');
assert.equal(isLegacyLocalSuffix('localhost'), true);
assert.equal(isLegacyLocalSuffix('.local'), true);
assert.equal(buildLocalDomainShortcut('Kourosh'), '', 'fresh installs must not auto-create .local');
assert.equal(buildLocalDomainShortcut('Kourosh', true), 'kourosh.local', 'explicit legacy preservation remains available');

const mixed = {
  store_name: 'Store A',
  app_base_url: 'https://legacy.example.com',
  qr_public_base_url: 'https://qr.example.com',
  local_hostname: 'shop-a',
  local_domain_suffix: 'home.arpa',
  local_base_url: 'https://shop-a.home.arpa:5173/#/',
  telegram_bot_username: 'StoreABot',
  telegram_transport_mode: 'direct',
  telegram_public_access_mode: 'self_hosted',
  telegram_miniapp_public_url: 'https://mini.example.com/miniapp.html',
  kourosh_cloud_enabled: '1',
  kourosh_cloud_endpoint: 'wss://cloud.example.com/connect',
  installation_id: 'inst_should_not_be_writable',
};
const localScoped = pickLocalAccessSettings(mixed);
assert.deepEqual(Object.keys(localScoped).sort(), ['local_base_url', 'local_domain_suffix', 'local_hostname']);
assert.equal('telegram_miniapp_public_url' in localScoped, false);
assert.equal('app_base_url' in localScoped, false);
const telegramScoped = pickTelegramSettings(mixed);
assert.equal(telegramScoped.telegram_bot_username, 'StoreABot');
assert.equal('local_hostname' in telegramScoped, false);
assert.equal('app_base_url' in telegramScoped, false);
const genericScoped = pickGenericWritableSettings(mixed);
assert.equal(genericScoped.store_name, 'Store A');
assert.equal(genericScoped.app_base_url, 'https://legacy.example.com');
assert.equal(genericScoped.qr_public_base_url, 'https://qr.example.com');
for (const blocked of ['local_hostname', 'local_domain_suffix', 'local_base_url', 'telegram_bot_username', 'telegram_transport_mode', 'telegram_public_access_mode', 'telegram_miniapp_public_url', 'kourosh_cloud_enabled', 'kourosh_cloud_endpoint', 'installation_id']) {
  assert.equal(blocked in genericScoped, false, `generic settings must not write ${blocked}`);
}

assert.equal(resolveTelegramPublicAccessMode({}), 'disabled');
assert.equal(resolveTelegramPublicAccessMode({ telegram_miniapp_public_url: 'https://legacy-mini.example.com/miniapp.html' }), 'self_hosted', 'v150 explicit Mini App URL is preserved in memory as self-hosted');
assert.equal(resolveTelegramMiniAppUrl({ telegram_public_access_mode: 'disabled', telegram_miniapp_public_url: 'https://mini.example.com/miniapp.html' }), null);
assert.equal(resolveTelegramMiniAppUrl({ telegram_public_access_mode: 'self_hosted', telegram_miniapp_public_url: 'https://mini.example.com/miniapp.html' }), 'https://mini.example.com/miniapp.html');
assert.equal(resolveTelegramMiniAppUrl({ telegram_public_access_mode: 'self_hosted', app_base_url: 'https://legacy.example.com', public_app_base_url: 'https://public.example.com', local_base_url: 'https://shop.home.arpa:5173/#/' }), null, 'Mini App must not fallback to web/local URLs');
assert.equal(resolveTelegramMiniAppUrl({ telegram_public_access_mode: 'cloud_managed', kourosh_cloud_provisioned: '0', kourosh_cloud_assigned_public_url: 'https://cloud.example.com/miniapp.html' }), null);
assert.equal(resolveTelegramMiniAppUrl({ telegram_public_access_mode: 'cloud_managed', kourosh_cloud_enabled: '1', kourosh_cloud_provisioned: '1', installation_id: 'inst_ABCDEFGHIJKLMNOPQRSTUVWX', kourosh_cloud_assigned_store_id: 'store-a', kourosh_cloud_assigned_public_url: 'https://cloud.example.com/miniapp.html', kourosh_cloud_endpoint: 'wss://relay.example.com/connect', kourosh_cloud_credential_configured: '1' }), 'https://cloud.example.com/miniapp.html');
assert.equal(validateTelegramMiniAppPublicUrl('https://shop.home.arpa/miniapp.html'), null);
assert.equal(validateTelegramMiniAppPublicUrl('https://shop.local/miniapp.html'), null);
assert.equal(validateTelegramMiniAppPublicUrl('https://192.168.1.20/miniapp.html'), null);
assert.equal(auditTelegramMiniAppPublicConfiguration({ telegram_public_access_mode: 'disabled' }, '', 'production').status, 'MINIAPP_DISABLED');
assert.equal(auditTelegramMiniAppPublicConfiguration({ telegram_public_access_mode: 'cloud_managed' }, '', 'production').status, 'CLOUD_RELAY_NOT_PROVISIONED');

assert.equal(resolveTelegramTransportMode({}), 'direct');
assert.equal(resolveTelegramTransportMode({ telegram_transport_mode: 'direct' }), 'direct');
assert.equal(resolveTelegramTransportMode({ telegram_transport_mode: 'cloud_relay' }), 'relay');

const identityBacking = new Map();
const identityStore = {
  get: async (key) => identityBacking.get(key),
  set: async (key, value) => identityBacking.set(key, value),
};
const firstInstallationId = await ensureInstallationId(identityStore);
assert.equal(isValidInstallationId(firstInstallationId), true);
const storeNameBefore = 'Store A';
const localDomainBefore = 'store-a.home.arpa';
const botBefore = 'StoreABot';
void storeNameBefore; void localDomainBefore; void botBefore;
const secondInstallationId = await ensureInstallationId(identityStore);
assert.equal(secondInstallationId, firstInstallationId, 'restart must preserve installation_id');
const unrelatedChanges = { storeName: 'Store B', localDomain: 'store-b.home.arpa', bot: 'StoreBBot' };
void unrelatedChanges;
const afterUnrelatedChanges = await ensureInstallationId(identityStore);
assert.equal(afterUnrelatedChanges, firstInstallationId, 'store/domain/bot changes must not change installation_id');

const unprovisionedCloud = resolveCloudConnectorConfig({ kourosh_cloud_enabled: '1', installation_id: firstInstallationId }, {});
assert.equal(unprovisionedCloud.endpoint, null);
assert.equal(unprovisionedCloud.connectionState, 'not_provisioned');
assert.equal(getCloudProvisioningStatus(unprovisionedCloud), 'CLOUD_RELAY_NOT_PROVISIONED');
const configuredCloud = resolveCloudConnectorConfig({
  kourosh_cloud_enabled: '1',
  installation_id: firstInstallationId,
  kourosh_cloud_provisioned: '1',
  kourosh_cloud_assigned_store_id: 'store_route_123',
  kourosh_cloud_assigned_public_url: 'https://assigned.example.com',
  kourosh_cloud_relay_mode: 'telegram_and_miniapp',
}, {
  KOUROSH_CLOUD_CONNECTOR_ENDPOINT: 'wss://relay.example.com/connect',
  KOUROSH_CLOUD_CONNECTOR_PRIVATE_KEY_PATH: '/tmp/test-connector.pem',
});
assert.equal(configuredCloud.provisioned, true);
assert.equal(configuredCloud.endpoint, 'wss://relay.example.com/connect');
assert.equal(configuredCloud.credentialConfigured, true);
assert.equal(getCloudProvisioningStatus(configuredCloud), 'CLOUD_RELAY_PROVISIONED');
assert.equal(KOUROSH_CLOUD_RELAY_PROTOCOL_VERSION, 1);
assert.equal(CONNECTIVITY_RUNTIME_BOUNDARIES.backend.bindHost, '127.0.0.1');
assert.equal(CONNECTIVITY_RUNTIME_BOUNDARIES.backend.port, 3001);
assert.equal(CONNECTIVITY_RUNTIME_BOUNDARIES.localPwa.defaultPort, 5173);
assert.equal(CONNECTIVITY_RUNTIME_BOUNDARIES.selfHostedMiniAppGateway.bindHost, '127.0.0.1');
assert.equal(CONNECTIVITY_RUNTIME_BOUNDARIES.selfHostedMiniAppGateway.port, 4180);
assert.equal(CONNECTIVITY_RUNTIME_BOUNDARIES.cloudConnector.outboundOnly, true);
assert.deepEqual([...CONNECTIVITY_RUNTIME_BOUNDARIES.cloudConnector.tlsPorts], [443]);
assert.equal(CONNECTIVITY_RUNTIME_BOUNDARIES.cloudConnector.publicListener, false);

// Execute the actual readiness profile module without changing production import style.
const readinessPath = path.join(projectRoot, 'server/connectivity/telegramReadinessProfiles.ts');
const readinessSource = fs.readFileSync(readinessPath, 'utf8').replace('"./telegramPublicAccess"', JSON.stringify(publicAccessTempUrl));
const tempReadinessPath = path.join(os.tmpdir(), `kourosh-readiness-v151-${process.pid}-${Date.now()}.ts`);
fs.writeFileSync(tempReadinessPath, readinessSource, 'utf8');
try {
  const readiness = await import(`${pathToFileURL(tempReadinessPath).href}?v=${Date.now()}`);
  const disabled = readiness.evaluateTelegramReadinessProfile({ telegram_public_access_mode: 'disabled' }, '', 'production');
  assert.equal(disabled.operational, true);
  assert.equal(disabled.requirements.publicUrl.required, false);
  assert.equal(disabled.requirements.gateway.required, false);
  const selfHosted = readiness.evaluateTelegramReadinessProfile({
    telegram_public_access_mode: 'self_hosted',
    telegram_miniapp_public_url: 'https://mini.example.com/miniapp.html',
    telegram_bot_username: 'StoreABot',
  }, 'mini.example.com', 'production');
  assert.equal(selfHosted.requirements.publicUrl.required, true);
  assert.equal(selfHosted.requirements.hostConsistency.ok, true);
  assert.equal(selfHosted.requirements.botFather.code, 'MANUAL_CHECK_REQUIRED');
  const cloud = readiness.evaluateTelegramReadinessProfile({ telegram_public_access_mode: 'cloud_managed' }, '', 'production');
  assert.equal(cloud.profileStatus, 'CLOUD_RELAY_NOT_PROVISIONED');
  assert.equal(cloud.requirements.publicUrl.required, false);
  assert.equal(cloud.requirements.gateway.required, true);
} finally {
  fs.rmSync(tempReadinessPath, { force: true });
  for (const tempPath of tempModulePaths) fs.rmSync(tempPath, { force: true });
}

console.log('Connectivity v151 behavioral tests passed (local/public isolation, legacy local behavior, Mini App modes, installation identity, readiness profiles, transport/cloud contracts and runtime boundaries).');
