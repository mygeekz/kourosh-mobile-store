import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  authenticateMiniApp,
  clearMiniAppSession,
  MiniAppApiError,
} from "../apiClient";
import { getTelegramWebApp } from "../telegram";
import type { MiniAppAuthData, MiniAppIdentity } from "../types";
import { useMiniAppDataAvailability } from "../dataAvailability/MiniAppDataAvailabilityContext";
import { resolveMiniAppLaunch } from "../startParam";

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
  const { reportMeta, clearAvailability } = useMiniAppDataAvailability();
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
    clearAvailability();
    setState({
      status: "loading",
      identity: null,
      launch: null,
      message: "در حال برقراری اتصال امن…",
      code: null,
    });
    setAttempt((value) => value + 1);
  }, [clearAvailability]);

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
        const authResult = await authenticateMiniApp(webApp.initData);
        if (!active) return;
        reportMeta("/api/miniapp/auth", authResult.meta);
        const auth = authResult.data;
        const directLaunchHint = new URLSearchParams(window.location.search).get("kourosh_start");
        const hintedLaunch = directLaunchHint
          ? resolveMiniAppLaunch(directLaunchHint, auth.identity.kind)
          : null;
        const launch = auth.launch?.startParam || !hintedLaunch?.startParam
          ? auth.launch
          : hintedLaunch;
        if (active) {
          setState({
            status: "authenticated",
            identity: auth.identity,
            launch,
            message: "",
            code: null,
          });
        }
      } catch (error: unknown) {
        if (!active) return;
        const apiError = error instanceof MiniAppApiError ? error : null;
        if (apiError?.responseMeta) reportMeta("/api/miniapp/auth", apiError.responseMeta);
        else clearAvailability("/api/miniapp/auth");
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
  }, [attempt, clearAvailability, reportMeta]);

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
