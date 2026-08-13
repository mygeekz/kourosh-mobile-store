#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  MINI_APP_AUTH_BODY_LIMIT,
  isAllowedMiniAppApiPath,
  isAllowedMiniAppApiRequest,
  isAnyApiPath,
  isMiniAppApiNamespace,
  normalizeMiniAppStaticPublicPath,
  safeDecodeMiniAppPath,
} from "../server/miniapp/miniAppGatewayPolicy.mjs";
import { ensureGatewayRelaySecret, readGatewayRelayAssignment } from "../server/cloud/gatewayRelayRuntimeFiles.mjs";
import { readMiniAppGatewayRuntimeConfig } from "../server/miniapp/miniAppGatewayRuntimeConfig.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_BODY_LIMIT = MINI_APP_AUTH_BODY_LIMIT;
const DEFAULT_TIMEOUT_MS = 30_000;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

const MIME_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".woff2", "font/woff2"],
]);

const SECURITY_HEADERS = Object.freeze({
  // React and Telegram theme/safe-area integration set CSS variables through
  // element.style. unsafe-inline is therefore limited to styles; scripts stay
  // restricted to the bundled app and Telegram's official runtime.
  "Content-Security-Policy": "default-src 'none'; script-src 'self' https://telegram.org; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors https://web.telegram.org https://*.telegram.org; base-uri 'none'; form-action 'none'; object-src 'none'; manifest-src 'none'; worker-src 'none'",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
});

const SECURITY_EVENTS = new Set([
  "gateway_rejected_path",
  "gateway_rejected_method",
  "gateway_bad_host",
  "gateway_body_too_large",
  "gateway_runtime_config_invalid",
]);

const normalizeIp = (value) => String(value || "").trim().replace(/^::ffff:/, "").replace(/^\[|\]$/g, "");
const isLoopbackIp = (value) => {
  const ip = normalizeIp(value);
  return ip === "::1" || ip === "localhost" || ip.startsWith("127.");
};

const validClientIp = (value) => {
  const ip = normalizeIp(value);
  return net.isIP(ip) ? ip : null;
};

const safeRequestId = (value) => {
  const normalized = String(value || "").trim();
  return REQUEST_ID_PATTERN.test(normalized) ? normalized : null;
};

export const writeMiniAppSecurityLog = (event, fields = {}, sink = console.warn) => {
  if (!SECURITY_EVENTS.has(event)) return;
  const record = {
    timestamp: new Date().toISOString(),
    event,
    requestId: safeRequestId(fields.requestId) || undefined,
    route: String(fields.route || "").slice(0, 160) || undefined,
    method: String(fields.method || "").slice(0, 12) || undefined,
    status: Number.isInteger(fields.status) ? fields.status : undefined,
    reasonCode: String(fields.reasonCode || "").slice(0, 80) || undefined,
    durationMs: Number.isFinite(fields.durationMs) ? Math.max(0, Math.round(fields.durationMs)) : undefined,
  };
  sink(JSON.stringify(Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined))));
};

const secretsEqual = (left, right) => {
  const a = Buffer.from(String(left || "")); const b = Buffer.from(String(right || ""));
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
};

export const resolveGatewayClientIp = (req, trustedEdgeMode, gatewayMode = "self_hosted", relayAuthenticated = false) => {
  const peer = validClientIp(req.socket.remoteAddress) || "unknown";
  if (gatewayMode === "cloud_relay_internal" && relayAuthenticated && isLoopbackIp(peer)) {
    return validClientIp(req.headers["x-kourosh-relay-client-ip"]) || peer;
  }
  if (gatewayMode === "self_hosted" && trustedEdgeMode === "cloudflare" && isLoopbackIp(peer)) {
    return validClientIp(req.headers["cf-connecting-ip"]) || peer;
  }
  return peer;
};

const normalizeExpectedHost = (value) => String(value || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
const requestHost = (req) => String(req.headers.host || "").trim().toLowerCase();

const applySecurityHeaders = (res) => {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(name, value);
};

const send = (res, status, body, contentType, extraHeaders = {}) => {
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(String(body), "utf8");
  applySecurityHeaders(res);
  res.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Length": payload.length,
    "Content-Type": contentType,
    ...extraHeaders,
  });
  res.end(payload);
};

const sendJson = (res, status, requestId, code, message) => send(
  res,
  status,
  JSON.stringify({ success: false, code, message, requestId }),
  "application/json; charset=utf-8",
  { "X-Request-ID": requestId },
);

