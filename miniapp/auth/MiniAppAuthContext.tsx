import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  authenticateMiniApp,
  clearMiniAppSession,
  MiniAppApiError,
} from "../apiClient";
import { getTelegramWebApp } from "../telegram";
import type { MiniAppAuthData, MiniAppIdentity } from "../types";

type MiniAppAuthStatus =
  | "loading"
  | "authenticated"
  | "outside_telegram"
  | "unlinked"
  | "error";

type MiniAppAuthState = {
  status: MiniAppAuthStatus;
  identity: MiniAppIdentity | null;
  launch: MiniAppAuthData["launch"] | null;
  message: string;
  code: string | null;
  retry: () => void;
};

const MiniAppAuthContext = createContext<MiniAppAuthState | null>(null);

export const MiniAppAuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<MiniAppAuthState, "retry">>({
    status: "loading",
    identity: null,
    launch: null,
    message: "در حال برقراری اتصال امن…",
    code: null,
  });

  const retry = useCallback(() => {
    clearMiniAppSession();
    setState({
      status: "loading",
      identity: null,
      launch: null,
      message: "در حال برقراری اتصال امن…",
      code: null,
    });
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      const webApp = getTelegramWebApp();
      if (!webApp?.initData) {
        if (active) {
          setState({
            status: "outside_telegram",
            identity: null,
            launch: null,
            message: "این بخش فقط از داخل ربات رسمی کوروش باز می‌شود.",
            code: "MINIAPP_TELEGRAM_REQUIRED",
          });
        }
        return;
      }

      try {
        // A fresh Telegram WebView boot must validate this launch's initData.
        // Rotating the session ensures a still-valid stored token cannot hide a
        // newer startapp navigation context.
        const auth = await authenticateMiniApp(webApp.initData);
        if (active) {
          setState({
            status: "authenticated",
            identity: auth.identity,
            launch: auth.launch,
            message: "",
            code: null,
          });
        }
      } catch (error: unknown) {
        if (!active) return;
        const apiError = error instanceof MiniAppApiError ? error : null;
        const isUnlinked = apiError?.code === "MINIAPP_ACCOUNT_UNLINKED";
        setState({
          status: isUnlinked ? "unlinked" : "error",
          identity: null,
          launch: null,
          message: apiError?.message || "اتصال امن با کوروش برقرار نشد.",
          code: apiError?.code || "MINIAPP_BOOTSTRAP_FAILED",
        });
      }
    };
    void bootstrap();
    return () => {
      active = false;
    };
  }, [attempt]);

  const value = useMemo<MiniAppAuthState>(
    () => ({ ...state, retry }),
    [retry, state],
  );
  return <MiniAppAuthContext.Provider value={value}>{children}</MiniAppAuthContext.Provider>;
};

export const useMiniAppAuth = (): MiniAppAuthState => {
  const value = useContext(MiniAppAuthContext);
  if (!value) throw new Error("useMiniAppAuth must be used inside MiniAppAuthProvider");
  return value;
};
