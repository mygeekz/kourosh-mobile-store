import { getAuthHeaders } from "./apiUtils";
import { AUTH_SESSION_INVALID_EVENT } from "./authSession";

const CONFIGURED_API_BASE_URL = (() => {
  const value =
    typeof import.meta !== "undefined"
      ? import.meta.env?.VITE_API_BASE_URL
      : undefined;
  const normalized = String(value || "").trim().replace(/\/$/, "");
  if (!normalized) return null;

  try {
    const parsed = new URL(normalized);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? normalized
      : null;
  } catch {
    return null;
  }
})();

const INTERNAL_API_PATH = /^\/(?:api|uploads)(?:\/|$)/;
const SAFE_RETRY_METHODS = new Set(["GET", "HEAD"]);
const FALLBACK_HTTP_STATUSES = new Set([404, 502, 503, 504]);
const DIRECT_VITE_PORTS = new Set(["4173", "5173"]);

const toOrigin = (value: string | undefined | null): string | null => {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const getBrowserOrigin = (): string | null => {
  if (typeof window === "undefined") return null;
  return toOrigin(window.location.origin);
};

/**
 * Direct Vite access is occasionally used from another LAN device. In that
 * mode, a safe GET/HEAD fallback may target the API port on the same hostname.
 * Never substitute 127.0.0.1: on a phone or tablet that address is the device
 * itself, not the computer hosting Kourosh.
 */
const getDirectViteBackendOrigin = (): string | null => {
  if (typeof window === "undefined") return null;
  if (!DIRECT_VITE_PORTS.has(window.location.port)) return null;
  if (window.location.protocol !== "http:") return null;

  try {
    const backendUrl = new URL(window.location.origin);
    backendUrl.port = "3001";
    return backendUrl.origin;
  } catch {
    return null;
  }
};

/**
 * Shared transport is deliberately limited to Kourosh-owned API and upload
 * routes. This boundary prevents an authentication token from being attached
 * to arbitrary cross-origin requests.
 */
export const isTrustedInternalApiUrl = (url: string): boolean => {
  if (INTERNAL_API_PATH.test(url)) return true;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (!INTERNAL_API_PATH.test(parsed.pathname)) return false;

  const trustedOrigins = new Set(
    [
      toOrigin(CONFIGURED_API_BASE_URL),
      getBrowserOrigin(),
      getDirectViteBackendOrigin(),
    ].filter((origin): origin is string => Boolean(origin)),
  );
  return trustedOrigins.has(parsed.origin);
};

const buildAbsoluteUrl = (base: string, url: string) => {
  const normalizedBase = base.replace(/\/$/, "");
  const normalizedUrl = url.startsWith("/") ? url : `/${url}`;
  return `${normalizedBase}${normalizedUrl}`;
};

const isAbsoluteHttpUrl = (url: string) => /^https?:\/\//i.test(url);

const resolvePrimaryUrl = (url: string): string => {
  if (isAbsoluteHttpUrl(url) || !CONFIGURED_API_BASE_URL) return url;
  return buildAbsoluteUrl(CONFIGURED_API_BASE_URL, url);
};

const resolveSafeFallbackUrl = (
  url: string,
  primaryUrl: string,
  method: string,
): string | null => {
  if (!SAFE_RETRY_METHODS.has(method)) return null;
  if (isAbsoluteHttpUrl(url) || CONFIGURED_API_BASE_URL) return null;

  const backendOrigin = getDirectViteBackendOrigin();
  if (!backendOrigin) return null;

  const fallbackUrl = buildAbsoluteUrl(backendOrigin, url);
  return fallbackUrl === primaryUrl ? null : fallbackUrl;
};

const createAssetFallbackResponse = async (
  url: string,
  options: RequestInit = {},
): Promise<Response | null> => {
  const method = String(options.method || "GET").toUpperCase();
  if (method !== "GET") return null;

  if (url.startsWith("/uploads/") && url.includes("logo.png")) {
    const sameOriginLogo = await fetch("/logo.png");
    if (sameOriginLogo.ok) return sameOriginLogo;
  }

  return null;
};

export type ApiFetchOptions = RequestInit & {
  suppressAuthInvalidation?: boolean;
};

export const apiFetch = async (
  url: string,
  options: ApiFetchOptions = {},
): Promise<Response> => {
  if (!isTrustedInternalApiUrl(url)) {
    throw new TypeError(
      `apiFetch rejected a non-internal URL: ${url}. Use the native fetch API for public assets or external services.`,
    );
  }

  const { suppressAuthInvalidation = false, ...requestOptions } = options;
  const token = localStorage.getItem("authToken");
  const isFormData =
    typeof FormData !== "undefined" && requestOptions.body instanceof FormData;
  const authHeadersFromUtil = getAuthHeaders(token, isFormData);
  const mergedHeaders = new Headers(authHeadersFromUtil);
  new Headers(requestOptions.headers).forEach((value, key) => {
    mergedHeaders.set(key, value);
  });

  const method = String(requestOptions.method || "GET").toUpperCase();
  const primaryUrl = resolvePrimaryUrl(url);
  const safeFallbackUrl = resolveSafeFallbackUrl(url, primaryUrl, method);
  const shouldDisableHttpCache =
    method === "GET" &&
    (/^\/api(?:\/|$)/.test(url) ||
      /^https?:\/\/[^/]+\/api(?:\/|$)/i.test(url));

  const request = (requestUrl: string) =>
    fetch(requestUrl, {
      ...requestOptions,
      cache: requestOptions.cache ?? (shouldDisableHttpCache ? "no-store" : undefined),
      headers: mergedHeaders,
    });

  const finalizeResponse = (response: Response): Response => {
    const isLoginRequest = /(?:^|\/)api\/login(?:$|[?#])/i.test(url);
    if (
      response.status === 401 &&
      Boolean(token) &&
      !suppressAuthInvalidation &&
      !isLoginRequest &&
      typeof window !== "undefined"
    ) {
      window.dispatchEvent(new CustomEvent(AUTH_SESSION_INVALID_EVENT));
    }
    return response;
  };

  try {
    const response = await request(primaryUrl);
    if (response.ok) return finalizeResponse(response);

    const assetFallback = await createAssetFallbackResponse(url, requestOptions);
    if (assetFallback) return finalizeResponse(assetFallback);

    if (safeFallbackUrl && FALLBACK_HTTP_STATUSES.has(response.status)) {
      const retryResponse = await request(safeFallbackUrl);
      if (retryResponse.ok) return finalizeResponse(retryResponse);

      const retryAssetFallback = await createAssetFallbackResponse(url, requestOptions);
      if (retryAssetFallback) return finalizeResponse(retryAssetFallback);
      return finalizeResponse(retryResponse);
    }

    return finalizeResponse(response);
  } catch (error) {
    const assetFallback = await createAssetFallbackResponse(url, requestOptions);
    if (assetFallback) return finalizeResponse(assetFallback);

    if (safeFallbackUrl) {
      return finalizeResponse(await request(safeFallbackUrl));
    }
    throw error;
  }
};
