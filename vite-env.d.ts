/// <reference types="vite/client" />


import 'react';

declare module 'react' {
  interface InputHTMLAttributes<T> {
    /** Legacy alias used by older Kourosh form controls; treated like placeholder by wrappers. */
    preview?: string;
  }

  interface TextareaHTMLAttributes<T> {
    /** Legacy alias used by older Kourosh form controls; treated like placeholder by wrappers. */
    preview?: string;
  }
}

declare module '*.svg?raw' {
  const content: string;
  export default content;
}

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly SSR: boolean;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_LOADING_BUTTON_QA?: string;
  readonly VITE_DASHBOARD_VISUAL_QA?: string;
  readonly VITE_STYLE_VISUAL_QA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}


declare module 'virtual:pwa-register' {
  export type RegisterSWOptions = {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegisteredSW?: (serviceWorkerUrl: string, registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: unknown) => void;
  };

  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>;
}
