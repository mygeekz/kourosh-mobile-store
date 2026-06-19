// contexts/StyleContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { deriveBrandTheme, normalizeStoreName, readStoredBranding, writeStoredBranding } from '../utils/branding';

export type SidebarVariant = 'classic' | 'pill';
export type ThemeMode = 'light' | 'dark' | 'system';
export type ButtonPreset = 'luxury' | 'classic' | 'ocean' | 'sunset' | 'mono';
export type ButtonShadow = 'soft' | 'medium' | 'strong';
export type ButtonMotion = 'calm' | 'balanced' | 'expressive';
export type ButtonIconMode = 'auto' | 'manual';
export type ButtonIconSide = 'start' | 'end';
export type UiDensity = 'compact' | 'comfortable';
export type FinanceTableDensity = 'comfortable' | 'compact' | 'ultra';

export type StyleState = {
  theme: ThemeMode;
  brandMode: 'auto' | 'custom';
  brandSource: string;

  /** 🎛️ پالت آماده برای حس «پولی» و یکپارچگی رنگ‌ها */
  palette: 'custom' | 'aurora' | 'ocean' | 'sunset' | 'classic';

  /** 🎨 رنگ برند (HSL) — با Tailwind به primary وصل شده */
  primaryHue: number;     // 0..360
  primaryS: number;       // 40..100 (%)
  primaryL: number;       // 30..70  (%)

  sidebarVariant: SidebarVariant;
  sidebarIconPx: number;       // 24..44
  sidebarPillWidthPx: number;  // 360..390
  showInkBar: boolean;
  buttonPreset: ButtonPreset;
  buttonRadiusPx: number;
  buttonShadow: ButtonShadow;
  buttonMotion: ButtonMotion;
  buttonIconMode: ButtonIconMode;
  buttonIconSide: ButtonIconSide;
  uiDensity: UiDensity;
  financeTableDensity: FinanceTableDensity;
  sidebarHoverHue: number;
  sidebarHoverS: number;
  sidebarHoverL: number;
};

type Ctx = {
  style: StyleState;
  setStyle: <K extends keyof StyleState>(k: K, v: StyleState[K]) => void;
  setMany: (patch: Partial<StyleState>) => void;
  resetStyle: () => void;

  // هِلپرها
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  computeSidebarWidthPx: () => number;

  // میان‌بر تغییر سریع رنگ برند
  setBrand: (h: number, s?: number, l?: number) => void;
  syncBrandFromStoreName: (storeName: string) => void;
};

const DEFAULTS: StyleState = {
  theme: 'system',
  palette: 'aurora',
  primaryHue: 258,
  primaryS: 90,
  primaryL: 50,
  sidebarVariant: 'pill',
  sidebarIconPx: 30,
  sidebarPillWidthPx: 372,
  showInkBar: true,
  buttonPreset: 'luxury',
  buttonRadiusPx: 18,
  buttonShadow: 'medium',
  buttonMotion: 'balanced',
  buttonIconMode: 'auto',
  buttonIconSide: 'start',
  uiDensity: 'compact',
  financeTableDensity: 'compact',
  sidebarHoverHue: 258,
  sidebarHoverS: 88,
  sidebarHoverL: 54,
  brandMode: 'auto',
  brandSource: normalizeStoreName(readStoredBranding()?.storeName || 'فروشگاه'),
};

const KEY = 'koroush.style.v1';
const StyleContext = createContext<Ctx | null>(null);

// ───────── Utilities
const clampInt = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

