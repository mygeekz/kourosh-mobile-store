import { ensureConnectorCredential, generateConnectorCredentialMaterial, persistConnectorPrivateKey, resolveConnectorPrivateKeyPath } from "./connectorCredentialStore";
import { ensureGatewayRelaySecret } from "./gatewayRelayRuntimeFiles.mjs";
import { validateAssignedMiniAppUrl, validateDnsHostname } from "../../cloud/shared/cloudHostname.mjs";

const isLoopback = (host: string) => ["127.0.0.1", "localhost", "::1"].includes(host);
const resolveControlPlaneUrl = (override?: string, env: NodeJS.ProcessEnv = process.env) => {
  const raw = String(override || env.KOUROSH_CLOUD_CONTROL_PLANE_URL || "").trim();
  if (!raw) throw Object.assign(new Error("Cloud Control Plane endpoint is not configured."), { code: "CLOUD_CONTROL_PLANE_NOT_CONFIGURED" });
  const url = new URL(raw); const environment = String(env.NODE_ENV || "production");
  if (url.protocol !== "https:" && !(["test", "development"].includes(environment) && url.protocol === "http:" && isLoopback(url.hostname))) {
    throw Object.assign(new Error("Cloud Control Plane requires HTTPS outside local test/development."), { code: "CLOUD_CONTROL_PLANE_URL_INVALID" });
  }
  return url;
};

const readControlResponseBounded = async (response: Response, limit = 64 * 1024): Promise<string> => {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        try { await reader.cancel(); } catch {}
        throw Object.assign(new Error("Cloud Control Plane response is too large."), { code: "CLOUD_CONTROL_RESPONSE_TOO_LARGE" });
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    try { reader.releaseLock(); } catch {}
  }
  return Buffer.concat(chunks).toString("utf8");
};

const postControl = async (path: string, payload: Record<string, unknown>, override?: string) => {
  const base = resolveControlPlaneUrl(override); const url = new URL(path, base);
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(15_000) });
  const text = await readControlResponseBounded(response); let body: any = {}; try { body = text ? JSON.parse(text) : {}; } catch {}
  if (!response.ok || body?.success === false) throw Object.assign(new Error(String(body?.message || "Cloud Control Plane rejected request.")), { code: String(body?.code || "CLOUD_ENROLLMENT_FAILED") });
  return body.data || {};
};
const validateAssignment = (data: any, env: NodeJS.ProcessEnv = process.env, expectedConnectorEndpoint?: string) => {
  const assignedStoreId = String(data.assignedStoreId || "").trim();
  const assignedPublicUrl = String(data.assignedPublicUrl || "").trim();
  const connectorEndpoint = String(data.connectorEndpoint || "").trim();
  const protocolVersion = Number(data.protocolVersion || 0);
  const assignmentVersion = Number(data.assignmentVersion || 1);
  if (!/^store_[A-Za-z0-9_-]{16,40}$/.test(assignedStoreId)) throw Object.assign(new Error("Cloud assignment store id invalid."), { code: "CLOUD_ASSIGNMENT_INVALID" });
  if (protocolVersion !== 1 || !Number.isInteger(assignmentVersion) || assignmentVersion < 1) throw Object.assign(new Error("Cloud assignment protocol/version invalid."), { code: "CLOUD_ASSIGNMENT_INVALID" });
  const publicCheck = validateAssignedMiniAppUrl(assignedPublicUrl);
  if (!publicCheck.ok || !publicCheck.url || !publicCheck.host) throw Object.assign(new Error("Cloud assigned URL invalid."), { code: "CLOUD_ASSIGNMENT_INVALID" });
  let endpoint: URL; try { endpoint = new URL(connectorEndpoint); } catch { throw Object.assign(new Error("Cloud connector endpoint invalid."), { code: "CLOUD_ASSIGNMENT_INVALID" }); }
  const environment = String(env.NODE_ENV || "production");
  const devLoopback = ["test", "development"].includes(environment) && endpoint.protocol === "ws:" && isLoopback(endpoint.hostname);
  if (endpoint.protocol !== "wss:" && !devLoopback) throw Object.assign(new Error("Cloud connector endpoint invalid."), { code: "CLOUD_ASSIGNMENT_INVALID" });
  if (endpoint.pathname !== "/connector" || endpoint.search || endpoint.hash || endpoint.username || endpoint.password) throw Object.assign(new Error("Cloud connector endpoint contract invalid."), { code: "CLOUD_ASSIGNMENT_INVALID" });
  if (!devLoopback && !validateDnsHostname(endpoint.hostname).ok) throw Object.assign(new Error("Cloud connector endpoint Host invalid."), { code: "CLOUD_ASSIGNMENT_INVALID" });
  const expectedEndpointRaw = String(expectedConnectorEndpoint || "").trim();
  if (expectedEndpointRaw) {
    let expected: URL;
    try { expected = new URL(expectedEndpointRaw); } catch { throw Object.assign(new Error("Expected Relay Connector endpoint is invalid."), { code: "CLOUD_ASSIGNMENT_CONNECTOR_HOST_UNTRUSTED" }); }
    if (endpoint.toString() !== expected.toString()) throw Object.assign(new Error("Relay connector endpoint mismatch."), { code: "CLOUD_ASSIGNMENT_CONNECTOR_HOST_MISMATCH" });
  } else {
    const expectedConnectorHost = String(env.KOUROSH_CLOUD_EXPECTED_CONNECTOR_HOST || env.KOUROSH_CLOUD_CONNECTOR_HOST || "").trim().toLowerCase();
    if (environment === "production" && !expectedConnectorHost) throw Object.assign(new Error("Expected Relay Connector Host is not configured."), { code: "CLOUD_ASSIGNMENT_CONNECTOR_HOST_UNTRUSTED" });
    if (expectedConnectorHost && endpoint.hostname.toLowerCase() !== expectedConnectorHost) throw Object.assign(new Error("Relay connector endpoint Host mismatch."), { code: "CLOUD_ASSIGNMENT_CONNECTOR_HOST_MISMATCH" });
  }
  return { assignedStoreId, assignedHost: publicCheck.host, assignedPublicUrl: publicCheck.url, connectorEndpoint: endpoint.toString(), protocolVersion, assignmentVersion };
};

