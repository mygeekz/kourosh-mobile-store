export {};

declare global {
  type TelegramThemeParams = Record<string, string | undefined>;

  type TelegramWebApp = {
    initData: string;
    initDataUnsafe?: {
      query_id?: string;
      user?: { id: number; first_name: string; last_name?: string; username?: string; language_code?: string };
      auth_date?: number;
      hash?: string;
      start_param?: string;
    };
    version: string;
    platform: string;
    isFullscreen?: boolean;
    colorScheme: "light" | "dark";
    themeParams: TelegramThemeParams;
    safeAreaInset?: { top: number; bottom: number; left: number; right: number };
    contentSafeAreaInset?: { top: number; bottom: number; left: number; right: number };
    BackButton: {
      show: () => void;
      hide: () => void;
      onClick: (handler: () => void) => void;
      offClick: (handler: () => void) => void;
    };
    ready: () => void;
    expand: () => void;
    requestFullscreen?: () => void;
    exitFullscreen?: () => void;
    isVersionAtLeast?: (version: string) => boolean;
    setHeaderColor?: (color: string) => void;
    setBackgroundColor?: (color: string) => void;
    onEvent: (event: string, handler: () => void) => void;
    offEvent: (event: string, handler: () => void) => void;
  };

  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}
