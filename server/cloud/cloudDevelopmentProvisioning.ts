import { ensureConnectorCredential } from "./connectorCredentialStore";
import { normalizeCloudConnectorEndpoint } from "./cloudConnectorReadiness";

export const isDevelopmentCloudProvisioningAvailable = (env: NodeJS.ProcessEnv = process.env) =>
  ["test", "development"].includes(String(env.NODE_ENV || "").trim()) &&
  String(env.KOUROSH_CLOUD_DEV_PROVISIONING || "").trim() === "1" &&
  Boolean(normalizeCloudConnectorEndpoint(env.KOUROSH_CLOUD_CONNECTOR_ENDPOINT, env.NODE_ENV || "production")) &&
  Boolean(String(env.KOUROSH_CLOUD_DEV_ASSIGNED_PUBLIC_URL || "").trim());

export const provisionDevelopmentCloudConnector = async (
  installationId: string,
  env: NodeJS.ProcessEnv = process.env,
) => {
  if (!isDevelopmentCloudProvisioningAvailable(env)) throw Object.assign(new Error("Development Cloud provisioning is disabled."), { code: "CLOUD_PROVISIONING_CONTROL_PLANE_UNAVAILABLE" });
  const endpoint = normalizeCloudConnectorEndpoint(env.KOUROSH_CLOUD_CONNECTOR_ENDPOINT, env.NODE_ENV || "production");
  if (!endpoint) throw Object.assign(new Error("Cloud connector endpoint is invalid."), { code: "CLOUD_ENDPOINT_INVALID" });
  const assignedPublicUrl = new URL(String(env.KOUROSH_CLOUD_DEV_ASSIGNED_PUBLIC_URL));
  if (assignedPublicUrl.protocol !== "https:") throw Object.assign(new Error("Development assigned public URL must use HTTPS."), { code: "CLOUD_PUBLIC_URL_INVALID" });
  const credential = ensureConnectorCredential({ createIfMissing: true });
  if (!credential) throw new Error("Connector credential could not be created.");
  const endpointUrl = new URL(endpoint);
  endpointUrl.protocol = endpointUrl.protocol === "wss:" ? "https:" : "http:";
  endpointUrl.pathname = "/__dev/provision";
  endpointUrl.search = "";
  endpointUrl.hash = "";
  const response = await fetch(endpointUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      installationId,
      publicKeyPem: credential.publicKeyPem,
      publicKeyFingerprint: credential.publicKeyFingerprint,
      assignedPublicUrl: assignedPublicUrl.toString(),
    }),
  });
  const result = await response.json().catch(() => null) as any;
  if (!response.ok || !result?.success) throw Object.assign(new Error("Development Cloud provisioning rejected."), { code: "CLOUD_PROVISIONING_FAILED" });
  return {
    endpoint,
    assignedStoreId: String(result.data?.assignedStoreId || ""),
    assignedPublicUrl: String(result.data?.assignedPublicUrl || assignedPublicUrl.toString()),
    credentialConfigured: true,
  };
};
