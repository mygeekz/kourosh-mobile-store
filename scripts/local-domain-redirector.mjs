import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), '..');
const certDir = path.join(rootDir, 'certs');
const runtimeConfigPath = path.join(certDir, 'local-domain-runtime.json');
const hostsScriptPath = path.join(certDir, 'setup-local-hosts.bat');
const targetPortFallback = 5173;
const pfxPassphrase = process.env.LOCAL_CERT_PFX_PASSPHRASE || process.env.VITE_LOCAL_CERT_PFX_PASSPHRASE || 'kourosh-local-dev';

const normalizeDomain = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9.-]/g, '');

const readJson = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
};

const inferDomainFromHostsScript = () => {
  try {
    const text = fs.readFileSync(hostsScriptPath, 'utf8');
    return normalizeDomain(text.match(/set\s+"PRIMARY_HOST=([^"]+)"/i)?.[1] || text.match(/set\s+"HOST=([^"]+)"/i)?.[1]);
  } catch {
    return '';
  }
};

const getRuntimeConfig = () => {
  const stored = readJson(runtimeConfigPath) || {};
  const inferredDomain = inferDomainFromHostsScript();
  const targetDomain = normalizeDomain(stored.targetDomain || inferredDomain || 'kourosh.home.arpa');
  const shortcutDomain = normalizeDomain(stored.shortcutDomain || '');
  const requestedPort = Number(stored.targetPort || targetPortFallback);
  const targetPort = Number.isInteger(requestedPort) && requestedPort > 0 && requestedPort <= 65535
    ? requestedPort
    : targetPortFallback;
  const targetUrl = `https://${targetDomain}:${targetPort}/#/`;
  const certificateDnsNames = Array.isArray(stored.certificateDnsNames)
    ? stored.certificateDnsNames.map(normalizeDomain).filter(Boolean)
    : [];
  return { targetDomain, shortcutDomain, targetPort, targetUrl, certificateDnsNames };
};

const redirectRequest = (_req, res) => {
  const { targetUrl } = getRuntimeConfig();
  res.writeHead(308, {
    Location: targetUrl,
    'Cache-Control': 'no-store',
    Connection: 'close',
    'Content-Type': 'text/plain; charset=utf-8',
  });
  res.end(`Redirecting to ${targetUrl}\n`);
};

const activeServers = [];
const keepAlive = setInterval(() => {}, 2 ** 30);

const listen = (server, port, label) => {
  server.on('error', (error) => {
    const code = error && typeof error === 'object' ? error.code : '';
    if (code === 'EADDRINUSE') {
      console.warn(`[local-domain-redirect] ${label} port ${port} is already in use; automatic no-port redirect is unavailable on that port.`);
      return;
    }
    if (code === 'EACCES') {
      console.warn(`[local-domain-redirect] Windows denied access to ${label} port ${port}. Run start_https.bat as Administrator or free the port.`);
      return;
    }
    console.error(`[local-domain-redirect] ${label} listener failed:`, error);
  });
  server.listen(port, '0.0.0.0', () => {
    const config = getRuntimeConfig();
    console.log(`[local-domain-redirect] ${label} local redirect ready: ${config.shortcutDomain || config.targetDomain} -> ${config.targetUrl}`);
  });
  activeServers.push(server);
};

listen(http.createServer(redirectRequest), Number(process.env.KOUROSH_REDIRECT_HTTP_PORT || 80), 'HTTP');

const loadHttpsOptions = () => {
  const config = getRuntimeConfig();
  const certificateHost = config.shortcutDomain || config.targetDomain;
  if (!certificateHost || !config.certificateDnsNames.includes(certificateHost)) return null;
  const pfxPath = path.join(certDir, 'current-cert.pfx');
  if (fs.existsSync(pfxPath)) {
    return { pfx: fs.readFileSync(pfxPath), passphrase: pfxPassphrase };
  }
  const certPath = path.join(certDir, 'current-cert.pem');
  const keyPath = path.join(certDir, 'current-key.pem');
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    return { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) };
  }
  return null;
};

try {
  const httpsOptions = loadHttpsOptions();
  if (httpsOptions) {
    listen(https.createServer(httpsOptions, redirectRequest), Number(process.env.KOUROSH_REDIRECT_HTTPS_PORT || 443), 'HTTPS');
  } else {
    console.log('[local-domain-redirect] HTTPS port 443 redirect will activate after regenerating the certificate and restarting start_https.bat.');
  }
} catch (error) {
  console.warn('[local-domain-redirect] Generated certificate could not be used for the optional HTTPS redirect:', error);
}

const shutdown = () => {
  clearInterval(keepAlive);
  for (const server of activeServers) server.close();
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
