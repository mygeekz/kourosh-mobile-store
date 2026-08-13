import type { StyleState } from '../../contexts/StyleContext';
import { STANDARD_STYLE_PALETTES } from '../../config/stylePalettes';

export type SavedStyleProfile = { id: string; name: string; snapshot: Partial<StyleState>; createdAt: string; updatedAt?: string };
export type AppStyleTemplate = { key: string; label: string; hint: string; icon: string; snapshot: Partial<StyleState> };
export type ActiveStyleProfileReference =
  | { kind: 'template'; id: string }
  | { kind: 'saved'; id: string };

export const STYLE_PROFILES_KEY = 'kourosh.saved-style-profiles.v2';
export const LEGACY_STYLE_PROFILES_KEY = 'kourosh.saved-style-profiles.v1';
export const ACTIVE_STYLE_PROFILE_KEY = 'kourosh.active-style-profile.v1';
const aurora = STANDARD_STYLE_PALETTES.aurora;
const classic = STANDARD_STYLE_PALETTES.classic;
const ocean = STANDARD_STYLE_PALETTES.ocean;
const sunset = STANDARD_STYLE_PALETTES.sunset;
const midnight = STANDARD_STYLE_PALETTES.midnight;
const gold = STANDARD_STYLE_PALETTES.gold;


export const APP_STYLE_TEMPLATES: AppStyleTemplate[] = [
  {
    key: 'executive-luxury',
    label: 'لوکس اجرایی',
    hint: 'زمردی عمیق، رسمی و مناسب مدیریت حرفه‌ای فروشگاه',
    icon: 'fa-solid fa-crown',
    snapshot: { palette: 'aurora', theme: 'system', brandMode: 'custom', primaryHue: aurora.hue, primaryS: aurora.saturation, primaryL: aurora.lightness, sidebarIconPx: 28, sidebarPillWidthPx: 272, showInkBar: true, buttonPreset: aurora.buttonPreset, buttonRadiusPx: 18, buttonShadow: 'medium', buttonMotion: 'balanced', uiDensity: 'compact', financeTableDensity: 'compact', controlRadiusPx: 16, cardRadiusPx: 22, reducedMotion: false, highContrast: false },
  },
  {
    key: 'classic-ios',
    label: 'کلاسیک iOS',
    hint: 'گرافیت و آبی کنترل‌شده؛ مینیمال، رسمی و بدون رنگ‌زدگی',
    icon: 'fa-brands fa-apple',
    snapshot: { palette: 'classic', theme: 'system', brandMode: 'custom', primaryHue: classic.hue, primaryS: classic.saturation, primaryL: classic.lightness, sidebarIconPx: 28, sidebarPillWidthPx: 272, showInkBar: false, buttonPreset: classic.buttonPreset, buttonRadiusPx: 16, buttonShadow: 'soft', buttonMotion: 'calm', uiDensity: 'compact', financeTableDensity: 'compact', controlRadiusPx: 14, cardRadiusPx: 20, reducedMotion: false, highContrast: false },
  },
  {
    key: 'modern-ocean',
    label: 'اقیانوس مدرن',
    hint: 'آبی و فیروزه‌ای خنک برای داشبورد، گزارش و تحلیل داده',
    icon: 'fa-solid fa-wave-square',
    snapshot: { palette: 'ocean', theme: 'system', brandMode: 'custom', primaryHue: ocean.hue, primaryS: ocean.saturation, primaryL: ocean.lightness, sidebarIconPx: 30, sidebarPillWidthPx: 280, showInkBar: true, buttonPreset: ocean.buttonPreset, buttonRadiusPx: 18, buttonShadow: 'medium', buttonMotion: 'balanced', uiDensity: 'comfortable', financeTableDensity: 'comfortable', controlRadiusPx: 18, cardRadiusPx: 24, reducedMotion: false, highContrast: false },
  },
  {
    key: 'sunset-sales',
    label: 'فروش پرانرژی',
    hint: 'نارنجی تجاری و گرم برای صندوق و عملیات سریع فروش',
    icon: 'fa-solid fa-bolt',
    snapshot: { palette: 'sunset', theme: 'system', brandMode: 'custom', primaryHue: sunset.hue, primaryS: sunset.saturation, primaryL: sunset.lightness, sidebarIconPx: 28, sidebarPillWidthPx: 272, showInkBar: true, buttonPreset: sunset.buttonPreset, buttonRadiusPx: 18, buttonShadow: 'medium', buttonMotion: 'balanced', uiDensity: 'compact', financeTableDensity: 'compact', controlRadiusPx: 16, cardRadiusPx: 22, reducedMotion: false, highContrast: false },
  },
  {
    key: 'midnight-pro',
    label: 'شب حرفه‌ای',
    hint: 'سرمه‌ای و ایندیگو برای تمرکز بالا و استفاده طولانی مدیریتی',
    icon: 'fa-solid fa-moon',
    snapshot: { palette: 'midnight', theme: 'dark', brandMode: 'custom', primaryHue: midnight.hue, primaryS: midnight.saturation, primaryL: midnight.lightness, sidebarIconPx: 28, sidebarPillWidthPx: 272, showInkBar: false, buttonPreset: midnight.buttonPreset, buttonRadiusPx: 16, buttonShadow: 'soft', buttonMotion: 'calm', uiDensity: 'compact', financeTableDensity: 'compact', controlRadiusPx: 16, cardRadiusPx: 22, reducedMotion: true, highContrast: true },
  },
  {
    key: 'matte-gold',
    label: 'طلایی مات',
    hint: 'طلایی برنزی و سطوح ذغالی گرم؛ هماهنگ با هویت صفحه ورود',
    icon: 'fa-solid fa-gem',
    snapshot: { palette: 'gold', theme: 'dark', brandMode: 'custom', primaryHue: gold.hue, primaryS: gold.saturation, primaryL: gold.lightness, sidebarIconPx: 28, sidebarPillWidthPx: 272, showInkBar: true, buttonPreset: gold.buttonPreset, buttonRadiusPx: 18, buttonShadow: 'soft', buttonMotion: 'calm', uiDensity: 'compact', financeTableDensity: 'compact', controlRadiusPx: 16, cardRadiusPx: 22, reducedMotion: false, highContrast: false },
  },
];
