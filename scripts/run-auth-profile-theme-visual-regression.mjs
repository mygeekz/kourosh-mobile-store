#!/usr/bin/env node
/* global document, innerHeight, innerWidth, requestAnimationFrame, getComputedStyle, HTMLInputElement, HTMLButtonElement, window, DOMMatrixReadOnly */
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

import { browserLaunchArgs, resolvePuppeteerBrowserExecutable } from './lib/resolve-browser-executable.mjs';

process.env.FONTCONFIG_PATH ||= '/etc/fonts';
process.env.XDG_CACHE_HOME ||= '/tmp/kourosh-chromium-cache';

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const skipScreenshots = args.has('--skip-screenshots');
const updateBaselines = args.has('--update-baselines');
const updateRestoreBaselines = args.has('--update-restore-baselines');
const outputIndex = process.argv.indexOf('--output');
const requestedOutput = outputIndex >= 0 ? process.argv[outputIndex + 1] : null;
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.resolve(root, requestedOutput || path.join('.kourosh-runtime', 'auth-profile-theme-visual', timestamp));
const screenshotsDir = path.join(outputDir, 'screenshots');
const referencesDir = path.join(outputDir, 'references');
const diffsDir = path.join(outputDir, 'diffs');
const baselineDir = path.join(root, 'tests', 'visual-baselines', 'auth-profile-theme');
const baselineManifestPath = path.join(baselineDir, 'manifest.json');
const runtimeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kourosh-auth-profile-visual-'));
const distDir = path.join(runtimeDir, 'dist');
const qaAvatarPath = path.join(runtimeDir, 'qa-avatar.png');
const viteCli = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');

if (!fs.existsSync(viteCli)) throw new Error('node_modules نصب نیست؛ ابتدا setup پروژه را کامل کنید.');
fs.mkdirSync(screenshotsDir, { recursive: true });
fs.mkdirSync(referencesDir, { recursive: true });
fs.mkdirSync(diffsDir, { recursive: true });
if (updateBaselines || updateRestoreBaselines) fs.mkdirSync(baselineDir, { recursive: true });

const pixelPolicy = {
  perPixelThreshold: 0.1,
  maxDiffRatio: 0.0025,
  includeAntiAliasing: false,
};

const viewports = [
  { key: 'mobile', label: 'موبایل', width: 390, height: 844 },
  { key: 'short-desktop', label: 'پنجره کوتاه', width: 768, height: 520 },
  { key: 'desktop', label: 'دسکتاپ', width: 1440, height: 900 },
];

const themes = [
  { key: 'light', label: 'روشن', storedTheme: 'light', systemDark: false, expectDark: false },
  { key: 'dark', label: 'تیره', storedTheme: 'dark', systemDark: false, expectDark: true },
  { key: 'system-dark', label: 'سیستمی تیره', storedTheme: 'system', systemDark: true, expectDark: true },
];

const restorePalettes = ['aurora', 'classic', 'ocean', 'sunset', 'midnight', 'gold'];

const restoreThemes = [
  { key: 'light', label: 'روشن', expectDark: false },
  { key: 'dark', label: 'تیره', expectDark: true },
];

const restoreViewports = [
  { key: 'mobile', label: 'موبایل', width: 390, height: 844 },
  { key: 'narrow', label: 'پنجره باریک', width: 680, height: 508 },
  { key: 'desktop', label: 'دسکتاپ', width: 1440, height: 900 },
];

const surfaces = [
  { key: 'login', label: 'ورود', route: 'login', authenticated: false },
  { key: 'profile', label: 'پروفایل', route: 'profile', authenticated: true },
  { key: 'setup', label: 'ساخت حساب اولیه', route: 'setup', authenticated: false },
  { key: 'password-dialog', label: 'پنجره تغییر رمز', route: 'profile', authenticated: true },
  { key: 'remove-avatar-dialog', label: 'پنجره حذف تصویر', route: 'profile', authenticated: true },
  { key: 'avatar-crop-dialog', label: 'ویرایش تصویر پروفایل', route: 'profile', authenticated: true },
];

const profileButtonLabels = [
  'انتخاب تصویر پروفایل',
  'ذخیره تصویر پروفایل',
  'حذف تصویر پروفایل',
  'امنیت و تغییر رمز',
  'روشن',
  'تیره',
  'سیستمی',
  'ذخیره تغییرات پروفایل',
];

const reservePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : null;
    server.close((error) => error ? reject(error) : resolve(port));
  });
});

const build = spawnSync(process.execPath, [viteCli, 'build', '--outDir', distDir, '--emptyOutDir'], {
  cwd: root,
  env: { ...process.env, VITE_DISABLE_HTTPS: '1', VITE_LOADING_BUTTON_QA: '1' },
  encoding: 'utf8',
  timeout: 180_000,
  maxBuffer: 40 * 1024 * 1024,
});
if (build.status !== 0) throw new Error(`Auth/profile visual build failed:\n${build.stderr || build.stdout}`);

const port = await reservePort();
const origin = `http://127.0.0.1:${port}`;
const previewLogs = [];
const preview = spawn(process.execPath, [viteCli, 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort', '--outDir', distDir], {
  cwd: root,
  env: { ...process.env, VITE_DISABLE_HTTPS: '1', VITE_LOADING_BUTTON_QA: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
preview.stdout.on('data', (chunk) => previewLogs.push(String(chunk)));
preview.stderr.on('data', (chunk) => previewLogs.push(String(chunk)));

const waitForPreview = async () => {
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    if (preview.exitCode !== null) throw new Error(`Vite preview exited early:\n${previewLogs.join('')}`);
    try {
      if ((await fetch(origin)).ok) return;
    } catch {
      // Preview is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Vite preview did not become ready:\n${previewLogs.join('')}`);
};

const json = (request, data, status = 200) => request.respond({
  status,
  contentType: 'application/json; charset=utf-8',
  body: JSON.stringify(data),
});

const parseRgb = (value) => {
  const parts = String(value || '').match(/[\d.]+/g)?.map(Number) || [];
  return parts.length >= 3 ? parts.slice(0, 3) : null;
};

const luminance = (color) => {
  const rgb = parseRgb(color);
  if (!rgb) return null;
  const channel = (value) => {
    const normalized = value / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return (0.2126 * channel(rgb[0])) + (0.7152 * channel(rgb[1])) + (0.0722 * channel(rgb[2]));
};

const contrast = (foreground, background) => {
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  if (foregroundLuminance === null || backgroundLuminance === null) return null;
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
};

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const authUser = {
  id: 1,
  username: 'qa-admin',
  firstName: 'مدیر',
  lastName: 'کیفیت',
  roleName: 'Admin',
  avatarUrl: null,
  dateAdded: '2026-01-01T10:00:00.000Z',
  lastLogin: '2026-08-01T10:00:00.000Z',
};

const qaAvatarUrl = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 128 128%22%3E%3Crect width=%22128%22 height=%22128%22 rx=%2228%22 fill=%22%232d241b%22/%3E%3Ccircle cx=%2264%22 cy=%2248%22 r=%2224%22 fill=%22%23d8bd89%22/%3E%3Cpath d=%22M24 118c4-27 19-40 40-40s36 13 40 40%22 fill=%22%23a98a64%22/%3E%3C/svg%3E';

const qaAvatarPng = new PNG({ width: 240, height: 160 });
for (let y = 0; y < qaAvatarPng.height; y += 1) {
  for (let x = 0; x < qaAvatarPng.width; x += 1) {
    const offset = (y * qaAvatarPng.width + x) * 4;
    const left = x < qaAvatarPng.width / 2;
    const top = y < qaAvatarPng.height / 2;
    const color = top ? (left ? [216, 189, 137] : [15, 23, 42]) : (left ? [148, 163, 184] : [71, 85, 105]);
    qaAvatarPng.data[offset] = color[0];
    qaAvatarPng.data[offset + 1] = color[1];
    qaAvatarPng.data[offset + 2] = color[2];
    qaAvatarPng.data[offset + 3] = 255;
  }
}
fs.writeFileSync(qaAvatarPath, PNG.sync.write(qaAvatarPng));

const configurePage = async (page, theme, surface) => {
  const authenticated = surface.authenticated;
  const activeUser = surface.key === 'remove-avatar-dialog'
    ? { ...authUser, avatarUrl: qaAvatarUrl }
    : authUser;
  const setupRequired = surface.key === 'setup';
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme.systemDark ? 'dark' : 'light' }]);
  await page.evaluateOnNewDocument(({ storedTheme, authenticatedUser, isAuthenticated }) => {
    localStorage.clear();
    localStorage.setItem('pwa_install_overlay_dismissed_v2', '1');
    localStorage.setItem('koroush.style.v2', JSON.stringify({ theme: storedTheme, palette: 'gold' }));
    if (isAuthenticated) {
      localStorage.setItem('authToken', 'auth-profile-visual-token');
      localStorage.setItem('currentUser', JSON.stringify(authenticatedUser));
    }
  }, { storedTheme: theme.storedTheme, authenticatedUser: activeUser, isAuthenticated: authenticated });

  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    if (request.isInterceptResolutionHandled?.()) return;
    const url = new URL(request.url());
    if (url.origin !== origin || !url.pathname.startsWith('/api/')) {
      await request.continue();
      return;
    }
    if (url.pathname === '/api/setup/status') {
      await json(request, { success: true, setupRequired, canInitialize: setupRequired });
      return;
    }
    if (url.pathname === '/api/me') {
      await json(request, authenticated
        ? { success: true, user: activeUser }
        : { success: false, message: 'Unauthorized' }, authenticated ? 200 : 401);
      return;
    }
    if (url.pathname === '/api/settings/public' || url.pathname === '/api/branding/public') {
      await json(request, { success: true, data: { storeName: 'فروشگاه کوروش' } });
      return;
    }
    if (url.pathname === '/api/module-flags') {
      await json(request, { success: true, data: {} });
      return;
    }
    await json(request, { success: true, data: [] });
  });
};

