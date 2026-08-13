// vite.config.ts
import { createLogger, defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { createSecureContext } from 'node:tls';
import { VitePWA } from 'vite-plugin-pwa';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { kouroshAliases, kouroshManualChunk } from './vite.shared.config';


const POSTCSS_FROM_WARNING = 'A PostCSS plugin did not pass the `from` option to `postcss.parse`';
const viteLogger = createLogger();
const originalViteWarn = viteLogger.warn.bind(viteLogger);
viteLogger.warn = (message, options) => {
  const normalizedMessage = typeof message === 'string' ? message : String(message ?? '');
  if (normalizedMessage.includes(POSTCSS_FROM_WARNING)) {
    return;
  }
  originalViteWarn(message, options);
};
const originalViteWarnOnce = viteLogger.warnOnce.bind(viteLogger);
viteLogger.warnOnce = (message, options) => {
  const normalizedMessage = typeof message === 'string' ? message : String(message ?? '');
  // Tailwind 3.4 creates a few synthetic AST fragments without a source file.
  // They contain no relative asset URLs, while real project styles retain Vite's
  // source path. Suppress only this known upstream warning, not PostCSS errors.
  if (normalizedMessage.includes(POSTCSS_FROM_WARNING)) {
    return;
  }
  originalViteWarnOnce(message, options);
};

const resolveOptionalPath = (envValue: string | undefined) => {
  const value = String(envValue || '').trim();
  return value ? path.resolve(__dirname, value) : '';
};

const GENERATED_CERT_FILE = path.resolve(__dirname, 'certs/current-cert.pem');
const GENERATED_KEY_FILE = path.resolve(__dirname, 'certs/current-key.pem');
const GENERATED_PFX_FILE = path.resolve(__dirname, 'certs/current-cert.pfx');

const resolveConfiguredCertificatePath = (envValue: string | undefined, generatedPath: string) => {
  const configured = resolveOptionalPath(envValue);
  return configured || generatedPath;
};

const CERT_FILE = resolveConfiguredCertificatePath(
  process.env.HTTPS_CERT_FILE || process.env.VITE_HTTPS_CERT_FILE,
  GENERATED_CERT_FILE,
);
const KEY_FILE = resolveConfiguredCertificatePath(
  process.env.HTTPS_KEY_FILE || process.env.VITE_HTTPS_KEY_FILE,
  GENERATED_KEY_FILE,
);
const PFX_FILE = resolveConfiguredCertificatePath(
  process.env.HTTPS_PFX_FILE || process.env.VITE_HTTPS_PFX_FILE,
  GENERATED_PFX_FILE,
);
const PFX_PASSPHRASE = process.env.LOCAL_CERT_PFX_PASSPHRASE || process.env.VITE_LOCAL_CERT_PFX_PASSPHRASE || 'kourosh-local-dev';

const exists = (filePath: string) => {
  try {
    return Boolean(filePath) && fs.existsSync(filePath);
  } catch {
    return false;
  }
};

const loadCustomHttpsOptions = () => {
  try {
    if (exists(PFX_FILE)) {
      const options = {
        pfx: fs.readFileSync(PFX_FILE),
        passphrase: PFX_PASSPHRASE,
      };
      createSecureContext(options);
      return options;
    }
    if (exists(CERT_FILE) && exists(KEY_FILE)) {
      const options = {
        cert: fs.readFileSync(CERT_FILE),
        key: fs.readFileSync(KEY_FILE),
      };
      createSecureContext(options);
      return options;
    }
  } catch (error) {
    console.warn('Generated HTTPS certificate is unreadable; falling back to Vite basic SSL.', error);
  }
  return null;
};

const CUSTOM_HTTPS_OPTIONS = loadCustomHttpsOptions();
const HAS_CUSTOM_CERT = Boolean(CUSTOM_HTTPS_OPTIONS);
const DISABLE_HTTPS = String(process.env.VITE_DISABLE_HTTPS || process.env.KOUROSH_DEV_PROXY || '').trim() === '1';
const ENABLE_PWA_DEV = String(process.env.VITE_ENABLE_PWA_DEV || '').trim() === '1';
const DISABLE_PWA_BUILD = String(process.env.VITE_DISABLE_PWA_BUILD || '').trim() === '1';
const EXPLICIT_PUBLIC_PORT = String(process.env.VITE_PUBLIC_PORT || process.env.KOUROSH_PUBLIC_PORT || '').trim();
const PUBLIC_PORT = Number(EXPLICIT_PUBLIC_PORT || (DISABLE_HTTPS ? 80 : 5173));

// Development assets must stay same-origin with the URL currently used by the browser.
// Pinning server.origin to one LAN IP breaks Font Awesome webfonts whenever the same
// server is opened through localhost, 127.0.0.1 or a future local DNS name.
const HMR_PROTOCOL = DISABLE_HTTPS ? 'ws' : 'wss';

const httpsServerOptions = () => {
  if (DISABLE_HTTPS) return false;
  return CUSTOM_HTTPS_OPTIONS || true;
};

export default defineConfig({
  customLogger: viteLogger,
  plugins: [
    react({
      babel: {
        // Settings.tsx is still a large legacy settings hub. Keep Babel from
        // switching the generator to compact mode and printing the >500KB note
        // while the module is gradually split into smaller route-level panels.
        compact: false,
      },
    }),
    ...((HAS_CUSTOM_CERT && !DISABLE_HTTPS) ? [] : (!DISABLE_HTTPS ? [basicSsl()] : [])),

    // ✅ PWA
    ...(DISABLE_PWA_BUILD ? [] : [VitePWA({
      registerType: 'autoUpdate',
      // Registration is explicit in hooks/usePwaInstall.ts so runtime failures can be surfaced.
      injectRegister: false,

      // ✅ برای بررسی PWA در حالت توسعه (روی شبکهٔ محلی)
      devOptions: {
        enabled: ENABLE_PWA_DEV,
        type: 'module',
        navigateFallback: '/index.html',
      },

      includeAssets: [
        'kourosh-logo.svg',
        'favicon.svg',
        'favicon.ico',
        'apple-touch-icon.png',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/maskable-512.png',
      ],

      manifest: {
        id: '/',
        name: 'مدیریت فروشگاه کوروش',
        short_name: 'کوروش',
        description: 'سامانه جامع مدیریت فروشگاه، فروش، مالی و انبارداری کوروش',
        lang: 'fa',
        dir: 'rtl',
        start_url: '/?source=pwa#/',
        scope: '/',
        theme_color: '#08090d',
        background_color: '#08090d',
        display: 'standalone',
        orientation: 'any',
        prefer_related_applications: false,
        related_applications: [
          { platform: 'webapp', url: '/manifest.webmanifest', id: '/' },
        ],
        categories: ['business', 'finance', 'productivity'],
        icons: [
          { src: '/kourosh-logo.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },

      // ✅ برای SPA (React + HashRouter)؛ اجازه بده ناوبری‌ها به index برگردن
      workbox: {
        navigateFallback: '/index.html',
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff2,ttf}'],
        // Keep very large generated assets out of Workbox's build-time hashing path.
        // They are cached safely on first use below; the smaller app shell remains precached.
        globIgnores: ['**/assets/index-*.css', '**/assets/vendor-*.js'],
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) =>
              url.origin === self.location.origin &&
              (request.destination === 'script' || request.destination === 'style'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'kourosh-large-static-assets-v1',
              expiration: { maxEntries: 40, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    })]),
  ],

  // ✅ aliasها
  resolve: {
    alias: kouroshAliases(__dirname),
  },

  build: {
    // The two intentionally isolated, lazy-loaded document/export vendors are
    // below this measured budget (vendor 909 kB, Excel 937 kB). Keeping them as
    // stable vendor chunks avoids duplicating those libraries across routes.
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'index.html'),
        miniapp: path.resolve(__dirname, 'miniapp.html'),
      },
      output: {
        manualChunks: kouroshManualChunk,
      },
    },
  },

  server: {
    host: '0.0.0.0',
    strictPort: true,
    port: 5173,

    // ✅ در حالت dev-proxy، HTTPS را خاموش می‌کنیم تا SSL و SW خطا در عملیات ندهند.
    // در حالت عادی، اگر cert سفارشی پیدا شود از آن استفاده می‌کنیم.
    https: httpsServerOptions(),
    // Do not set server.origin in development. Root-relative CSS/font URLs then
    // follow the browser's actual origin, so HTTPS works through LAN IP, localhost,
    // 127.0.0.1 and a future local domain without cross-origin font requests.
    origin: undefined,
    hmr: {
      protocol: HMR_PROTOCOL,
      clientPort: PUBLIC_PORT,
      port: 5173,
    },

    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/inventory/alerts': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },

  // start_https.bat serves the production build, not Vite's development graph.
  // This gives Chrome the real generated manifest and Workbox service worker.
  preview: {
    host: '0.0.0.0',
    strictPort: true,
    port: 5173,
    https: httpsServerOptions(),
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/inventory/alerts': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
});
