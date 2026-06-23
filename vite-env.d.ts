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
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

