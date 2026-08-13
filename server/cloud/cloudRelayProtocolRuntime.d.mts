export const KOUROSH_CLOUD_RELAY_PROTOCOL_VERSION_RUNTIME: 1;
export type CloudRelayRuntimeValidationResult = { ok: true; code: "OK" } | { ok: false; code: string };
export function validateCloudRelayEnvelopeRuntime(value: unknown, expectedInstallationId?: string, nowMs?: number): CloudRelayRuntimeValidationResult;