const configureRestorePage = async (page, theme, palette) => {
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme.expectDark ? 'dark' : 'light' }]);
  await page.evaluateOnNewDocument(({ storedTheme, storedPalette }) => {
    localStorage.clear();
    localStorage.setItem('pwa_install_overlay_dismissed_v2', '1');
    localStorage.setItem('koroush.style.v2', JSON.stringify({ theme: storedTheme, palette: storedPalette }));
  }, { storedTheme: theme.key, storedPalette: palette });

  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    if (request.isInterceptResolutionHandled?.()) return;
    const url = new URL(request.url());
    if (url.origin !== origin || !url.pathname.startsWith('/api/')) {
      await request.continue();
      return;
    }
    if (url.pathname === '/api/auth/me' || url.pathname === '/api/me') {
      await json(request, { success: false, message: 'Unauthorized' }, 401);
      return;
    }
    if (url.pathname === '/api/settings/public' || url.pathname === '/api/branding/public') {
      await json(request, { success: true, data: { storeName: 'فروشگاه کوروش' } });
      return;
    }
    await json(request, { success: true, data: [] });
  });
};

const freezeVisualMotion = (page) => page.addStyleTag({ content: `
  *, *::before, *::after {
    animation-delay: 0s !important;
    animation-duration: 0s !important;
    caret-color: transparent !important;
    transition-delay: 0s !important;
    transition-duration: 0s !important;
  }
` });

const collectLoginMetrics = (page) => page.evaluate(() => {
  const button = document.querySelector('[data-ui-login-primary-action="gold"]');
  const style = button ? getComputedStyle(button) : null;
  const rect = button?.getBoundingClientRect();
  const root = document.querySelector('.login-page.auth-liquid-shell');
  return {
    ready: Boolean(button && root),
    contract: button?.getAttribute('data-ui-login-primary-action') || '',
    text: button?.textContent?.replace(/\s+/g, ' ').trim() || '',
    backgroundColor: style?.backgroundColor || '',
    backgroundImage: style?.backgroundImage || 'none',
    color: style?.color || '',
    borderColor: style?.borderColor || '',
    width: rect?.width || 0,
    height: rect?.height || 0,
    contained: Boolean(rect && rect.left >= -1 && rect.right <= innerWidth + 1 && rect.top >= -1 && rect.bottom <= innerHeight + 1),
    documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
});

const collectProfileMetrics = (page, labels) => page.evaluate((expectedLabels) => {
  const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const visibleButtons = Array.from(document.querySelectorAll('button')).filter((button) => {
    const rect = button.getBoundingClientRect();
    const style = getComputedStyle(button);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  });
  const buttons = expectedLabels.map((label) => {
    const element = visibleButtons.find((button) => normalize(button.textContent) === label);
    if (!element) return { label, found: false };
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      label,
      found: true,
      disabled: element.disabled,
      pressed: element.getAttribute('aria-pressed'),
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      color: style.color,
      borderColor: style.borderColor,
      opacity: Number(style.opacity || 1),
      width: rect.width,
      height: rect.height,
    };
  });
  return {
    buttons,
    htmlDark: document.documentElement.classList.contains('dark'),
    bodyBackground: getComputedStyle(document.body).backgroundColor,
    documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
}, labels);

const collectSetupMetrics = (page) => page.evaluate(() => {
  const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const visibleButtons = Array.from(document.querySelectorAll('button')).filter((button) => {
    const rect = button.getBoundingClientRect();
    const style = getComputedStyle(button);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  });
  const buttonMetrics = (label) => {
    const element = visibleButtons.find((button) => normalize(button.textContent) === label);
    if (!element) return { label, found: false };
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      label,
      found: true,
      disabled: element.disabled,
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      color: style.color,
      borderColor: style.borderColor,
      minHeight: style.minHeight,
      cssHeight: style.height,
      uxButtonHeight: style.getPropertyValue('--ux-btn-h').trim(),
      commandHeight: style.getPropertyValue('--app-command-height-md').trim(),
      className: element.className,
      width: rect.width,
      height: rect.height,
      contained: rect.left >= -1 && rect.right <= innerWidth + 1 && rect.top >= -1 && rect.bottom <= innerHeight + 1,
    };
  };
  const fields = ['setup-username', 'setup-password', 'setup-confirm-password'].map((id) => {
    const input = document.getElementById(id);
    if (!(input instanceof HTMLInputElement)) return { id, found: false };
    const style = getComputedStyle(input);
    const placeholderStyle = getComputedStyle(input, '::placeholder');
    const rect = input.getBoundingClientRect();
    return {
      id,
      found: true,
      color: style.color,
      webkitTextFillColor: style.webkitTextFillColor,
      placeholderColor: placeholderStyle.color,
      backgroundColor: style.backgroundColor,
      width: rect.width,
      height: rect.height,
    };
  });
  const iconMetrics = (selector) => Array.from(document.querySelectorAll(selector)).map((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      color: style.color,
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      width: rect.width,
      height: rect.height,
    };
  });
  const scroller = document.querySelector('[data-ui-initial-setup-scroll="true"]');
  const scrollerStyle = scroller ? getComputedStyle(scroller) : null;
  const scrollerRect = scroller?.getBoundingClientRect();
  const primary = buttonMetrics('ایجاد مدیر اصلی');
  return {
    ready: Boolean(scroller && fields.every((field) => field.found) && primary.found),
    htmlDark: document.documentElement.classList.contains('dark'),
    fields,
    leadingIcons: iconMetrics('.app-form-field__leading-icon'),
    passwordToggles: iconMetrics('.app-password-visibility-button'),
    buttons: [buttonMetrics('بازگشت'), primary],
    scroll: {
      found: Boolean(scroller),
      overflowY: scrollerStyle?.overflowY || '',
      scrollHeight: scroller?.scrollHeight || 0,
      clientHeight: scroller?.clientHeight || 0,
      scrollTop: scroller?.scrollTop || 0,
      top: scrollerRect?.top || 0,
      bottom: scrollerRect?.bottom || 0,
      viewportContained: Boolean(scrollerRect && scrollerRect.top >= -1 && scrollerRect.bottom <= innerHeight + 1),
      nestedScrollFree: Boolean(scrollerStyle
        && !/auto|scroll/.test(scrollerStyle.overflowY)
        && (scroller?.scrollHeight || 0) <= (scroller?.clientHeight || 0) + 1),
      primaryReachable: Boolean(primary.found && primary.contained && scrollerRect && document.querySelector('#setup-confirm-password')),
    },
    page: {
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      scrollTop: window.scrollY,
    },
    documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
});

