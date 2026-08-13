import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import path from 'node:path';
import { createSecureContext } from 'node:tls';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.resolve(process.env.KOUROSH_PWA_DIST_DIR || path.join(rootDir, 'dist'));
const requestedHost = String(process.env.KOUROSH_PWA_HOST || '0.0.0.0').trim() || '0.0.0.0';
const requestedPort = Number(process.env.KOUROSH_PWA_PORT || 5173);
const apiHost = String(process.env.KOUROSH_API_HOST || '127.0.0.1').trim() || '127.0.0.1';
const apiPort = Number(process.env.KOUROSH_API_PORT || 3001);
const testHttpMode = process.env.NODE_ENV === 'test' && process.env.KOUROSH_PWA_TEST_HTTP === '1';
const host = testHttpMode ? '127.0.0.1' : requestedHost;
const publicHost = String(process.env.LOCAL_HOSTS_IP || process.env.KOUROSH_HTTPS_HOST || 'localhost').trim() || 'localhost';
const REMOTE_ACCESS_TTL_MS = 2 * 60 * 1000;
let lastRemoteMobileAccessAt = 0;
const pfxPassphrase =
  process.env.LOCAL_CERT_PFX_PASSPHRASE ||
  process.env.VITE_LOCAL_CERT_PFX_PASSPHRASE ||
  'kourosh-local-dev';
// The production launcher and certificate bootstrap share one reviewed TLS
// source of truth. Environment variables left behind by an older dev setup
// must never make the production runtime serve a different certificate than
// the one whose LAN IP SAN was just validated.
const allowExternalTlsFiles = process.env.KOUROSH_ALLOW_EXTERNAL_TLS_FILES === '1';
const resolveRuntimeTlsPath = (externalValue, generatedRelativePath) => path.resolve(
  allowExternalTlsFiles && String(externalValue || '').trim()
    ? String(externalValue).trim()
    : path.join(rootDir, generatedRelativePath),
);
const pfxPath = resolveRuntimeTlsPath(
  process.env.HTTPS_PFX_FILE || process.env.VITE_HTTPS_PFX_FILE,
  'certs/current-cert.pfx',
);
const certPath = resolveRuntimeTlsPath(
  process.env.HTTPS_CERT_FILE || process.env.VITE_HTTPS_CERT_FILE,
  'certs/current-cert.pem',
);
const keyPath = resolveRuntimeTlsPath(
  process.env.HTTPS_KEY_FILE || process.env.VITE_HTTPS_KEY_FILE,
  'certs/current-key.pem',
);

const MIME_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.mp4', 'video/mp4'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.ttf', 'font/ttf'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

const isNonEmptyFile = (filePath) => {
  try {
    const stat = fs.statSync(filePath);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
};

const validateProductionRuntime = () => {
  const indexPath = path.join(distDir, 'index.html');
  const workerPath = path.join(distDir, 'sw.js');
  const manifestPath = path.join(distDir, 'manifest.webmanifest');
  const required = [
    indexPath,
    workerPath,
    manifestPath,
    path.join(distDir, 'icons/icon-192.png'),
    path.join(distDir, 'icons/icon-512.png'),
    path.join(distDir, 'icons/maskable-512.png'),
  ];
  for (const filePath of required) {
    if (!isNonEmptyFile(filePath)) {
      throw new Error(`Required PWA output is missing: ${path.relative(rootDir, filePath)}`);
    }
  }

  const index = fs.readFileSync(indexPath, 'utf8');
  const workerPrefix = fs.readFileSync(workerPath, 'utf8').slice(0, 320).toLowerCase();
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!/rel=["']manifest["'][^>]+manifest\.webmanifest|manifest\.webmanifest[^>]+rel=["']manifest["']/i.test(index)) {
    throw new Error('Production index.html does not reference manifest.webmanifest.');
  }
  if (workerPrefix.includes('<!doctype html') || workerPrefix.includes('<html')) {
    throw new Error('Generated sw.js contains an HTML fallback instead of JavaScript.');
  }
  const iconSizes = new Set((manifest.icons || []).flatMap((icon) => String(icon.sizes || '').split(/\s+/)).filter(Boolean));
  if (!(manifest.name || manifest.short_name) || !manifest.start_url || !['standalone', 'fullscreen', 'minimal-ui'].includes(manifest.display)) {
    throw new Error('Generated web manifest is missing the required install identity.');
  }
  if (!iconSizes.has('192x192') || !iconSizes.has('512x512')) {
    throw new Error('Generated web manifest is missing required install icon sizes.');
  }
};

const loadTlsOptions = () => {
  if (testHttpMode) return null;
  if (isNonEmptyFile(pfxPath)) {
    const options = { pfx: fs.readFileSync(pfxPath), passphrase: pfxPassphrase };
    createSecureContext(options);
    return options;
  }
  if (isNonEmptyFile(certPath) && isNonEmptyFile(keyPath)) {
    const options = { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) };
    createSecureContext(options);
    return options;
  }
  throw new Error('Trusted local HTTPS material is missing. Run the HTTPS bootstrap before starting the PWA runtime.');
};

