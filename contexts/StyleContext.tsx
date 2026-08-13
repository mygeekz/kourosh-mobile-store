// contexts/StyleContext.tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { deriveBrandTheme, normalizeStoreName, readStoredBranding, writeStoredBranding } from '../utils/branding';
import { isStandardStylePalette, STANDARD_STYLE_PALETTES, type StandardStylePalette } from '../config/stylePalettes';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ButtonPreset = 'luxury' | 'classic' | 'ocean' | 'sunset' | 'mono';
export type ButtonShadow = 'soft' | 'medium' | 'strong';
export type ButtonMotion = 'calm' | 'balanced' | 'expressive';
export type UiDensity = 'compact' | 'comfortable';
export type FinanceTableDensity = 'comfortable' | 'compact' | 'ultra';

export type StyleState = {
  theme: ThemeMode;
  brandMode: 'auto' | 'custom';
  brandSource: string;

  /** 🎛️ پالت آماده برای حس «پولی» و یکپارچگی رنگ‌ها */
  palette: 'custom' | StandardStylePalette;

  /** 🎨 رنگ برند (HSL) — با Tailwind به primary وصل شده */
  primaryHue: number;     // 0..360
  primaryS: number;       // 40..100 (%)
  primaryL: number;       // 22..70  (%)

  sidebarIconPx: number;       // 24..34
  sidebarPillWidthPx: number;  // 196..280
  showInkBar: boolean;
  buttonPreset: ButtonPreset;
  buttonRadiusPx: number;
  buttonShadow: ButtonShadow;
  buttonMotion: ButtonMotion;
  uiDensity: UiDensity;
  financeTableDensity: FinanceTableDensity;
  controlRadiusPx: number;
  cardRadiusPx: number;
  reducedMotion: boolean;
  highContrast: boolean;
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
  primaryHue: 175,
  primaryS: 77,
  primaryL: 26,
  sidebarIconPx: 28,
  sidebarPillWidthPx: 272,
  showInkBar: true,
  buttonPreset: 'luxury',
  buttonRadiusPx: 18,
  buttonShadow: 'medium',
  buttonMotion: 'balanced',
  uiDensity: 'compact',
  financeTableDensity: 'compact',
  controlRadiusPx: 16,
  cardRadiusPx: 22,
  reducedMotion: false,
  highContrast: false,
  brandMode: 'auto',
  brandSource: normalizeStoreName(readStoredBranding()?.storeName || 'فروشگاه'),
};

const KEY = 'koroush.style.v2';
const LEGACY_KEY = 'koroush.style.v1';
const PRIMARY_LIGHTNESS_MIN = 22;
const StyleContext = createContext<Ctx | null>(null);

// ───────── Utilities
const clampInt = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

const hslChannel = (hue: number, saturation: number, lightness: number) => {
  const h = ((hue % 360) + 360) % 360 / 360;
  const s = Math.min(1, Math.max(0, saturation / 100));
  const l = Math.min(1, Math.max(0, lightness / 100));

  if (s === 0) return [l, l, l] as const;

  const q = l < 0.5 ? l * (1 + s) : l + s - (l * s);
  const p = (2 * l) - q;
  const hueToRgb = (offset: number) => {
    let t = offset;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + ((q - p) * 6 * t);
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + ((q - p) * (2 / 3 - t) * 6);
    return p;
  };

  return [hueToRgb(h + 1 / 3), hueToRgb(h), hueToRgb(h - 1 / 3)] as const;
};

const relativeLuminance = (hue: number, saturation: number, lightness: number) => {
  const channels = hslChannel(hue, saturation, lightness).map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
};

const resolveAccessiblePrimary = (hue: number, saturation: number, lightness: number) => {
  const luminance = relativeLuminance(hue, saturation, lightness);
  const contrastWithWhite = 1.05 / (luminance + 0.05);
  const contrastWithBlack = (luminance + 0.05) / 0.05;
  const useDarkForeground = contrastWithBlack >= contrastWithWhite;

  // Keep every custom gradient endpoint on the same accessible side of the
  // WCAG contrast boundary. Dark text receives a lighter hover endpoint;
  // white text receives a darker one. This avoids a readable primary color
  // turning unreadable halfway through the loading-button gradient.
  const hoverLightness = useDarkForeground
    ? Math.min(88, lightness + 7)
    : Math.max(14, lightness - 8);
  const highlightLightness = useDarkForeground
    ? Math.min(92, lightness + 14)
    : Math.max(14, lightness - 4);

  return {
    foreground: useDarkForeground ? '0 0% 0%' : '0 0% 100%',
    hoverLightness,
    highlightLightness,
  };
};