function readInitial(): StyleState {
  try {
    const raw = localStorage.getItem(KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<StyleState>) : {};
    const theme: ThemeMode =
      saved?.theme === 'light' || saved?.theme === 'dark' || saved?.theme === 'system'
        ? saved.theme
        : DEFAULTS.theme;

    const sidebarVariant: SidebarVariant =
      saved?.sidebarVariant === 'classic' || saved?.sidebarVariant === 'pill'
        ? saved.sidebarVariant
        : DEFAULTS.sidebarVariant;

    const palette: StyleState['palette'] =
      saved?.palette === 'aurora' || saved?.palette === 'ocean' || saved?.palette === 'sunset' || saved?.palette === 'classic' || saved?.palette === 'custom'
        ? saved.palette
        : DEFAULTS.palette;

    const buttonPreset: ButtonPreset =
      saved?.buttonPreset === 'luxury' || saved?.buttonPreset === 'classic' || saved?.buttonPreset === 'ocean' || saved?.buttonPreset === 'sunset' || saved?.buttonPreset === 'mono'
        ? saved.buttonPreset
        : DEFAULTS.buttonPreset;

    const buttonShadow: ButtonShadow =
      saved?.buttonShadow === 'soft' || saved?.buttonShadow === 'medium' || saved?.buttonShadow === 'strong'
        ? saved.buttonShadow
        : DEFAULTS.buttonShadow;

    const buttonMotion: ButtonMotion =
      saved?.buttonMotion === 'calm' || saved?.buttonMotion === 'balanced' || saved?.buttonMotion === 'expressive'
        ? saved.buttonMotion
        : DEFAULTS.buttonMotion;

    const buttonIconMode: ButtonIconMode = saved?.buttonIconMode === 'manual' ? 'manual' : 'auto';
    const buttonIconSide: ButtonIconSide = saved?.buttonIconSide === 'end' ? 'end' : 'start';
    const uiDensity: UiDensity = saved?.uiDensity === 'comfortable' ? 'comfortable' : 'compact';
    const financeTableDensity: FinanceTableDensity =
      saved?.financeTableDensity === 'comfortable' || saved?.financeTableDensity === 'ultra' || saved?.financeTableDensity === 'compact'
        ? saved.financeTableDensity
        : DEFAULTS.financeTableDensity;

    const brandMode = saved?.brandMode === 'custom' ? 'custom' : 'auto';
    const brandSource = normalizeStoreName(saved?.brandSource || readStoredBranding()?.storeName || DEFAULTS.brandSource);
    const derived = deriveBrandTheme(brandSource);

    return {
      theme,
      palette,
      sidebarVariant,
      showInkBar: saved?.showInkBar ?? DEFAULTS.showInkBar,
      buttonPreset,
      buttonRadiusPx: clampInt(saved?.buttonRadiusPx ?? DEFAULTS.buttonRadiusPx, 14, 28, DEFAULTS.buttonRadiusPx),
      buttonShadow,
      buttonMotion,
      buttonIconMode,
      buttonIconSide,
      uiDensity,
      financeTableDensity,
      sidebarHoverHue: clampInt(saved?.sidebarHoverHue ?? DEFAULTS.sidebarHoverHue, 0, 360, DEFAULTS.sidebarHoverHue),
      sidebarHoverS: clampInt(saved?.sidebarHoverS ?? DEFAULTS.sidebarHoverS, 40, 100, DEFAULTS.sidebarHoverS),
      sidebarHoverL: clampInt(saved?.sidebarHoverL ?? DEFAULTS.sidebarHoverL, 30, 70, DEFAULTS.sidebarHoverL),

      // 🎨 برند
      brandMode,
      brandSource,
      primaryHue: clampInt(saved?.primaryHue ?? (brandMode === 'auto' ? derived.hue : DEFAULTS.primaryHue), 0, 360, DEFAULTS.primaryHue),
      primaryS: clampInt(saved?.primaryS ?? (brandMode === 'auto' ? derived.saturation : DEFAULTS.primaryS), 40, 100, DEFAULTS.primaryS),
      primaryL: clampInt(saved?.primaryL ?? (brandMode === 'auto' ? derived.lightness : DEFAULTS.primaryL), 30, 70, DEFAULTS.primaryL),

      // اندازه‌ها
      sidebarIconPx: clampInt(saved?.sidebarIconPx ?? DEFAULTS.sidebarIconPx, 24, 44, DEFAULTS.sidebarIconPx),
      sidebarPillWidthPx: clampInt(
        saved?.sidebarPillWidthPx ?? DEFAULTS.sidebarPillWidthPx,
        360,
        390,
        DEFAULTS.sidebarPillWidthPx
      ),
    };
  } catch {
    return DEFAULTS;
  }
}

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  root.classList.toggle('dark', isDark);
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

function applyPalette(palette: StyleState['palette']) {
  // این attribute در styles/themes.css هم استفاده می‌شود
  document.documentElement.setAttribute('data-palette', palette);
}

