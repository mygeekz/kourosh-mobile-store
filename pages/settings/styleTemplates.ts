import type { StyleState } from '../../contexts/StyleContext';

export type SavedStyleProfile = { id: string; name: string; snapshot: unknown; createdAt: string };
export type AppStyleTemplate = { key: string; label: string; hint: string; badge: string; icon: string; swatch: string; snapshot: Partial<StyleState> };

export const STYLE_PROFILES_KEY = 'kourosh.saved-style-profiles.v1';

export const APP_STYLE_TEMPLATES: AppStyleTemplate[] = [
  {
    key: 'executive-luxury',
    label: 'لوکس اجرایی',
    hint: 'لوکس، متعادل و مناسب محیط‌های رسمی فروشگاهی',
    badge: 'حرفه‌ای',
    icon: 'fa-solid fa-crown',
    swatch: 'from-emerald-500 via-teal-500 to-cyan-500',
    snapshot: { palette: 'aurora', theme: 'light', sidebarVariant: 'pill', sidebarIconPx: 30, sidebarPillWidthPx: 218, showInkBar: true, buttonPreset: 'luxury', buttonRadiusPx: 18, buttonShadow: 'medium', buttonMotion: 'balanced', buttonIconMode: 'auto', buttonIconSide: 'start', uiDensity: 'compact' },
  },
  {
    key: 'classic-ios',
    label: 'کلاسیک',
    hint: 'رنگ برند خنثی و دکمه‌های شبیه iOS؛ رسمی، تمیز و بدون رنگ‌زدگی',
    badge: 'جدید',
    icon: 'fa-brands fa-apple',
    swatch: 'from-slate-200 via-white to-slate-300',
    snapshot: { palette: 'classic', theme: 'light', sidebarVariant: 'pill', sidebarIconPx: 30, sidebarPillWidthPx: 220, showInkBar: false, buttonPreset: 'classic', buttonRadiusPx: 18, buttonShadow: 'soft', buttonMotion: 'balanced', buttonIconMode: 'auto', buttonIconSide: 'start', uiDensity: 'compact' },
  },
  {
    key: 'modern-ocean',
    label: 'اقیانوس مدرن',
    hint: 'تم مدرن، آبی و مناسب فضای تکنولوژیک و داشبوردی',
    badge: 'داشبوردی',
    icon: 'fa-solid fa-wave-square',
    swatch: 'from-sky-500 via-blue-500 to-indigo-500',
    snapshot: { palette: 'ocean', theme: 'light', sidebarVariant: 'pill', sidebarIconPx: 31, sidebarPillWidthPx: 222, showInkBar: true, buttonPreset: 'ocean', buttonRadiusPx: 20, buttonShadow: 'strong', buttonMotion: 'balanced', buttonIconMode: 'auto', buttonIconSide: 'start', uiDensity: 'compact' },
  },
  {
    key: 'sunset-sales',
    label: 'فروش پرانرژی',
    hint: 'پرانرژی، گرم و مناسب محیط‌های عملیاتی و فروش سریع',
    badge: 'پویا',
    icon: 'fa-solid fa-bolt',
    swatch: 'from-rose-500 via-orange-500 to-amber-400',
    snapshot: { palette: 'sunset', theme: 'light', sidebarVariant: 'pill', sidebarIconPx: 30, sidebarPillWidthPx: 218, showInkBar: true, buttonPreset: 'sunset', buttonRadiusPx: 22, buttonShadow: 'strong', buttonMotion: 'expressive', buttonIconMode: 'auto', buttonIconSide: 'start', uiDensity: 'compact' },
  },
  {
    key: 'midnight-pro',
    label: 'شب حرفه‌ای',
    hint: 'رسمی، تیره و جدی برای کاربرانی که نمای مدیریتی‌تر می‌خواهند',
    badge: 'دارک حرفه‌ای',
    icon: 'fa-solid fa-moon-stars',
    swatch: 'from-slate-800 via-slate-700 to-slate-500',
    snapshot: { palette: 'custom', theme: 'dark', sidebarVariant: 'classic', sidebarIconPx: 28, sidebarPillWidthPx: 206, showInkBar: false, buttonPreset: 'mono', buttonRadiusPx: 18, buttonShadow: 'medium', buttonMotion: 'calm', buttonIconMode: 'auto', buttonIconSide: 'end', uiDensity: 'compact' },
  },
];
