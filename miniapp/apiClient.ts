import type {
  MiniAppApiFailure,
  MiniAppApiSuccess,
  MiniAppAuthData,
  MiniAppIdentity,
} from "./types";
import type { MiniAppResponseMeta } from "./reference/miniAppDataAvailability";

const SESSION_KEY = "kourosh-miniapp-session";

export type MiniAppApiResult<T> = {
  data: T;
  meta: MiniAppResponseMeta;
};

export class MiniAppApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly requestId?: string,
    public readonly responseMeta?: MiniAppResponseMeta,
  ) {
    super(message);
    this.name = "MiniAppApiError";
  }
}

const parseOptionalPositiveInteger = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const readResponseMeta = (
  response: Response,
  assumeLiveWhenMissing: boolean,
): MiniAppResponseMeta | null => {
  const rawSource = String(response.headers.get("x-kourosh-data-source") || "").trim().toLowerCase();
  if (rawSource !== "live" && rawSource !== "snapshot" && !assumeLiveWhenMissing) return null;
  const source = rawSource === "snapshot" ? "snapshot" : "live";
  return {
    source,
    snapshotVersion: source === "snapshot"
      ? parseOptionalPositiveInteger(response.headers.get("x-kourosh-snapshot-version"))
      : null,
    snapshotGeneratedAt: source === "snapshot"
      ? response.headers.get("x-kourosh-snapshot-generated-at")
      : null,
    snapshotReceivedAt: source === "snapshot"
      ? response.headers.get("x-kourosh-snapshot-received-at")
      : null,
  };
};

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

const requireSuccess = async <T>(response: Response): Promise<MiniAppApiResult<T>> => {
  if (!response.ok) {
    const failure = await readFailure(response);
    throw new MiniAppApiError(
      failure.code,
      failure.message,
      response.status,
      failure.requestId,
      readResponseMeta(response, false) || undefined,
    );
  }
  const payload = (await response.json()) as MiniAppApiSuccess<T>;
  return {
    data: payload.data,
    // Direct/local v163-compatible responses do not carry the Edge provenance
    // header. Such successful same-origin responses are necessarily live.
    meta: readResponseMeta(response, true) as MiniAppResponseMeta,
  };
};

export const fetchMiniAppData = async <T>(path: string, signal?: AbortSignal): Promise<MiniAppApiResult<T>> => {
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
): Promise<MiniAppApiResult<MiniAppAuthData>> => {
  const response = await fetch("/api/miniapp/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData }),
    credentials: "same-origin",
  });
  const result = await requireSuccess<MiniAppAuthData>(response);
  sessionStorage.setItem(SESSION_KEY, result.data.sessionToken);
  return result;
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
  const result = await requireSuccess<{ identity: MiniAppIdentity }>(response);
  return result.data.identity;
};
