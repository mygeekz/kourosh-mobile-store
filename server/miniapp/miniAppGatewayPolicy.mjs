export const MINI_APP_AUTH_BODY_LIMIT = 32 * 1024;
export const MINI_APP_RELAY_STATIC_BODY_LIMIT = 8 * 1024 * 1024;

export const safeDecodeMiniAppPath = (pathname) => {
  let decoded = String(pathname || "");
  try {
    for (let index = 0; index < 2; index += 1) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch {
    return null;
  }
  if (!decoded.startsWith("/") || decoded.includes("\0") || decoded.includes("\\")) return null;
  if (decoded.split("/").some((segment) => segment === "." || segment === ".." || segment.startsWith("."))) return null;
  return decoded;
};

export const isMiniAppApiNamespace = (pathname) => pathname === "/api/miniapp" || pathname.startsWith("/api/miniapp/");
export const isAnyApiPath = (pathname) => pathname === "/api" || pathname.startsWith("/api/");

export const isAllowedMiniAppApiPath = (pathname) => pathname === "/api/miniapp/auth"
  || pathname === "/api/miniapp/me"
  || pathname.startsWith("/api/miniapp/customer/")
  || pathname.startsWith("/api/miniapp/partner/")
  || pathname.startsWith("/api/miniapp/staff/");

export const isAllowedMiniAppApiRequest = (method, pathname) =>
  String(method || "").toUpperCase() === (pathname === "/api/miniapp/auth" ? "POST" : "GET");

export const normalizeMiniAppStaticPublicPath = (pathname) => {
  const decoded = safeDecodeMiniAppPath(pathname);
  if (!decoded) return null;
  const publicPath = decoded === "/" || decoded === "/miniapp.html" ? "/miniapp.html" : decoded;
  const allowed = publicPath === "/miniapp.html"
    || publicPath === "/favicon.svg"
    || publicPath === "/kourosh-logo.svg"
    || publicPath === "/fonts/Vazir-FD-WOL.woff2"
    || /^\/assets\/[A-Za-z0-9_-]+\.(?:js|css)$/.test(publicPath);
  return allowed ? publicPath : null;
};

export const classifyMiniAppGatewayRequest = ({ method, pathname, hasBody = false, contentLength = 0, allowOptions = false }) => {
  const normalizedMethod = String(method || "").toUpperCase();
  const decoded = safeDecodeMiniAppPath(pathname);
  if (!decoded || decoded !== pathname) return { allowed: false, status: 404, code: "ENCODED_PATH_REJECTED", kind: "rejected" };

  if (pathname === "/healthz") {
    return normalizedMethod === "GET" || normalizedMethod === "HEAD"
      ? { allowed: true, kind: "health", publicPath: pathname }
      : { allowed: false, status: 405, code: "METHOD_NOT_ALLOWED", kind: "rejected" };
  }

  if (isAnyApiPath(pathname)) {
    if (!isMiniAppApiNamespace(pathname) || !isAllowedMiniAppApiPath(pathname)) {
      return { allowed: false, status: 404, code: "API_PATH_NOT_ALLOWED", kind: "rejected" };
    }
    if (normalizedMethod === "OPTIONS" && allowOptions) return { allowed: true, kind: "options", publicPath: pathname };
    if (!isAllowedMiniAppApiRequest(normalizedMethod, pathname)) {
      return { allowed: false, status: 405, code: "METHOD_NOT_ALLOWED", kind: "rejected" };
    }
    if (normalizedMethod === "GET" && hasBody) return { allowed: false, status: 400, code: "GET_BODY_NOT_ALLOWED", kind: "rejected" };
    if (normalizedMethod === "POST" && Number(contentLength || 0) > MINI_APP_AUTH_BODY_LIMIT) {
      return { allowed: false, status: 413, code: "AUTH_BODY_TOO_LARGE", kind: "rejected" };
    }
    return { allowed: true, kind: "api", publicPath: pathname };
  }

  if (normalizedMethod !== "GET" && normalizedMethod !== "HEAD") {
    return { allowed: false, status: 405, code: "STATIC_METHOD_NOT_ALLOWED", kind: "rejected" };
  }
  const publicPath = normalizeMiniAppStaticPublicPath(pathname);
  return publicPath
    ? { allowed: true, kind: "static", publicPath }
    : { allowed: false, status: 404, code: "STATIC_PATH_NOT_ALLOWED", kind: "rejected" };
};