const isApiPath = (pathname) =>
  pathname === '/health' ||
  pathname === '/api' ||
  pathname.startsWith('/api/') ||
  pathname === '/uploads' ||
  pathname.startsWith('/uploads/') ||
  pathname === '/inventory/alerts' ||
  pathname.startsWith('/inventory/alerts/');

const proxyHeaders = (req) => {
  const headers = { ...req.headers };
  headers.host = `${apiHost}:${apiPort}`;
  headers['x-forwarded-for'] = req.socket.remoteAddress || '';
  headers['x-forwarded-host'] = req.headers.host || '';
  headers['x-forwarded-proto'] = testHttpMode ? 'http' : 'https';
  return headers;
};

const proxyRequest = (req, res) => {
  const upstream = http.request({
    host: apiHost,
    port: apiPort,
    method: req.method,
    path: req.url,
    headers: proxyHeaders(req),
  }, (upstreamResponse) => {
    res.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
    upstreamResponse.pipe(res, { end: true });
  });

  upstream.setTimeout(60_000, () => upstream.destroy(new Error('API proxy timeout')));
  upstream.on('error', (error) => {
    if (!res.headersSent) {
      res.writeHead(502, {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      });
    }
    res.end(JSON.stringify({ success: false, message: `Local API is not ready: ${error.message}` }));
  });
  req.pipe(upstream, { end: true });
};

const resolveStaticPath = (pathname) => {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return { error: 400, filePath: '' };
  }
  if (decoded.includes('\0')) return { error: 400, filePath: '' };
  const candidate = path.resolve(distDir, `.${decoded}`);
  const relative = path.relative(distDir, candidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return { error: 403, filePath: '' };
  return { error: 0, filePath: candidate };
};

const cachePolicyFor = (pathname, filePath) => {
  const base = path.basename(filePath);
  if (pathname === '/' || base === 'index.html' || base === 'sw.js' || base === 'manifest.webmanifest') {
    return 'no-store, no-cache, must-revalidate, proxy-revalidate';
  }
  if (pathname.startsWith('/assets/') && /[-.][a-z0-9_-]{8,}\./i.test(base)) {
    return 'public, max-age=31536000, immutable';
  }
  return 'public, max-age=3600, must-revalidate';
};

const sendStatus = (res, statusCode, message) => {
  const body = Buffer.from(message, 'utf8');
  res.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Length': body.length,
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
};

const normalizeIp = (value) => String(value || '')
  .trim()
  .replace(/^::ffff:/, '')
  .replace(/^\[|\]$/g, '');

const isLoopbackIp = (value) => {
  const ip = normalizeIp(value);
  return ip === '127.0.0.1' || ip === '::1' || ip === 'localhost';
};

const isPrivateLanIpv4 = (value) => {
  const parts = normalizeIp(value).split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 10
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168);
};

const isHostPeer = (req) => {
  const peer = normalizeIp(req.socket.remoteAddress);
  return isLoopbackIp(peer) || peer === normalizeIp(publicHost);
};

const isMobilePeer = (req) => /android|iphone|ipad|ipod|mobile/i.test(String(req.headers['user-agent'] || ''));

const sendRuntimeHealth = (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    sendStatus(res, 405, 'Method Not Allowed');
    return;
  }

  const hostDevice = isHostPeer(req);
  if (!hostDevice && isMobilePeer(req)) lastRemoteMobileAccessAt = Date.now();
  const publicPort = Number(req.socket.localPort || requestedPort);
  const protocol = testHttpMode ? 'http' : 'https';
  const shareable = isPrivateLanIpv4(publicHost) && host === '0.0.0.0';
  const remoteAccessVerified = !hostDevice && isMobilePeer(req)
    ? true
    : lastRemoteMobileAccessAt > 0 && Date.now() - lastRemoteMobileAccessAt <= REMOTE_ACCESS_TTL_MS;
  const body = Buffer.from(JSON.stringify({
    ok: true,
    runtime: 'kourosh-local-pwa',
    secure: !testHttpMode,
    serviceWorker: '/sw.js',
    manifest: '/manifest.webmanifest',
    network: {
      publicHost,
      publicPort,
      publicUrl: `${protocol}://${publicHost}:${publicPort}/#/`,
      bindAddress: host,
      shareable,
      hostDevice,
      remoteAccessVerified,
    },
  }), 'utf8');
  res.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Length': body.length,
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  });
  if (req.method === 'HEAD') res.end();
  else res.end(body);
};