// ───────── Provider
export const StyleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [style, setStyleState] = useState<StyleState>(readInitial);

  const setStyle = <K extends keyof StyleState>(k: K, v: StyleState[K]) => {
    setStyleState(prev => {
      const next = { ...prev, [k]: v } as StyleState;
      if (k === 'primaryHue' || k === 'primaryS' || k === 'primaryL' || k === 'palette') {
        next.brandMode = 'custom';
      }
      return next;
    });
  };

  const setMany = (patch: Partial<StyleState>) => {
    setStyleState(prev => ({ ...prev, ...patch }));
  };

  const resetStyle = () => setStyleState({ ...DEFAULTS });

  const setTheme = (t: ThemeMode) => setStyle('theme', t);
  const toggleTheme = () =>
    setStyle('theme', style.theme === 'light' ? 'dark' : style.theme === 'dark' ? 'system' : 'light');

  const setBrand = (h: number, s?: number, l?: number) => {
    setStyleState(prev => ({
      ...prev,
      brandMode: 'custom',
      palette: 'custom',
      primaryHue: clampInt(h, 0, 360, DEFAULTS.primaryHue),
      primaryS: clampInt(s ?? prev.primaryS, 40, 100, DEFAULTS.primaryS),
      primaryL: clampInt(l ?? prev.primaryL, 30, 70, DEFAULTS.primaryL),
    }));
  };

  const syncBrandFromStoreName = (storeName: string) => {
    const normalized = normalizeStoreName(storeName);
    const derived = deriveBrandTheme(normalized);
    setStyleState(prev => ({
      ...prev,
      brandMode: 'auto',
      brandSource: normalized,
      palette: derived.palette,
      primaryHue: derived.hue,
      primaryS: derived.saturation,
      primaryL: derived.lightness,
    }));
    writeStoredBranding({ storeName: normalized, brandMode: 'auto' });
  };

  // پایداری در localStorage
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(style));
    writeStoredBranding({ storeName: style.brandSource, brandMode: style.brandMode });
  }, [style]);

  // اعمال تم + شنود تغییر تم سیستم در حالت system
  useEffect(() => {
    applyTheme(style.theme);
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (style.theme === 'system') applyTheme('system');
    };
    mq?.addEventListener?.('change', onChange);
    return () => mq?.removeEventListener?.('change', onChange);
  }, [style.theme]);

  useEffect(() => {
    applyPalette(style.palette);
  }, [style.palette]);

  // اعمال متغیرهای CSS سراسری (Tailwind به این‌ها وصل است)
  useEffect(() => {
    const root = document.documentElement;

    // 🎨 برند HSL
    const hue = clampInt(style.primaryHue, 0, 360, DEFAULTS.primaryHue);
    const s = clampInt(style.primaryS, 40, 100, DEFAULTS.primaryS);
    const l = clampInt(style.primaryL, 30, 70, DEFAULTS.primaryL);
    root.style.setProperty('--primary-h', String(hue));
    root.style.setProperty('--primary-s', `${s}%`);
    root.style.setProperty('--primary-l', `${l}%`);

    // ✅ نسخه عددی برای calc() در Tailwind و CSS
    root.style.setProperty('--primary-s-num', String(s));
    root.style.setProperty('--primary-l-num', String(l));

    // ✅ سازگاری با بخش‌هایی که از hsl(var(--primary)) استفاده می‌کنند
    root.style.setProperty('--primary', `${hue} ${s}% ${l}%`);

    // اندازه‌ها
    root.style.setProperty('--sidebar-icon', `${clampInt(style.sidebarIconPx, 24, 44, 30)}px`);
    root.style.setProperty('--sidebar-pill-w', `${clampInt(style.sidebarPillWidthPx, 360, 390, DEFAULTS.sidebarPillWidthPx)}px`);
    const buttonRadiusPx = `${clampInt(style.buttonRadiusPx, 14, 28, DEFAULTS.buttonRadiusPx)}px`;
    root.style.setProperty('--btn-radius', buttonRadiusPx);
    root.style.setProperty('--button-radius-app', buttonRadiusPx);
    root.style.setProperty('--ux-btn-radius', buttonRadiusPx);
    root.style.setProperty('--ux-btn-radius-unified', buttonRadiusPx);

    const sh = clampInt(style.sidebarHoverHue, 0, 360, DEFAULTS.sidebarHoverHue);
    const ss = clampInt(style.sidebarHoverS, 40, 100, DEFAULTS.sidebarHoverS);
    const sl = clampInt(style.sidebarHoverL, 30, 70, DEFAULTS.sidebarHoverL);
    root.style.setProperty('--sidebar-hover-h', String(sh));
    root.style.setProperty('--sidebar-hover-s', `${ss}%`);
    root.style.setProperty('--sidebar-hover-l', `${sl}%`);
    const activeLightness = Math.max(58, sl);
    const activeTextLightness = Math.max(34, Math.min(48, sl - 14));
    root.style.setProperty('--sidebar-hover-bg', `hsl(${sh} ${ss}% ${activeLightness}% / 0.10)`);
    root.style.setProperty('--sidebar-hover-bg-strong', `hsl(${sh} ${ss}% ${activeLightness}% / 0.14)`);
    root.style.setProperty('--sidebar-hover-border', `hsl(${sh} ${ss}% ${Math.max(48, sl - 2)}% / 0.26)`);
    root.style.setProperty('--sidebar-hover-fg', `hsl(${sh} ${Math.min(100, ss + 4)}% ${activeTextLightness}%)`);
    root.style.setProperty('--sidebar-hover-fg-dark', `hsl(${sh} ${Math.min(100, ss + 4)}% 78%)`);
    // Apple Minimal active state: active row stays calm, but icon/accent follows the selected style color.
    root.style.setProperty('--sidebar-active-bg', 'rgba(248,250,252,0.96)');
    root.style.setProperty('--sidebar-active-border', 'rgba(203,213,225,0.92)');
    root.style.setProperty('--sidebar-active-fg', 'rgb(15 23 42)');
    root.style.setProperty('--sidebar-active-fg-dark', 'rgb(241 245 249)');
    root.style.setProperty('--sidebar-active-icon-bg', `hsl(${sh} ${ss}% ${activeLightness}% / 0.14)`);
    root.style.setProperty('--sidebar-active-icon-border', `hsl(${sh} ${ss}% ${Math.max(48, sl - 2)}% / 0.30)`);
    root.style.setProperty('--sidebar-active-icon-fg', `hsl(${sh} ${Math.min(100, ss + 4)}% ${activeTextLightness}%)`);
    root.style.setProperty('--sidebar-active-icon-fg-dark', `hsl(${sh} ${Math.min(100, ss + 4)}% 78%)`);
    root.style.setProperty('--sidebar-active-indicator', `hsl(${sh} ${Math.min(100, ss + 4)}% ${activeTextLightness}%)`);
    root.style.setProperty('--sidebar-active-shadow', 'none');
    root.style.setProperty('--sidebar-open-bg', 'rgba(248,250,252,0.82)');
    root.style.setProperty('--sidebar-open-border', 'rgba(226,232,240,0.92)');

    const compact = style.uiDensity !== 'comfortable';
    root.style.setProperty('--app-header-h', compact ? '52px' : '60px');
    root.style.setProperty('--app-page-gap', compact ? '12px' : '16px');
    root.style.setProperty('--sidebar-item-h', compact ? '42px' : '50px');
    root.style.setProperty('--sidebar-subitem-h', compact ? '36px' : '42px');
    root.style.setProperty('--sidebar-section-gap', compact ? '6px' : '10px');
    root.style.setProperty('--sidebar-search-h', compact ? '38px' : '44px');
    root.style.setProperty('--control-h', compact ? '40px' : '44px');
    root.style.setProperty('--control-h-sm', compact ? '34px' : '38px');
    root.style.setProperty('--card-pad', compact ? '12px' : '16px');

    // دکمه‌ها
    root.setAttribute('data-button-preset', style.buttonPreset);
    root.setAttribute('data-button-shadow', style.buttonShadow);
    root.setAttribute('data-button-motion', style.buttonMotion);
    root.setAttribute('data-button-icon-mode', style.buttonIconMode);
    root.setAttribute('data-button-icon-side', style.buttonIconSide);
    root.setAttribute('data-ui-density', style.uiDensity);
    root.setAttribute('data-finance-table-density', style.financeTableDensity);

    // جوهری
    root.style.setProperty('--inkbar-opacity', style.showInkBar ? '1' : '0');
  }, [
    style.primaryHue,
    style.primaryS,
    style.primaryL,
    style.sidebarIconPx,
    style.sidebarPillWidthPx,
    style.buttonPreset,
    style.buttonRadiusPx,
    style.buttonShadow,
    style.buttonMotion,
    style.buttonIconMode,
    style.buttonIconSide,
    style.uiDensity,
    style.financeTableDensity,
    style.showInkBar,
    style.sidebarHoverHue,
    style.sidebarHoverS,
    style.sidebarHoverL,
  ]);

  // عرض واقعی سایدبار برای لایه‌بندی
  const computeSidebarWidthPx = () =>
    style.sidebarVariant === 'pill'
      ? clampInt(style.sidebarPillWidthPx, 360, 390, DEFAULTS.sidebarPillWidthPx)
      : 360; // عرض خواناتر برای متن فارسی سایدبار

  const value = useMemo<Ctx>(
    () => ({
      style,
      setStyle,
      setMany,
      resetStyle,
      setTheme,
      toggleTheme,
      computeSidebarWidthPx,
      setBrand,
      syncBrandFromStoreName,
    }),
    [style]
  );

  return <StyleContext.Provider value={value}>{children}</StyleContext.Provider>;
};

// ───────── Hooks
export const useStyleContext = () => {
  const ctx = useContext(StyleContext);
  if (!ctx) throw new Error('useStyleContext must be used within StyleProvider');
  return ctx;
};

// alias سازگار با importهای قبلی
export const useStyle = useStyleContext;
