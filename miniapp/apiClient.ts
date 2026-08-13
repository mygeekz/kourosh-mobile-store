import type {
  MiniAppApiFailure,
  MiniAppApiSuccess,
  MiniAppAuthData,
  MiniAppIdentity,
} from "./types";

const SESSION_KEY = "kourosh-miniapp-session";

export class MiniAppApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "MiniAppApiError";
  }
}

const readFailure = async (response: Response): Promise<MiniAppApiFailure> => {
  try {
    const payload = (await response.json()) as Partial<MiniAppApiFailure>;
    return {
      success: false,
      code: payload.code || "MINIAPP_REQUEST_FAILED",
      message: payload.message || "ارتباط با کوروش انجام نشد.",
      requestId: payload.requestId,
    };
  } catch {
    return {
      success: false,
      code: "MINIAPP_REQUEST_FAILED",
      message: "پاسخ سرویس کوروش معتبر نبود.",
    };
  }
};

const requireSuccess = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const failure = await readFailure(response);
    throw new MiniAppApiError(
      failure.code,
      failure.message,
      response.status,
      failure.requestId,
    );
  }
  const payload = (await response.json()) as MiniAppApiSuccess<T>;
  return payload.data;
};

export const fetchMiniAppData = async <T>(path: string, signal?: AbortSignal): Promise<T> => {
  const token = getStoredMiniAppToken();
  if (!token) {
    throw new MiniAppApiError("MINIAPP_AUTH_REQUIRED", "نشست Mini App موجود نیست.", 401);
  }
  const response = await fetch(path, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "same-origin",
    cache: "no-store",
    signal,
  });
  try {
    return await requireSuccess<T>(response);
  } catch (error) {
    if (error instanceof MiniAppApiError && error.status === 401) clearMiniAppSession();
    throw error;
  }
};

export const authenticateMiniApp = async (
  initData: string,
): Promise<MiniAppAuthData> => {
  const response = await fetch("/api/miniapp/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData }),
    credentials: "same-origin",
  });
  const data = await requireSuccess<MiniAppAuthData>(response);
  sessionStorage.setItem(SESSION_KEY, data.sessionToken);
  return data;
};

export const getStoredMiniAppToken = (): string | null =>
  sessionStorage.getItem(SESSION_KEY);

export const clearMiniAppSession = (): void => {
  sessionStorage.removeItem(SESSION_KEY);
};

export const fetchMiniAppIdentity = async (
  token: string,
): Promise<MiniAppIdentity> => {
  const response = await fetch("/api/miniapp/me", {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "same-origin",
  });
  const data = await requireSuccess<{ identity: MiniAppIdentity }>(response);
  return data.identity;
};
