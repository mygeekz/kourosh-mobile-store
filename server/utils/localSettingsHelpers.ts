import fs from "fs";
import path, { dirname, join } from "path";
import { fileURLToPath } from "url";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { X509Certificate } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const uploadsDir = join(__dirname, "..", "..", "uploads");
export const privateUploadsDir = join(__dirname, "..", "..", "private_uploads");
export const localCertDir = join(__dirname, "..", "..", "certs");
const localCurrentKeyPath = join(localCertDir, "current-key.pem");
const localCurrentCertPath = join(localCertDir, "current-cert.pem");
const localCurrentPfxPath = join(localCertDir, "current-cert.pfx");
const localCurrentCaKeyPath = join(localCertDir, "current-ca-key.pem");
const localCurrentCaPemPath = join(localCertDir, "current-ca.pem");
const localCurrentCaPfxPath = join(localCertDir, "current-ca.pfx");
const localCurrentCaCerPath = join(localCertDir, "current-ca.cer");
const localCurrentCaCrtPath = join(localCertDir, "current-ca.crt");
const localCurrentCaProfilePath = join(localCertDir, "current-ca-profile.json");
export const LOCAL_CA_PROFILE_VERSION = 3;
export const LOCAL_CA_COMMON_NAME = `Kourosh Local Root CA v${LOCAL_CA_PROFILE_VERSION}`;
export const localHostsScriptPath = join(localCertDir, "setup-local-hosts.bat");
export const localMacHostsScriptPath = join(localCertDir, "setup-local-hosts.command");
const localPfxPassphrase =
  process.env.LOCAL_CERT_PFX_PASSPHRASE ||
  process.env.VITE_LOCAL_CERT_PFX_PASSPHRASE ||
  "kourosh-local-dev";
const execFileAsync = promisify(execFile);
export const FRESH_LOCAL_DOMAIN_SUFFIX = "home.arpa";
export const LEGACY_LOCAL_DOMAIN_SUFFIXES = new Set(["localhost", "local"]);
const LOCAL_DOMAIN_SUFFIX_WHITELIST = new Set([
  FRESH_LOCAL_DOMAIN_SUFFIX,
  "internal",
  "lan",
  ...LEGACY_LOCAL_DOMAIN_SUFFIXES,
]);

export const normalizeLocalHostname = (value: unknown) => {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  const cleaned = raw
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned;
};

export const normalizeLocalSuffix = (value: unknown) => {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  const cleaned = raw.replace(/^\.+/, "").replace(/\.+$/, "");
  return cleaned && LOCAL_DOMAIN_SUFFIX_WHITELIST.has(cleaned) ? cleaned : "";
};

export const isLegacyLocalSuffix = (value: unknown) =>
  LEGACY_LOCAL_DOMAIN_SUFFIXES.has(normalizeLocalSuffix(value));

export const buildLocalDomain = (hostname: unknown, suffix: unknown) => {
  const host = normalizeLocalHostname(hostname);
  const suf = normalizeLocalSuffix(suffix);
  return host && suf ? `${host}.${suf}` : "";
};

export const buildLocalDomainShortcut = (hostname: unknown, preserveLegacy = false) => {
  if (!preserveLegacy) return "";
  const host = normalizeLocalHostname(hostname);
  return host ? `${host}.local` : "";
};

const isLoopbackLocalDomain = (suffix: unknown) =>
  normalizeLocalSuffix(suffix) === "localhost";

export const getLocalDomainHostIp = (suffix: unknown) => {
  if (isLoopbackLocalDomain(suffix)) return "127.0.0.1";
  const lanIp = getPreferredLocalIPv4();
  return isUsableLanIPv4(lanIp) ? lanIp : "";
};

const isValidIPv4 = (value: string) =>
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(
    value,
  );

export const isUsableLanIPv4 = (value: unknown) => {
  const address = String(value || "").trim();
  return isValidIPv4(address) &&
    !address.startsWith("127.") &&
    !address.startsWith("169.254.") &&
    address !== "0.0.0.0";
};