const sendStatic = (req, res, pathname) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    sendStatus(res, 405, 'Method Not Allowed');
    return;
  }

  const resolved = resolveStaticPath(pathname === '/' ? '/index.html' : pathname);
  if (resolved.error) {
    sendStatus(res, resolved.error, resolved.error === 403 ? 'Forbidden' : 'Bad Request');
    return;
  }

  let filePath = resolved.filePath;
  let stat = fs.statSync(filePath, { throwIfNoEntry: false });
  if (stat?.isDirectory()) {
    filePath = path.join(filePath, 'index.html');
    stat = fs.statSync(filePath, { throwIfNoEntry: false });
  }
  if (!stat?.isFile()) {
    if (path.extname(pathname)) {
      sendStatus(res, 404, 'Not Found');
      return;
    }
    filePath = path.join(distDir, 'index.html');
    stat = fs.statSync(filePath);
  }

  const etag = `W/"${stat.size.toString(16)}-${Math.trunc(stat.mtimeMs).toString(16)}"`;
  const headers = {
    'Cache-Control': cachePolicyFor(pathname, filePath),
    'Content-Length': stat.size,
    'Content-Type': MIME_TYPES.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream',
    ETag: etag,
    'Last-Modified': stat.mtime.toUTCString(),
    'Referrer-Policy': 'same-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
  };
  if (path.basename(filePath) === 'sw.js') headers['Service-Worker-Allowed'] = '/';

  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, headers);
    res.end();
    return;
  }
  res.writeHead(200, headers);
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  const stream = fs.createReadStream(filePath);
  stream.on('error', (error) => {
    if (!res.headersSent) sendStatus(res, 500, 'Static asset read failed');
    else res.destroy(error);
  });
  stream.pipe(res);
};

const requestHandler = (req, res) => {
  let parsed;
  try {
    parsed = new URL(req.url || '/', `${testHttpMode ? 'http' : 'https'}://localhost`);
  } catch {
    sendStatus(res, 400, 'Bad Request');
    return;
  }

  if (parsed.pathname === '/__kourosh/pwa-health') {
    sendRuntimeHealth(req, res);
    return;
  }
  if (isApiPath(parsed.pathname)) {
    proxyRequest(req, res);
    return;
  }
  sendStatic(req, res, parsed.pathname);
};

const proxyUpgrade = (req, socket, head) => {
  let pathname = '';
  try { pathname = new URL(req.url || '/', 'https://localhost').pathname; } catch { socket.destroy(); return; }
  if (!isApiPath(pathname)) {
    socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }
  const upstream = net.connect(apiPort, apiHost, () => {
    const headers = proxyHeaders(req);
    headers.connection = 'Upgrade';
    headers.upgrade = headers.upgrade || 'websocket';
    const lines = [`${req.method} ${req.url} HTTP/1.1`];
    for (const [key, value] of Object.entries(headers)) {
      if (Array.isArray(value)) value.forEach((item) => lines.push(`${key}: ${item}`));
      else if (value !== undefined) lines.push(`${key}: ${value}`);
    }
    lines.push('\r\n');
    upstream.write(lines.join('\r\n'));
    if (head?.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on('error', (error) => socket.destroy(error));
  socket.on('error', () => upstream.destroy());
};

try {
  if (!Number.isInteger(requestedPort) || requestedPort < 0 || requestedPort > 65535) {
    throw new Error(`Invalid HTTPS port: ${requestedPort}`);
  }
  if (!Number.isInteger(apiPort) || apiPort <= 0 || apiPort > 65535) {
    throw new Error(`Invalid API port: ${apiPort}`);
  }
  validateProductionRuntime();
  const tlsOptions = loadTlsOptions();
  const server = testHttpMode
    ? http.createServer(requestHandler)
    : https.createServer(tlsOptions, requestHandler);

  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 70_000;
  server.requestTimeout = 120_000;
  server.on('upgrade', proxyUpgrade);
  server.on('clientError', (_error, socket) => {
    if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
  });
  server.on('error', (error) => {
    console.error('[pwa-runtime] Server failed:', error);
    process.exitCode = 1;
  });
  server.listen(requestedPort, host, () => {
    const address = server.address();
    const activePort = typeof address === 'object' && address ? address.port : requestedPort;
    const protocol = testHttpMode ? 'http' : 'https';
    console.log(`[pwa-runtime] Production runtime ready: ${protocol}://${publicHost}:${activePort}/#/`);
    console.log(`[pwa-runtime] Service worker: ${protocol}://${publicHost}:${activePort}/sw.js`);
    console.log(`[pwa-runtime] API proxy: http://${apiHost}:${apiPort}`);
    if (typeof process.send === 'function') {
      process.send({
        type: 'kourosh-pwa-runtime-ready',
        port: activePort,
        protocol,
        bindAddress: typeof address === 'object' && address ? address.address : host,
        publicHost,
      });
    }
  });

  const shutdown = () => server.close(() => process.exit(0));
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
} catch (error) {
  console.error('[pwa-runtime] Startup validation failed.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
