import http from "node:http";
import net from "node:net";
import { createHash, randomUUID } from "node:crypto";
import { ensureGatewayRelaySecret, writeGatewayRelayAssignment } from "./gatewayRelayRuntimeFiles.mjs";
import { validateAssignedMiniAppUrl } from "../../cloud/shared/cloudHostname.mjs";

export type LocalCloudConnectorState = "disabled" | "unprovisioned" | "connecting" | "authenticating" | "connected" | "degraded" | "backoff" | "stopped";

type ConnectorLogger = (event: string, meta?: Record<string, unknown>) => void;

type ConnectorOptions = {
  installationId: string;
  endpoint: string;
  publicKeyFingerprint: string;
  signChallenge: (proof: string) => string;
  miniAppGatewayOrigin?: string;
  environment?: string;
  heartbeatIntervalMs?: number;
  requestTimeoutMs?: number;
  maxPendingRequests?: number;
  maxWireBytes?: number;
  maxMiniAppBodyBytes?: number;
  gatewayRelaySecretPath?: string;
  gatewayRelayAssignmentPath?: string;
  backoffBaseMs?: number;
  backoffMaxMs?: number;
  random?: () => number;
  logger?: ConnectorLogger;
  onStateChange?: (state: LocalCloudConnectorState) => void;
  onAssignmentChange?: (assignment: { assignedStoreId: string; assignedHost: string | null; assignedPublicUrl: string | null; assignmentVersion: number }) => void;
};

type PendingRequest = { resolve: (value: any) => void; reject: (error: Error) => void; timer: NodeJS.Timeout };

const PROTOCOL_VERSION = 1;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
const METHOD_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const INBOUND_MESSAGE_TYPES = new Set([
  "connector_auth_challenge", "connector_ready", "connector_health_response", "telegram_credential_bound",
  "telegram_api_response", "miniapp_http_request", "connector_error",
]);
const sanitizeLogMeta = (meta: Record<string, unknown> = {}) => Object.fromEntries(
  Object.entries(meta).filter(([key]) => !/(token|secret|credential|authorization|initdata|body)/i.test(key)).map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 180) : value]),
);

const buildProof = (installationId: string, challengeId: string, nonce: string, expiresAt: string) =>
  `KOUROSH-CLOUD-RELAY-V1\n${installationId}\n${challengeId}\n${nonce}\n${expiresAt}`;

const boundedHeaders = (headers: http.IncomingHttpHeaders) => {
  const result: Record<string, string> = {};
  for (const name of ["content-type", "cache-control", "pragma", "retry-after", "x-request-id"]) {
    const value = headers[name];
    if (typeof value === "string" && value.length <= 4096) result[name] = value;
  }
  return result;
};

export class LocalCloudConnector {
  private readonly options: ConnectorOptions;
  private state: LocalCloudConnectorState = "unprovisioned";
  private ws: WebSocket | null = null;
  private stopped = true;
  private reconnectAttempt = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private pending = new Map<string, PendingRequest>();
  private telegramCredentialHash: string | null = null;
  private telegramCredentialBound = false;
  private assignedStoreId: string | null = null;
  private assignedPublicUrl: string | null = null;
  private assignedHost: string | null = null;
  private assignmentVersion = 0;
  private lastConnectedAt: string | null = null;
  private gatewayRelaySecret: string | null = null;

  constructor(options: ConnectorOptions) { this.options = options; }

  private log(event: string, meta: Record<string, unknown> = {}) {
    this.options.logger?.(event, sanitizeLogMeta(meta));
  }

  private setState(next: LocalCloudConnectorState) {
    if (this.state === next) return;
    this.state = next;
    this.options.onStateChange?.(next);
    const event = next === "connecting" ? "cloud_connector_connecting"
      : next === "connected" ? "cloud_connector_connected"
      : next === "backoff" ? "cloud_connector_backoff"
      : next === "degraded" ? "cloud_connector_disconnected"
      : null;
    if (event) this.log(event);
  }

  getStatus() {
    return {
      state: this.state,
      connected: this.state === "connected" && this.ws?.readyState === WebSocket.OPEN,
      assignedStoreId: this.assignedStoreId,
      assignedHost: this.assignedHost,
      assignedPublicUrl: this.assignedPublicUrl,
      assignmentVersion: this.assignmentVersion,
      lastConnectedAt: this.lastConnectedAt,
      pendingRequests: this.pending.size,
      telegramCredentialBound: this.telegramCredentialBound,
    };
  }