const collectDialogMetrics = (page, expectedTitle, actionLabels) => page.evaluate(({ title, labels }) => {
  const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const dialog = Array.from(document.querySelectorAll('[role="dialog"]')).find((candidate) => {
    const labelledBy = candidate.getAttribute('aria-labelledby');
    const titleElement = labelledBy ? document.getElementById(labelledBy) : null;
    return normalize(titleElement?.textContent) === title;
  });
  const buttonMetrics = (label) => {
    const element = dialog
      ? Array.from(dialog.querySelectorAll('button')).find((button) => normalize(button.textContent) === label)
      : null;
    if (!element) return { label, found: false };
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      label,
      found: true,
      disabled: element.disabled,
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      color: style.color,
      borderColor: style.borderColor,
      minHeight: style.minHeight,
      cssHeight: style.height,
      uxButtonHeight: style.getPropertyValue('--ux-btn-h').trim(),
      commandHeight: style.getPropertyValue('--app-command-height-md').trim(),
      className: element.className,
      width: rect.width,
      height: rect.height,
    };
  };
  const rect = dialog?.getBoundingClientRect();
  const style = dialog ? getComputedStyle(dialog) : null;
  const labelledBy = dialog?.getAttribute('aria-labelledby');
  const titleElement = labelledBy ? document.getElementById(labelledBy) : null;
  const titleStyle = titleElement ? getComputedStyle(titleElement) : null;
  const fields = dialog ? Array.from(dialog.querySelectorAll('input')).map((input) => {
    const inputRect = input.getBoundingClientRect();
    const inputStyle = getComputedStyle(input);
    return {
      name: input.name,
      type: input.type,
      color: inputStyle.color,
      backgroundColor: inputStyle.backgroundColor,
      height: inputRect.height,
      width: inputRect.width,
    };
  }) : [];
  return {
    ready: Boolean(dialog && rect && titleElement),
    title: normalize(titleElement?.textContent),
    variant: dialog?.getAttribute('data-dialog-variant') || '',
    tone: dialog?.getAttribute('data-modal-tone') || '',
    htmlDark: document.documentElement.classList.contains('dark'),
    panel: {
      backgroundColor: style?.backgroundColor || '',
      backgroundImage: style?.backgroundImage || 'none',
      color: style?.color || '',
      borderColor: style?.borderColor || '',
      transform: style?.transform || 'none',
      width: rect?.width || 0,
      height: rect?.height || 0,
      contained: Boolean(rect && rect.left >= -1 && rect.right <= innerWidth + 1 && rect.top >= -1 && rect.bottom <= innerHeight + 1),
      horizontalOverflow: Boolean(dialog && dialog.scrollWidth > dialog.clientWidth + 1),
    },
    titleColor: titleStyle?.color || '',
    buttons: labels.map(buttonMetrics),
    fields,
    bodyScrollLocked: document.body.style.overflow === 'hidden',
    documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
}, { title: expectedTitle, labels: actionLabels });

const collectAvatarCropMetrics = (page) => page.evaluate(() => {
  const dialog = document.querySelector('[data-avatar-crop-dialog="true"]')?.closest('[role="dialog"]');
  const body = dialog?.querySelector('.kourosh-modal__body');
  const stage = dialog?.querySelector('[data-avatar-crop-stage="true"]');
  const bodyStyle = body ? getComputedStyle(body) : null;
  const stageRect = stage?.getBoundingClientRect();
  const panelRect = dialog?.getBoundingClientRect();
  return {
    ready: Boolean(dialog && body && stage && stageRect),
    stage: {
      width: stageRect?.width || 0,
      height: stageRect?.height || 0,
      contained: Boolean(stageRect && panelRect
        && stageRect.left >= panelRect.left - 1
        && stageRect.right <= panelRect.right + 1
        && stageRect.top >= panelRect.top - 1
        && stageRect.bottom <= panelRect.bottom + 1),
    },
    body: {
      overflowX: bodyStyle?.overflowX || '',
      overflowY: bodyStyle?.overflowY || '',
      horizontalOverflow: Boolean(body && body.scrollWidth > body.clientWidth + 1),
      verticalOverflow: Boolean(body && body.scrollHeight > body.clientHeight + 1),
      scrollHeight: body?.scrollHeight || 0,
      clientHeight: body?.clientHeight || 0,
    },
  };
});

