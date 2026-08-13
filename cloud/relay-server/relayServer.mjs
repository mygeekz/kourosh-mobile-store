import http from "node:http";
import crypto from "node:crypto";
import { acceptWebSocketUpgrade } from "./webSocketServer.mjs";
import { MemoryCloudTenantRegistry } from "./tenantRegistry.mjs";
import { BoundedWindowRateLimiter, isLoopbackIp, normalizeIp, resolveCloudRelayClientIp } from "./securityLimits.mjs";
import { classifyMiniAppGatewayRequest, MINI_APP_AUTH_BODY_LIMIT, MINI_APP_RELAY_STATIC_BODY_LIMIT } from "../../server/miniapp/miniAppGatewayPolicy.mjs";
import { validateCloudRelayEnvelopeRuntime } from "../../server/cloud/cloudRelayProtocolRuntime.mjs";

const PROTOCOL_VERSION = 1;
const METHOD_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const CONTROL_TYPES = new Set([
  "connector_auth_hello", "connector_auth_challenge", "connector_auth_response", "connector_ready",
  "connector_health_request", "connector_health_response", "heartbeat", "telegram_credential_bind",
  "telegram_credential_bound", "connector_error",
]);
const DEFAULTS = Object.freeze({
  maxConnections: 1000,
  maxWireBytes: 12 * 1024 * 1024,
  maxControlBytes: 64 * 1024,
  maxTelegramJsonBytes: 512 * 1024,
  maxTelegramBinaryBytes: 8 * 1024 * 1024,
  maxTelegramResponseBytes: 6 * 1024 * 1024,
  maxRawDiagnosticBytes: 64 * 1024,
  maxMiniAppBytes: 8 * 1024 * 1024,
  maxPendingPerTenant: 128,
  requestTimeoutMs: 30_000,
  heartbeatTimeoutMs: 75_000,
  challengeTtlMs: 10_000,
  authDeadlineMs: 10_000,
  maxUnauthenticatedConnectionsPerIp: 5,
  connectorAttemptsPerMinute: 30,
  maxRateLimiterEntries: 4096,
  publicRequestsPerMinutePerIp: 120,
  publicGlobalRequestsPerMinutePerIp: 600,
});

const requestId = () => crypto.randomUUID().replaceAll("-", "");
const nowEnvelope = (installationId, type, payload, id = requestId(), ttlMs = 30_000) => {
  const now = Date.now();
  return { protocolVersion: PROTOCOL_VERSION, installationId, requestId: id, type, timestamp: new Date(now).toISOString(), expiresAt: new Date(now + Math.max(1000, Math.min(ttlMs, 120000))).toISOString(), payload };
};
const proofText = (installationId, challengeId, nonce, expiresAt) => `KOUROSH-CLOUD-RELAY-V1\n${installationId}\n${challengeId}\n${nonce}\n${expiresAt}`;
const safeMeta = (meta = {}) => Object.fromEntries(Object.entries(meta).filter(([k]) => !/(token|secret|credential|authorization|initdata|body|query|enrollment)/i.test(k)).map(([k,v]) => [k, typeof v === "string" ? v.slice(0,180) : v]));
const byteLength = (value) => Buffer.byteLength(typeof value === "string" ? value : JSON.stringify(value), "utf8");
const normalizeHost = (value) => String(value || "").trim().toLowerCase().replace(/\.$/, "");
const isDev = () => ["test", "development"].includes(String(process.env.NODE_ENV || "").trim());
const validEnvelope = (message, installationId, now = Date.now()) => validateCloudRelayEnvelopeRuntime(message, installationId, now).ok;

const readBody = (req, limit) => new Promise((resolve, reject) => {
  const chunks=[]; let size=0; let done=false;
  req.on("data", (chunk) => { if (done) return; size += chunk.length; if (size > limit) { done=true; reject(Object.assign(new Error("BODY_TOO_LARGE"),{code:"BODY_TOO_LARGE"})); req.destroy(); } else chunks.push(chunk); });
  req.on("end", () => { if (!done) resolve(Buffer.concat(chunks)); }); req.on("error", reject);
});