const resolveStaticFile = (distDir, pathname) => {
  const decoded = safeDecodeMiniAppPath(pathname);
  if (!decoded) return null;
  const publicPath = normalizeMiniAppStaticPublicPath(decoded);
  if (!publicPath) return null;
  const filePath = path.resolve(distDir, `.${publicPath}`);
  const relative = path.relative(distDir, filePath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
  const mime = MIME_TYPES.get(path.extname(filePath).toLowerCase());
  if (!mime) return null;
  try {
    const stat = fs.statSync(filePath);
    const realFilePath = fs.realpathSync(filePath);
    const realRelative = path.relative(fs.realpathSync(distDir), realFilePath);
    if (realRelative.startsWith("..") || path.isAbsolute(realRelative)) return null;
    return stat.isFile() ? { filePath: realFilePath, mime, publicPath } : null;
  } catch {
    return null;
  }
};

const readAuthBody = (req, limit) => new Promise((resolve, reject) => {
  const chunks = [];
  let size = 0;
  let tooLarge = false;
  req.on("data", (chunk) => {
    if (tooLarge) return;
    size += chunk.length;
    if (size > limit) {
      tooLarge = true;
      reject(Object.assign(new Error("BODY_TOO_LARGE"), { code: "BODY_TOO_LARGE" }));
      return;
    }
    chunks.push(chunk);
  });
  req.on("end", () => { if (!tooLarge) resolve(Buffer.concat(chunks)); });
  req.on("error", reject);
});

const forwardHeaders = (req, requestId, clientIp, apiHost, apiPort, externalProto) => {
  const headers = {
    host: `${apiHost}:${apiPort}`,
    "x-forwarded-for": clientIp,
    "x-forwarded-host": requestHost(req),
    "x-forwarded-proto": externalProto,
    "x-request-id": requestId,
  };
  for (const name of ["authorization", "content-type", "accept", "user-agent"]) {
    const value = req.headers[name];
    if (typeof value === "string" && value.length <= 4096) headers[name] = value;
  }
  return headers;
};

const proxyApi = ({ req, res, body, requestId, clientIp, apiHost, apiPort, timeoutMs, externalProto }) => {
  const upstream = http.request({
    host: apiHost,
    port: apiPort,
    method: req.method,
    path: req.url,
    headers: {
      ...forwardHeaders(req, requestId, clientIp, apiHost, apiPort, externalProto),
      ...(body ? { "content-length": String(body.length) } : {}),
    },
    agent: false,
  }, (upstreamResponse) => {
    applySecurityHeaders(res);
    res.statusCode = upstreamResponse.statusCode || 502;
    for (const name of ["content-type", "cache-control", "pragma", "retry-after"]) {
      const value = upstreamResponse.headers[name];
      if (value !== undefined) res.setHeader(name, value);
    }
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Request-ID", requestId);
    upstreamResponse.pipe(res);
  });
  upstream.setTimeout(timeoutMs, () => upstream.destroy(new Error("UPSTREAM_TIMEOUT")));
  upstream.on("error", () => {
    if (!res.headersSent) sendJson(res, 502, requestId, "MINIAPP_GATEWAY_UNAVAILABLE", "سرویس Mini App موقتاً در دسترس نیست.");
    else res.destroy();
  });
  if (body?.length) upstream.end(body);
  else upstream.end();
};

export const createMiniAppGateway = (options = {}) => {
  const distDir = path.resolve(options.distDir || process.env.KOUROSH_MINIAPP_DIST_DIR || path.join(rootDir, "dist-miniapp"));
  const apiHost = String(options.apiHost || process.env.KOUROSH_API_HOST || "127.0.0.1").trim() || "127.0.0.1";
  const apiPort = Number(options.apiPort || process.env.KOUROSH_API_PORT || 3001);
  const explicitGatewayAccess = Object.prototype.hasOwnProperty.call(options, "publicHost") || Object.prototype.hasOwnProperty.call(options, "gatewayMode");
  const legacyPublicHost = normalizeExpectedHost(options.publicHost || process.env.KOUROSH_MINIAPP_PUBLIC_HOST);
  const legacyConfiguredGatewayMode = String(options.gatewayMode || process.env.KOUROSH_MINIAPP_GATEWAY_MODE || "auto").trim().toLowerCase();
  const runtimeConfigPath = options.runtimeConfigPath || process.env.KOUROSH_MINIAPP_GATEWAY_RUNTIME_CONFIG_PATH;
  const resolveGatewayAccess = () => {
    if (!explicitGatewayAccess) {
      const runtimeResult = readMiniAppGatewayRuntimeConfig({ configPath: runtimeConfigPath, env: process.env });
      if (runtimeResult.state === "invalid") {
        return { gatewayMode: "invalid_runtime_config", expectedHost: null, source: "runtime", reasonCode: runtimeResult.reasonCode };
      }
      if (runtimeResult.state === "valid") {
        const runtime = runtimeResult.config;
        if (runtime.mode === "disabled") return { gatewayMode: "disabled", expectedHost: null, source: "runtime" };
        if (runtime.mode === "self_hosted" || runtime.mode === "external_tunnel") return { gatewayMode: "self_hosted", expectedHost: normalizeExpectedHost(runtime.expectedPublicHost), source: "runtime" };
        if (runtime.mode === "relay") return { gatewayMode: "cloud_relay_internal", expectedHost: null, source: "runtime" };
      }
      // Legacy ENV compatibility is intentionally limited to an ABSENT runtime config.
    }
    const gatewayMode = legacyConfiguredGatewayMode === "auto" ? (legacyPublicHost ? "self_hosted" : "cloud_relay_internal") : legacyConfiguredGatewayMode;
    return { gatewayMode, expectedHost: legacyPublicHost || null, source: "legacy_or_explicit" };
  };
  const trustedEdgeMode = String(options.trustedEdgeMode || process.env.KOUROSH_MINIAPP_TRUSTED_EDGE || "none").trim().toLowerCase();
  let relaySecret = String(options.relaySecret || "");
  const getRelaySecret = () => {
    if (/^[A-Za-z0-9_-]{40,}$/.test(relaySecret)) return relaySecret;
    relaySecret = String(ensureGatewayRelaySecret({ secretPath: options.relaySecretPath, createIfMissing: true }) || "");
    return relaySecret;
  };
  const relayAssignmentPath = options.relayAssignmentPath || process.env.KOUROSH_MINIAPP_RELAY_ASSIGNMENT_PATH;
  const allowOptions = options.allowOptions ?? (process.env.NODE_ENV === "test" || process.env.KOUROSH_MINIAPP_ALLOW_OPTIONS === "1");
  const bodyLimit = Number(options.bodyLimit || process.env.KOUROSH_MINIAPP_AUTH_BODY_LIMIT || DEFAULT_BODY_LIMIT);
  const timeoutMs = Number(options.timeoutMs || process.env.KOUROSH_MINIAPP_UPSTREAM_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const externalProto = String(options.externalProto || process.env.KOUROSH_MINIAPP_EXTERNAL_PROTO || "https") === "http" ? "http" : "https";
  const logSink = options.logSink || console.warn;

  const initialGatewayAccess = resolveGatewayAccess();
  if (initialGatewayAccess.gatewayMode === "invalid_runtime_config") {
    throw Object.assign(new Error("MINIAPP_GATEWAY_RUNTIME_CONFIG_INVALID: Mini App Gateway runtime configuration is invalid."), {
      code: "MINIAPP_GATEWAY_RUNTIME_CONFIG_INVALID",
      reasonCode: initialGatewayAccess.reasonCode,
    });
  }
  if (!["disabled", "self_hosted", "cloud_relay_internal"].includes(initialGatewayAccess.gatewayMode)) throw new Error("Unsupported Mini App Gateway mode.");
  if (initialGatewayAccess.gatewayMode === "self_hosted" && !initialGatewayAccess.expectedHost) throw new Error("Mini App public Host is required for self-hosted/tunnel mode.");
  if (initialGatewayAccess.expectedHost && !/^(?:[a-z0-9.-]+|\[[0-9a-f:]+\])(?::\d{1,5})?$/.test(initialGatewayAccess.expectedHost)) throw new Error("Invalid Mini App public Host.");
  if (initialGatewayAccess.gatewayMode === "cloud_relay_internal" && !/^[A-Za-z0-9_-]{40,}$/.test(getRelaySecret())) throw new Error("Cloud relay internal Gateway secret is unavailable.");
  if (!fs.existsSync(distDir) || !fs.statSync(distDir).isDirectory()) throw new Error("Mini App build directory is missing. Run npm run build:miniapp.");
  if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) throw new Error("Invalid KOUROSH_API_PORT.");
  if (!Number.isInteger(bodyLimit) || bodyLimit < 1024 || bodyLimit > 1024 * 1024) throw new Error("Invalid Mini App auth body limit.");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120_000) throw new Error("Invalid Mini App upstream timeout.");
  if (!["none", "cloudflare"].includes(trustedEdgeMode)) throw new Error("Unsupported trusted edge mode.");

  return http.createServer(async (req, res) => {
    const startedAt = Date.now();
    const access = resolveGatewayAccess();
    const gatewayMode = access.gatewayMode;
    if (gatewayMode === "invalid_runtime_config") {
      const requestId = crypto.randomUUID();
      res.setHeader("X-Request-ID", requestId);
      let pathname = "/__runtime_config_invalid__";
      try { pathname = new URL(req.url || "/", "http://gateway.invalid").pathname; } catch {}
      writeMiniAppSecurityLog("gateway_runtime_config_invalid", {
        requestId,
        route: pathname,
        method: req.method,
        status: 503,
        reasonCode: access.reasonCode || "RUNTIME_CONFIG_INVALID",
        durationMs: 0,
      }, logSink);
      return send(res, 503, "Service Unavailable", "text/plain; charset=utf-8", { "X-Request-ID": requestId });
    }
    const trustedIncomingId = gatewayMode === "self_hosted" && trustedEdgeMode !== "none" && isLoopbackIp(req.socket.remoteAddress)
      ? safeRequestId(req.headers["cf-ray"])
      : null;
    const requestId = trustedIncomingId || crypto.randomUUID();
    res.setHeader("X-Request-ID", requestId);
    let pathname;
    try {
      pathname = new URL(req.url || "/", "http://gateway.invalid").pathname;
    } catch {
      pathname = "/__invalid__";
    }
    const eventFields = (status, reasonCode) => ({ requestId, route: pathname, method: req.method, status, reasonCode, durationMs: Date.now() - startedAt });

    if (gatewayMode === "disabled") {
      return send(res, 503, "Service Unavailable", "text/plain; charset=utf-8", { "X-Request-ID": requestId });
    }

    let relayAuthenticated = false;
    let expectedHost = access.expectedHost;
    if (gatewayMode === "cloud_relay_internal") {
      const activeRelaySecret = getRelaySecret();
      const peerLoopback = isLoopbackIp(req.socket.remoteAddress);
      relayAuthenticated = peerLoopback && secretsEqual(req.headers["x-kourosh-relay-auth"], activeRelaySecret);
      const assignment = readGatewayRelayAssignment({ assignmentPath: relayAssignmentPath });
      expectedHost = normalizeExpectedHost(assignment?.assignedHost || "");
      if (!relayAuthenticated) {
        writeMiniAppSecurityLog("gateway_bad_host", eventFields(403, "RELAY_AUTH_REQUIRED"), logSink);
        return send(res, 403, "Forbidden", "text/plain; charset=utf-8", { "X-Request-ID": requestId });
      }
      if (!expectedHost) {
        writeMiniAppSecurityLog("gateway_bad_host", eventFields(503, "RELAY_ASSIGNMENT_UNAVAILABLE"), logSink);
        return send(res, 503, "Service Unavailable", "text/plain; charset=utf-8", { "X-Request-ID": requestId });
      }
    }
    if (requestHost(req) !== expectedHost) {
      writeMiniAppSecurityLog("gateway_bad_host", eventFields(421, "HOST_NOT_ALLOWED"), logSink);
      return send(res, 421, "Misdirected Request", "text/plain; charset=utf-8", { "X-Request-ID": requestId });
    }

    if (pathname === "/healthz") {
      if (req.method !== "GET" && req.method !== "HEAD") {
        res.setHeader("Allow", "GET, HEAD");
        return send(res, 405, "Method Not Allowed", "text/plain; charset=utf-8", { "X-Request-ID": requestId });
      }
      return send(res, 200, req.method === "HEAD" ? "" : "ok", "text/plain; charset=utf-8", { "X-Request-ID": requestId });
    }

    if (isAnyApiPath(pathname)) {
      const decodedApiPath = safeDecodeMiniAppPath(pathname);
      if (!decodedApiPath || decodedApiPath !== pathname) {
        writeMiniAppSecurityLog("gateway_rejected_path", eventFields(404, "ENCODED_API_PATH_REJECTED"), logSink);
        return sendJson(res, 404, requestId, "MINIAPP_GATEWAY_NOT_FOUND", "مسیر درخواستی وجود ندارد.");
      }
      if (!isMiniAppApiNamespace(pathname)) {
        writeMiniAppSecurityLog("gateway_rejected_path", eventFields(404, "API_PATH_NOT_ALLOWED"), logSink);
        return sendJson(res, 404, requestId, "MINIAPP_GATEWAY_NOT_FOUND", "مسیر درخواستی وجود ندارد.");
      }
      if (!isAllowedMiniAppApiPath(pathname)) {
        writeMiniAppSecurityLog("gateway_rejected_path", eventFields(404, "MINIAPP_PATH_NOT_ALLOWED"), logSink);
        return sendJson(res, 404, requestId, "MINIAPP_GATEWAY_NOT_FOUND", "مسیر درخواستی وجود ندارد.");
      }
      if (req.method === "OPTIONS" && allowOptions) {
        applySecurityHeaders(res);
        res.writeHead(204, { "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Cache-Control": "no-store", "X-Request-ID": requestId });
        return res.end();
      }
      if (!isAllowedMiniAppApiRequest(req.method || "", pathname)) {
        writeMiniAppSecurityLog("gateway_rejected_method", eventFields(405, "METHOD_NOT_ALLOWED"), logSink);
        res.setHeader("Allow", pathname === "/api/miniapp/auth" ? "POST" : "GET");
        return sendJson(res, 405, requestId, "MINIAPP_GATEWAY_METHOD_NOT_ALLOWED", "روش درخواست مجاز نیست.");
      }
      const hasBody = Number(req.headers["content-length"] || 0) > 0 || Boolean(req.headers["transfer-encoding"]);
      if (req.method === "GET" && hasBody) {
        writeMiniAppSecurityLog("gateway_rejected_method", eventFields(400, "GET_BODY_NOT_ALLOWED"), logSink);
        return sendJson(res, 400, requestId, "MINIAPP_GATEWAY_BAD_REQUEST", "درخواست معتبر نیست.");
      }
      if (req.method === "POST" && Number(req.headers["content-length"] || 0) > bodyLimit) {
        writeMiniAppSecurityLog("gateway_body_too_large", eventFields(413, "AUTH_BODY_TOO_LARGE"), logSink);
        return sendJson(res, 413, requestId, "MINIAPP_GATEWAY_BODY_TOO_LARGE", "حجم درخواست بیش از حد مجاز است.");
      }
      try {
        const body = req.method === "POST" ? await readAuthBody(req, bodyLimit) : null;
        return proxyApi({ req, res, body, requestId, clientIp: resolveGatewayClientIp(req, trustedEdgeMode, gatewayMode, relayAuthenticated), apiHost, apiPort, timeoutMs, externalProto });
      } catch (error) {
        if (error?.code === "BODY_TOO_LARGE") {
          writeMiniAppSecurityLog("gateway_body_too_large", eventFields(413, "AUTH_BODY_TOO_LARGE"), logSink);
          if (!res.headersSent) return sendJson(res, 413, requestId, "MINIAPP_GATEWAY_BODY_TOO_LARGE", "حجم درخواست بیش از حد مجاز است.");
          return undefined;
        }
        if (!res.headersSent) return sendJson(res, 400, requestId, "MINIAPP_GATEWAY_BAD_REQUEST", "درخواست معتبر نیست.");
        return undefined;
      }
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      writeMiniAppSecurityLog("gateway_rejected_method", eventFields(405, "STATIC_METHOD_NOT_ALLOWED"), logSink);
      res.setHeader("Allow", "GET, HEAD");
      return send(res, 405, "Method Not Allowed", "text/plain; charset=utf-8", { "X-Request-ID": requestId });
    }
    const resolved = resolveStaticFile(distDir, pathname);
    if (!resolved) {
      writeMiniAppSecurityLog("gateway_rejected_path", eventFields(404, "STATIC_PATH_NOT_ALLOWED"), logSink);
      return send(res, 404, "Not Found", "text/plain; charset=utf-8", { "X-Request-ID": requestId });
    }
    const assetIsHashed = resolved.publicPath.startsWith("/assets/") && /[-_][A-Za-z0-9_-]{8,}\.(?:js|css)$/.test(path.basename(resolved.filePath));
    const body = req.method === "HEAD" ? Buffer.alloc(0) : fs.readFileSync(resolved.filePath);
    return send(res, 200, body, resolved.mime, {
      "Cache-Control": resolved.publicPath === "/miniapp.html" ? "no-store, no-cache, must-revalidate" : assetIsHashed ? "public, max-age=31536000, immutable" : "public, max-age=3600, must-revalidate",
      "X-Request-ID": requestId,
    });
  });
};

const isEntrypoint = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntrypoint) {
  const host = String(process.env.KOUROSH_MINIAPP_GATEWAY_HOST || "127.0.0.1").trim() || "127.0.0.1";
  const port = Number(process.env.KOUROSH_MINIAPP_GATEWAY_PORT || 4180);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid KOUROSH_MINIAPP_GATEWAY_PORT.");
  const gateway = createMiniAppGateway();
  gateway.keepAliveTimeout = 5_000;
  gateway.headersTimeout = 10_000;
  gateway.requestTimeout = 35_000;
  gateway.maxRequestsPerSocket = 100;
  gateway.listen(port, host, () => console.log(`Mini App Gateway listening on http://${host}:${port}`));
}