export const selectPreferredLocalIPv4 = (
  nets: ReturnType<typeof os.networkInterfaces>,
) => {
  const virtualAdapterPattern = /docker|wsl|hyper-v|vethernet|virtualbox|vmware|tailscale|loopback/i;
  const preferredAdapterPattern = /wi-?fi|wireless|wlan|ethernet|local area/i;
  const candidates: Array<{ address: string; score: number }> = [];
  for (const [adapterName, entries] of Object.entries(nets)) {
    for (const entry of entries || []) {
      if (!entry || entry.family !== "IPv4" || entry.internal) continue;
      const address = String(entry.address || "").trim();
      if (!isUsableLanIPv4(address)) continue;
      let score = 0;
      if (address.startsWith("192.168.")) score += 40;
      else if (address.startsWith("10.")) score += 30;
      else if (/^172\.(1[6-9]|2\d|3[01])\./.test(address)) score += 20;
      if (preferredAdapterPattern.test(adapterName)) score += 15;
      if (virtualAdapterPattern.test(adapterName)) score -= 80;
      candidates.push({ address, score });
    }
  }
  candidates.sort((left, right) => right.score - left.score);
  return candidates[0]?.address || "127.0.0.1";
};

export const getPreferredLocalIPv4 = (
  explicitValue: unknown = null,
  nets?: ReturnType<typeof os.networkInterfaces>,
) => {
  const explicit = String(
    explicitValue === null
      ? process.env.LOCAL_HOSTS_IP || process.env.VITE_LOCAL_HOSTS_IP || ""
      : explicitValue,
  ).trim();
  if (isUsableLanIPv4(explicit)) return explicit;
  let availableInterfaces = nets;
  if (!availableInterfaces) {
    try {
      availableInterfaces = os.networkInterfaces();
    } catch {
      availableInterfaces = {};
    }
  }
  return selectPreferredLocalIPv4(availableInterfaces);
};

export const buildWindowsHostsSetupBatch = (
  domain: string,
  ip: string,
  aliases: string[] = [],
) => {
  const safeDomain = domain.replace(/[^a-z0-9.-]/gi, "");
  const safeAliases = aliases
    .map((alias) => alias.replace(/[^a-z0-9.-]/gi, ""))
    .filter((alias) => alias && alias !== safeDomain);
  const safeHosts = [...new Set([safeDomain, ...safeAliases])].filter(Boolean);
  const safeIp = isValidIPv4(ip) ? ip : "127.0.0.1";
  const hostsLine = `${safeIp} ${safeHosts.join(" ")}`;
  const findClauses = safeHosts
    .flatMap((host) => [`/C:" ${host}"`, `/C:"${host} "`, `/C:"${host}"`])
    .join(" ");
  const shortcut = safeAliases[0] || safeDomain;
  return `@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Kourosh Local Domain Setup

set "PRIMARY_HOST=${safeDomain}"
set "SHORT_HOST=${shortcut}"
set "IP=${safeIp}"
set "HOSTS=%SystemRoot%\\System32\\drivers\\etc\\hosts"

net session >nul 2>&1
if not "%errorlevel%"=="0" (
  echo Requesting Administrator privileges...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

if not exist "%HOSTS%" (
  echo Hosts file was not found.
  pause
  exit /b 1
)

set "TMP=%TEMP%\\hosts-%RANDOM%.tmp"
break > "%TMP%"
for /f "usebackq delims=" %%L in ("%HOSTS%") do (
  set "LINE=%%L"
  echo(!LINE! | findstr /I ${findClauses} >nul
  if errorlevel 1 (
    >> "%TMP%" echo(!LINE!
  )
)

>> "%TMP%" echo ${hostsLine}
copy /Y "%TMP%" "%HOSTS%" >nul
del "%TMP%" >nul 2>&1
ipconfig /flushdns >nul

echo.
echo ======================================
echo Local domains configured successfully:
echo Shortcut: http://%SHORT_HOST%
echo Target:   https://%PRIMARY_HOST%:5173/#/
echo Hosts entry:
echo ${hostsLine}
echo ======================================
pause
`;
};