const readFetchResponseBounded = async (response, limit) => {
  if (!response.body) return "";
  const reader = response.body.getReader(); const chunks=[]; let size=0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > limit) { try { await reader.cancel(); } catch {} throw Object.assign(new Error("Telegram response exceeds relay limit."), { code: "CLOUD_RELAY_RESPONSE_TOO_LARGE" }); }
      chunks.push(Buffer.from(value));
    }
  } finally { try { reader.releaseLock(); } catch {} }
  return Buffer.concat(chunks).toString("utf8");
};

const publicResponseHeaders = (headers = {}) => {
  const out = { "cache-control": "no-store", "x-content-type-options": "nosniff" };
  for (const name of ["content-type","cache-control","pragma","retry-after","x-request-id","content-security-policy","permissions-policy","referrer-policy","x-content-type-options"]) {
    const value = headers[name]; if (typeof value === "string" && value.length <= 4096) out[name] = value;
  }
  return out;
};

export const createCloudRelayServer = (options = {}) => {
  const registry = options.registry || new MemoryCloudTenantRegistry();
  const limits = { ...DEFAULTS, ...(options.limits || {}) };
  const edgeTrust = options.edgeTrust || { mode: "direct" };
  const controlHost = normalizeHost(options.edgeHosts?.controlHost);
  const connectorHost = normalizeHost(options.edgeHosts?.connectorHost);
  const logSink = options.logSink || ((record) => console.log(JSON.stringify(record)));
  const log = (event, meta = {}) => logSink({ timestamp: new Date().toISOString(), event, ...safeMeta(meta) });
  const pendingByTenant = new Map();
  const allConnections = new Set();
  const unauthenticatedByIp = new Map();
  const connectorAttemptLimiter = new BoundedWindowRateLimiter({ windowMs: 60_000, maxAttempts: limits.connectorAttemptsPerMinute, maxEntries: limits.maxRateLimiterEntries });
  const publicGlobalRequestLimiter = new BoundedWindowRateLimiter({ windowMs: 60_000, maxAttempts: limits.publicGlobalRequestsPerMinutePerIp, maxEntries: limits.maxRateLimiterEntries });
  const publicTenantRequestLimiter = new BoundedWindowRateLimiter({ windowMs: 60_000, maxAttempts: limits.publicRequestsPerMinutePerIp, maxEntries: limits.maxRateLimiterEntries });
  let staleTimer = null;
  let maxOutboundFrameBytesObserved = 0;
  let shuttingDown = false;
  const metrics = { relayErrors: 0, rateLimitRejections: 0 };

  const tenantPending = (installationId) => {
    let map = pendingByTenant.get(installationId); if (!map) { map = new Map(); pendingByTenant.set(installationId,map); } return map;
  };
  const sendBounded = (connection, envelope) => {
    const serialized = JSON.stringify(envelope); const bytes = Buffer.byteLength(serialized, "utf8");
    if (bytes > limits.maxWireBytes) { log("protocol_rejected", { installationId: connection.installationId, reason: "outbound_message_too_large", bytes }); return false; }
    const sent = connection.ws.send(serialized); if (sent !== false) maxOutboundFrameBytesObserved = Math.max(maxOutboundFrameBytesObserved, bytes); return sent !== false;
  };
  const sendError = (connection, id, code, message, retryable=false) => sendBounded(connection, nowEnvelope(connection.installationId || "inst_000000000000000000000000", "connector_error", { code, message: String(message || "Relay error").slice(0,512), retryable }, id || requestId(), 10000));
  const sendTelegramResult = (connection, id, result) => {
    const envelope = nowEnvelope(connection.installationId,"telegram_api_response",result,id,10000);
    if (byteLength(envelope) <= limits.maxWireBytes && sendBounded(connection,envelope)) return true;
    return sendBounded(connection, nowEnvelope(connection.installationId,"telegram_api_response",{ success:false, message:"Cloud Telegram response exceeded relay wire limit.", errorCode:"CLOUD_RELAY_RESPONSE_TOO_LARGE" },id,10000));
  };
  const rejectTenantPending = (installationId, code="TENANT_OFFLINE") => {
    const map = pendingByTenant.get(installationId); if (!map) return;
    for (const [id,p] of map) { clearTimeout(p.timer); p.reject(Object.assign(new Error(code),{code})); map.delete(id); }
    pendingByTenant.delete(installationId);
  };
  const decrementUnauth = (connection) => {
    if (connection.unauthCountReleased) return;
    connection.unauthCountReleased = true;
    const ip = connection.peerIp; const current = unauthenticatedByIp.get(ip) || 0;
    if (current <= 1) unauthenticatedByIp.delete(ip); else unauthenticatedByIp.set(ip,current-1);
  };

  const disconnect = async (connection, code=1000, reason="closed") => {
    if (connection.closed) return; connection.closed=true;
    if (connection.authTimer) clearTimeout(connection.authTimer);
    decrementUnauth(connection); allConnections.delete(connection); connection.telegramToken = null; connection.challenge = null;
    if (connection.installationId) {
      await registry.releaseConnection(connection.installationId, connection);
      if (typeof registry.markDisconnected === "function") { try { await registry.markDisconnected(connection.installationId); } catch {} }
      rejectTenantPending(connection.installationId);
    }
    try { connection.ws.close(code, reason); } catch {}
    if (connection.authenticated) log("connector_disconnected", { installationId: connection.installationId, reason });
  };

  const relayTelegram = async (connection, message) => {
    const payload = message.payload || {}; const method = String(payload.method || "");
    if (!connection.telegramToken) return sendError(connection, message.requestId, "CLOUD_RELAY_AUTH_FAILED", "Telegram credential is not bound.");
    if (!METHOD_PATTERN.test(method)) return sendError(connection, message.requestId, "TELEGRAM_METHOD_INVALID", "Telegram method rejected.");
    const jsonBytes = byteLength(payload.body || {}); if (jsonBytes > limits.maxTelegramJsonBytes) return sendError(connection, message.requestId, "PAYLOAD_TOO_LARGE", "Telegram JSON request exceeds limit.");
    let multipart = null;
    if (payload.multipart) {
      const attachment = payload.multipart.attachment || {}; if (attachment.encoding !== "base64" || !["photo","document"].includes(attachment.fieldName)) return sendError(connection,message.requestId,"MALFORMED_PAYLOAD","Multipart attachment rejected.");
      const binary = Buffer.from(String(attachment.data || ""), "base64"); if (binary.length > limits.maxTelegramBinaryBytes) return sendError(connection,message.requestId,"PAYLOAD_TOO_LARGE","Telegram attachment exceeds limit.");
      multipart = { fields: payload.multipart.fields || {}, attachment, binary };
    }
    const configuredOrigin = String(options.telegramApiBaseUrl || "https://api.telegram.org").replace(/\/$/, "");
    if (configuredOrigin !== "https://api.telegram.org" && !(options.allowTestTelegramOrigin && isDev())) return sendError(connection,message.requestId,"CLOUD_RELAY_CONFIG_INVALID","Custom Telegram origin is test/development only.");
    const url = `${configuredOrigin}/bot${connection.telegramToken}/${method}`;
    const controller = new AbortController(); const timeoutMs = Math.max(1000, Math.min(Number(payload.timeoutMs || limits.requestTimeoutMs), 60000)); const timer = setTimeout(()=>controller.abort(), timeoutMs);
    try {
      let init;
      if (multipart) {
        const form = new FormData(); for (const [k,v] of Object.entries(multipart.fields)) form.append(k,String(v));
        form.append(multipart.attachment.fieldName, new Blob([multipart.binary], { type: String(multipart.attachment.mimeType || "application/octet-stream") }), String(multipart.attachment.filename || "file.bin"));
        init = { method: "POST", body: form, signal: controller.signal };
      } else {
        const methodName = String(payload.httpMethod || "POST") === "GET" ? "GET" : "POST";
        init = methodName === "GET" ? { method: "GET", signal: controller.signal } : { method: "POST", headers: { "content-type":"application/json" }, body: JSON.stringify(payload.body || {}), signal: controller.signal };
      }
      const response = await fetch(url, init);
      const responseLimit = Math.max(256, Math.min(limits.maxTelegramResponseBytes, Math.max(256, limits.maxWireBytes - 768)));
      const rawText = await readFetchResponseBounded(response, responseLimit);
      let data=null; try { data=rawText?JSON.parse(rawText):null; } catch {}
      const success = Boolean(response.ok && data?.ok);
      const diagnosticRawText = data == null && rawText ? rawText.slice(0, Math.min(limits.maxRawDiagnosticBytes, 64*1024)) : undefined;
      const result = { success, status: response.status, message: success ? undefined : (data?.description || `Telegram request failed (HTTP ${response.status})`), data: data ?? diagnosticRawText ?? null, rawText: diagnosticRawText, errorCode: success ? undefined : "TELEGRAM_API_ERROR", parameters: data?.parameters };
      sendTelegramResult(connection, message.requestId, result);
    } catch (error) {
      const tooLarge = error?.code === "CLOUD_RELAY_RESPONSE_TOO_LARGE";
      log("telegram_relay_error", { installationId: connection.installationId, reason: tooLarge ? "response_too_large" : error?.name === "AbortError" ? "timeout" : "network" });
      sendTelegramResult(connection, message.requestId, { success:false, message:tooLarge?"Cloud Telegram response exceeded configured limit.":error?.name === "AbortError"?"Cloud Telegram relay timeout.":"Cloud Telegram relay unavailable.", errorCode:tooLarge?"CLOUD_RELAY_RESPONSE_TOO_LARGE":error?.name === "AbortError"?"CLOUD_RELAY_TIMEOUT":"CLOUD_RELAY_UNAVAILABLE" });
    } finally { clearTimeout(timer); }
  };

  const handleAuthenticatedMessage = async (connection, message) => {
    if (message.installationId !== connection.installationId) { log("protocol_rejected",{installationId:connection.installationId,reason:"installation_mismatch"}); return disconnect(connection,1008,"installation mismatch"); }
    if (connection.seen.has(message.requestId)) { if (message.type === "miniapp_http_response") { log("protocol_rejected", { installationId: connection.installationId, reason: "duplicate_response" }); return; } log("protocol_rejected",{installationId:connection.installationId,reason:"duplicate_request"}); return disconnect(connection,1008,"duplicate request"); }
    connection.seen.add(message.requestId); if (connection.seen.size > 512) connection.seen.delete(connection.seen.values().next().value);
    if (["connector_auth_hello", "connector_auth_challenge", "connector_auth_response", "connector_ready"].includes(message.type)) { log("protocol_rejected", { installationId: connection.installationId, reason: "authentication_message_replay" }); return disconnect(connection, 1008, "authentication replay rejected"); }
    if (message.type === "heartbeat") { connection.lastHeartbeat=Date.now(); return; }
    if (message.type === "telegram_credential_bind") { const token=String(message.payload?.botToken||"").trim(); if (!/^\d{6,15}:[A-Za-z0-9_-]{20,}$/.test(token)) return sendError(connection,message.requestId,"TELEGRAM_TOKEN_INVALID","Telegram credential rejected."); connection.telegramToken=token; return sendBounded(connection,nowEnvelope(connection.installationId,"telegram_credential_bound",{accepted:true},message.requestId,10000)); }
    if (message.type === "connector_health_request") return sendBounded(connection,nowEnvelope(connection.installationId,"connector_health_response",{telegramRelayReady:Boolean(connection.telegramToken),miniAppRelayReady:true},message.requestId,10000));
    if (message.type === "telegram_api_request") return relayTelegram(connection,message);
    if (message.type === "miniapp_http_response") { const map=tenantPending(connection.installationId); const pending=map.get(message.requestId); if (!pending) { log("protocol_rejected",{installationId:connection.installationId,reason:"unknown_request_id"}); return; } clearTimeout(pending.timer); map.delete(message.requestId); pending.resolve(message.payload || {}); return; }
    log("protocol_rejected",{installationId:connection.installationId,reason:"unknown_authenticated_type"});
  };

  const handleWsMessage = async (connection, text) => {
    if (byteLength(text) > limits.maxWireBytes) return disconnect(connection,1009,"message too large");
    let message; try { message=JSON.parse(text); } catch { log("protocol_rejected",{reason:"malformed_json"}); return disconnect(connection,1008,"malformed json"); }
    if (!validEnvelope(message, connection.authenticated ? connection.installationId : undefined)) { log("protocol_rejected",{reason:"invalid_envelope"}); return disconnect(connection,1008,"invalid envelope"); }
    if (CONTROL_TYPES.has(message.type) && byteLength(text) > limits.maxControlBytes) { log("protocol_rejected", { installationId: connection.installationId, reason: "control_message_too_large" }); return disconnect(connection,1009,"control message too large"); }
    if (!connection.authenticated) {
      if (!connection.installationId) {
        if (message.type !== "connector_auth_hello" || byteLength(message) > limits.maxControlBytes) return disconnect(connection,1008,"auth hello required");
        const tenant=await registry.getTenant(message.installationId);
        if (!tenant || tenant.tenantStatus === "revoked" || tenant.tenantStatus === "suspended" || tenant.publicKeyFingerprint !== String(message.payload?.publicKeyFingerprint||"")) { log("connector_auth_failed",{installationId:message.installationId,reason:"tenant_or_key_not_found"}); return disconnect(connection,1008,"authentication failed"); }
        connection.installationId=message.installationId; connection.tenant=tenant; connection.authCredentialVersion=tenant.credentialVersion || 1; connection.authAssignmentVersion=tenant.assignmentVersion || 1; connection.authPublicKeyFingerprint=tenant.publicKeyFingerprint;
        const challengeId=requestId(); const nonce=crypto.randomBytes(32).toString("base64url"); const challenge=nowEnvelope(message.installationId,"connector_auth_challenge",{challengeId,nonce},requestId(),limits.challengeTtlMs); connection.challenge={challengeId,nonce,expiresAt:challenge.expiresAt,used:false}; sendBounded(connection,challenge); return;
      }
      if (message.type !== "connector_auth_response" || !connection.challenge || connection.challenge.used || Date.parse(connection.challenge.expiresAt)<=Date.now()) { log("connector_auth_failed",{installationId:connection.installationId,reason:"challenge_invalid"}); return disconnect(connection,1008,"authentication failed"); }
      if (String(message.payload?.challengeId||"") !== connection.challenge.challengeId) { log("connector_auth_failed",{installationId:connection.installationId,reason:"challenge_mismatch"}); return disconnect(connection,1008,"authentication failed"); }
      connection.challenge.used=true; const signature=Buffer.from(String(message.payload?.signature||""),"base64url"); const proof=proofText(connection.installationId,connection.challenge.challengeId,connection.challenge.nonce,connection.challenge.expiresAt);
      const verified=crypto.verify(null,Buffer.from(proof,"utf8"),connection.tenant.publicKeyPem,signature); if (!verified) { log("connector_auth_failed",{installationId:connection.installationId,reason:"signature_invalid"}); return disconnect(connection,1008,"authentication failed"); }
      connection.authenticated=true; decrementUnauth(connection); if (connection.authTimer) clearTimeout(connection.authTimer); connection.lastHeartbeat=Date.now();
      const old=await registry.assignConnection(connection.installationId,connection); if (old && old!==connection) { log("connector_replaced",{installationId:connection.installationId}); await disconnect(old,4001,"replaced by authenticated connector"); }
      if (typeof registry.markConnected === "function") { try { await registry.markConnected(connection.installationId); } catch {} }
      log("connector_connected",{installationId:connection.installationId}); sendBounded(connection,nowEnvelope(connection.installationId,"connector_ready",{assignedStoreId:connection.tenant.assignedStoreId,assignedHost:connection.tenant.assignedHost,assignedPublicUrl:connection.tenant.assignedPublicUrl,assignmentVersion:connection.tenant.assignmentVersion||1,connectionState:"connected"},requestId(),10000)); return;
    }
    return handleAuthenticatedMessage(connection,message);
  };

  const relayMiniApp = async (tenant, req, body, clientIp) => {
    const connection=tenant.activeConnection; if (!connection?.authenticated || connection.closed) throw Object.assign(new Error("TENANT_OFFLINE"),{code:"TENANT_OFFLINE"});
    const map=tenantPending(tenant.installationId); if (map.size >= limits.maxPendingPerTenant) throw Object.assign(new Error("BACKPRESSURE"),{code:"BACKPRESSURE"});
    const id=requestId(); const headers={}; for (const name of ["authorization","content-type","accept","user-agent","x-request-id"]) { const value=req.headers[name]; if (typeof value==="string"&&value.length<=4096) headers[name]=value; }
    const payload={method:req.method,path:req.url,publicHost:normalizeHost(req.headers.host),headers,clientContext:{ip:clientIp},bodyBase64:body?.length?body.toString("base64"):undefined};
    return new Promise((resolve,reject)=>{ const timer=setTimeout(()=>{map.delete(id); log("relay_timeout",{installationId:tenant.installationId,kind:"miniapp"}); reject(Object.assign(new Error("RELAY_TIMEOUT"),{code:"RELAY_TIMEOUT"}));},limits.requestTimeoutMs); map.set(id,{resolve,reject,timer}); if(!sendBounded(connection,nowEnvelope(tenant.installationId,"miniapp_http_request",payload,id,limits.requestTimeoutMs))){clearTimeout(timer);map.delete(id);reject(Object.assign(new Error("OUTBOUND_FRAME_TOO_LARGE"),{code:"OUTBOUND_FRAME_TOO_LARGE"}));} });
  };

  const server=http.createServer(async (req,res)=>{
    const clientIp=resolveCloudRelayClientIp(req,edgeTrust); const host=normalizeHost(req.headers.host); let pathname="/"; try { pathname=new URL(req.url||"/","http://relay.invalid").pathname; } catch {}
    if (shuttingDown) { res.writeHead(503,{"content-type":"text/plain","cache-control":"no-store","connection":"close"}); return res.end("Service Unavailable"); }
    if (pathname==="/healthz" && req.method==="GET" && (!controlHost || host===controlHost)) { res.writeHead(200,{"content-type":"text/plain; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}); return res.end("ok"); }
    if (pathname.startsWith("/control/")) { if (typeof options.controlPlaneHandler === "function" && (!controlHost || host===controlHost)) return options.controlPlaneHandler(req,res,{clientIp,registry,log,limits}); log("control_host_rejected",{reason:"host_mismatch"}); res.writeHead(404,{"content-type":"text/plain","cache-control":"no-store"}); return res.end("Not Found"); }
    if ((controlHost && host===controlHost) || (connectorHost && host===connectorHost)) { res.writeHead(404,{"content-type":"text/plain","cache-control":"no-store"}); return res.end("Not Found"); }
    if (options.enableDevProvisioning && isDev() && pathname==="/__dev/provision" && req.method==="POST") { try { const body=await readBody(req,64*1024); const input=JSON.parse(body.toString("utf8")); const tenant=await registry.registerTenant(input); res.writeHead(201,{"content-type":"application/json","cache-control":"no-store"}); return res.end(JSON.stringify({success:true,data:{installationId:tenant.installationId,assignedStoreId:tenant.assignedStoreId,assignedPublicUrl:tenant.assignedPublicUrl}})); } catch { res.writeHead(400,{"content-type":"application/json","cache-control":"no-store"}); return res.end(JSON.stringify({success:false,code:"DEV_PROVISIONING_REJECTED"})); } }
    const globalPublicRate=publicGlobalRequestLimiter.check(clientIp); if(!globalPublicRate.allowed){metrics.rateLimitRejections+=1;res.writeHead(429,{"content-type":"text/plain","cache-control":"no-store","retry-after":String(Math.ceil(globalPublicRate.retryAfterMs/1000))});return res.end("Too Many Requests");}
    const tenant=await registry.resolvePublicHost(host); if (!tenant) { log("tenant_not_found",{host}); res.writeHead(404,{"content-type":"text/plain","cache-control":"no-store"}); return res.end("Not Found"); }
    if (tenant.tenantStatus === "revoked" || tenant.tenantStatus === "suspended") { res.writeHead(503,{"content-type":"text/plain","cache-control":"no-store"}); return res.end("Service Unavailable"); }
    const tenantPublicRate=publicTenantRequestLimiter.check(`${tenant.installationId}|${clientIp}`); if(!tenantPublicRate.allowed){metrics.rateLimitRejections+=1;res.writeHead(429,{"content-type":"text/plain","cache-control":"no-store","retry-after":String(Math.ceil(tenantPublicRate.retryAfterMs/1000))});return res.end("Too Many Requests");}
    const hasBody=Number(req.headers["content-length"]||0)>0||Boolean(req.headers["transfer-encoding"]); const classification=classifyMiniAppGatewayRequest({method:req.method,pathname,hasBody,contentLength:Number(req.headers["content-length"]||0),allowOptions:false});
    if (!classification.allowed || classification.kind==="health") { const status=classification.kind==="health"?200:(classification.status||404); res.writeHead(status,{"content-type":"text/plain","cache-control":"no-store"}); return res.end(classification.kind==="health"?"ok":"Not Found"); }
    let body=Buffer.alloc(0); try { if (req.method==="POST") body=await readBody(req,MINI_APP_AUTH_BODY_LIMIT); } catch { res.writeHead(413,{"content-type":"text/plain","cache-control":"no-store"}); return res.end("Payload Too Large"); }
    try { const response=await relayMiniApp(tenant,req,body,clientIp); const data=response.bodyBase64?Buffer.from(response.bodyBase64,"base64"):Buffer.alloc(0); if (data.length>MINI_APP_RELAY_STATIC_BODY_LIMIT) throw Object.assign(new Error("BODY_TOO_LARGE"),{code:"BODY_TOO_LARGE"}); res.writeHead(Number(response.status)||502,publicResponseHeaders(response.headers)); return res.end(req.method==="HEAD"?undefined:data); }
    catch(error){ metrics.relayErrors+=1; const status=error?.code==="BACKPRESSURE"?503:error?.code==="RELAY_TIMEOUT"?504:503; log(error?.code==="TENANT_OFFLINE"?"tenant_offline":"miniapp_relay_error",{installationId:tenant.installationId,reason:error?.code||"relay_error"}); res.writeHead(status,{"content-type":"text/plain; charset=utf-8","cache-control":"no-store"}); return res.end(status===504?"Gateway Timeout":"Service Unavailable"); }
  });

  server.on("upgrade",(req,socket,head)=>{
    let pathname=""; try { pathname=new URL(req.url||"/","http://relay.invalid").pathname; } catch {}
    const host=normalizeHost(req.headers.host);
    if (shuttingDown || pathname!=="/connector" || (connectorHost && host!==connectorHost)) { if(connectorHost&&host!==connectorHost)log("connector_host_rejected",{reason:"host_mismatch"}); socket.write(`HTTP/1.1 ${shuttingDown?503:404} ${shuttingDown?"Service Unavailable":"Not Found"}\r\nConnection: close\r\n\r\n`); return socket.destroy(); }
    const peerIp=normalizeIp(req.socket.remoteAddress)||"unknown";
    const rate=connectorAttemptLimiter.check(peerIp);
    const unauthCount=unauthenticatedByIp.get(peerIp)||0;
    if (allConnections.size>=limits.maxConnections || unauthCount>=limits.maxUnauthenticatedConnectionsPerIp || !rate.allowed) {
      if(!rate.allowed)metrics.rateLimitRejections+=1; const status=!rate.allowed?429:503; socket.write(`HTTP/1.1 ${status} ${status===429?"Too Many Requests":"Service Unavailable"}\r\nConnection: close\r\n\r\n`); return socket.destroy();
    }
    const ws=acceptWebSocketUpgrade(req,socket,head,{maxFrameBytes:limits.maxWireBytes}); if(!ws)return;
    unauthenticatedByIp.set(peerIp,unauthCount+1);
    const connection={ws,peerIp,installationId:null,tenant:null,authenticated:false,telegramToken:null,challenge:null,lastHeartbeat:Date.now(),seen:new Set(),closed:false,unauthCountReleased:false,authTimer:null,authCredentialVersion:null,authAssignmentVersion:null,authPublicKeyFingerprint:null}; allConnections.add(connection);
    connection.authTimer=setTimeout(()=>{ if(!connection.authenticated){ log("connector_auth_failed",{reason:"auth_deadline"}); disconnect(connection,1008,"authentication deadline exceeded"); } },limits.authDeadlineMs);
    ws.on("message",text=>handleWsMessage(connection,text).catch(()=>disconnect(connection,1011,"internal error"))); ws.on("close",()=>disconnect(connection,1000,"socket closed")); ws.on("error",()=>disconnect(connection,1011,"socket error"));
  });

  const startMaintenance=()=>{ if(staleTimer)return; staleTimer=setInterval(async()=>{ const now=Date.now(); connectorAttemptLimiter.cleanup(now); publicGlobalRequestLimiter.cleanup(now); publicTenantRequestLimiter.cleanup(now); for(const connection of [...allConnections]){ if(!connection.authenticated) continue; let currentTenant=null; try { currentTenant=await registry.getTenant(connection.installationId); } catch {} if(!currentTenant || currentTenant.tenantStatus==="revoked" || currentTenant.tenantStatus==="suspended" || (currentTenant.publicKeyFingerprint && currentTenant.publicKeyFingerprint!==connection.authPublicKeyFingerprint) || (currentTenant.credentialVersion && currentTenant.credentialVersion!==connection.authCredentialVersion)){ log("protocol_rejected",{installationId:connection.installationId,reason:"tenant_credential_or_status_changed"}); await disconnect(connection,4003,"tenant authorization changed"); continue; } if((currentTenant.assignmentVersion||1)!==(connection.authAssignmentVersion||1) || currentTenant.assignedPublicUrl!==connection.tenant?.assignedPublicUrl){ connection.tenant=currentTenant; connection.authAssignmentVersion=currentTenant.assignmentVersion||1; sendBounded(connection,nowEnvelope(connection.installationId,"connector_ready",{assignedStoreId:currentTenant.assignedStoreId,assignedHost:currentTenant.assignedHost,assignedPublicUrl:currentTenant.assignedPublicUrl,assignmentVersion:currentTenant.assignmentVersion||1,connectionState:"connected"},requestId(),10000)); } if(now-connection.lastHeartbeat>limits.heartbeatTimeoutMs){ log("protocol_rejected",{installationId:connection.installationId,reason:"heartbeat_timeout"}); await disconnect(connection,4002,"heartbeat timeout"); } else { try{connection.ws.ping("k");}catch{} } } },Math.max(100,Math.floor(Math.min(limits.heartbeatTimeoutMs,limits.authDeadlineMs)/3))); };
  const stopMaintenance=()=>{ if(staleTimer)clearInterval(staleTimer); staleTimer=null; };
  const close=async()=>{ if(shuttingDown)return; shuttingDown=true; stopMaintenance(); await new Promise(resolve=>{try{server.close(()=>resolve());}catch{resolve();} setTimeout(resolve,1000).unref?.();}); for(const c of [...allConnections]) await disconnect(c,1001,"server shutdown"); for(const installationId of [...pendingByTenant.keys()])rejectTenantPending(installationId,"CLOUD_RELAY_UNAVAILABLE"); try{server.closeAllConnections?.();}catch{} };
  startMaintenance();
  return { server, registry, limits, close, disconnectTenant: async(id,reason="operator action")=>{const tenant=await registry.getTenant(id);if(tenant?.activeConnection)await disconnect(tenant.activeConnection,4003,reason);}, getConnectionCount:()=>allConnections.size, getUnauthenticatedConnectionCount:()=>[...allConnections].filter(c=>!c.authenticated).length, getPendingCount:(id)=>tenantPending(id).size, getAuthAttemptLimiterSize:()=>connectorAttemptLimiter.size, getMaxOutboundFrameBytesObserved:()=>maxOutboundFrameBytesObserved, getMetricsSnapshot:()=>({activeConnectors:[...allConnections].filter(c=>c.authenticated).length,unauthenticatedConnectors:[...allConnections].filter(c=>!c.authenticated).length,pendingRelayRequests:[...pendingByTenant.values()].reduce((n,m)=>n+m.size,0),tenantCount:typeof registry.getTenantCount==="function"?registry.getTenantCount():null,onlineTenantCount:[...allConnections].filter(c=>c.authenticated).length,rateLimitRejections:metrics.rateLimitRejections,relayErrors:metrics.relayErrors}) };
};
