import { auditTelegramMiniAppPublicConfiguration } from "./telegramPublicAccess";

export type TelegramReadinessRequirement = { required: boolean; ok: boolean; code: string };

export const evaluateTelegramReadinessProfile = (
  settings: Record<string, unknown>,
  gatewayPublicHost: unknown,
  environment = process.env.NODE_ENV || "production",
) => {
  const audit = auditTelegramMiniAppPublicConfiguration(settings, gatewayPublicHost, environment);
  if (audit.mode === "disabled") {
    return { ...audit, operational: true, profileStatus: "MINIAPP_DISABLED" as const, requirements: {
      publicUrl: { required:false, ok:true, code:"NOT_REQUIRED" }, gateway:{required:false,ok:true,code:"NOT_REQUIRED"}, hostConsistency:{required:false,ok:true,code:"NOT_REQUIRED"}, botUsername:{required:false,ok:true,code:"NOT_REQUIRED"}, botFather:{required:false,ok:true,code:"NOT_REQUIRED"},
    } satisfies Record<string, TelegramReadinessRequirement> };
  }
  if (audit.mode === "relay") {
    const relay = audit.cloudReadiness;
    const operational = Boolean(relay.provisioned && relay.connected && relay.miniAppRelayHealthy && audit.miniAppUrl);
    return { ...audit, operational, profileStatus: operational ? "RELAY_MINIAPP_OPERATIONAL" as const : relay.provisioned ? (relay.connected ? "CLOUD_RELAY_DEGRADED" as const : "CLOUD_RELAY_PROVISIONED_OFFLINE" as const) : "CLOUD_RELAY_NOT_PROVISIONED" as const, requirements: {
      publicUrl:{required:false,ok:Boolean(relay.assignedPublicUrl),code:relay.assignedPublicUrl?"RELAY_ASSIGNED_PUBLIC_URL":"RELAY_ASSIGNED_PUBLIC_URL_REQUIRED"},
      gateway:{required:true,ok:relay.miniAppRelayHealthy,code:relay.miniAppRelayHealthy?"RELAY_MINIAPP_HEALTHY":"RELAY_MINIAPP_NOT_READY"},
      hostConsistency:{required:false,ok:true,code:"RELAY_HOST_ROUTING_OWNED"},
      botUsername:{required:false,ok:true,code:"INDEPENDENT_FROM_RELAY_MINIAPP"},
      botFather:{required:true,ok:operational,code:operational?"MANUAL_CHECK_REQUIRED":"RELAY_NOT_READY"},
    } satisfies Record<string, TelegramReadinessRequirement> };
  }
  const profileStatus = audit.mode === "stable_tunnel"
    ? (audit.miniAppUrl && audit.liveOriginUrl ? "STABLE_TUNNEL_CHECKS_REQUIRED" as const : !audit.miniAppUrl ? "PUBLIC_MINIAPP_URL_REQUIRED" as const : "LIVE_ORIGIN_REQUIRED" as const)
    : audit.mode === "external_tunnel"
      ? (audit.miniAppUrl ? "EXTERNAL_TUNNEL_CHECKS_REQUIRED" as const : "PUBLIC_MINIAPP_URL_REQUIRED" as const)
      : (audit.miniAppUrl ? "SELF_HOSTED_CHECKS_REQUIRED" as const : "PUBLIC_MINIAPP_URL_REQUIRED" as const);
  return { ...audit, operational:Boolean(audit.miniAppUrl&&audit.hostMatches&&audit.endpointIsCanonical&&audit.botUsername), profileStatus, requirements:{
    publicUrl:{required:true,ok:Boolean(audit.miniAppUrl),code:audit.miniAppUrl?"READY":"PUBLIC_MINIAPP_URL_REQUIRED"}, gateway:{required:true,ok:Boolean(audit.expectedHost),code:audit.expectedHost?"READY":"PUBLIC_GATEWAY_HOST_REQUIRED"}, hostConsistency:{required:true,ok:Boolean(audit.hostMatches),code:audit.hostMatches?"READY":"PUBLIC_HOST_MISMATCH"}, botUsername:{required:true,ok:Boolean(audit.botUsername),code:audit.botUsername?"READY":"TELEGRAM_BOT_USERNAME_REQUIRED"}, botFather:{required:true,ok:false,code:"MANUAL_CHECK_REQUIRED"},
  } satisfies Record<string, TelegramReadinessRequirement> };
};
