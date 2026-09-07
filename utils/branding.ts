import { AUTO_BRAND_STYLE_PALETTE_KEYS, STANDARD_STYLE_PALETTES, type StandardStylePalette } from '../config/stylePalettes';

export type BrandPalette = 'custom' | StandardStylePalette;
export type BrandMode = 'auto' | 'custom';

export type BrandSnapshot = {
  storeName: string;
  brandMode: BrandMode;
  updatedAt: string;
};

export type DerivedBrand = {
  hue: number;
  saturation: number;
  lightness: number;
  palette: BrandPalette;
  title: string;
};

export const BRANDING_STORAGE_KEY = 'koroush.branding.v1';
export const BRAND_FALLBACK_NAME = 'فروشگاه';
export const BRAND_DEFAULT_TITLE = 'مدیریت فروشگاه';

export const normalizeStoreName = (value: unknown): string => {
  const raw = String(value ?? '').replace(/\s+/g, ' ').trim();
  return raw || BRAND_FALLBACK_NAME;
};

const hashString = (value: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const deriveBrandTheme = (storeName: unknown): DerivedBrand => {
  const name = normalizeStoreName(storeName);
  const hash = hashString(name);
  const palette = AUTO_BRAND_STYLE_PALETTE_KEYS[hash % AUTO_BRAND_STYLE_PALETTE_KEYS.length];
  const selected = STANDARD_STYLE_PALETTES[palette];

  return {
    palette,
    hue: selected.hue,
    saturation: selected.saturation,
    lightness: selected.lightness,
    title: `${name} | ${BRAND_DEFAULT_TITLE}`,
  };
};

export const formatBrandTitle = (storeName?: unknown): string => {
  return `${normalizeStoreName(storeName)} | ${BRAND_DEFAULT_TITLE}`;
};

export const readStoredBranding = (): BrandSnapshot | null => {
  try {
    const raw = localStorage.getItem(BRANDING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BrandSnapshot>;
    if (!parsed?.storeName) return null;
    return {
      storeName: normalizeStoreName(parsed.storeName),
      brandMode: parsed.brandMode === 'custom' ? 'custom' : 'auto',
      updatedAt: String(parsed.updatedAt || new Date().toISOString()),
    };
  } catch {
    return null;
  }
};

export const writeStoredBranding = (snapshot: Partial<BrandSnapshot>) => {
  try {
    const next: BrandSnapshot = {
      storeName: normalizeStoreName(snapshot.storeName),
      brandMode: snapshot.brandMode === 'custom' ? 'custom' : 'auto',
      updatedAt: String(snapshot.updatedAt || new Date().toISOString()),
    };
    localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
};

export const applyDocumentBranding = (storeName?: unknown) => {
  const title = formatBrandTitle(storeName);
  if (typeof document !== 'undefined') {
    document.title = title;
    const derived = deriveBrandTheme(storeName);
    const themeColor = `hsl(${derived.hue} ${derived.saturation}% ${derived.lightness}%)`;
    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = themeColor;
  }
  return title;
};
