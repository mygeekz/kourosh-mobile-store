import type { AuthUser } from "../types";

export const AUTH_SESSION_INVALID_EVENT = "kourosh:auth-session-invalid";
export const AUTH_TOKEN_STORAGE_KEY = "authToken";
export const AUTH_USER_STORAGE_KEY = "currentUser";

export const isAuthUser = (value: unknown): value is AuthUser => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AuthUser>;
  return (
    Number.isInteger(candidate.id) &&
    Number(candidate.id) > 0 &&
    typeof candidate.username === "string" &&
    candidate.username.trim().length > 0 &&
    typeof candidate.roleName === "string" &&
    candidate.roleName.trim().length > 0
  );
};

export const readStoredAuthToken = (): string | null => {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)?.trim();
  return token || null;
};

export const persistAuthSession = (token: string, user: AuthUser): void => {
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
};

export const clearPersistedAuthSession = (): void => {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(AUTH_USER_STORAGE_KEY);
};

export const readJsonObject = async (
  response: Response,
): Promise<Record<string, unknown>> => {
  try {
    const value = await response.json();
    return value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
};

export const getAuthResponseMessage = (
  payload: Record<string, unknown>,
  fallback: string,
): string =>
  typeof payload.message === "string" && payload.message.trim()
    ? payload.message
    : fallback;
