import crypto from "node:crypto";
import net from "node:net";

export const DNS_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const SERVICE_RESERVED_LABELS = new Set(["control", "connector", "api", "admin", "www", "status", "health"]);

export const normalizeCloudHostname = (value) => String(value || "").trim().toLowerCase();

export const validateDnsHostname = (value, options = {}) => {
  const raw = String(value || "").trim();
  const maxLength = Number(options.maxLength || 253);
  if (!raw || raw.length > maxLength || raw !== raw.toLowerCase()) return { ok: false, code: "HOST_INVALID" };
  if (raw.includes("://") || /[\/?#@*\s]/.test(raw) || raw.includes(":") || raw.endsWith(".") || raw.startsWith(".")) return { ok: false, code: "HOST_INVALID" };
  if (!options.allowIpLiteral && net.isIP(raw)) return { ok: false, code: "HOST_IP_LITERAL_REJECTED" };
  const labels = raw.split(".");
  if (labels.length < (options.allowSingleLabel ? 1 : 2) || labels.some((label) => !DNS_LABEL_PATTERN.test(label))) return { ok: false, code: "HOST_INVALID" };
  return { ok: true, host: raw, labels };
};

export const requireDnsHostname = (value, options = {}) => {
  const checked = validateDnsHostname(value, options);
  if (!checked.ok) throw Object.assign(new Error("Cloud hostname is invalid."), { code: checked.code || "HOST_INVALID" });
  return checked.host;
};

export const validateCloudBaseDomain = (value, options = {}) => {
  const checked = validateDnsHostname(value, { allowIpLiteral: false, allowSingleLabel: Boolean(options.allowSingleLabel) });
  if (!checked.ok) return { ok: false, code: "CLOUD_BASE_DOMAIN_INVALID" };
  return { ok: true, domain: checked.host };
};

export const requireCloudBaseDomain = (value, options = {}) => {
  const checked = validateCloudBaseDomain(value, options);
  if (!checked.ok) throw Object.assign(new Error("Cloud public base domain is invalid."), { code: checked.code });
  return checked.domain;
};

export const tenantNamespaceForBaseDomain = (baseDomain) => `apps.${requireCloudBaseDomain(baseDomain)}`;

export const generateTenantHostLabel = (options = {}) => {
  const bytes = Math.max(8, Math.min(Number(options.randomBytes || 8), 16));
  const randomHex = (options.randomHex || (() => crypto.randomBytes(bytes).toString("hex")))();
  const label = `s-${String(randomHex).toLowerCase().replace(/[^a-f0-9]/g, "").slice(0, bytes * 2)}`;
  if (!DNS_LABEL_PATTERN.test(label) || label.length > 32 || SERVICE_RESERVED_LABELS.has(label)) throw new Error("Generated tenant host label is invalid.");
  return label;
};

export const buildTenantAssignment = ({ baseDomain, hostLabel } = {}) => {
  const domain = requireCloudBaseDomain(baseDomain);
  const label = String(hostLabel || generateTenantHostLabel()).trim().toLowerCase();
  if (!DNS_LABEL_PATTERN.test(label) || label.length > 63 || SERVICE_RESERVED_LABELS.has(label)) throw Object.assign(new Error("Tenant host label invalid."), { code: "TENANT_HOST_LABEL_INVALID" });
  const assignedHost = requireDnsHostname(`${label}.apps.${domain}`);
  return { hostLabel: label, assignedHost, assignedPublicUrl: `https://${assignedHost}/miniapp.html` };
};

export const validateAssignedMiniAppUrl = (value, options = {}) => {
  let url;
  try { url = new URL(String(value || "")); } catch { return { ok: false, code: "CLOUD_ASSIGNMENT_INVALID" }; }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/miniapp.html" || url.port) return { ok: false, code: "CLOUD_ASSIGNMENT_INVALID" };
  const checked = validateDnsHostname(url.hostname);
  if (!checked.ok) return { ok: false, code: "CLOUD_ASSIGNMENT_INVALID" };
  if (options.baseDomain) {
    const expectedNamespace = tenantNamespaceForBaseDomain(options.baseDomain);
    if (!checked.host.endsWith(`.${expectedNamespace}`) || checked.host === expectedNamespace) return { ok: false, code: "CLOUD_ASSIGNMENT_HOST_MISMATCH" };
  }
  return { ok: true, url: `https://${checked.host}/miniapp.html`, host: checked.host };
};

export const isReservedServiceHost = (host, { controlHost, connectorHost, baseDomain } = {}) => {
  const normalized = normalizeCloudHostname(host);
  if (controlHost && normalized === normalizeCloudHostname(controlHost)) return true;
  if (connectorHost && normalized === normalizeCloudHostname(connectorHost)) return true;
  if (baseDomain) {
    const tenantNs = tenantNamespaceForBaseDomain(baseDomain);
    if (normalized === tenantNs) return true;
  }
  return false;
};

export const assertEdgeHostSeparation = ({ baseDomain, controlHost, connectorHost }) => {
  const domain = requireCloudBaseDomain(baseDomain);
  const control = requireDnsHostname(String(controlHost || ""));
  const connector = requireDnsHostname(String(connectorHost || ""));
  const tenantNamespace = tenantNamespaceForBaseDomain(domain);
  if (control === connector) throw Object.assign(new Error("Control and Connector hosts must be distinct."), { code: "EDGE_HOST_COLLISION" });
  for (const serviceHost of [control, connector]) {
    if (serviceHost === tenantNamespace || serviceHost.endsWith(`.${tenantNamespace}`)) throw Object.assign(new Error("Service host collides with tenant namespace."), { code: "EDGE_TENANT_NAMESPACE_COLLISION" });
  }
  return { baseDomain: domain, controlHost: control, connectorHost: connector, tenantNamespace };
};

export const RESERVED_SERVICE_LABELS = Object.freeze([...SERVICE_RESERVED_LABELS]);
