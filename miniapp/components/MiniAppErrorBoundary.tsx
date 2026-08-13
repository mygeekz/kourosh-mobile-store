import React from "react";

type State = { failed: boolean };

export class MiniAppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render(): React.ReactNode {
    if (this.state.failed) {
      return (
        <main className="flex min-h-[var(--tg-viewport-stable-height,100vh)] flex-col items-center justify-center gap-3 bg-background px-6 py-10 text-center font-sans text-foreground" role="alert">
          <img className="size-20 object-contain" src="/kourosh-logo.svg" alt="کوروش" />
          <h1 className="m-0 text-xl font-black">نمایش برنامه با خطا روبه‌رو شد</h1>
          <p className="m-0 max-w-sm text-sm leading-7 text-mutedText">Mini App را ببندید و دوباره از داخل ربات کوروش باز کنید.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-2 min-h-11 rounded-[var(--radius-md)] bg-primary px-5 text-sm font-bold text-primary-foreground">
            تلاش دوباره
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