const collectRestoreModalMetrics = (page) => page.evaluate(() => {
  const button = document.querySelector('button[data-loading-contract="canonical-v2"]');
  const content = button?.querySelector(':scope > .ux-btn__content--state')
    || button?.querySelector('.ux-btn__content--state');
  const icon = content?.querySelector('.ux-btn__state-icon');
  const spinner = content?.querySelector('.ux-btn__state-spinner');
  const copy = content?.querySelector('.ux-btn__state-copy');
  const main = content?.querySelector('.ux-btn__state-main');
  const hint = content?.querySelector('.ux-btn__state-hint');
  const track = content?.querySelector('.ux-btn__loading-track');
  const runner = track?.querySelector('.ux-btn__loading-runner');
  const dialog = button?.closest('[role="dialog"]');
  const modalBody = dialog?.querySelector('.kourosh-modal__body');
  const actionHost = button?.parentElement;
  const titleId = dialog?.getAttribute('aria-labelledby');
  const title = titleId ? document.getElementById(titleId) : null;
  const rect = button?.getBoundingClientRect();
  const mainRect = main?.getBoundingClientRect();
  const hintRect = hint?.getBoundingClientRect();
  const trackRect = track?.getBoundingClientRect();
  const dialogRect = dialog?.getBoundingClientRect();
  const actionRect = actionHost?.getBoundingClientRect();
  const style = button ? getComputedStyle(button) : null;
  const spinnerStyle = spinner ? getComputedStyle(spinner) : null;
  const trackStyle = track ? getComputedStyle(track) : null;
  const withinButton = (child) => !child || !rect || (
    child.left >= rect.left - 1
    && child.right <= rect.right + 1
    && child.top >= rect.top - 1
    && child.bottom <= rect.bottom + 1
  );
  return {
    ready: Boolean(dialog && modalBody && actionHost && rect && content),
    title: title?.textContent?.replace(/\s+/g, ' ').trim() || '',
    contract: button?.getAttribute('data-loading-contract') || '',
    layout: button?.getAttribute('data-loading-layout') || '',
    htmlDark: document.documentElement.classList.contains('dark'),
    palette: document.querySelector('[data-qa-palette]')?.getAttribute('data-qa-palette') || '',
    theme: document.querySelector('[data-qa-theme]')?.getAttribute('data-qa-theme') || '',
    button: rect ? { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height } : null,
    color: style?.color || '',
    backgroundColor: style?.backgroundColor || '',
    backgroundImage: style?.backgroundImage || 'none',
    spinnerAnimationName: spinnerStyle?.animationName || '',
    stateNodes: {
      content: Boolean(content), icon: Boolean(icon), spinner: Boolean(spinner), copy: Boolean(copy),
      main: Boolean(main), hint: Boolean(hint), track: Boolean(track), runner: Boolean(runner),
    },
    selectedVisibleStateTree: Boolean(content && copy && main && track && !content.closest('.ux-btn__intrinsic-measure')),
    mainInside: withinButton(mainRect),
    hintInside: withinButton(hintRect),
    trackInside: withinButton(trackRect),
    trackWidth: trackRect?.width || 0,
    trackHeight: trackRect?.height || 0,
    trackBackground: trackStyle?.backgroundColor || '',
    modal: {
      panelContained: Boolean(dialogRect
        && dialogRect.left >= -1 && dialogRect.right <= innerWidth + 1
        && dialogRect.top >= -1 && dialogRect.bottom <= innerHeight + 1),
      panelHorizontalOverflow: Boolean(dialog && dialog.scrollWidth > dialog.clientWidth + 1),
      bodyHorizontalOverflow: Boolean(modalBody && modalBody.scrollWidth > modalBody.clientWidth + 1),
      actionsHorizontalOverflow: Boolean(actionHost && actionHost.scrollWidth > actionHost.clientWidth + 1),
      buttonInsideActions: Boolean(rect && actionRect
        && rect.left >= actionRect.left - 1 && rect.right <= actionRect.right + 1),
    },
    bodyScrollLocked: document.body.style.overflow === 'hidden',
    documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
});

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

const writeDimensionMismatchDiff = (reference, current) => {
  const width = Math.max(reference.width, current.width);
  const height = Math.max(reference.height, current.height);
  const output = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const target = (y * width + x) * 4;
      const inReference = x < reference.width && y < reference.height;
      const inCurrent = x < current.width && y < current.height;
      output.data[target] = inCurrent ? 255 : 104;
      output.data[target + 1] = inReference && inCurrent ? 0 : 32;
      output.data[target + 2] = inReference ? 255 : 104;
      output.data[target + 3] = 255;
    }
  }
  return output;
};

const captureAndCompare = async (page, slug) => {
  const currentBuffer = await page.screenshot({ fullPage: true, type: 'png' });
  const baselinePath = path.join(baselineDir, `${slug}.png`);
  const screenshot = skipScreenshots ? null : `screenshots/${slug}.png`;
  if (screenshot) fs.writeFileSync(path.join(outputDir, screenshot), currentBuffer);

  const shouldUpdateBaseline = updateBaselines || (updateRestoreBaselines && slug.startsWith('restore-modal-'));
  if (shouldUpdateBaseline) fs.writeFileSync(baselinePath, currentBuffer);
  if (!fs.existsSync(baselinePath)) {
    return {
      status: 'missing',
      passed: false,
      baseline: null,
      screenshot,
      diff: null,
      currentSha256: sha256(currentBuffer),
      message: `Baseline is missing: ${path.relative(root, baselinePath)}`,
    };
  }

  const baselineBuffer = fs.readFileSync(baselinePath);
  const baseline = `references/${slug}.png`;
  fs.copyFileSync(baselinePath, path.join(outputDir, baseline));
  const referencePng = PNG.sync.read(baselineBuffer);
  const currentPng = PNG.sync.read(currentBuffer);
  const dimensionsMatch = referencePng.width === currentPng.width && referencePng.height === currentPng.height;
  const totalPixels = Math.max(referencePng.width * referencePng.height, currentPng.width * currentPng.height);
  let diffPixels;
  let diffPng;
  if (dimensionsMatch) {
    diffPng = new PNG({ width: referencePng.width, height: referencePng.height });
    diffPixels = pixelmatch(referencePng.data, currentPng.data, diffPng.data, referencePng.width, referencePng.height, {
      threshold: pixelPolicy.perPixelThreshold,
      includeAA: pixelPolicy.includeAntiAliasing,
      diffColor: [220, 38, 38],
      aaColor: [245, 158, 11],
    });
  } else {
    diffPng = writeDimensionMismatchDiff(referencePng, currentPng);
    diffPixels = totalPixels;
  }
  const diffRatio = totalPixels > 0 ? diffPixels / totalPixels : 0;
  const passed = dimensionsMatch && diffRatio <= pixelPolicy.maxDiffRatio;
  const diff = diffPixels > 0 ? `diffs/${slug}.diff.png` : null;
  if (diff) fs.writeFileSync(path.join(outputDir, diff), PNG.sync.write(diffPng));
  return {
    status: shouldUpdateBaseline ? 'updated' : passed ? 'matched' : 'changed',
    passed: shouldUpdateBaseline || passed,
    baseline,
    screenshot,
    diff,
    dimensionsMatch,
    referenceSize: { width: referencePng.width, height: referencePng.height },
    currentSize: { width: currentPng.width, height: currentPng.height },
    diffPixels,
    totalPixels,
    diffRatio,
    diffPercent: Number((diffRatio * 100).toFixed(4)),
    allowedDiffPercent: pixelPolicy.maxDiffRatio * 100,
    baselineSha256: sha256(baselineBuffer),
    currentSha256: sha256(currentBuffer),
  };
};

const appendResult = async (page, slug, result) => {
  const visualComparison = await captureAndCompare(page, slug);
  result.checks.pixelBaselineWithinTolerance = visualComparison.passed;
  results.push({
    ...result,
    passed: Object.values(result.checks).every(Boolean),
    screenshot: visualComparison.screenshot,
    baseline: visualComparison.baseline,
    diff: visualComparison.diff,
    visualComparison,
  });
};

