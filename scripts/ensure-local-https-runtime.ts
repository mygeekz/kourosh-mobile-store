import { execFile } from 'node:child_process';
import { X509Certificate } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createSecureContext } from 'node:tls';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import {
  LOCAL_CA_COMMON_NAME,
  LOCAL_CA_PROFILE_VERSION,
  buildLocalDomain,
  buildMacHostsSetupCommand,
  buildWindowsHostsSetupBatch,
  generateLocalCertificate,
  getPreferredLocalIPv4,
  isUsableLanIPv4,
  localCertDir,
  localHostsScriptPath,
  localMacHostsScriptPath,
  normalizeLocalHostname,
  normalizeLocalSuffix,
} from '../server/utils/localSettingsHelpers';

type JsonRecord = Record<string, unknown>;

type CertificateReadiness = {
  ready: boolean;
  reason: string;
  fingerprintSha256: string;
  validUntil: string;
};

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtimeConfigPath = path.join(localCertDir, 'local-domain-runtime.json');
const leafPfxPath = path.join(localCertDir, 'current-cert.pfx');
const leafPemPath = path.join(localCertDir, 'current-cert.pem');
const leafKeyPath = path.join(localCertDir, 'current-key.pem');
const leafCerPath = path.join(localCertDir, 'current-cert.cer');
const rootCerPath = path.join(localCertDir, 'current-ca.cer');
const rootCrtPath = path.join(localCertDir, 'current-ca.crt');
const rootProfilePath = path.join(localCertDir, 'current-ca-profile.json');
const pfxPassphrase =
  process.env.LOCAL_CERT_PFX_PASSPHRASE ||
  process.env.VITE_LOCAL_CERT_PFX_PASSPHRASE ||
  'kourosh-local-dev';

const readJson = (filePath: string): JsonRecord => {
  try {
    const value = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return value && typeof value === 'object' ? value as JsonRecord : {};
  } catch {
    return {};
  }
};

const isValidIPv4 = (value: string) =>
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(value);

const normalizeDnsName = (value: unknown) =>
  String(value || '').trim().toLowerCase().replace(/[^a-z0-9.-]/g, '');

