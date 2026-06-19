// vite.config.ts
import { createLogger, defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { VitePWA } from 'vite-plugin-pwa';
import basicSsl from '@vitejs/plugin-basic-ssl';


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

const resolveOptionalPath = (envValue: string | undefined) => {
  const value = String(envValue || '').trim();
  return value ? path.resolve(__dirname, value) : '';
};

const CERT_FILE = resolveOptionalPath(process.env.HTTPS_CERT_FILE || process.env.VITE_HTTPS_CERT_FILE);
const KEY_FILE = resolveOptionalPath(process.env.HTTPS_KEY_FILE || process.env.VITE_HTTPS_KEY_FILE);
const PFX_FILE = resolveOptionalPath(process.env.HTTPS_PFX_FILE || process.env.VITE_HTTPS_PFX_FILE);
const PFX_PASSPHRASE = process.env.LOCAL_CERT_PFX_PASSPHRASE || process.env.VITE_LOCAL_CERT_PFX_PASSPHRASE || 'kourosh-local-dev';

const exists = (filePath: string) => {
  try {
    return Boolean(filePath) && fs.existsSync(filePath);
  } catch {
    return false;
  }
};

const HAS_CUSTOM_CERT = (exists(CERT_FILE) && exists(KEY_FILE)) || exists(PFX_FILE);
const DISABLE_HTTPS = String(process.env.VITE_DISABLE_HTTPS || process.env.KOUROSH_DEV_PROXY || '').trim() === '1';
const ENABLE_PWA_DEV = String(process.env.VITE_ENABLE_PWA_DEV || '').trim() === '1';
const PUBLIC_HOST = String(process.env.VITE_PUBLIC_HOST || process.env.KOUROSH_PUBLIC_HOST || 'localhost').trim();
const PUBLIC_PORT = Number(process.env.VITE_PUBLIC_PORT || process.env.KOUROSH_PUBLIC_PORT || 80);
const PUBLIC_PROTOCOL = String(process.env.VITE_PUBLIC_PROTOCOL || (DISABLE_HTTPS ? 'http' : 'https')).trim();

const httpsServerOptions = () => {
  if (DISABLE_HTTPS) return false;
  try {
    if (exists(PFX_FILE)) {
      return {
        pfx: fs.readFileSync(PFX_FILE),
        passphrase: PFX_PASSPHRASE,
      };
    }
    if (exists(CERT_FILE) && exists(KEY_FILE)) {
      return {
        cert: fs.readFileSync(CERT_FILE),
        key: fs.readFileSync(KEY_FILE),
      };
    }
  } catch (error) {
    console.warn('Failed to read custom HTTPS certs, falling back to basic SSL.', error);
  }
  return true;
};

const publicOrigin = `${PUBLIC_PROTOCOL}://${PUBLIC_HOST}${PUBLIC_PORT && PUBLIC_PORT !== 80 && PUBLIC_PORT !== 443 ? `:${PUBLIC_PORT}` : ''}`;

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
    VitePWA({
      registerType: 'autoUpdate',

      // ✅ برای بررسی PWA در حالت توسعه (روی شبکهٔ محلی)
      devOptions: { enabled: ENABLE_PWA_DEV },

      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/maskable-512.png',
      ],

      manifest: {
        name: 'مدیریت فروشگاه کوروش',
        short_name: 'کوروش',
        description: 'سامانه جامع مدیریت فروشگاه و انبارداری کوروش',
        start_url: '/#/',
        scope: '/',
        theme_color: '#0d9488',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },

      // ✅ برای SPA (React + HashRouter)؛ اجازه بده ناوبری‌ها به index برگردن
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
      },
    }),
  ],

  // ✅ aliasها
  resolve: {
    alias: {
      'lucide-react': path.resolve(__dirname, './components/lucide-react'),
      '@': path.resolve(__dirname, '.'),
      '@components': path.resolve(__dirname, './components'),
      '@pages': path.resolve(__dirname, './pages'),
      '@contexts': path.resolve(__dirname, './contexts'),
      '@utils': path.resolve(__dirname, './utils'),
      '@types': path.resolve(__dirname, './types'),
      '@assets': path.resolve(__dirname, './assets'),
      '@styles': path.resolve(__dirname, './styles'),
      '@hooks': path.resolve(__dirname, './hooks'),
    },
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/');
          if (normalized.includes('node_modules')) {
            if (normalized.includes('recharts')) return 'vendor-charts';
            if (normalized.includes('framer-motion')) return 'vendor-motion';
            if (normalized.includes('@tanstack')) return 'vendor-tables';
            if (normalized.includes('jspdf') || normalized.includes('html2canvas') || normalized.includes('exceljs') || normalized.includes('xlsx')) return 'vendor-export';
            return 'vendor';
          }
          if (normalized.includes('/pages/reports/')) return 'module-reports';
          if (normalized.includes('/pages/MobilePhones')) return 'module-mobile-phones';
          if (normalized.includes('/pages/Installment')) return 'module-installments';
          if (normalized.includes('/pages/Repairs') || normalized.includes('/pages/AddRepair') || normalized.includes('/pages/Repair') || normalized.includes('/pages/Services')) return 'module-repairs-services';
          if (normalized.includes('/pages/Notifications') || normalized.includes('/pages/Outbox')) return 'module-notifications';
          if (normalized.includes('/pages/Purchases') || normalized.includes('/pages/StockCounts') || normalized.includes('/pages/tools/LabelPrint')) return 'module-inventory-ops';
          if (normalized.includes('/pages/Settings') || normalized.includes('/pages/settings/')) return 'module-settings';
        },
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
    origin: publicOrigin,
    hmr: DISABLE_HTTPS
      ? {
          host: PUBLIC_HOST,
          protocol: 'ws',
          clientPort: PUBLIC_PORT,
          port: 5173,
        }
      : {
          host: PUBLIC_HOST,
          protocol: 'wss',
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
    },
  },
});
