const CSS_VARIABLES: Record<string, string> = {
  bg_color: "--tg-theme-bg-color",
  text_color: "--tg-theme-text-color",
  hint_color: "--tg-theme-hint-color",
  link_color: "--tg-theme-link-color",
  button_color: "--tg-theme-button-color",
  button_text_color: "--tg-theme-button-text-color",
  secondary_bg_color: "--tg-theme-secondary-bg-color",
  header_bg_color: "--tg-theme-header-bg-color",
  bottom_bar_bg_color: "--tg-theme-bottom-bar-bg-color",
  section_bg_color: "--tg-theme-section-bg-color",
  section_header_text_color: "--tg-theme-section-header-text-color",
  subtitle_text_color: "--tg-theme-subtitle-text-color",
  destructive_text_color: "--tg-theme-destructive-text-color",
};

export const getTelegramWebApp = (): TelegramWebApp | null =>
  window.Telegram?.WebApp || null;

const setOfficialInsetVariables = (
  prefix: "--tg-safe-area-inset" | "--tg-content-safe-area-inset",
  inset?: { top: number; bottom: number; left: number; right: number },
): void => {
  if (!inset) return;
  const root = document.documentElement;
  root.style.setProperty(`${prefix}-top`, `${Math.max(0, inset.top)}px`);
  root.style.setProperty(`${prefix}-bottom`, `${Math.max(0, inset.bottom)}px`);
  root.style.setProperty(`${prefix}-left`, `${Math.max(0, inset.left)}px`);
  root.style.setProperty(`${prefix}-right`, `${Math.max(0, inset.right)}px`);
};

const setViewportVariable = (name: "--tg-viewport-height" | "--tg-viewport-stable-height", value?: number): void => {
  if (!Number.isFinite(value) || Number(value) <= 0) return;
  document.documentElement.style.setProperty(name, `${Math.round(Number(value))}px`);
};

const applyTelegramViewport = (webApp: TelegramWebApp): void => {
  setViewportVariable("--tg-viewport-height", webApp.viewportHeight);
  setViewportVariable("--tg-viewport-stable-height", webApp.viewportStableHeight);
};

export const applyTelegramEnvironment = (): void => {
  const webApp = getTelegramWebApp();
  if (!webApp) return;
  const root = document.documentElement;
  root.dataset.telegramPlatform = webApp.platform || "unknown";
  root.dataset.colorScheme = webApp.colorScheme || "light";
  root.dataset.theme = webApp.colorScheme === "dark" ? "dark" : "light";
  root.dataset.telegramFullscreen = webApp.isFullscreen ? "true" : "false";
  for (const [key, cssVariable] of Object.entries(CSS_VARIABLES)) {
    const value = webApp.themeParams?.[key];
    if (value) root.style.setProperty(cssVariable, value);
  }
  setOfficialInsetVariables("--tg-safe-area-inset", webApp.safeAreaInset);
  setOfficialInsetVariables("--tg-content-safe-area-inset", webApp.contentSafeAreaInset);
  applyTelegramViewport(webApp);
  root.classList.toggle("dark", webApp.colorScheme === "dark");
  const background = webApp.themeParams?.secondary_bg_color || webApp.themeParams?.bg_color;
  if (background) {
    webApp.setHeaderColor?.(background);
    webApp.setBackgroundColor?.(background);
  }
};

export const requestTelegramFullscreenFromUserGesture = (): boolean => {
  const webApp = getTelegramWebApp();
  if (!webApp || webApp.isFullscreen || typeof webApp.requestFullscreen !== "function") return false;
  if (webApp.isVersionAtLeast && !webApp.isVersionAtLeast("8.0")) return false;
  try {
    webApp.requestFullscreen();
    return true;
  } catch {
    // Fullscreen is optional and must never block the Mini App.
    return false;
  }
};

export const configureTelegramBackButton = (
  webApp: TelegramWebApp | null,
  options: { isHome: boolean; onBack: () => void },
): (() => void) => {
  const backButton = webApp?.BackButton as Partial<TelegramWebApp["BackButton"]> | undefined;
  if (!backButton) return () => undefined;

  try {
    if (options.isHome) {
      backButton.hide?.();
      return () => undefined;
    }

    backButton.show?.();
    // Register a callback only when Telegram also exposes the matching cleanup
    // API. Some WebView/client versions have shipped partial BackButton bridges;
    // duplicate handlers are worse than gracefully falling back to bottom nav.
    if (typeof backButton.onClick !== "function" || typeof backButton.offClick !== "function") {
      return () => undefined;
    }
    backButton.onClick(options.onBack);
  } catch {
    // Telegram UI chrome is optional. A broken/partial bridge must never crash
    // Kourosh route rendering or block access to read-only Mini App pages.
    return () => undefined;
  }

  return () => {
    try {
      backButton.offClick?.(options.onBack);
    } catch {
      // Cleanup failures are isolated for the same compatibility reason.
    }
  };
};

export const initializeTelegramWebApp = (): TelegramWebApp | null => {
  const webApp = getTelegramWebApp();
  if (!webApp) return null;
  applyTelegramEnvironment();
  // Expanded standard mode is the safe default. Fullscreen is intentionally
  // opt-in from an explicit user interaction via requestTelegramFullscreenFromUserGesture().
  // This avoids viewport/safe-area jumps during bootstrap on Telegram clients.
  try {
    webApp.expand();
  } catch {
    // A partial Telegram bridge must not block bootstrap.
  }
  try {
    webApp.ready();
  } catch {
    // ready() is also progressive enhancement for partial/older bridges.
  }
  return webApp;
};
