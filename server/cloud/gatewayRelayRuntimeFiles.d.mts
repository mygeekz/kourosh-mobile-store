export function resolveGatewayRelaySecretPath(env?: NodeJS.ProcessEnv): string;
export function resolveGatewayRelayAssignmentPath(env?: NodeJS.ProcessEnv): string;
export function ensureGatewayRelaySecret(options?: { secretPath?: string; env?: NodeJS.ProcessEnv; createIfMissing?: boolean }): string | null;
export function writeGatewayRelayAssignment(assignedPublicUrl: string, options?: { assignmentPath?: string; env?: NodeJS.ProcessEnv; assignmentVersion?: number }): { file: string; assignedHost: string };
export function readGatewayRelayAssignment(options?: { assignmentPath?: string; env?: NodeJS.ProcessEnv }): { assignedHost: string; assignedPublicUrl: string; assignmentVersion: number; updatedAt?: string } | null;
