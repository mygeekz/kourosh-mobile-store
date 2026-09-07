export const STANDARD_STYLE_PALETTES = {
  aurora: {
    label: 'لوکس اجرایی',
    hue: 175,
    saturation: 77,
    lightness: 26,
    buttonPreset: 'luxury',
    buttonPress: { hue: 176, saturation: 69, lightness: 22 },
    buttonActive: { hue: 172, saturation: 72, lightness: 34 },
  },
  classic: {
    label: 'کلاسیک iOS',
    hue: 210,
    saturation: 100,
    lightness: 40,
    buttonPreset: 'classic',
    buttonPress: { hue: 210, saturation: 100, lightness: 32 },
    buttonActive: { hue: 211, saturation: 88, lightness: 42 },
  },
  ocean: {
    label: 'اقیانوس مدرن',
    hue: 201,
    saturation: 96,
    lightness: 32,
    buttonPreset: 'ocean',
    buttonPress: { hue: 201, saturation: 90, lightness: 27 },
    buttonActive: { hue: 193, saturation: 82, lightness: 35 },
  },
  sunset: {
    label: 'فروش پرانرژی',
    hue: 17,
    saturation: 88,
    lightness: 40,
    buttonPreset: 'sunset',
    buttonPress: { hue: 15, saturation: 79, lightness: 34 },
    buttonActive: { hue: 27, saturation: 88, lightness: 43 },
  },
  midnight: {
    label: 'شب حرفه‌ای',
    hue: 243,
    saturation: 75,
    lightness: 59,
    buttonPreset: 'mono',
    buttonPress: { hue: 245, saturation: 58, lightness: 51 },
    buttonActive: { hue: 234, saturation: 72, lightness: 58 },
  },
  gold: {
    label: 'طلایی مات',
    hue: 38,
    saturation: 48,
    lightness: 38,
    buttonPreset: 'luxury',
    buttonPress: { hue: 37, saturation: 47, lightness: 32 },
    buttonActive: { hue: 40, saturation: 52, lightness: 46 },
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