const nonEmptyFile = (filePath: string) => {
  try {
    const stat = fs.statSync(filePath);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
};

const certificateFingerprint = (certificate: X509Certificate) =>
  certificate.fingerprint256.replace(/:/g, '').toLowerCase();

const certificateHasEnoughLifetime = (certificate: X509Certificate, minimumDays: number) => {
  const validUntil = Date.parse(certificate.validTo);
  return Number.isFinite(validUntil) && validUntil > Date.now() + minimumDays * 24 * 60 * 60 * 1000;
};

const certificateIsCurrentlyValid = (certificate: X509Certificate) => {
  const validFrom = Date.parse(certificate.validFrom);
  const validUntil = Date.parse(certificate.validTo);
  const now = Date.now();
  return Number.isFinite(validFrom) && Number.isFinite(validUntil) && validFrom <= now && validUntil > now;
};

const validateCertificateRuntime = (
  domain: string,
  aliases: string[],
  ipAddresses: string[],
): CertificateReadiness => {
  const requiredFiles = [leafCerPath, rootCerPath, rootCrtPath, rootProfilePath];
  if (!requiredFiles.every(nonEmptyFile)) {
    return { ready: false, reason: 'certificate chain files are missing', fingerprintSha256: '', validUntil: '' };
  }
  if (!nonEmptyFile(leafPfxPath) && !(nonEmptyFile(leafPemPath) && nonEmptyFile(leafKeyPath))) {
    return { ready: false, reason: 'server TLS material is incomplete', fingerprintSha256: '', validUntil: '' };
  }

  try {
    const rootCertificate = new X509Certificate(fs.readFileSync(rootCerPath));
    const leafCertificate = new X509Certificate(fs.readFileSync(leafCerPath));
    const profile = readJson(rootProfilePath);
    const fingerprintSha256 = certificateFingerprint(rootCertificate);
    const profileFingerprint = String(profile.fingerprintSha256 || '').replace(/[^a-f0-9]/gi, '').toLowerCase();

    if (Number(profile.version || 0) !== LOCAL_CA_PROFILE_VERSION) {
      return { ready: false, reason: 'Root CA profile is outdated', fingerprintSha256, validUntil: leafCertificate.validTo };
    }
    if (!rootCertificate.ca || leafCertificate.ca) {
      return { ready: false, reason: 'certificate CA constraints are invalid', fingerprintSha256, validUntil: leafCertificate.validTo };
    }
    if (
      rootCertificate.subject !== rootCertificate.issuer ||
      !rootCertificate.verify(rootCertificate.publicKey)
    ) {
      return { ready: false, reason: 'Root CA is not a valid self-signed trust anchor', fingerprintSha256, validUntil: leafCertificate.validTo };
    }
    if (!leafCertificate.verify(rootCertificate.publicKey)) {
      return { ready: false, reason: 'server certificate is not signed by the active Root CA', fingerprintSha256, validUntil: leafCertificate.validTo };
    }
    if (!profileFingerprint || profileFingerprint !== fingerprintSha256) {
      return { ready: false, reason: 'Root CA profile fingerprint does not match', fingerprintSha256, validUntil: leafCertificate.validTo };
    }
    if (!certificateIsCurrentlyValid(rootCertificate) || !certificateIsCurrentlyValid(leafCertificate)) {
      return { ready: false, reason: 'certificate chain is not currently within its validity period', fingerprintSha256, validUntil: leafCertificate.validTo };
    }
    if (!certificateHasEnoughLifetime(rootCertificate, 90) || !certificateHasEnoughLifetime(leafCertificate, 14)) {
      return { ready: false, reason: 'certificate renewal window was reached', fingerprintSha256, validUntil: leafCertificate.validTo };
    }

    for (const dnsName of [...new Set([domain, ...aliases, 'localhost'])]) {
      if (!leafCertificate.checkHost(dnsName)) {
        return { ready: false, reason: `certificate SAN does not contain ${dnsName}`, fingerprintSha256, validUntil: leafCertificate.validTo };
      }
    }
    for (const ipAddress of [...new Set(ipAddresses.filter(isValidIPv4))]) {
      if (!leafCertificate.checkIP(ipAddress)) {
        return { ready: false, reason: `certificate SAN does not contain ${ipAddress}`, fingerprintSha256, validUntil: leafCertificate.validTo };
      }
    }

    if (nonEmptyFile(leafPfxPath)) {
      createSecureContext({ pfx: fs.readFileSync(leafPfxPath), passphrase: pfxPassphrase });
    } else {
      createSecureContext({ cert: fs.readFileSync(leafPemPath), key: fs.readFileSync(leafKeyPath) });
    }

    return {
      ready: true,
      reason: 'certificate chain is current',
      fingerprintSha256,
      validUntil: leafCertificate.validTo,
    };
  } catch (error) {
    return {
      ready: false,
      reason: error instanceof Error ? error.message : String(error),
      fingerprintSha256: '',
      validUntil: '',
    };
  }
};

const ensureWindowsRootTrust = async () => {
  if (process.platform !== 'win32') return false;
  const certutil = process.env.SYSTEMROOT
    ? path.join(process.env.SYSTEMROOT, 'System32', 'certutil.exe')
    : 'certutil.exe';
  try {
    await execFileAsync(certutil, ['-user', '-addstore', '-f', 'Root', rootCerPath], {
      windowsHide: true,
      timeout: 45_000,
      maxBuffer: 1024 * 1024,
    });
    return true;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.warn(`[https] Root CA is ready, but Windows trust could not be confirmed automatically: ${detail}`);
    return false;
  }
};

type WindowsListener = {
  pid: number;
  commandLine: string;
};

const readWindowsListeners = async (port: number): Promise<WindowsListener[]> => {
  if (process.platform !== 'win32') return [];
  const powershell = process.env.SYSTEMROOT
    ? path.join(process.env.SYSTEMROOT, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
    : 'powershell.exe';
  const command = [
    `$port = ${port}`,
    "$owners = @(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)",
    "$rows = @($owners | ForEach-Object { $process = Get-CimInstance Win32_Process -Filter \"ProcessId = $($_)\" -ErrorAction SilentlyContinue; if ($process) { [PSCustomObject]@{ pid = [int]$process.ProcessId; commandLine = [string]$process.CommandLine } } })",
    "if ($rows.Count -gt 0) { $rows | ConvertTo-Json -Compress }",
  ].join('; ');
  try {
    const result = await execFileAsync(powershell, [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      command,
    ], {
      windowsHide: true,
      timeout: 15_000,
      maxBuffer: 512 * 1024,
    });
    const raw = String(result.stdout || '').trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    return rows
      .map((row) => ({
        pid: Number(row?.pid || 0),
        commandLine: String(row?.commandLine || ''),
      }))
      .filter((row) => Number.isInteger(row.pid) && row.pid > 0);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.warn(`[https] Could not inspect existing port ${port} listeners: ${detail}`);
    return [];
  }
};

const stopStaleWindowsRuntime = async () => {
  if (process.platform !== 'win32' || process.env.KOUROSH_KEEP_EXISTING_RUNTIME === '1') return;
  const port = Number(process.env.KOUROSH_PWA_PORT || 5173);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) return;
  const listeners = await readWindowsListeners(port);
  if (listeners.length === 0) return;

  const normalizedRoot = rootDir.replace(/\\/g, '/').toLowerCase();
  const staleKourosh = listeners.filter(({ commandLine }) => {
    const normalized = commandLine.replace(/\\/g, '/').toLowerCase();
    return /serve-local-pwa\.mjs|kourosh local pwa/.test(normalized) || normalized.includes(normalizedRoot);
  });
  const unrelated = listeners.filter(({ pid }) => !staleKourosh.some((item) => item.pid === pid));
  if (unrelated.length > 0) {
    throw new Error(`Port ${port} is already used by another application (PID ${unrelated.map((item) => item.pid).join(', ')}). Close it before starting Kourosh.`);
  }

  const taskkill = process.env.SYSTEMROOT
    ? path.join(process.env.SYSTEMROOT, 'System32', 'taskkill.exe')
    : 'taskkill.exe';
  for (const listener of staleKourosh) {
    console.log(`[https] Stopping stale Kourosh HTTPS runtime on port ${port} (PID ${listener.pid}) before loading the refreshed certificate.`);
    await execFileAsync(taskkill, ['/PID', String(listener.pid), '/T', '/F'], {
      windowsHide: true,
      timeout: 15_000,
      maxBuffer: 512 * 1024,
    });
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    if ((await readWindowsListeners(port)).length === 0) return;
  }
  throw new Error(`The previous Kourosh HTTPS runtime did not release port ${port}. Close its terminal window and start again.`);
};

const writeRuntimeFiles = async (
  domain: string,
  shortcutDomain: string,
  serverIp: string,
  certificateDnsNames: string[],
  certificateIpAddresses: string[],
  fingerprintSha256: string,
  validUntil: string,
) => {
  const aliases = shortcutDomain && shortcutDomain !== domain ? [shortcutDomain] : [];
  await fs.promises.mkdir(localCertDir, { recursive: true });
  await Promise.all([
    fs.promises.writeFile(localHostsScriptPath, buildWindowsHostsSetupBatch(domain, serverIp, aliases), 'utf8'),
    fs.promises.writeFile(localMacHostsScriptPath, buildMacHostsSetupCommand(domain, serverIp, aliases), 'utf8'),
    fs.promises.writeFile(runtimeConfigPath, JSON.stringify({
      version: 2,
      targetDomain: domain,
      targetUrl: `https://${domain}:5173/#/`,
      shortcutDomain,
      shortcutUrl: shortcutDomain ? `http://${shortcutDomain}` : '',
      lanUrl: `https://${serverIp}:5173/#/`,
      rootCaDownloadUrl: `https://${serverIp}:5173/api/local-runtime/root-ca.crt`,
      targetPort: 5173,
      httpRedirectPort: 80,
      httpsRedirectPort: 443,
      certificateDnsNames,
      certificateIpAddresses,
      caCommonName: LOCAL_CA_COMMON_NAME,
      caProfileVersion: LOCAL_CA_PROFILE_VERSION,
      caFingerprintSha256: fingerprintSha256,
      leafValidUntil: validUntil,
      updatedAt: new Date().toISOString(),
    }, null, 2), 'utf8'),
  ]);
  try { await fs.promises.chmod(localMacHostsScriptPath, 0o755); } catch { /* Windows does not use POSIX modes. */ }
  for (const privatePath of [leafPfxPath, leafKeyPath, path.join(localCertDir, 'current-ca-key.pem'), path.join(localCertDir, 'current-ca.pfx')]) {
    if (!nonEmptyFile(privatePath)) continue;
    try { await fs.promises.chmod(privatePath, 0o600); } catch { /* Best effort on Windows. */ }
  }
};

const main = async () => {
  await stopStaleWindowsRuntime();
  const stored = readJson(runtimeConfigPath);
  const storedDomain = normalizeDnsName(stored.targetDomain);
  const storedParts = storedDomain.split('.').filter(Boolean);
  const storedHostname = storedParts.shift() || '';
  const storedSuffix = storedParts.join('.');

  const hostname = normalizeLocalHostname(
    process.env.KOUROSH_LOCAL_HOSTNAME || storedHostname || 'kourosh',
  ) || 'kourosh';
  const suffix = normalizeLocalSuffix(
    process.env.KOUROSH_LOCAL_SUFFIX || storedSuffix || 'home.arpa',
  );
  const domain = normalizeDnsName(process.env.KOUROSH_HTTPS_DOMAIN) || buildLocalDomain(hostname, suffix);
  const shortcutDomain = normalizeDnsName(stored.shortcutDomain);
  const explicitIp = String(
    process.env.LOCAL_HOSTS_IP ||
    process.env.VITE_LOCAL_HOSTS_IP ||
    process.env.KOUROSH_HTTPS_HOST ||
    '',
  ).trim();
  const serverIp = isUsableLanIPv4(explicitIp)
    ? explicitIp
    : getPreferredLocalIPv4('', undefined);
  const aliases = shortcutDomain && shortcutDomain !== domain ? [shortcutDomain] : [];
  const certificateDnsNames = [...new Set([domain, ...aliases, 'localhost'])];
  const certificateIpAddresses = [...new Set(['127.0.0.1', serverIp].filter(isValidIPv4))];

  if (!domain || !isUsableLanIPv4(serverIp)) {
    throw new Error('A safe local domain and LAN IPv4 address are required before HTTPS can start.');
  }

  let readiness = validateCertificateRuntime(domain, aliases, certificateIpAddresses);
  let regenerated = false;
  if (!readiness.ready) {
    console.log(`[https] Local certificate needs preparation: ${readiness.reason}.`);
    await generateLocalCertificate(domain, serverIp, aliases);
    regenerated = true;
    readiness = validateCertificateRuntime(domain, aliases, certificateIpAddresses);
  }

  if (!readiness.ready) {
    throw new Error(`Local HTTPS certificate validation failed after generation: ${readiness.reason}`);
  }

  const trustedOnWindows = await ensureWindowsRootTrust();
  await writeRuntimeFiles(
    domain,
    shortcutDomain,
    serverIp,
    certificateDnsNames,
    certificateIpAddresses,
    readiness.fingerprintSha256,
    readiness.validUntil,
  );

  console.log(`[https] ${regenerated ? 'Generated and validated' : 'Validated and reused'} the local Root CA + server certificate chain.`);
  if (process.platform === 'win32') {
    console.log(`[https] Windows Current User trust: ${trustedOnWindows ? 'ready' : 'manual Root CA installation may be required'}.`);
  }
  console.log(`[https] Computer: https://${domain}:5173/#/`);
  console.log(`[https] LAN/mobile: https://${serverIp}:5173/#/`);
  console.log(`[https] Mobile Root CA: https://${serverIp}:5173/api/local-runtime/root-ca.crt`);
  console.log(`[https] Root fingerprint (SHA-256): ${readiness.fingerprintSha256}`);
};

main().catch((error) => {
  console.error('[https] Local HTTPS bootstrap failed.');
  console.error(error instanceof Error ? error.message : String(error));
  console.error(`[https] Project: ${rootDir}`);
  process.exitCode = 1;
});