export const enrollCloudConnector = async (input: { installationId: string; enrollmentCode: string; controlPlaneUrl?: string; expectedConnectorEndpoint?: string; privateKeyPath?: string }) => {
  const code = String(input.enrollmentCode || "").trim(); if (!/^kce_[A-Za-z0-9_-]{12}_[A-Za-z0-9_-]{40,64}$/.test(code)) throw Object.assign(new Error("Enrollment code invalid."), { code: "ENROLLMENT_CODE_INVALID" });
  const credential = ensureConnectorCredential({ privateKeyPath: input.privateKeyPath, createIfMissing: true }); if (!credential) throw Object.assign(new Error("Connector credential unavailable."), { code: "CONNECTOR_CREDENTIAL_UNAVAILABLE" });
  ensureGatewayRelaySecret({ createIfMissing: true });
  const data = await postControl("/control/v1/enroll", { installationId: input.installationId, publicKeyPem: credential.publicKeyPem, enrollmentCode: code }, input.controlPlaneUrl);
  return { ...validateAssignment(data, process.env, input.expectedConnectorEndpoint), credentialConfigured: true };
};

export const rotateCloudConnectorCredential = async (input: { installationId: string; recoveryCode: string; controlPlaneUrl?: string; expectedConnectorEndpoint?: string; privateKeyPath?: string }) => {
  const code = String(input.recoveryCode || "").trim(); if (!/^kce_[A-Za-z0-9_-]{12}_[A-Za-z0-9_-]{40,64}$/.test(code)) throw Object.assign(new Error("Recovery code invalid."), { code: "ENROLLMENT_CODE_INVALID" });
  const material = generateConnectorCredentialMaterial();
  const data = await postControl("/control/v1/rotate", { installationId: input.installationId, publicKeyPem: material.publicKeyPem, recoveryCode: code }, input.controlPlaneUrl);
  const assignment = validateAssignment(data, process.env, input.expectedConnectorEndpoint);
  persistConnectorPrivateKey(material.privateKeyPem, { privateKeyPath: input.privateKeyPath || resolveConnectorPrivateKeyPath() });
  ensureGatewayRelaySecret({ createIfMissing: true });
  return { ...assignment, credentialConfigured: true, credentialVersion: Number(data.credentialVersion || 1) };
};

export const isCloudEnrollmentAvailable = (env: NodeJS.ProcessEnv = process.env) => Boolean(String(env.KOUROSH_CLOUD_CONTROL_PLANE_URL || "").trim());
