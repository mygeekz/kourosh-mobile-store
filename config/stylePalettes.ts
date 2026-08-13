export const STANDARD_STYLE_PALETTES = {
  aurora: {
    label: 'لوکس اجرایی',
    hue: 175,
    saturation: 77,
    lightness: 26,
    buttonPreset: 'luxury',
  },
  classic: {
    label: 'کلاسیک iOS',
    hue: 210,
    saturation: 100,
    lightness: 40,
    buttonPreset: 'classic',
  },
  ocean: {
    label: 'اقیانوس مدرن',
    hue: 201,
    saturation: 96,
    lightness: 32,
    buttonPreset: 'ocean',
  },
  sunset: {
    label: 'فروش پرانرژی',
    hue: 17,
    saturation: 88,
    lightness: 40,
    buttonPreset: 'sunset',
  },
  midnight: {
    label: 'شب حرفه‌ای',
    hue: 243,
    saturation: 75,
    lightness: 59,
    buttonPreset: 'mono',
  },
  gold: {
    label: 'طلایی مات',
    hue: 38,
    saturation: 48,
    lightness: 38,
    buttonPreset: 'luxury',
  },
} as const;

export type StandardStylePalette = keyof typeof STANDARD_STYLE_PALETTES;

export const STANDARD_STYLE_PALETTE_KEYS = Object.freeze(
  Object.keys(STANDARD_STYLE_PALETTES) as StandardStylePalette[],
);

// Keep automatic store-name branding stable for existing installations.
// New opt-in palettes belong to the Style center without reshuffling the
// deterministic palette previously assigned to every saved store name.
export const AUTO_BRAND_STYLE_PALETTE_KEYS = Object.freeze([
  'aurora',
  'classic',
  'ocean',
  'sunset',
  'midnight',
] satisfies StandardStylePalette[]);

export const isStandardStylePalette = (value: unknown): value is StandardStylePalette =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(STANDARD_STYLE_PALETTES, value);
