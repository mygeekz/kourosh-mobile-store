import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  authenticateMiniApp,
  clearMiniAppSession,
  MiniAppApiError,
} from "../apiClient";
import { getTelegramWebApp } from "../telegram";
import type { MiniAppAuthData, MiniAppIdentity, MiniAppWorkspaceKind } from "../types";
import { useMiniAppDataAvailability } from "../dataAvailability/MiniAppDataAvailabilityContext";
import { resolveMiniAppLaunch } from "../startParam";
import { runMiniAppIdentitySyncRecovery } from "./miniAppIdentitySyncRecovery";

type MiniAppAuthStatus =
  | "loading"
  | "syncing"
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
  switchWorkspace: (kind: MiniAppWorkspaceKind) => Promise<boolean>;
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
    const abortController = new AbortController();
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
        // newer startapp navigation context. If Edge is temporarily missing the
        // just-linked snapshot, give the bounded server-side identity sync enough
        // time to converge before surfacing the final offline error.
        const authResult = await runMiniAppIdentitySyncRecovery({
          attempt: () => authenticateMiniApp(webApp.initData, abortController.signal),
          getErrorCode: (error) => error instanceof MiniAppApiError ? error.code : null,
          sleep: (delayMs) => new Promise<void>((resolve, reject) => {
            if (abortController.signal.aborted) { reject(new DOMException("Aborted", "AbortError")); return; }
            const timer = window.setTimeout(() => {
              abortController.signal.removeEventListener("abort", onAbort);
              resolve();
            }, delayMs);
            const onAbort = () => {
              window.clearTimeout(timer);
              reject(new DOMException("Aborted", "AbortError"));
            };
            abortController.signal.addEventListener("abort", onAbort, { once: true });
          }),
          onPending: ({ error }) => {
            const apiError = error instanceof MiniAppApiError ? error : null;
            if (apiError?.responseMeta) reportMeta("/api/miniapp/auth", apiError.responseMeta);
            else clearAvailability("/api/miniapp/auth");
            if (active) {
              setState({
                status: "syncing",
                identity: null,
                launch: null,
                message: "در حال بررسی و همگام‌سازی اطلاعات حساب…",
                code: "MINIAPP_IDENTITY_SYNC_PENDING",
              });
            }
          },
        });
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
      abortController.abort();
    };
  }, [attempt, clearAvailability, reportMeta]);

  const switchWorkspace = useCallback(async (kind: MiniAppWorkspaceKind): Promise<boolean> => {
    const webApp = getTelegramWebApp();
    if (!webApp?.initData) return false;
    const previous = state;
    setState({ ...previous, status: "syncing", message: "در حال تغییر فضای کاری…", code: null });
    try {
      const result = await authenticateMiniApp(webApp.initData, undefined, kind);
      reportMeta("/api/miniapp/auth", result.meta);
      setState({
        status: "authenticated",
        identity: result.data.identity,
        launch: { startParam: null, route: "/" },
        message: "",
        code: null,
      });
      return true;
    } catch (error: unknown) {
      const apiError = error instanceof MiniAppApiError ? error : null;
      if (apiError?.responseMeta) reportMeta("/api/miniapp/auth", apiError.responseMeta);
      setState({ ...previous, status: "authenticated", message: apiError?.message || "تغییر فضای کاری انجام نشد.", code: apiError?.code || "MINIAPP_WORKSPACE_SWITCH_FAILED" });
      return false;
    }
  }, [reportMeta, state]);

  const value = useMemo<MiniAppAuthState>(
    () => ({ ...state, retry, switchWorkspace }),
    [retry, state, switchWorkspace],
  );
  return <MiniAppAuthContext.Provider value={value}>{children}</MiniAppAuthContext.Provider>;
};

export const useMiniAppAuth = (): MiniAppAuthState => {
  const value = useContext(MiniAppAuthContext);
  if (!value) throw new Error("useMiniAppAuth must be used inside MiniAppAuthProvider");
  return value;
};
