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

export const applyTelegramEnvironment = (): void => {
  const webApp = getTelegramWebApp();
  if (!webApp) return;
  const root = document.documentElement;
  root.dataset.telegramPlatform = webApp.platform || "unknown";
  root.dataset.colorScheme = webApp.colorScheme || "light";
  root.dataset.theme = webApp.colorScheme === "dark" ? "dark" : "light";
  for (const [key, cssVariable] of Object.entries(CSS_VARIABLES)) {
    const value = webApp.themeParams?.[key];
    if (value) root.style.setProperty(cssVariable, value);
  }
  setOfficialInsetVariables("--tg-safe-area-inset", webApp.safeAreaInset);
  setOfficialInsetVariables("--tg-content-safe-area-inset", webApp.contentSafeAreaInset);
  root.classList.toggle("dark", webApp.colorScheme === "dark");
  const background = webApp.themeParams?.secondary_bg_color || webApp.themeParams?.bg_color;
  if (background) {
    webApp.setHeaderColor?.(background);
    webApp.setBackgroundColor?.(background);
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
  webApp.expand();
  webApp.ready();
  try {
    if (!webApp.isFullscreen && webApp.requestFullscreen && (!webApp.isVersionAtLeast || webApp.isVersionAtLeast("8.0"))) {
      webApp.requestFullscreen();
    }
  } catch {
    // Fullscreen is progressive enhancement. Older/partial Telegram bridges
    // must continue with the expanded standard viewport without crashing.
  }
  return webApp;
};