let browser;
const results = [];
try {
  await waitForPreview();
  const [{ default: puppeteer }, browserExecutable] = await Promise.all([
    import('puppeteer-core'),
    resolvePuppeteerBrowserExecutable({ root }),
  ]);
  console.log(`[browser] ${browserExecutable.source}: ${browserExecutable.executablePath}`);
  browser = await puppeteer.launch({
    executablePath: browserExecutable.executablePath,
    args: browserLaunchArgs(),
    headless: true,
  });

  for (const theme of themes) {
    for (const viewport of viewports) {
      for (const surface of surfaces) {
        const slug = `${surface.key}-${theme.key}-${viewport.key}`;
        const page = await browser.newPage();
        const pageErrors = [];
        page.on('pageerror', (error) => pageErrors.push(error.message));
        await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 });
        await configurePage(page, theme, surface);

        try {
          await page.goto(`${origin}/?theme-visual=${slug}#/${surface.route}`, { waitUntil: 'networkidle0', timeout: 60_000 });
          if (surface.key === 'login') {
            await page.waitForSelector('[data-ui-login-primary-action="gold"]', { visible: true, timeout: 25_000 });
            await freezeVisualMotion(page);
            await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            const metrics = await collectLoginMetrics(page);
            const textContrast = contrast(metrics.color, 'rgb(90, 67, 45)');
            const checks = {
              surfaceReady: metrics.ready,
              dedicatedGoldContract: metrics.contract === 'gold',
              matteGoldGradient: /linear-gradient/i.test(metrics.backgroundImage)
                && /rgb\(90, 67, 45\)/.test(metrics.backgroundImage)
                && /rgb\(155, 118, 75\)/.test(metrics.backgroundImage)
                && /rgb\(85, 62, 42\)/.test(metrics.backgroundImage),
              lightGoldText: /rgb\(243, 226, 191\)/.test(metrics.color),
              readableText: textContrast !== null && textContrast >= 4.5,
              touchTarget: metrics.height >= 44,
              viewportContained: metrics.contained,
              noHorizontalOverflow: !metrics.documentOverflow,
              noPageErrors: pageErrors.length === 0,
            };
            await appendResult(page, slug, { surface: surface.key, surfaceLabel: surface.label, theme: theme.key, themeLabel: theme.label, viewport: viewport.key, viewportLabel: viewport.label, metrics, checks, pageErrors });
          } else if (surface.key === 'profile') {
            await page.waitForFunction((labels) => {
              const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
              const visible = Array.from(document.querySelectorAll('button')).filter((button) => button.getBoundingClientRect().width > 0);
              return labels.every((label) => visible.some((button) => normalize(button.textContent) === label));
            }, { timeout: 30_000 }, profileButtonLabels);
            await freezeVisualMotion(page);
            await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            const metrics = await collectProfileMetrics(page, profileButtonLabels);
            const decoratedButtons = metrics.buttons.map((button) => ({
              ...button,
              backgroundLuminance: button.found ? luminance(button.backgroundColor) : null,
              textLuminance: button.found ? luminance(button.color) : null,
              contrast: button.found ? contrast(button.color, button.backgroundColor) : null,
            }));
            metrics.buttons = decoratedButtons;
            const allFound = decoratedButtons.every((button) => button.found);
            const allTouchSafe = decoratedButtons.every((button) => !button.found || button.height >= 40);
            const darkButtons = decoratedButtons.every((button) => !button.found || (button.backgroundLuminance !== null && button.backgroundLuminance <= 0.13));
            const lightText = decoratedButtons.every((button) => !button.found || (button.textLuminance !== null && button.textLuminance >= (button.disabled ? 0.14 : 0.24)));
            const readableButtons = decoratedButtons.every((button) => !button.found || button.backgroundImage !== 'none' || (button.contrast !== null && button.contrast >= (button.disabled ? 3 : 4.5)));
            const darkButtonsDropLightGradient = decoratedButtons.every((button) => !button.found || button.backgroundImage === 'none');
            const checks = {
              allEightActionsFound: allFound && decoratedButtons.length === profileButtonLabels.length,
              resolvedThemeMatches: metrics.htmlDark === theme.expectDark,
              darkActionsStayDark: !theme.expectDark || darkButtons,
              darkActionsDropLightGradient: !theme.expectDark || darkButtonsDropLightGradient,
              darkActionsUseLightText: !theme.expectDark || lightText,
              readableButtonContrast: readableButtons,
              touchTargets: allTouchSafe,
              noHorizontalOverflow: !metrics.documentOverflow,
              noPageErrors: pageErrors.length === 0,
            };
            await appendResult(page, slug, { surface: surface.key, surfaceLabel: surface.label, theme: theme.key, themeLabel: theme.label, viewport: viewport.key, viewportLabel: viewport.label, metrics, checks, pageErrors });
          } else if (surface.key === 'setup') {
            await page.waitForSelector('[data-ui-initial-setup-scroll="true"]', { visible: true, timeout: 25_000 });
            await page.evaluate(() => {
              const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
              const start = Array.from(document.querySelectorAll('button')).find((button) => normalize(button.textContent) === 'شروع راه‌اندازی');
              if (!(start instanceof HTMLButtonElement)) throw new Error('Initial setup start action was not found.');
              start.click();
            });
            await page.waitForSelector('#setup-confirm-password', { visible: true, timeout: 25_000 });
            await page.type('#setup-username', 'qa-admin');
            await page.type('#setup-password', 'Secure1234');
            await page.type('#setup-confirm-password', 'Secure1234');
            await page.evaluate(() => {
              const scroller = document.querySelector('[data-ui-initial-setup-scroll="true"]');
              if (scroller) scroller.scrollTop = scroller.scrollHeight;
              window.scrollTo(0, document.documentElement.scrollHeight);
            });
            await freezeVisualMotion(page);
            await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            const metrics = await collectSetupMetrics(page);
            metrics.buttons = metrics.buttons.map((button) => ({
              ...button,
              backgroundLuminance: button.found ? luminance(button.backgroundColor) : null,
              textLuminance: button.found ? luminance(button.color) : null,
              contrast: button.found ? contrast(button.color, button.backgroundColor) : null,
            }));
            const primary = metrics.buttons.find((button) => button.label === 'ایجاد مدیر اصلی');
            const controlsAreGold = metrics.fields.every((field) => field.found
              && /rgb\((216, 189, 137|226, 201, 149)\)/.test(field.webkitTextFillColor));
            const usernamePlaceholderIsGold = metrics.fields.some((field) => field.id === 'setup-username'
              && /rgba?\(183, 155, 106/.test(field.placeholderColor));
            const iconsStayUnboxed = [...metrics.leadingIcons, ...metrics.passwordToggles].every((icon) =>
              icon.backgroundImage === 'none' && /rgba\(0, 0, 0, 0\)/.test(icon.backgroundColor));
            const checks = {
              setupFormReady: metrics.ready,
              resolvedThemeMatches: metrics.htmlDark === theme.expectDark,
              threeGoldFields: metrics.fields.length === 3 && controlsAreGold,
              goldUsernamePlaceholder: usernamePlaceholderIsGold,
              goldIconsStayUnboxed: metrics.leadingIcons.length === 3 && metrics.passwordToggles.length === 2 && iconsStayUnboxed,
              matteGoldPrimary: Boolean(primary?.found
                && /linear-gradient/i.test(primary.backgroundImage)
                && /rgb\(90, 67, 45\)/.test(primary.backgroundImage)
                && /rgb\(155, 118, 75\)/.test(primary.backgroundImage)
                && /rgb\(85, 62, 42\)/.test(primary.backgroundImage)),
              lightGoldPrimaryText: Boolean(primary?.found && /rgb\(243, 226, 191\)/.test(primary.color)),
              actionTouchTargets: metrics.buttons.every((button) => button.found && button.height >= 44),
              noNestedSetupScroller: metrics.scroll.found && metrics.scroll.nestedScrollFree,
              finalActionReachable: metrics.scroll.primaryReachable,
              noHorizontalOverflow: !metrics.documentOverflow,
              noPageErrors: pageErrors.length === 0,
            };
            await appendResult(page, slug, { surface: surface.key, surfaceLabel: surface.label, theme: theme.key, themeLabel: theme.label, viewport: viewport.key, viewportLabel: viewport.label, metrics, checks, pageErrors });
          } else if (surface.key === 'avatar-crop-dialog') {
            await page.waitForSelector('input[type="file"][accept*="image/webp"]', { timeout: 30_000 });
            const avatarInput = await page.$('input[type="file"][accept*="image/webp"]');
            if (!avatarInput) throw new Error('Avatar file input was not found.');
            await avatarInput.uploadFile(qaAvatarPath);
            await page.waitForSelector('[data-avatar-crop-dialog="true"]', { visible: true, timeout: 25_000 });
            await page.waitForFunction(() => {
              const image = document.querySelector('[data-avatar-crop-stage="true"] img');
              const dialog = document.querySelector('[data-avatar-crop-dialog="true"]')?.closest('[role="dialog"]');
              return image?.naturalWidth > 0 && dialog && Number(getComputedStyle(dialog).opacity) >= 0.999;
            }, { timeout: 25_000 });
            await page.waitForFunction(() => {
              const dialog = document.querySelector('[data-avatar-crop-dialog="true"]')?.closest('[role="dialog"]');
              if (!dialog) return false;
              const transform = getComputedStyle(dialog).transform;
              if (transform === 'none') return true;
              const matrix = new DOMMatrixReadOnly(transform);
              return Math.abs(matrix.a - 1) < 0.0005
                && Math.abs(matrix.d - 1) < 0.0005
                && Math.abs(matrix.e) < 0.05
                && Math.abs(matrix.f) < 0.05;
            }, { timeout: 3_000 });
            await freezeVisualMotion(page);
            await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            const actionLabels = ['بازنشانی', 'چرخش ۹۰ درجه', 'قرینه افقی', 'لغو', 'اعمال برش'];
            const metrics = await collectDialogMetrics(page, 'تنظیم تصویر پروفایل', actionLabels);
            metrics.crop = await collectAvatarCropMetrics(page);
            metrics.panel.backgroundLuminance = luminance(metrics.panel.backgroundColor);
            metrics.panel.textLuminance = luminance(metrics.panel.color);
            metrics.buttons = metrics.buttons.map((button) => ({
              ...button,
              backgroundLuminance: button.found ? luminance(button.backgroundColor) : null,
              textLuminance: button.found ? luminance(button.color) : null,
              contrast: button.found ? contrast(button.color, button.backgroundColor) : null,
            }));
            const darkButtons = metrics.buttons.every((button) => !button.found
              || (button.backgroundLuminance !== null && button.backgroundLuminance <= 0.13));
            const darkButtonsDropGradient = metrics.buttons.every((button) => !button.found || button.backgroundImage === 'none');
            const lightButtonText = metrics.buttons.every((button) => !button.found
              || (button.textLuminance !== null && button.textLuminance >= (button.disabled ? 0.14 : 0.24)));
            const checks = {
              dialogReady: metrics.ready && metrics.crop.ready,
              resolvedThemeMatches: metrics.htmlDark === theme.expectDark,
              allFiveActionsFound: metrics.buttons.length === actionLabels.length && metrics.buttons.every((button) => button.found),
              actionTouchTargets: metrics.buttons.every((button) => !button.found || button.height >= 43.99),
              darkActionsStayDark: !theme.expectDark || darkButtons,
              darkActionsDropLightGradient: !theme.expectDark || darkButtonsDropGradient,
              darkActionsUseLightText: !theme.expectDark || lightButtonText,
              cropStageUsable: metrics.crop.stage.width >= 140 && metrics.crop.stage.height >= 140 && metrics.crop.stage.contained,
              noDialogHorizontalOverflow: !metrics.panel.horizontalOverflow && !metrics.crop.body.horizontalOverflow,
              avoidNestedVerticalScroll: !metrics.crop.body.verticalOverflow,
              viewportContained: metrics.panel.contained,
              bodyScrollLocked: metrics.bodyScrollLocked,
              noHorizontalOverflow: !metrics.documentOverflow,
              noPageErrors: pageErrors.length === 0,
            };
            await appendResult(page, slug, { surface: surface.key, surfaceLabel: surface.label, theme: theme.key, themeLabel: theme.label, viewport: viewport.key, viewportLabel: viewport.label, metrics, checks, pageErrors });
          } else {
            const dialogConfig = surface.key === 'password-dialog'
              ? { trigger: 'امنیت و تغییر رمز', title: 'تغییر کلمه عبور', actions: ['انصراف', 'ثبت اطلاعات تغییرات'], expectedFields: 3, expectedVariant: 'operational', expectedTone: 'neutral' }
              : { trigger: 'حذف تصویر پروفایل', title: 'حذف تصویر پروفایل', actions: ['انصراف', 'حذف تصویر'], expectedFields: 0, expectedVariant: 'compact', expectedTone: 'danger' };
            await page.waitForFunction((label) => {
              const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
              return Array.from(document.querySelectorAll('button')).some((button) => normalize(button.textContent) === label && !button.disabled);
            }, { timeout: 30_000 }, dialogConfig.trigger);
            await page.evaluate((label) => {
              const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
              const trigger = Array.from(document.querySelectorAll('button')).find((button) => normalize(button.textContent) === label);
              if (!(trigger instanceof HTMLButtonElement)) throw new Error(`Dialog trigger was not found: ${label}`);
              trigger.click();
            }, dialogConfig.trigger);
            await page.waitForFunction((title) => Array.from(document.querySelectorAll('[role="dialog"]')).some((dialog) => {
              const titleId = dialog.getAttribute('aria-labelledby');
              return titleId && document.getElementById(titleId)?.textContent?.replace(/\s+/g, ' ').trim() === title;
            }), { timeout: 25_000 }, dialogConfig.title);
            await page.waitForFunction((title) => {
              const dialog = Array.from(document.querySelectorAll('[role="dialog"]')).find((candidate) => {
                const titleId = candidate.getAttribute('aria-labelledby');
                return titleId && document.getElementById(titleId)?.textContent?.replace(/\s+/g, ' ').trim() === title;
              });
              if (!dialog || Number(getComputedStyle(dialog).opacity) < 0.999) return false;
              const transform = getComputedStyle(dialog).transform;
              if (transform === 'none') return true;
              const matrix = new DOMMatrixReadOnly(transform);
              return Math.abs(matrix.a - 1) < 0.0005
                && Math.abs(matrix.d - 1) < 0.0005
                && Math.abs(matrix.e) < 0.05
                && Math.abs(matrix.f) < 0.05;
            }, { timeout: 3_000 }, dialogConfig.title);
            await freezeVisualMotion(page);
            await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            const metrics = await collectDialogMetrics(page, dialogConfig.title, dialogConfig.actions);
            metrics.panel.backgroundLuminance = luminance(metrics.panel.backgroundColor);
            metrics.panel.textLuminance = luminance(metrics.panel.color);
            metrics.buttons = metrics.buttons.map((button) => ({
              ...button,
              backgroundLuminance: button.found ? luminance(button.backgroundColor) : null,
              textLuminance: button.found ? luminance(button.color) : null,
              contrast: button.found ? contrast(button.color, button.backgroundColor) : null,
              gradientContrast: button.found && button.backgroundImage !== 'none'
                ? contrast(button.color, button.backgroundImage.match(/rgb\([^)]*\)/)?.[0] || '')
                : null,
            }));
            const readableActions = metrics.buttons.every((button) => !button.found || (
              button.backgroundImage !== 'none'
                ? (button.textLuminance !== null && button.textLuminance >= 0.18)
                  || (button.gradientContrast !== null && button.gradientContrast >= 4.5)
                : button.contrast !== null && button.contrast >= 3
            ));
            const checks = {
              dialogReady: metrics.ready && metrics.title === dialogConfig.title,
              resolvedThemeMatches: metrics.htmlDark === theme.expectDark,
              canonicalVariant: metrics.variant === dialogConfig.expectedVariant,
              semanticTone: metrics.tone === dialogConfig.expectedTone,
              expectedFields: metrics.fields.length === dialogConfig.expectedFields,
              fieldTouchTargets: metrics.fields.every((field) => field.height >= 44),
              allActionsFound: metrics.buttons.length === dialogConfig.actions.length && metrics.buttons.every((button) => button.found),
              actionTouchTargets: metrics.buttons.every((button) => !button.found || (Number.parseFloat(button.minHeight) >= 44 && button.height >= 43.99)),
              dialogMotionSettled: metrics.panel.transform === 'none' || metrics.panel.transform === 'matrix(1, 0, 0, 1, 0, 0)',
              readableActions,
              darkSurfaceStaysDark: !theme.expectDark || (metrics.panel.backgroundLuminance !== null && metrics.panel.backgroundLuminance <= 0.18),
              darkSurfaceUsesLightText: !theme.expectDark || (metrics.panel.textLuminance !== null && metrics.panel.textLuminance >= 0.5),
              viewportContained: metrics.panel.contained,
              noDialogOverflow: !metrics.panel.horizontalOverflow,
              bodyScrollLocked: metrics.bodyScrollLocked,
              noHorizontalOverflow: !metrics.documentOverflow,
              noPageErrors: pageErrors.length === 0,
            };
            await appendResult(page, slug, { surface: surface.key, surfaceLabel: surface.label, theme: theme.key, themeLabel: theme.label, viewport: viewport.key, viewportLabel: viewport.label, metrics, checks, pageErrors });
          }
        } catch (error) {
          results.push({
            surface: surface.key,
            surfaceLabel: surface.label,
            theme: theme.key,
            themeLabel: theme.label,
            viewport: viewport.key,
            viewportLabel: viewport.label,
            metrics: null,
            checks: {},
            passed: false,
            screenshot: null,
            pageErrors,
            error: error instanceof Error ? error.stack || error.message : String(error),
          });
        } finally {
          await page.close().catch(() => {});
        }
        const latest = results.at(-1);
        process.stdout.write(`${latest?.passed ? 'PASS' : 'FAIL'} ${slug}\n`);
      }
    }
  }

  for (const palette of restorePalettes) {
    for (const theme of restoreThemes) {
      for (const viewport of restoreViewports) {
        const slug = `restore-modal-${palette}-${theme.key}-${viewport.key}`;
        const page = await browser.newPage();
        const pageErrors = [];
        page.on('pageerror', (error) => pageErrors.push(error.message));
        await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 });
        await configureRestorePage(page, theme, palette);

        try {
          await page.goto(`${origin}/?theme-visual=${slug}#/__qa/loading-buttons?scenario=restore&palette=${palette}&theme=${theme.key}`, { waitUntil: 'networkidle0', timeout: 60_000 });
          await page.waitForSelector('[data-qa-ready="true"]', { timeout: 25_000 });
          await page.waitForSelector('button[data-loading-contract="canonical-v2"]', { visible: true, timeout: 25_000 });
          await page.waitForFunction(() => {
            const dialog = document.querySelector('button[data-loading-contract="canonical-v2"]')?.closest('[role="dialog"]');
            if (!dialog || Number(getComputedStyle(dialog).opacity) < 0.999) return false;
            const transform = getComputedStyle(dialog).transform;
            if (transform === 'none') return true;
            const matrix = new DOMMatrixReadOnly(transform);
            return Math.abs(matrix.a - 1) < 0.0005
              && Math.abs(matrix.d - 1) < 0.0005
              && Math.abs(matrix.e) < 0.05
              && Math.abs(matrix.f) < 0.05;
          }, { timeout: 3_000 });
          await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

          const metrics = await collectRestoreModalMetrics(page);
          const textContrast = contrast(metrics.color, metrics.backgroundColor);
          const checks = {
            restoreModalReady: metrics.ready && metrics.title === 'تأیید بازیابی اطلاعات',
            paletteApplied: metrics.palette === palette,
            resolvedThemeMatches: metrics.theme === theme.key && metrics.htmlDark === theme.expectDark,
            canonicalLoadingContract: metrics.contract === 'canonical-v2' && metrics.layout === 'adaptive',
            completeVisibleState: metrics.selectedVisibleStateTree
              && Object.entries(metrics.stateNodes).filter(([key]) => key !== 'hint').every(([, value]) => value),
            actionHeightControlled: Boolean(metrics.button && metrics.button.height >= 47 && metrics.button.height <= 93),
            activeStateMotion: metrics.stateNodes.spinner && metrics.spinnerAnimationName !== 'none',
            textInsideAction: metrics.mainInside && metrics.hintInside,
            progressInsideAction: metrics.trackInside && metrics.trackWidth >= 80 && metrics.trackHeight >= 4,
            readableAction: textContrast === null || textContrast >= 4.5 || metrics.backgroundImage !== 'none',
            panelInsideViewport: metrics.modal.panelContained,
            noPanelHorizontalOverflow: !metrics.modal.panelHorizontalOverflow,
            noBodyHorizontalOverflow: !metrics.modal.bodyHorizontalOverflow,
            noActionRowHorizontalOverflow: !metrics.modal.actionsHorizontalOverflow,
            actionInsidePanel: metrics.modal.buttonInsideActions,
            bodyScrollLocked: metrics.bodyScrollLocked,
            noHorizontalOverflow: !metrics.documentOverflow,
            noPageErrors: pageErrors.length === 0,
          };

          await freezeVisualMotion(page);
          await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          await appendResult(page, slug, {
            surface: 'restore-modal',
            surfaceLabel: `مودال ریستور · ${palette}`,
            palette,
            theme: theme.key,
            themeLabel: theme.label,
            viewport: viewport.key,
            viewportLabel: viewport.label,
            metrics: { ...metrics, contrast: textContrast },
            checks,
            pageErrors,
          });
        } catch (error) {
          results.push({
            surface: 'restore-modal',
            surfaceLabel: `مودال ریستور · ${palette}`,
            palette,
            theme: theme.key,
            themeLabel: theme.label,
            viewport: viewport.key,
            viewportLabel: viewport.label,
            metrics: null,
            checks: {},
            passed: false,
            screenshot: null,
            pageErrors,
            error: error instanceof Error ? error.stack || error.message : String(error),
          });
        } finally {
          await page.close().catch(() => {});
        }
        const latest = results.at(-1);
        process.stdout.write(`${latest?.passed ? 'PASS' : 'FAIL'} ${slug}\n`);
      }
    }
  }
} finally {
  if (browser) await browser.close().catch(() => {});
  preview.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => preview.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
  if (preview.exitCode === null) preview.kill('SIGKILL');
  fs.rmSync(runtimeDir, { recursive: true, force: true });
}