function readInitial(): StyleState {
  try {
    const currentRaw = localStorage.getItem(KEY);
    const raw = currentRaw ?? localStorage.getItem(LEGACY_KEY);
    const isLegacyState = !currentRaw && Boolean(raw);
    const saved = raw ? (JSON.parse(raw) as Partial<StyleState>) : {};
    const theme: ThemeMode =
      saved?.theme === 'light' || saved?.theme === 'dark' || saved?.theme === 'system'
        ? saved.theme
        : DEFAULTS.theme;

    const palette: StyleState['palette'] =
      saved?.palette === 'custom' || isStandardStylePalette(saved?.palette)
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

    const uiDensity: UiDensity = saved?.uiDensity === 'comfortable' ? 'comfortable' : 'compact';
    const financeTableDensity: FinanceTableDensity =
      saved?.financeTableDensity === 'comfortable' || saved?.financeTableDensity === 'ultra' || saved?.financeTableDensity === 'compact'
        ? saved.financeTableDensity
        : DEFAULTS.financeTableDensity;

    const brandMode = saved?.brandMode === 'custom' ? 'custom' : 'auto';
    const brandSource = normalizeStoreName(saved?.brandSource || readStoredBranding()?.storeName || DEFAULTS.brandSource);
    const derived = deriveBrandTheme(brandSource);
    const legacyPalettePrimary = isLegacyState && palette !== 'custom' ? STANDARD_STYLE_PALETTES[palette] : null;

    return {
      theme,
      palette,
      showInkBar: saved?.showInkBar ?? DEFAULTS.showInkBar,
      buttonPreset,
      buttonRadiusPx: clampInt(saved?.buttonRadiusPx ?? DEFAULTS.buttonRadiusPx, 14, 28, DEFAULTS.buttonRadiusPx),
      buttonShadow,
      buttonMotion,
      uiDensity,
      financeTableDensity,
      controlRadiusPx: clampInt(saved?.controlRadiusPx ?? DEFAULTS.controlRadiusPx, 12, 20, DEFAULTS.controlRadiusPx),
      cardRadiusPx: clampInt(saved?.cardRadiusPx ?? DEFAULTS.cardRadiusPx, 16, 28, DEFAULTS.cardRadiusPx),
      reducedMotion: saved?.reducedMotion ?? DEFAULTS.reducedMotion,
      highContrast: saved?.highContrast ?? DEFAULTS.highContrast,

      // 🎨 برند
      brandMode,
      brandSource,
      primaryHue: clampInt(legacyPalettePrimary?.hue ?? saved?.primaryHue ?? (brandMode === 'auto' ? derived.hue : DEFAULTS.primaryHue), 0, 360, DEFAULTS.primaryHue),
      primaryS: clampInt(legacyPalettePrimary?.saturation ?? saved?.primaryS ?? (brandMode === 'auto' ? derived.saturation : DEFAULTS.primaryS), 40, 100, DEFAULTS.primaryS),
      primaryL: clampInt(legacyPalettePrimary?.lightness ?? saved?.primaryL ?? (brandMode === 'auto' ? derived.lightness : DEFAULTS.primaryL), PRIMARY_LIGHTNESS_MIN, 70, DEFAULTS.primaryL),

      // اندازه‌ها
      sidebarIconPx: clampInt(saved?.sidebarIconPx ?? DEFAULTS.sidebarIconPx, 24, 34, DEFAULTS.sidebarIconPx),
      sidebarPillWidthPx: clampInt(
        saved?.sidebarPillWidthPx ?? DEFAULTS.sidebarPillWidthPx,
        196,
        280,
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

  const setStyle = useCallback(<K extends keyof StyleState>(k: K, v: StyleState[K]) => {
    setStyleState(prev => {
      const next = { ...prev, [k]: v } as StyleState;
      if (k === 'palette' && isStandardStylePalette(v)) {
        const palette = STANDARD_STYLE_PALETTES[v];
        next.brandMode = 'custom';
        next.primaryHue = palette.hue;
        next.primaryS = palette.saturation;
        next.primaryL = palette.lightness;
        next.buttonPreset = palette.buttonPreset;
      } else if (k === 'primaryHue' || k === 'primaryS' || k === 'primaryL' || k === 'palette') {
        next.brandMode = 'custom';
      }
      return Object.is(prev[k], next[k]) && prev.brandMode === next.brandMode ? prev : next;
    });
  }, []);

  const setMany = useCallback((patch: Partial<StyleState>) => {
    setStyleState(prev => {
      const normalizedPatch = { ...patch };
      if (isStandardStylePalette(normalizedPatch.palette)) {
        const palette = STANDARD_STYLE_PALETTES[normalizedPatch.palette];
        normalizedPatch.primaryHue = palette.hue;
        normalizedPatch.primaryS = palette.saturation;
        normalizedPatch.primaryL = palette.lightness;
        if (normalizedPatch.buttonPreset === undefined) normalizedPatch.buttonPreset = palette.buttonPreset;
      }
      const next = { ...prev, ...normalizedPatch };
      const changed = Object.entries(normalizedPatch).some(([key, value]) => !Object.is(prev[key as keyof StyleState], value));
      return changed ? next : prev;
    });
  }, []);

  const resetStyle = useCallback(() => setStyleState({ ...DEFAULTS }), []);

  const setTheme = useCallback((t: ThemeMode) => setStyle('theme', t), [setStyle]);
  const toggleTheme = useCallback(() => {
    setStyleState(prev => ({
      ...prev,
      theme: prev.theme === 'light' ? 'dark' : prev.theme === 'dark' ? 'system' : 'light',
    }));
  }, []);

  const setBrand = useCallback((h: number, s?: number, l?: number) => {
    setStyleState(prev => {
      const next = {
        ...prev,
        brandMode: 'custom' as const,
        palette: 'custom' as const,
        primaryHue: clampInt(h, 0, 360, DEFAULTS.primaryHue),
        primaryS: clampInt(s ?? prev.primaryS, 40, 100, DEFAULTS.primaryS),
        primaryL: clampInt(l ?? prev.primaryL, PRIMARY_LIGHTNESS_MIN, 70, DEFAULTS.primaryL),
      };
      return next.brandMode === prev.brandMode &&
        next.palette === prev.palette &&
        next.primaryHue === prev.primaryHue &&
        next.primaryS === prev.primaryS &&
        next.primaryL === prev.primaryL
        ? prev
        : next;
    });
  }, []);

  const syncBrandFromStoreName = useCallback((storeName: string) => {
    const normalized = normalizeStoreName(storeName);
    const derived = deriveBrandTheme(normalized);
    setStyleState(prev => {
      const next = {
        ...prev,
        brandMode: 'auto' as const,
        brandSource: normalized,
        palette: derived.palette,
        primaryHue: derived.hue,
        primaryS: derived.saturation,
        primaryL: derived.lightness,
      };
      const unchanged =
        prev.brandMode === next.brandMode &&
        prev.brandSource === next.brandSource &&
        prev.palette === next.palette &&
        prev.primaryHue === next.primaryHue &&
        prev.primaryS === next.primaryS &&
        prev.primaryL === next.primaryL;
      return unchanged ? prev : next;
    });
    writeStoredBranding({ storeName: normalized, brandMode: 'auto' });
  }, []);

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
    const l = clampInt(style.primaryL, PRIMARY_LIGHTNESS_MIN, 70, DEFAULTS.primaryL);
    root.style.setProperty('--primary-h', String(hue));
    root.style.setProperty('--primary-s', `${s}%`);
    root.style.setProperty('--primary-l', `${l}%`);

    // ✅ نسخه عددی برای calc() در Tailwind و CSS
    root.style.setProperty('--primary-s-num', String(s));
    root.style.setProperty('--primary-l-num', String(l));

    // Palette CSS owns standard colors. Custom mode receives safe computed HSL values
    // without overriding the exact hover/highlight values of standard palettes.
    root.style.removeProperty('--primary');
    root.style.removeProperty('--primary-hover');
    root.style.removeProperty('--primary-highlight');

    if (style.palette === 'custom') {
      const accessiblePrimary = resolveAccessiblePrimary(hue, s, l);
      root.style.setProperty('--primary-foreground', accessiblePrimary.foreground);
      root.style.setProperty('--custom-primary-hover', `${hue} ${s}% ${accessiblePrimary.hoverLightness}%`);
      root.style.setProperty('--custom-primary-highlight', `${hue} ${s}% ${accessiblePrimary.highlightLightness}%`);
    } else {
      // Standard palettes own their foreground and endpoint values in themes.css.
      root.style.removeProperty('--primary-foreground');
      root.style.removeProperty('--custom-primary-hover');
      root.style.removeProperty('--custom-primary-highlight');
    }

    // اندازه‌ها
    const sidebarIconPx = `${clampInt(style.sidebarIconPx, 24, 34, DEFAULTS.sidebarIconPx)}px`;
    root.style.setProperty('--sidebar-icon', sidebarIconPx);
    root.style.setProperty('--app-sidebar-icon-size', sidebarIconPx);
    root.style.setProperty('--sidebar-pill-w', `${clampInt(style.sidebarPillWidthPx, 196, 280, DEFAULTS.sidebarPillWidthPx)}px`);
    const buttonRadiusPx = `${clampInt(style.buttonRadiusPx, 14, 28, DEFAULTS.buttonRadiusPx)}px`;
    root.style.setProperty('--btn-radius', buttonRadiusPx);
    root.style.setProperty('--button-radius-app', buttonRadiusPx);
    root.style.setProperty('--ux-btn-radius', buttonRadiusPx);
    root.style.setProperty('--ux-btn-radius-unified', buttonRadiusPx);

    const sh = hue;
    const ss = Math.max(40, Math.min(88, s));
    const sl = Math.max(44, Math.min(62, l + 8));
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
    root.style.setProperty('--sidebar-active-bg', 'color-mix(in srgb, hsl(var(--primary)) 8%, var(--ds-surface-card))');
    root.style.setProperty('--sidebar-active-border', 'color-mix(in srgb, hsl(var(--primary)) 22%, var(--ds-border-strong))');
    root.style.setProperty('--sidebar-active-fg', 'var(--ds-text-primary)');
    root.style.setProperty('--sidebar-active-fg-dark', 'var(--ds-text-primary)');
    root.style.setProperty('--sidebar-active-icon-bg', `hsl(${sh} ${ss}% ${activeLightness}% / 0.14)`);
    root.style.setProperty('--sidebar-active-icon-border', `hsl(${sh} ${ss}% ${Math.max(48, sl - 2)}% / 0.30)`);
    root.style.setProperty('--sidebar-active-icon-fg', `hsl(${sh} ${Math.min(100, ss + 4)}% ${activeTextLightness}%)`);
    root.style.setProperty('--sidebar-active-icon-fg-dark', `hsl(${sh} ${Math.min(100, ss + 4)}% 78%)`);
    root.style.setProperty('--sidebar-active-indicator', `hsl(${sh} ${Math.min(100, ss + 4)}% ${activeTextLightness}%)`);
    root.style.setProperty('--sidebar-active-shadow', 'none');
    root.style.setProperty('--sidebar-open-bg', 'var(--ds-surface-card-muted)');
    root.style.setProperty('--sidebar-open-border', 'var(--ds-border-subtle)');

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

    const controlRadiusPx = `${clampInt(style.controlRadiusPx, 12, 20, DEFAULTS.controlRadiusPx)}px`;
    const cardRadiusPx = `${clampInt(style.cardRadiusPx, 16, 28, DEFAULTS.cardRadiusPx)}px`;
    root.style.setProperty('--ui-control-radius', controlRadiusPx);
    root.style.setProperty('--ui-card-radius', cardRadiusPx);
    root.style.setProperty('--ds-control-radius', controlRadiusPx);
    root.style.setProperty('--ds-radius-md', controlRadiusPx);
    root.style.setProperty('--ds-radius-lg', cardRadiusPx);
    root.style.setProperty('--ds-radius-xl', `calc(${cardRadiusPx} + 4px)`);

    // دکمه‌ها
    root.setAttribute('data-button-preset', style.buttonPreset);
    root.setAttribute('data-button-shadow', style.buttonShadow);
    root.setAttribute('data-button-motion', style.buttonMotion);
    root.setAttribute('data-button-icon-mode', 'auto');
    root.setAttribute('data-button-icon-side', 'start');
    root.setAttribute('data-ui-density', style.uiDensity);
    root.setAttribute('data-finance-table-density', style.financeTableDensity);
    root.setAttribute('data-ui-reduced-motion', style.reducedMotion ? 'true' : 'false');
    root.setAttribute('data-ui-high-contrast', style.highContrast ? 'true' : 'false');

    // جوهری
    root.style.setProperty('--inkbar-opacity', style.showInkBar ? '1' : '0');
    root.style.setProperty('--sidebar-active-indicator-opacity', style.showInkBar ? '1' : '0');
  }, [
    style.palette,
    style.primaryHue,
    style.primaryS,
    style.primaryL,
    style.sidebarIconPx,
    style.sidebarPillWidthPx,
    style.buttonPreset,
    style.buttonRadiusPx,
    style.buttonShadow,
    style.buttonMotion,
    style.uiDensity,
    style.financeTableDensity,
    style.controlRadiusPx,
    style.cardRadiusPx,
    style.reducedMotion,
    style.highContrast,
    style.showInkBar,
  ]);

  // عرض واقعی سایدبار برای لایه‌بندی
  const computeSidebarWidthPx = useCallback(
    () => clampInt(style.sidebarPillWidthPx, 196, 280, DEFAULTS.sidebarPillWidthPx),
    [style.sidebarPillWidthPx],
  );

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
    [
      style,
      setStyle,
      setMany,
      resetStyle,
      setTheme,
      toggleTheme,
      computeSidebarWidthPx,
      setBrand,
      syncBrandFromStoreName,
    ]
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
