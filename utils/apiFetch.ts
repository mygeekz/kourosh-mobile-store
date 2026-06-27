import { getAuthHeaders } from "./apiUtils";

const DEV_BACKEND_ORIGIN =
  typeof import.meta !== "undefined" &&
  (import.meta as any)?.env?.VITE_API_BASE_URL
    ? String((import.meta as any).env.VITE_API_BASE_URL).replace(/\/$/, "")
    : "http://127.0.0.1:3001";

const shouldUseBackendFallback = (url: string) => {
  if (/^https?:\/\//i.test(url)) return false;
  if (!url.startsWith("/api") && !url.startsWith("/uploads")) return false;
  if (typeof window === "undefined") return false;
  return (
    ["5173", "4173"].includes(window.location.port) ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
};

const buildAbsoluteUrl = (base: string, url: string) => {
  const normalizedBase = base.replace(/\/$/, "");
  const normalizedUrl = url.startsWith("/") ? url : `/${url}`;
  return `${normalizedBase}${normalizedUrl}`;
};

const createJsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

const createFallbackResponse = async (
  url: string,
  options: RequestInit = {},
): Promise<Response | null> => {
  const isGet =
    !options.method || String(options.method).toUpperCase() === "GET";
  if (!isGet) return null;

  if (url.startsWith("/api/recurring-expenses")) {
    return createJsonResponse({ success: true, data: [] });
  }

  if (url.startsWith("/api/expenses/dashboard")) {
    return createJsonResponse({
      success: true,
      data: {
        categories: [],
        range: { from: "", to: "", days: 1 },
        totals: {
          total: 0,
          count: 0,
          avgDaily: 0,
          avgPerRecord: 0,
          todayTotal: 0,
          previousTotal: 0,
          deltaPercent: null,
        },
        recurring: { activeCount: 0, activeMonthlyTotal: 0, overdueCount: 0 },
        byCategory: [],
        trend: [],
        upcomingRecurring: [],
        importantExpenses: [],
        topVendors: [],
        recent: [],
        insights: [],
      },
    });
  }
  if (url.startsWith("/api/reports/expenses-summary")) {
    return createJsonResponse({
      success: true,
      data: { total: 0, byCategory: [] },
    });
  }

  if (url.startsWith("/uploads/") && url.includes("logo.png")) {
    const sameOriginLogo = await fetch("/logo.png");
    if (sameOriginLogo.ok) return sameOriginLogo;
  }

  return null;
};

export const apiFetch = async (
  url: string,
  options: RequestInit = {},
): Promise<Response> => {
  const token = localStorage.getItem("authToken");
  const isFormData = options.body instanceof FormData;
  const authHeadersFromUtil = getAuthHeaders(token, isFormData);
  const mergedHeaders = {
    ...authHeadersFromUtil,
    ...(options.headers || {}),
  };

  const primaryUrl = shouldUseBackendFallback(url)
    ? buildAbsoluteUrl(DEV_BACKEND_ORIGIN, url)
    : url;
  const request = (requestUrl: string) =>
    fetch(requestUrl, {
      ...options,
      headers: mergedHeaders,
    });

  try {
    const response = await request(primaryUrl);
    if (!response.ok) {
      const fallbackResponse = await createFallbackResponse(url, options);
      if (fallbackResponse) return fallbackResponse;
      if (
        shouldUseBackendFallback(url) &&
        (response.status === 404 ||
          response.status === 502 ||
          response.status === 503)
      ) {
        const retryResponse = await request(
          buildAbsoluteUrl(DEV_BACKEND_ORIGIN, url),
        );
        if (retryResponse.ok) return retryResponse;
        const retryFallback = await createFallbackResponse(url, options);
        if (retryFallback) return retryFallback;
        return retryResponse;
      }
      return response;
    }
    return response;
  } catch (error) {
    const fallbackResponse = await createFallbackResponse(url, options);
    if (fallbackResponse) return fallbackResponse;
    if (shouldUseBackendFallback(url)) {
      return request(buildAbsoluteUrl(DEV_BACKEND_ORIGIN, url));
    }
    throw error;
  }
};