const failures = results.filter((result) => !result.passed);
const resultSlug = (result) => result.surface === 'restore-modal'
  ? `restore-modal-${result.palette}-${result.theme}-${result.viewport}`
  : `${result.surface}-${result.theme}-${result.viewport}`;
const report = {
  generatedAt: new Date().toISOString(),
  mode: updateBaselines ? 'update-baselines' : updateRestoreBaselines ? 'update-restore-baselines' : 'compare',
  pixelPolicy,
  matrix: {
    authProfile: { surfaces: surfaces.length, themes: themes.length, viewports: viewports.length, total: surfaces.length * themes.length * viewports.length },
    restoreModal: { palettes: restorePalettes.length, themes: restoreThemes.length, viewports: restoreViewports.length, total: restorePalettes.length * restoreThemes.length * restoreViewports.length },
    total: results.length,
  },
  summary: { passed: results.length - failures.length, failed: failures.length },
  results,
};
fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

if (updateBaselines || updateRestoreBaselines) {
  const baselineEntries = results.map((result) => ({
    slug: resultSlug(result),
    sha256: result.visualComparison?.baselineSha256 || null,
    width: result.visualComparison?.referenceSize?.width || null,
    height: result.visualComparison?.referenceSize?.height || null,
  }));
  fs.writeFileSync(baselineManifestPath, `${JSON.stringify({
    schemaVersion: 1,
    matrix: report.matrix,
    pixelPolicy,
    entries: baselineEntries,
  }, null, 2)}\n`);
}