export const buildMacHostsSetupCommand = (
  domain: string,
  ip: string,
  aliases: string[] = [],
) => {
  const safeDomain = domain.replace(/[^a-z0-9.-]/gi, "");
  const safeAliases = aliases
    .map((alias) => alias.replace(/[^a-z0-9.-]/gi, ""))
    .filter((alias) => alias && alias !== safeDomain);
  const safeHosts = [...new Set([safeDomain, ...safeAliases])].filter(Boolean);
  const safeIp = isValidIPv4(ip) ? ip : "127.0.0.1";
  const shortcut = safeAliases[0] || safeDomain;
  const awkConditions = safeHosts
    .map((_, index) => `$0 ~ "(^|[[:space:]])" host${index + 1} "([[:space:]]|$)"`)
    .join(" || ");
  const awkVars = safeHosts
    .map((host, index) => `-v host${index + 1}="${host}"`)
    .join(" ");
  return `#!/usr/bin/env bash
set -euo pipefail

PRIMARY_HOST="${safeDomain}"
SHORT_HOST="${shortcut}"
IP="${safeIp}"
HOSTS="/etc/hosts"
BACKUP="/etc/hosts.kourosh-backup-$(date +%Y%m%d-%H%M%S)"

if [[ -z "$PRIMARY_HOST" ]]; then
  echo "Invalid host name."
  exit 1
fi

if [[ ! -f "$HOSTS" ]]; then
  echo "Hosts file was not found: $HOSTS"
  exit 1
fi

echo "Kourosh Local Domain Setup - macOS"
echo "Primary domain: $PRIMARY_HOST"
echo "Shortcut: $SHORT_HOST"
echo "IP: $IP"
echo

echo "Administrator password may be required to update /etc/hosts."
sudo cp "$HOSTS" "$BACKUP"
TMP_FILE="$(mktemp)"
awk ${awkVars} '
  ${awkConditions} { next }
  { print }
' "$HOSTS" > "$TMP_FILE"
printf "%s %s\\n" "$IP" "${safeHosts.join(" ")}" >> "$TMP_FILE"
sudo cp "$TMP_FILE" "$HOSTS"
rm -f "$TMP_FILE"

sudo dscacheutil -flushcache >/dev/null 2>&1 || true
sudo killall -HUP mDNSResponder >/dev/null 2>&1 || true

echo
echo "======================================"
echo "Local domains configured successfully:"
echo "Shortcut: http://$SHORT_HOST"
echo "Target:   https://$PRIMARY_HOST:5173/#/"
echo "Hosts entry:"
echo "${safeIp} ${safeHosts.join(" ")}"
echo "Backup: $BACKUP"
echo "======================================"
read -r -p "Press Enter to close..." _
`;
};


type ProcessExecutionError = Error & {
  code?: string | number;
  stderr?: unknown;
  stdout?: unknown;
};

type LocalCertificateResult = {
  keyPath?: string;
  certPath?: string;
  pfxPath?: string;
  cerPath?: string;
  caCerPath?: string;
  caCrtPath?: string;
  caPemPath?: string;
  caFingerprintSha256?: string;
  caCommonName?: string;
  configPath: string;
  mode: "proxy-http" | "windows-pfx" | "openssl";
  trusted: boolean;
  restartRequired: boolean;
  ipAddresses?: string[];
  rootCaRotated?: boolean;
  caProfileVersion?: number;
};

const normalizeProcessOutput = (value: unknown): string =>
  String(value ?? "")
    .replace(/\r\n/g, "\n")
    .trim();

const getProcessErrorText = (error: unknown): string => {
  if (!(error instanceof Error)) return normalizeProcessOutput(error);
  const processError = error as ProcessExecutionError;
  const parts = [
    normalizeProcessOutput(processError.stderr),
    normalizeProcessOutput(processError.stdout),
    normalizeProcessOutput(processError.message),
  ].filter(Boolean);
  return [...new Set(parts)].join(" | ");
};

const summarizeCertificateFailure = (error: unknown, tool: "PowerShell" | "OpenSSL") => {
  const text = getProcessErrorText(error);
  const lower = text.toLowerCase();
  if (/new-selfsignedcertificate.*not recognized|cmdlet.*not recognized/.test(lower)) {
    return "ماژول PKI یا دستور New-SelfSignedCertificate در ویندوز در دسترس نیست";
  }
  if (/enoent|not recognized|is not recognized|command not found|cannot find/.test(lower)) {
    return `${tool} در این سیستم پیدا نشد یا قابل اجرا نیست`;
  }
  if (/access.*denied|unauthorized|permission|دسترسی/.test(lower)) {
    return "ویندوز اجازه ساخت، ذخیره یا ثبت گواهی را نداد";
  }
  if (/being used|used by another process|sharing violation|locked/.test(lower)) {
    return "یکی از فایل‌های گواهی قبلی توسط پردازش دیگری قفل شده است";
  }
  if (/pfx|pkcs|export-pfxcertificate/.test(lower)) {
    return "خروجی PFX ساخته یا صادر نشد";
  }
  return `${tool} نتوانست فایل‌های گواهی را ایجاد کند`;
};

const removeFileIfPresent = async (filePath: string) => {
  try {
    await fs.promises.unlink(filePath);
  } catch (error: unknown) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (code !== "ENOENT") throw error;
  }
};