  private validateEndpoint() {
    const url = new URL(this.options.endpoint);
    if (url.protocol === "wss:") return;
    const env = this.options.environment || process.env.NODE_ENV || "production";
    if ((env === "test" || env === "development") && url.protocol === "ws:" && ["127.0.0.1", "localhost", "::1"].includes(url.hostname)) return;
    throw new Error("Cloud Connector requires WSS outside explicit local test/development mode.");
  }

  start() {
    if (!/^inst_[A-Za-z0-9_-]{24}$/.test(this.options.installationId)) {
      this.setState("unprovisioned");
      return;
    }
    this.validateEndpoint();
    if (!this.stopped) return;
    this.stopped = false;
    this.reconnectAttempt = 0;
    this.connect();
  }

  stop() {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.rejectAllPending("CLOUD_RELAY_UNAVAILABLE");
    this.telegramCredentialHash = null;
    this.telegramCredentialBound = false;
    const socket = this.ws;
    this.ws = null;
    try { socket?.close(1000, "connector stopped"); } catch {}
    this.setState("stopped");
  }

  private connect() {
    if (this.stopped) return;
    this.setState("connecting");
    let socket: WebSocket;
    try {
      socket = new WebSocket(this.options.endpoint);
    } catch {
      this.scheduleReconnect("connect_constructor_failed");
      return;
    }
    this.ws = socket;
    socket.addEventListener("open", () => {
      if (this.ws !== socket || this.stopped) return;
      this.setState("authenticating");
      this.sendEnvelope("connector_auth_hello", {
        publicKeyFingerprint: this.options.publicKeyFingerprint,
        capabilities: ["telegram_api", "miniapp_http"],
      }, undefined, 10_000);
    });
    socket.addEventListener("message", (event) => this.handleMessage(event.data).catch(() => this.protocolFailure("message_handler_failed")));
    socket.addEventListener("close", (event) => {
      const wasAuthenticating = this.state === "authenticating";
      if (this.ws === socket) this.ws = null;
      this.clearHeartbeat();
      this.telegramCredentialHash = null;
      this.telegramCredentialBound = false;
      this.rejectAllPending("CLOUD_RELAY_UNAVAILABLE");
      if (wasAuthenticating && Number(event.code) === 1008) this.log("cloud_connector_auth_failed", { reason: "authentication_rejected" });
      if (!this.stopped) this.scheduleReconnect("socket_closed");
    });
    socket.addEventListener("error", () => this.log("cloud_connector_disconnected", { reason: "socket_error" }));
  }