const cards = results.map((result) => {
  const visualLabel = escapeHtml(`${result.surfaceLabel || result.surface} ${result.themeLabel} ${result.viewportLabel}`);
  const beforeAfter = result.baseline && result.screenshot ? `
    <section class="compare" data-compare style="--split:50%">
      <img class="compare__reference" src="${escapeHtml(result.baseline)}" alt="مرجع ${visualLabel}">
      <img class="compare__current" src="${escapeHtml(result.screenshot)}" alt="خروجی فعلی ${visualLabel}">
      <span class="compare__divider" aria-hidden="true"></span>
      <label class="compare__control"><span>مرجع</span><input type="range" min="0" max="100" value="50" aria-label="مقایسه قبل و بعد ${visualLabel}"><output>۵۰٪</output><span>خروجی فعلی</span></label>
    </section>` : `
    <div class="visuals">
      ${result.baseline ? `<figure><figcaption>مرجع</figcaption><a href="${escapeHtml(result.baseline)}"><img src="${escapeHtml(result.baseline)}" alt="مرجع ${visualLabel}"></a></figure>` : ''}
      ${result.screenshot ? `<figure><figcaption>خروجی فعلی</figcaption><a href="${escapeHtml(result.screenshot)}"><img src="${escapeHtml(result.screenshot)}" alt="خروجی فعلی ${visualLabel}"></a></figure>` : ''}
    </div>`;
  return `
<article class="card ${result.passed ? 'pass' : 'fail'}" data-result-status="${result.passed ? 'pass' : 'fail'}">
  <header><strong>${escapeHtml(result.surfaceLabel || result.surface)} · ${escapeHtml(result.themeLabel)} · ${escapeHtml(result.viewportLabel)}</strong><span>${result.passed ? 'PASS' : 'FAIL'}</span></header>
  ${beforeAfter}
  ${result.diff ? `<figure class="diff"><figcaption>اختلاف · ${escapeHtml(result.visualComparison?.diffPercent ?? 0)}٪</figcaption><a href="${escapeHtml(result.diff)}"><img src="${escapeHtml(result.diff)}" alt="اختلاف ${visualLabel}"></a></figure>` : ''}
  <details><summary>جزئیات فنی</summary><pre>${escapeHtml(JSON.stringify({ checks: result.checks, metrics: result.metrics, error: result.error || null }, null, 2))}</pre></details>
</article>`;
}).join('');
const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>کنترل تصویری ورود، راه‌اندازی، پروفایل و ریستور</title><style>
*{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;margin:0;padding:20px;background:#f4f5f7;color:#15171a}.summary,.card{background:#fff;border:1px solid #d8dde5;border-radius:16px}.summary{padding:16px;margin-bottom:16px}.summary h1{margin-top:0}.toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.toolbar button{min-height:42px;padding:8px 14px;border:1px solid #cbd5e1;border-radius:12px;background:#fff;color:#0f172a;font:inherit;font-weight:700;cursor:pointer}.toolbar button[aria-pressed="true"]{border-color:#b91c1c;background:#fff1f2;color:#9f1239}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:16px}.card{min-width:0;overflow:hidden}.card header{display:flex;justify-content:space-between;gap:8px;padding:12px}.pass header span{color:#15803d}.fail header span{color:#b91c1c}.show-failures .card.pass{display:none}.visuals{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1px;background:#e5e7eb;border-block:1px solid #e5e7eb}.visuals figure,.diff{margin:0;background:#fff}.visuals figcaption,.diff figcaption{padding:8px;font-size:12px;font-weight:700}.card img{display:block;width:100%;height:auto}.compare{position:relative;overflow:hidden;background:#0f172a;direction:ltr}.compare>img{display:block;width:100%;height:auto}.compare__current{position:absolute;inset:0;clip-path:inset(0 calc(100% - var(--split)) 0 0)}.compare__divider{position:absolute;top:0;bottom:46px;left:var(--split);width:2px;background:#fff;box-shadow:0 0 0 1px rgba(15,23,42,.35);transform:translateX(-1px);pointer-events:none}.compare__control{position:absolute;inset:auto 0 0;display:grid;grid-template-columns:auto minmax(80px,1fr) auto auto;align-items:center;gap:8px;min-height:46px;padding:8px 10px;background:rgba(15,23,42,.88);color:#fff;direction:rtl;font-size:11px;font-weight:700}.compare__control input{width:100%;direction:ltr}.compare__control output{min-width:34px;text-align:center}.diff{border-top:1px solid #e5e7eb}.card details{border-top:1px solid #e5e7eb}.card summary{padding:12px;font-size:12px;font-weight:700;cursor:pointer}.card pre{direction:ltr;text-align:left;white-space:pre-wrap;overflow-wrap:anywhere;padding:12px;margin:0;font-size:11px}@media(max-width:520px){body{padding:10px}.compare__control{grid-template-columns:auto minmax(70px,1fr) auto}.compare__control output{display:none}}
</style></head><body><section class="summary"><h1>کنترل تصویری ورود، حساب اولیه، پروفایل و مودال ریستور کوروش</h1><p>${report.summary.passed} موفق از ${results.length}؛ ${report.summary.failed} خطا. آستانه مجاز اختلاف: ${pixelPolicy.maxDiffRatio * 100}٪.</p><div class="toolbar"><button id="failures-only" type="button" aria-pressed="false">فقط شکست‌ها</button><span id="visible-status">نمایش همه ${results.length} حالت</span></div></section><section class="grid">${cards}</section><script>
const failureToggle=document.getElementById('failures-only');const visibleStatus=document.getElementById('visible-status');failureToggle.addEventListener('click',()=>{const next=failureToggle.getAttribute('aria-pressed')!=='true';failureToggle.setAttribute('aria-pressed',String(next));document.body.classList.toggle('show-failures',next);visibleStatus.textContent=next?'نمایش ${report.summary.failed} شکست':'نمایش همه ${results.length} حالت';});document.querySelectorAll('[data-compare]').forEach((root)=>{const input=root.querySelector('input[type="range"]');const output=root.querySelector('output');input.addEventListener('input',()=>{root.style.setProperty('--split',input.value+'%');output.textContent=Number(input.value).toLocaleString('fa-IR')+'٪';});});
</script></body></html>`;
fs.writeFileSync(path.join(outputDir, 'index.html'), html);

console.log(`\nAuth/setup/profile/restore dialog visual regression: ${report.summary.passed}/${results.length} passed.`);
console.log(`Report: ${path.join(outputDir, 'index.html')}`);
assert.equal(failures.length, 0, `Auth/profile/restore theme visual regression failures:\n${failures.map((failure) => `${failure.surface}/${failure.palette || 'default'}/${failure.theme}/${failure.viewport}: ${failure.error || JSON.stringify(failure.checks)}`).join('\n')}`);
