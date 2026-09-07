import React from "react";
import { MiniAppBidiText } from "./MiniAppBidiText";

type State = { failed: boolean; detail: string };

const safeRenderErrorDetail = (error: unknown): string => {
  const raw = error instanceof Error
    ? `${error.name || "Error"}: ${error.message || "render failure"}`
    : "Error: render failure";
  return raw
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/[A-Za-z0-9_-]{40,}/g, "[redacted]")
    .slice(0, 220);
};

export class MiniAppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { failed: false, detail: "" };

  static getDerivedStateFromError(error: unknown): State {
    return { failed: true, detail: safeRenderErrorDetail(error) };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("[miniapp-render-error]", error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.failed) {
      return (
        <main className="miniapp-screen miniapp-safe-page flex flex-col items-center justify-center gap-3 bg-background text-center font-sans text-foreground" role="alert">
          <img className="size-20 object-contain" src="/kourosh-logo.svg" alt="کوروش" />
          <h1 className="m-0 text-xl font-black">نمایش برنامه با خطا روبه‌رو شد</h1>
          <p className="m-0 max-w-sm text-sm leading-7 text-mutedText">Mini App را ببندید و دوباره از داخل ربات کوروش باز کنید.</p>
          {this.state.detail ? (
            <details className="w-full max-w-sm rounded-[var(--radius-md)] border border-border bg-card p-3 text-start text-xs text-mutedText">
              <summary className="cursor-pointer font-bold text-foreground">جزئیات فنی</summary>
              <code className="mt-2 block break-words text-end"><MiniAppBidiText>{this.state.detail}</MiniAppBidiText></code>
            </details>
          ) : null}
          <button type="button" onClick={() => window.location.reload()} className="mt-2 min-h-11 rounded-[var(--radius-md)] bg-primary px-5 text-sm font-bold text-primary-foreground">
            تلاش دوباره
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