const assertNonEmptyFile = async (filePath: string, label: string) => {
  const stat = await fs.promises.stat(filePath).catch(() => null);
  if (!stat?.isFile() || stat.size <= 0) {
    throw new Error(`${label} پس از اجرای ابزار ساخته نشد.`);
  }
};

const runExecutable = async (command: string, args: string[]) =>
  execFileAsync(command, args, {
    windowsHide: true,
    timeout: 120_000,
    maxBuffer: 2 * 1024 * 1024,
  });

const getWindowsPowerShellCandidates = () => {
  const candidates = [
    process.env.SYSTEMROOT
      ? path.join(
          process.env.SYSTEMROOT,
          "System32",
          "WindowsPowerShell",
          "v1.0",
          "powershell.exe",
        )
      : "",
    "powershell.exe",
    "powershell",
  ].filter(Boolean);
  return [...new Set(candidates)];
};

const getOpenSslCandidates = () => {
  const explicit = String(process.env.OPENSSL_PATH || "").trim();
  const programFiles = String(process.env.ProgramFiles || "C:\\Program Files").trim();
  const programFilesX86 = String(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)").trim();
  const candidates = [
    explicit,
    "openssl",
    path.join(programFiles, "Git", "usr", "bin", "openssl.exe"),
    path.join(programFiles, "OpenSSL-Win64", "bin", "openssl.exe"),
    path.join(programFilesX86, "OpenSSL-Win32", "bin", "openssl.exe"),
  ].filter(Boolean);
  return [...new Set(candidates)].filter((candidate) =>
    candidate === "openssl" || fs.existsSync(candidate),
  );
};

const tryTrustCertificateOnWindows = async (cerPath: string) => {
  if (process.platform !== "win32") return false;
  const certutil = process.env.SYSTEMROOT
    ? path.join(process.env.SYSTEMROOT, "System32", "certutil.exe")
    : "certutil.exe";
  try {
    await runExecutable(certutil, ["-user", "-addstore", "-f", "Root", cerPath]);
    return true;
  } catch (error) {
    console.warn(`[local-cert] Certificate was created but could not be trusted automatically: ${getProcessErrorText(error)}`);
    return false;
  }
};

