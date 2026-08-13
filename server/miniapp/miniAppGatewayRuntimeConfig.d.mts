export type MiniAppGatewayRuntimeMode = "disabled" | "self_hosted" | "external_tunnel" | "relay";
export type MiniAppGatewayRuntimeConfig = { version: number; mode: MiniAppGatewayRuntimeMode; expectedPublicHost: string | null; updatedAt: string };
export type MiniAppGatewayRuntimeConfigReadResult =
  | { state: "absent" }
  | { state: "valid"; config: MiniAppGatewayRuntimeConfig }
  | { state: "invalid"; reasonCode: string };
export function resolveMiniAppGatewayRuntimeConfigPath(env?: NodeJS.ProcessEnv): string;
export function deriveMiniAppGatewayExpectedHost(publicUrl: unknown): string | null;
export function buildMiniAppGatewayRuntimeConfig(settings?: Record<string, unknown>): MiniAppGatewayRuntimeConfig;
export function writeMiniAppGatewayRuntimeConfig(config: Partial<MiniAppGatewayRuntimeConfig>, options?: { configPath?: string; env?: NodeJS.ProcessEnv }): { file: string; mode: MiniAppGatewayRuntimeMode; expectedPublicHost: string | null };
export function writeMiniAppGatewayRuntimeConfigFromSettings(settings?: Record<string, unknown>, options?: { configPath?: string; env?: NodeJS.ProcessEnv }): { file: string; mode: MiniAppGatewayRuntimeMode; expectedPublicHost: string | null };
export function readMiniAppGatewayRuntimeConfig(options?: { configPath?: string; env?: NodeJS.ProcessEnv }): MiniAppGatewayRuntimeConfigReadResult;
export const MINI_APP_GATEWAY_RUNTIME_CONFIG_VERSION: number;
