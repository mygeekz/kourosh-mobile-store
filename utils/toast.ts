import { cleanAppMessage } from '../shared/messages';
type AppToastType = "success" | "error" | "info" | "loading";

const DEFAULT_DURATIONS: Record<Exclude<AppToastType, "loading">, number> = {
  success: 3200,
  error: 5200,
  info: 3600,
};

const createToastId = () => `app-toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const emit = (name: string, detail?: Record<string, unknown>) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
};

const publish = (type: Exclude<AppToastType, "loading">, message: string, duration?: number) => {
  const id = createToastId();
  emit('kourosh:app-toast', { id, type, message: cleanAppMessage(message), duration: duration ?? DEFAULT_DURATIONS[type] });
  return id;
};

export const appToast = {
  success(message: string) {
    return publish('success', message, 3200);
  },
  error(message: string) {
    return publish('error', message, 5200);
  },
  info(message: string) {
    return publish('info', message, 3600);
  },
  loading(_message: string) {
    return createToastId();
  },
  promise<T>(promise: Promise<T>, messages: { loading: string; success: string; error: string }) {
    const loadingId = appToast.loading(messages.loading);
    return promise
      .then((result) => {
        appToast.dismiss(loadingId);
        appToast.success(cleanAppMessage(messages.success));
        return result;
      })
      .catch((error) => {
        appToast.dismiss(loadingId);
        appToast.error(cleanAppMessage(messages.error));
        throw error;
      });
  },
  dismiss(id?: string) {
    emit('kourosh:app-toast-dismiss', id ? { id } : undefined);
  },
};