export const generateLocalCertificate = async (
  domain: string,
  serverIp: string,
  aliases: string[] = [],
): Promise<LocalCertificateResult> => {
  if (!domain) throw new Error("نام دامنه محلی معتبر نیست.");
  if (
    String(
      process.env.KOUROSH_DEV_PROXY || process.env.VITE_DISABLE_HTTPS || "",
    ).trim() === "1"
  ) {
    await fs.promises.mkdir(localCertDir, { recursive: true });
    return {
      keyPath: "",
      certPath: "",
      pfxPath: "",
      cerPath: "",
      caCerPath: "",
      caCrtPath: "",
      caPemPath: "",
      caFingerprintSha256: "",
      caCommonName: LOCAL_CA_COMMON_NAME,
      configPath: "",
      mode: "proxy-http",
      trusted: false,
      restartRequired: false,
      ipAddresses: [],
    };
  }

  await fs.promises.mkdir(localCertDir, { recursive: true });
  const keyPath = localCurrentKeyPath;
  const certPath = localCurrentCertPath;
  const pfxPath = localCurrentPfxPath;
  const cerPath = join(localCertDir, "current-cert.cer");
  const caKeyPath = localCurrentCaKeyPath;
  const caPemPath = localCurrentCaPemPath;
  const caPfxPath = localCurrentCaPfxPath;
  const caCerPath = localCurrentCaCerPath;
  const caCrtPath = localCurrentCaCrtPath;
  const configPath = join(localCertDir, "openssl-local.cnf");
  const caConfigPath = join(localCertDir, "openssl-local-ca.cnf");
  const csrPath = join(localCertDir, "current-cert.csr");
  const serialPath = join(localCertDir, "current-ca.srl");
  const psScriptPath = join(localCertDir, "generate-local-cert.ps1");

  let rootCaRotated = false;
  let existingProfileVersion = 0;
  let existingProfileMode = "";
  try {
    const profile = JSON.parse(await fs.promises.readFile(localCurrentCaProfilePath, "utf8"));
    existingProfileVersion = Number(profile?.version || 0);
    existingProfileMode = String(profile?.mode || "");
  } catch {
    existingProfileVersion = 0;
    existingProfileMode = "";
  }
  const hasReusableRoot = existingProfileVersion === LOCAL_CA_PROFILE_VERSION &&
    fs.existsSync(caCerPath) &&
    (fs.existsSync(caPfxPath) || (fs.existsSync(caKeyPath) && fs.existsSync(caPemPath)));
  if (!hasReusableRoot) {
    rootCaRotated = true;
    await Promise.all([
      removeFileIfPresent(caKeyPath),
      removeFileIfPresent(caPemPath),
      removeFileIfPresent(caPfxPath),
      removeFileIfPresent(caCerPath),
      removeFileIfPresent(caCrtPath),
      removeFileIfPresent(serialPath),
      removeFileIfPresent(localCurrentCaProfilePath),
    ]);
  }

  const persistCaProfile = async (
    mode: "windows-pfx" | "openssl",
    fingerprintSha256: string,
  ) => {
    await fs.promises.writeFile(localCurrentCaProfilePath, JSON.stringify({
      version: LOCAL_CA_PROFILE_VERSION,
      mode,
      commonName: LOCAL_CA_COMMON_NAME,
      fingerprintSha256,
      updatedAt: new Date().toISOString(),
    }, null, 2), "utf8");
  };

  const validateAndPublishCertificateChain = async () => {
    const rootBytes = await fs.promises.readFile(caCerPath);
    const leafBytes = await fs.promises.readFile(cerPath);
    const rootCertificate = new X509Certificate(rootBytes);
    const leafCertificate = new X509Certificate(leafBytes);

    if (!rootCertificate.ca) {
      throw new Error("گواهی ریشه ساخته‌شده ویژگی CA معتبر ندارد.");
    }
    if (
      rootCertificate.subject !== rootCertificate.issuer ||
      !rootCertificate.verify(rootCertificate.publicKey)
    ) {
      throw new Error("گواهی ریشه ساخته‌شده یک Trust Anchor خودامضای معتبر نیست.");
    }
    if (leafCertificate.ca) {
      throw new Error("گواهی سرور به‌اشتباه به‌عنوان CA ساخته شده است.");
    }
    if (!leafCertificate.verify(rootCertificate.publicKey)) {
      throw new Error("امضای گواهی سرور با Root CA فعلی تطبیق ندارد.");
    }
    if (!leafCertificate.checkHost(domain)) {
      throw new Error(`دامنه ${domain} داخل SAN گواهی سرور ثبت نشده است.`);
    }
    for (const ipAddress of ipAddresses) {
      if (!leafCertificate.checkIP(ipAddress)) {
        throw new Error(`آدرس ${ipAddress} داخل SAN گواهی سرور ثبت نشده است.`);
      }
    }

    const mobilePem = `${rootCertificate.toString().trim()}\n`;
    await fs.promises.writeFile(caCrtPath, mobilePem, "utf8");
    await assertNonEmptyFile(caCrtPath, "فایل PEM گواهی ریشه برای موبایل");

    return {
      caFingerprintSha256: rootCertificate.fingerprint256.replace(/:/g, "").toLowerCase(),
      caCommonName: LOCAL_CA_COMMON_NAME,
    };
  };
  const safeServerIp = isValidIPv4(serverIp) ? serverIp : "";
  const preferredLanIp = getPreferredLocalIPv4();
  const ipAddresses = [...new Set([
    "127.0.0.1",
    safeServerIp,
    isValidIPv4(preferredLanIp) ? preferredLanIp : "",
  ].filter(Boolean))];
  const safeAliases = aliases
    .map((alias) => alias.replace(/[^a-z0-9.-]/gi, ""))
    .filter((alias) => alias && alias !== domain);
  const dnsNames = [...new Set([domain, ...safeAliases, "localhost"])];
  const altNameLines = [
    ...dnsNames.map((dnsName, index) => `DNS.${index + 1} = ${dnsName}`),
    ...ipAddresses.map((ipAddress, index) => `IP.${index + 1} = ${ipAddress}`),
  ].join("\n");
  const config = `[req]
distinguished_name = req_distinguished_name
prompt = no

[req_distinguished_name]
CN = ${domain}

[v3_req]
basicConstraints = critical, CA:false
subjectAltName = @alt_names
extendedKeyUsage = serverAuth
keyUsage = critical, digitalSignature, keyEncipherment
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer

[alt_names]
${altNameLines}
`;
  const caConfig = `[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_ca
prompt = no

[req_distinguished_name]
CN = ${LOCAL_CA_COMMON_NAME}
O = Kourosh Store

[v3_ca]
basicConstraints = critical, CA:true, pathlen:0
keyUsage = critical, keyCertSign, cRLSign, digitalSignature
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
`;
  const psScript = `param(
  [Parameter(Mandatory = $true)][string]$Domain,
  [Parameter(Mandatory = $true)][string]$LeafPfxPath,
  [Parameter(Mandatory = $true)][string]$LeafCerPath,
  [Parameter(Mandatory = $true)][string]$RootPfxPath,
  [Parameter(Mandatory = $true)][string]$RootCerPath,
  [string]$DnsNamesCsv = '',
  [string]$IpAddressesCsv = '',
  [string]$PfxPassword = '${localPfxPassphrase.replace(/'/g, "''")}'
)
$ErrorActionPreference = 'Stop'
Import-Module PKI -ErrorAction Stop | Out-Null
Remove-Item -LiteralPath $LeafPfxPath -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $LeafCerPath -Force -ErrorAction SilentlyContinue
$securePwd = ConvertTo-SecureString -String $PfxPassword -Force -AsPlainText
$rootCert = $null
$leafCert = $null
$rootWasImported = $false
try {
  if ((Test-Path -LiteralPath $RootPfxPath) -and (Test-Path -LiteralPath $RootCerPath)) {
    $imported = @(Import-PfxCertificate -FilePath $RootPfxPath -CertStoreLocation 'Cert:\\CurrentUser\\My' -Password $securePwd -Exportable)
    $rootCert = $imported | Where-Object { $_.HasPrivateKey } | Select-Object -First 1
    $rootWasImported = $true
  }
  if (-not $rootCert) {
    $rootCert = New-SelfSignedCertificate -Type Custom -Subject 'CN=${LOCAL_CA_COMMON_NAME},O=Kourosh Store' -FriendlyName '${LOCAL_CA_COMMON_NAME}' -KeyExportPolicy Exportable -KeyAlgorithm RSA -KeyLength 3072 -HashAlgorithm sha256 -KeyUsage CertSign,CRLSign,DigitalSignature -NotBefore (Get-Date).AddDays(-1) -NotAfter (Get-Date).AddYears(10) -CertStoreLocation 'Cert:\\CurrentUser\\My' -TextExtension @('2.5.29.19={critical}{text}ca=1&pathlength=0')
    Export-PfxCertificate -Cert ("Cert:\\CurrentUser\\My\\$($rootCert.Thumbprint)") -FilePath $RootPfxPath -Password $securePwd -Force | Out-Null
    Export-Certificate -Cert ("Cert:\\CurrentUser\\My\\$($rootCert.Thumbprint)") -FilePath $RootCerPath -Type CERT -Force | Out-Null
  }

  $dnsNames = @($Domain)
  if ($DnsNamesCsv) {
    $dnsNames += $DnsNamesCsv.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ }
  }
  $ipAddresses = @()
  if ($IpAddressesCsv) {
    $ipAddresses += $IpAddressesCsv.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ }
  }
  $sanEntries = @()
  foreach ($dnsName in ($dnsNames | Select-Object -Unique)) { $sanEntries += "DNS=$dnsName" }
  foreach ($ipAddress in ($ipAddresses | Select-Object -Unique)) { $sanEntries += "IPAddress=$ipAddress" }
  $san = [string]::Join('&', $sanEntries)

  $leafCert = New-SelfSignedCertificate -Type Custom -Subject "CN=$Domain" -FriendlyName "Kourosh Local Server $Domain" -Signer $rootCert -KeyExportPolicy Exportable -KeyAlgorithm RSA -KeyLength 2048 -HashAlgorithm sha256 -NotBefore (Get-Date).AddDays(-1) -NotAfter (Get-Date).AddDays(365) -CertStoreLocation 'Cert:\\CurrentUser\\My' -KeyUsage DigitalSignature,KeyEncipherment -TextExtension @("2.5.29.17={text}$san",'2.5.29.19={critical}{text}ca=0','2.5.29.37={text}1.3.6.1.5.5.7.3.1')
  Export-PfxCertificate -Cert ("Cert:\\CurrentUser\\My\\$($leafCert.Thumbprint)") -FilePath $LeafPfxPath -Password $securePwd -ChainOption BuildChain -Force | Out-Null
  Export-Certificate -Cert ("Cert:\\CurrentUser\\My\\$($leafCert.Thumbprint)") -FilePath $LeafCerPath -Type CERT -Force | Out-Null

  Write-Output ("KOUROSH_ROOT_THUMBPRINT=" + $rootCert.Thumbprint)
  Write-Output ("KOUROSH_LEAF_THUMBPRINT=" + $leafCert.Thumbprint)
} finally {
  if ($leafCert -and $leafCert.Thumbprint) {
    Remove-Item ("Cert:\\CurrentUser\\My\\$($leafCert.Thumbprint)") -Force -ErrorAction SilentlyContinue
  }
  if ($rootCert -and $rootCert.Thumbprint) {
    Remove-Item ("Cert:\\CurrentUser\\My\\$($rootCert.Thumbprint)") -Force -ErrorAction SilentlyContinue
  }
}
`;
  await fs.promises.writeFile(configPath, config, "utf8");
  await fs.promises.writeFile(caConfigPath, caConfig, "utf8");
  await fs.promises.writeFile(psScriptPath, psScript, "utf8");

  const runPowerShellFallback = async () => {
    await Promise.all([
      removeFileIfPresent(pfxPath),
      removeFileIfPresent(cerPath),
      removeFileIfPresent(keyPath),
      removeFileIfPresent(certPath),
    ]);

    let lastError: unknown;
    for (const ps of getWindowsPowerShellCandidates()) {
      try {
        const result = await runExecutable(ps, [
          "-NoLogo",
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          psScriptPath,
          "-Domain",
          domain,
          "-LeafPfxPath",
          pfxPath,
          "-LeafCerPath",
          cerPath,
          "-RootPfxPath",
          caPfxPath,
          "-RootCerPath",
          caCerPath,
          "-DnsNamesCsv",
          dnsNames.join(","),
          "-IpAddressesCsv",
          ipAddresses.join(","),
          "-PfxPassword",
          localPfxPassphrase,
        ]);
        await assertNonEmptyFile(pfxPath, "فایل PFX سرور");
        await assertNonEmptyFile(cerPath, "فایل CER سرور");
        await assertNonEmptyFile(caPfxPath, "فایل PFX گواهی ریشه");
        await assertNonEmptyFile(caCerPath, "فایل CER گواهی ریشه");
        const output = `${normalizeProcessOutput(result.stdout)}\n${normalizeProcessOutput(result.stderr)}`;
        void output;
        const certificateMetadata = await validateAndPublishCertificateChain();
        // Keep certificate creation independent from Windows trust-store UI.
        // Import-Certificate can fail under -NonInteractive with
        // "UI is not allowed in this operation" even though the generated
        // root and leaf files are valid. certutil performs the Current User
        // trust step separately and does not make OpenSSL a hard dependency.
        const trusted = await tryTrustCertificateOnWindows(caCerPath);
        await persistCaProfile("windows-pfx", certificateMetadata.caFingerprintSha256);
        return {
          pfxPath,
          cerPath,
          caCerPath,
          caCrtPath,
          configPath,
          mode: "windows-pfx" as const,
          trusted,
          restartRequired: true,
          ipAddresses,
          rootCaRotated,
          caProfileVersion: LOCAL_CA_PROFILE_VERSION,
          ...certificateMetadata,
        };
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("PowerShell در دسترس نیست.");
  };

  const runOpenSslFallback = async () => {
    await Promise.all([
      removeFileIfPresent(keyPath),
      removeFileIfPresent(certPath),
      removeFileIfPresent(pfxPath),
      removeFileIfPresent(cerPath),
      removeFileIfPresent(csrPath),
    ]);

    let lastError: unknown;
    for (const openssl of getOpenSslCandidates()) {
      try {
        if (!fs.existsSync(caKeyPath) || !fs.existsSync(caPemPath)) {
          rootCaRotated = true;
          await Promise.all([
            removeFileIfPresent(caKeyPath),
            removeFileIfPresent(caPemPath),
            removeFileIfPresent(caPfxPath),
            removeFileIfPresent(caCerPath),
            removeFileIfPresent(serialPath),
          ]);
          await runExecutable(openssl, [
            "req",
            "-x509",
            "-nodes",
            "-newkey",
            "rsa:3072",
            "-sha256",
            "-days",
            "3650",
            "-keyout",
            caKeyPath,
            "-out",
            caPemPath,
            "-config",
            caConfigPath,
            "-extensions",
            "v3_ca",
          ]);
          await runExecutable(openssl, [
            "pkcs12",
            "-export",
            "-out",
            caPfxPath,
            "-inkey",
            caKeyPath,
            "-in",
            caPemPath,
            "-name",
            LOCAL_CA_COMMON_NAME,
            "-passout",
            `pass:${localPfxPassphrase}`,
          ]);
        }

        await runExecutable(openssl, [
          "x509",
          "-in",
          caPemPath,
          "-outform",
          "der",
          "-out",
          caCerPath,
        ]);
        await runExecutable(openssl, [
          "req",
          "-new",
          "-nodes",
          "-newkey",
          "rsa:2048",
          "-sha256",
          "-keyout",
          keyPath,
          "-out",
          csrPath,
          "-subj",
          `/CN=${domain}`,
        ]);
        await runExecutable(openssl, [
          "x509",
          "-req",
          "-in",
          csrPath,
          "-CA",
          caPemPath,
          "-CAkey",
          caKeyPath,
          "-CAserial",
          serialPath,
          "-CAcreateserial",
          "-out",
          certPath,
          "-days",
          "365",
          "-sha256",
          "-extfile",
          configPath,
          "-extensions",
          "v3_req",
        ]);
        await runExecutable(openssl, [
          "x509",
          "-in",
          certPath,
          "-outform",
          "der",
          "-out",
          cerPath,
        ]);
        await runExecutable(openssl, [
          "pkcs12",
          "-export",
          "-out",
          pfxPath,
          "-inkey",
          keyPath,
          "-in",
          certPath,
          "-certfile",
          caPemPath,
          "-name",
          domain,
          "-passout",
          `pass:${localPfxPassphrase}`,
        ]);
        await Promise.all([
          assertNonEmptyFile(keyPath, "فایل کلید PEM سرور"),
          assertNonEmptyFile(certPath, "فایل گواهی PEM سرور"),
          assertNonEmptyFile(pfxPath, "فایل PFX سرور"),
          assertNonEmptyFile(cerPath, "فایل CER سرور"),
          assertNonEmptyFile(caCerPath, "فایل CER گواهی ریشه"),
        ]);
        await removeFileIfPresent(csrPath);
        const certificateMetadata = await validateAndPublishCertificateChain();
        const trusted = await tryTrustCertificateOnWindows(caCrtPath);
        await persistCaProfile("openssl", certificateMetadata.caFingerprintSha256);
        return {
          keyPath,
          certPath,
          pfxPath,
          cerPath,
          caCerPath,
          caCrtPath,
          caPemPath,
          configPath,
          mode: "openssl" as const,
          trusted,
          restartRequired: true,
          ipAddresses,
          rootCaRotated,
          caProfileVersion: LOCAL_CA_PROFILE_VERSION,
          ...certificateMetadata,
        };
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("OpenSSL در دسترس نیست.");
  };

  if (process.platform === "win32") {
    // Windows PKI is available without an extra OpenSSL installation. Prefer it
    // for a fresh profile and keep using the tool that owns an existing root so
    // regenerating a leaf certificate never rotates a trusted mobile Root CA.
    const preferPowerShell = !hasReusableRoot || existingProfileMode === "windows-pfx";
    const primary = preferPowerShell
      ? { name: "PowerShell" as const, run: runPowerShellFallback }
      : { name: "OpenSSL" as const, run: runOpenSslFallback };
    const fallback = preferPowerShell
      ? { name: "OpenSSL" as const, run: runOpenSslFallback }
      : { name: "PowerShell" as const, run: runPowerShellFallback };

    let primaryError: unknown;
    try {
      return await primary.run();
    } catch (error) {
      primaryError = error;
      console.error(`[local-cert] ${primary.name} generation failed: ${getProcessErrorText(error)}`);
    }

    try {
      return await fallback.run();
    } catch (fallbackError) {
      console.error(`[local-cert] ${fallback.name} generation failed: ${getProcessErrorText(fallbackError)}`);
      throw new Error(
        `ساخت گواهی محلی انجام نشد. علت ${primary.name}: ${summarizeCertificateFailure(primaryError, primary.name)}. مسیر جایگزین ${fallback.name}: ${summarizeCertificateFailure(fallbackError, fallback.name)}. جزئیات فنی در ترمینال سرور ثبت شد.`,
        { cause: primaryError },
      );
    }
  }

  try {
    return await runOpenSslFallback();
  } catch (opensslError) {
    console.error(`[local-cert] OpenSSL generation failed: ${getProcessErrorText(opensslError)}`);
    throw new Error(
      `ساخت گواهی محلی انجام نشد. ${summarizeCertificateFailure(opensslError, "OpenSSL")}. جزئیات فنی در ترمینال سرور ثبت شد.`,
      { cause: opensslError },
    );
  }
};
