import { Button } from '@/components/ui';
import React from 'react';

type State = { hasError: boolean; message?: string; stack?: string };

class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false, message: undefined, stack: undefined };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : 'خطا در عملیاتی نامشخص', stack: undefined };
  }

  componentDidCatch(error: unknown, errorInfo: unknown) {
    const stack = typeof errorInfo === 'object' && errorInfo && 'componentStack' in (errorInfo as any)
      ? String((errorInfo as any).componentStack || '')
      : undefined;
    this.setState({ stack });
    console.error('AppErrorBoundary caught an error', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleSoftRecover = () => {
    this.setState({ hasError: false, message: undefined, stack: undefined });
    try {
      if (window.location.hash && window.location.hash !== '#/' && window.location.hash !== '') {
        window.location.hash = '#/';
      }
    } catch {}
  };

  handleHardReset = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch {}
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div dir="rtl" className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-6 text-right">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300">
              <i className="fa-solid fa-triangle-exclamation text-xl" />
            </span>
            <div>
              <div className="text-lg font-black text-slate-900 dark:text-slate-100">یک خطا در عملیاتی غیرمنتظره رخ داد</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">برای جلوگیری از کرش کامل، صفحه در حالت ایمن متوقف شد.</div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4 text-sm text-slate-700 dark:text-slate-300">
            {this.state.message || 'جزئیات خطا در دسترس نیست.'}
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button type="button" onClick={this.handleSoftRecover} variant="secondary" size="sm" leftIcon={<i className="fa-solid fa-house" />}>
              بازگشت ایمن
            </Button>
            <Button type="button" onClick={this.handleHardReset} variant="warning" size="sm" leftIcon={<i className="fa-solid fa-broom" />}>
              پاک‌سازی کش و بارگذاری
            </Button>
            <Button type="button" onClick={this.handleReload} variant="primary" size="sm" leftIcon={<i className="fa-solid fa-rotate-right" />}>
              بارگذاری مجدد
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