  private scheduleReconnect(reason: string) {
    if (this.stopped || this.reconnectTimer) return;
    this.setState("backoff");
    const base = Math.max(50, this.options.backoffBaseMs ?? 1_000);
    const max = Math.max(base, this.options.backoffMaxMs ?? 60_000);
    const exponential = Math.min(max, base * (2 ** Math.min(this.reconnectAttempt, 10)));
    const random = this.options.random || Math.random;
    const jitter = Math.round(exponential * 0.2 * ((random() * 2) - 1));
    const delay = Math.max(25, exponential + jitter);
    this.reconnectAttempt += 1;
    this.log("cloud_connector_backoff", { reason, delayMs: delay });
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private clearHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private startHeartbeat() {
    this.clearHeartbeat();
    const interval = Math.max(100, this.options.heartbeatIntervalMs ?? 25_000);
    this.heartbeatTimer = setInterval(() => {
      if (this.state !== "connected") return;
      try { this.sendEnvelope("heartbeat", { connectionState: "connected" }, undefined, Math.max(interval * 2, 2_000)); } catch {}
    }, interval);
  }

  private protocolFailure(reason: string) {
    this.log("cloud_connector_disconnected", { reason });
    try { this.ws?.close(1008, "protocol rejected"); } catch {}
  }

  private sendEnvelope(type: string, payload: unknown, requestId?: string, ttlMs = 30_000) {
    const socket = this.ws;
    if (!socket || socket.readyState !== WebSocket.OPEN) throw Object.assign(new Error("Cloud Relay unavailable."), { code: "CLOUD_RELAY_UNAVAILABLE" });
    const now = Date.now();
    const envelope = {
      protocolVersion: PROTOCOL_VERSION,
      installationId: this.options.installationId,
      requestId: requestId || randomUUID().replaceAll("-", ""),
      type,
      timestamp: new Date(now).toISOString(),
      expiresAt: new Date(now + Math.max(1_000, Math.min(ttlMs, 120_000))).toISOString(),
      payload,
    };
    const text = JSON.stringify(envelope);
    const bytes = Buffer.byteLength(text, "utf8");
    const maxWire = this.options.maxWireBytes ?? 12 * 1024 * 1024;
    if (bytes > maxWire) throw Object.assign(new Error("Relay message exceeds configured size limit."), { code: "CLOUD_RELAY_MESSAGE_TOO_LARGE" });
    socket.send(text);
    return envelope.requestId;
  }

  private async handleMessage(data: unknown) {
    const text = typeof data === "string" ? data : data instanceof Blob ? await data.text() : Buffer.from(data as ArrayBuffer).toString("utf8");
    if (Buffer.byteLength(text, "utf8") > (this.options.maxWireBytes ?? 12 * 1024 * 1024)) return this.protocolFailure("oversized_payload");
    let message: any;
    try { message = JSON.parse(text); } catch { return this.protocolFailure("malformed_payload"); }
    if (message?.protocolVersion !== PROTOCOL_VERSION || message?.installationId !== this.options.installationId || !REQUEST_ID_PATTERN.test(String(message?.requestId || "")) || !INBOUND_MESSAGE_TYPES.has(String(message?.type || ""))) {
      return this.protocolFailure("invalid_envelope");
    }
    if (!Number.isFinite(Date.parse(String(message.timestamp || ""))) || Date.parse(String(message.expiresAt || "")) <= Date.now()) return this.protocolFailure("expired_or_malformed_message");

    if (message.type === "connector_auth_challenge") {
      const { challengeId, nonce } = message.payload || {};
      if (!REQUEST_ID_PATTERN.test(String(challengeId || "")) || !/^[A-Za-z0-9_-]{32,128}$/.test(String(nonce || ""))) return this.protocolFailure("invalid_challenge");
      const proof = buildProof(this.options.installationId, challengeId, nonce, message.expiresAt);
      const signature = this.options.signChallenge(proof);
      this.sendEnvelope("connector_auth_response", { challengeId, signature }, undefined, 10_000);
      return;
    }
    if (message.type === "connector_ready") {
      const assignedStoreId = String(message.payload?.assignedStoreId || "").trim();
      const assignedPublicUrl = String(message.payload?.assignedPublicUrl || "").trim();
      const assignedHost = String(message.payload?.assignedHost || "").trim().toLowerCase();
      const assignmentVersion = Number(message.payload?.assignmentVersion || 1);
      const storeIdValid = (this.options.environment || process.env.NODE_ENV || "production") === "production" ? /^store_[A-Za-z0-9_-]{16,40}$/.test(assignedStoreId) : /^[A-Za-z0-9_-]{3,64}$/.test(assignedStoreId);
      if (!storeIdValid || !Number.isInteger(assignmentVersion) || assignmentVersion < 1) return this.protocolFailure("invalid_connector_ready");
      const checked = validateAssignedMiniAppUrl(assignedPublicUrl);
      if (!checked.ok || !checked.host || !checked.url || checked.host !== assignedHost) return this.protocolFailure("invalid_connector_ready");
      if (this.assignmentVersion > 0 && assignmentVersion < this.assignmentVersion) return this.protocolFailure("stale_connector_assignment");
      this.assignedStoreId = assignedStoreId;
      this.assignedHost = checked.host;
      this.assignedPublicUrl = checked.url;
      this.assignmentVersion = assignmentVersion;
      try {
        this.gatewayRelaySecret = ensureGatewayRelaySecret({ secretPath: this.options.gatewayRelaySecretPath, createIfMissing: true });
        writeGatewayRelayAssignment(this.assignedPublicUrl, { assignmentPath: this.options.gatewayRelayAssignmentPath, assignmentVersion });
      } catch {
        this.gatewayRelaySecret = null;
        this.log("miniapp_relay_request_rejected", { reason: "gateway_runtime_contract_unavailable" });
      }
      this.options.onAssignmentChange?.({ assignedStoreId: this.assignedStoreId, assignedHost: this.assignedHost, assignedPublicUrl: this.assignedPublicUrl, assignmentVersion: this.assignmentVersion });
      this.lastConnectedAt = new Date().toISOString();
      this.reconnectAttempt = 0;
      this.setState("connected");
      this.startHeartbeat();
      return;
    }
    if (message.type === "miniapp_http_request") {
      if (this.state !== "connected") return;
      await this.handleMiniAppRequest(message);
      return;
    }
    if (["telegram_api_response", "telegram_credential_bound", "connector_health_response", "connector_error"].includes(message.type)) {
      const pending = this.pending.get(message.requestId);
      if (!pending) return;
      clearTimeout(pending.timer);
      this.pending.delete(message.requestId);
      if (message.type === "connector_error") pending.reject(Object.assign(new Error(String(message.payload?.message || "Cloud Relay error")), { code: String(message.payload?.code || "CLOUD_RELAY_UNAVAILABLE") }));
      else pending.resolve(message.payload);
      return;
    }
    this.protocolFailure("unknown_message_type");
  }

  private request(type: string, payload: unknown, timeoutMs?: number): Promise<any> {
    if (this.state !== "connected") return Promise.reject(Object.assign(new Error("Cloud Relay unavailable."), { code: "CLOUD_RELAY_UNAVAILABLE" }));
    const maxPending = this.options.maxPendingRequests ?? 128;
    if (this.pending.size >= maxPending) return Promise.reject(Object.assign(new Error("Cloud Relay backpressure limit reached."), { code: "CLOUD_RELAY_BACKPRESSURE" }));
    const timeout = Math.max(500, Math.min(timeoutMs ?? this.options.requestTimeoutMs ?? 30_000, 120_000));
    const requestId = randomUUID().replaceAll("-", "");
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(Object.assign(new Error("Cloud Relay request timeout."), { code: "CLOUD_RELAY_TIMEOUT" }));
      }, timeout);
      this.pending.set(requestId, { resolve, reject, timer });
      try { this.sendEnvelope(type, payload, requestId, timeout); }
      catch (error) { clearTimeout(timer); this.pending.delete(requestId); reject(error); }
    });
  }

  private rejectAllPending(code: string) {
    for (const [requestId, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(Object.assign(new Error("Cloud Relay disconnected."), { code }));
      this.pending.delete(requestId);
    }
  }

  async bindTelegramCredential(botToken: string) {
    const token = String(botToken || "").trim();
    if (!/^\d{6,15}:[A-Za-z0-9_-]{20,}$/.test(token)) throw Object.assign(new Error("Telegram Bot token is invalid."), { code: "TELEGRAM_TOKEN_INVALID" });
    const tokenHash = createHash("sha256").update(token).digest("base64url");
    if (this.telegramCredentialBound && this.telegramCredentialHash === tokenHash) return true;
    const result = await this.request("telegram_credential_bind", { botToken: token }, 10_000);
    if (!result?.accepted) throw Object.assign(new Error("Cloud Relay rejected Telegram credential binding."), { code: "CLOUD_RELAY_AUTH_FAILED" });
    this.telegramCredentialHash = tokenHash;
    this.telegramCredentialBound = true;
    return true;
  }

  async requestTelegram(input: { botToken: string; method: string; httpMethod?: "GET" | "POST"; body?: Record<string, unknown>; multipart?: unknown; timeoutMs?: number }) {
    if (!METHOD_PATTERN.test(String(input.method || ""))) throw Object.assign(new Error("Invalid Telegram Bot API method."), { code: "TELEGRAM_METHOD_INVALID" });
    await this.bindTelegramCredential(input.botToken);
    const telegramTimeoutMs = input.timeoutMs ?? 30_000;
    const correlationTimeoutMs = input.method === "getUpdates"
      ? Math.min(45_000, telegramTimeoutMs + 5_000)
      : telegramTimeoutMs;
    return this.request("telegram_api_request", {
      method: input.method,
      httpMethod: input.httpMethod || "POST",
      body: input.body || {},
      multipart: input.multipart,
      timeoutMs: telegramTimeoutMs,
    }, correlationTimeoutMs);
  }

  async checkTelegramRelay(botToken: string) {
    await this.bindTelegramCredential(botToken);
    const result = await this.requestTelegram({ botToken, method: "getMe", httpMethod: "GET", timeoutMs: 12_000 });
    return Boolean(result?.success);
  }

  async checkMiniAppRelay() {
    const status = this.getStatus();
    if (!status.connected || !status.assignedPublicUrl) return false;
    const host = new URL(status.assignedPublicUrl).host;
    const localHealthy = await this.forwardToLocalGateway({ method: "GET", path: "/healthz", publicHost: host, headers: {} }).then((r) => r.status === 200).catch(() => false);
    if (!localHealthy) return false;
    const health = await this.request("connector_health_request", { checks: ["miniapp"] }, 8_000);
    return Boolean(health?.miniAppRelayReady);
  }

  private async handleMiniAppRequest(message: any) {
    try {
      const response = await this.forwardToLocalGateway(message.payload || {});
      this.sendEnvelope("miniapp_http_response", response, message.requestId, 30_000);
    } catch (error: any) {
      this.log("miniapp_relay_request_rejected", { reason: String(error?.code || "gateway_error") });
      this.sendEnvelope("miniapp_http_response", { status: 503, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }, bodyBase64: Buffer.from("Service Unavailable").toString("base64") }, message.requestId, 30_000);
    }
  }

  private forwardToLocalGateway(input: { method?: string; path?: string; publicHost?: string; headers?: Record<string, string>; clientContext?: { ip?: string }; bodyBase64?: string }): Promise<{ status: number; headers: Record<string, string>; bodyBase64?: string }> {
    const origin = new URL(this.options.miniAppGatewayOrigin || "http://127.0.0.1:4180");
    if (origin.protocol !== "http:" || !["127.0.0.1", "localhost", "::1"].includes(origin.hostname)) {
      return Promise.reject(Object.assign(new Error("Mini App relay target must remain loopback HTTP gateway."), { code: "UNSAFE_MINIAPP_TARGET" }));
    }
    const method = String(input.method || "GET").toUpperCase();
    if (!["GET", "POST", "HEAD"].includes(method)) return Promise.reject(Object.assign(new Error("Mini App relay method rejected."), { code: "METHOD_NOT_ALLOWED" }));
    const requestPath = String(input.path || "/");
    if (!requestPath.startsWith("/") || requestPath.includes("\\") || requestPath.includes("\0")) return Promise.reject(Object.assign(new Error("Mini App relay path rejected."), { code: "PATH_NOT_ALLOWED" }));
    const publicHost = String(input.publicHost || "").trim().toLowerCase();
    if (!publicHost || publicHost !== new URL(this.assignedPublicUrl || "https://placeholder.example.invalid").host.toLowerCase()) return Promise.reject(Object.assign(new Error("Mini App relay public host mismatch."), { code: "HOST_NOT_ALLOWED" }));
    const body = input.bodyBase64 ? Buffer.from(input.bodyBase64, "base64") : Buffer.alloc(0);
    if (body.length > (this.options.maxMiniAppBodyBytes ?? 8 * 1024 * 1024)) return Promise.reject(Object.assign(new Error("Mini App relay body too large."), { code: "BODY_TOO_LARGE" }));
    const relaySecret = this.gatewayRelaySecret || ensureGatewayRelaySecret({ secretPath: this.options.gatewayRelaySecretPath, createIfMissing: true });
    if (!relaySecret) return Promise.reject(Object.assign(new Error("Mini App internal relay secret unavailable."), { code: "MINIAPP_RELAY_AUTH_UNAVAILABLE" }));
    this.gatewayRelaySecret = relaySecret;
    const clientIp = String(input.clientContext?.ip || "").trim().replace(/^::ffff:/, "");
    if (clientIp && net.isIP(clientIp) === 0) return Promise.reject(Object.assign(new Error("Mini App relay client identity rejected."), { code: "CLIENT_IDENTITY_INVALID" }));
    const forwarded: Record<string, string> = { host: publicHost, "x-forwarded-host": publicHost, "x-forwarded-proto": "https", "x-kourosh-relay-auth": relaySecret };
    if (clientIp) forwarded["x-kourosh-relay-client-ip"] = clientIp;
    for (const name of ["authorization", "content-type", "accept", "user-agent", "x-request-id"]) {
      const value = input.headers?.[name];
      if (typeof value === "string" && value.length <= 4096) forwarded[name] = value;
    }
    if (body.length) forwarded["content-length"] = String(body.length);
    return new Promise((resolve, reject) => {
      const req = http.request({ hostname: origin.hostname, port: Number(origin.port || 80), method, path: requestPath, headers: forwarded, agent: false }, (res) => {
        const chunks: Buffer[] = []; let size = 0; const limit = this.options.maxMiniAppBodyBytes ?? 8 * 1024 * 1024;
        res.on("data", (chunk: Buffer) => { size += chunk.length; if (size > limit) req.destroy(Object.assign(new Error("Mini App response too large."), { code: "BODY_TOO_LARGE" })); else chunks.push(chunk); });
        res.on("end", () => resolve({ status: res.statusCode || 502, headers: boundedHeaders(res.headers), bodyBase64: method === "HEAD" ? undefined : Buffer.concat(chunks).toString("base64") }));
      });
      req.setTimeout(30_000, () => req.destroy(Object.assign(new Error("Mini App gateway timeout."), { code: "MINIAPP_GATEWAY_TIMEOUT" })));
      req.on("error", reject);
      req.end(body.length ? body : undefined);
    });
  }
}
