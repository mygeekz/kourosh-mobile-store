import ToggleSwitch from '../ToggleSwitch';
import { useStyle } from '../../hooks/useStyle';

export default function StylePanel() {
  const { style, setStyle, setTheme } = useStyle();

  return (
    <div className="space-y-6">
      {/* Mode */}
      <div>
        <h3 className="mb-2 font-semibold">حالت نمایش</h3>
        <div className="flex gap-2">
          {(['light', 'dark', 'system'] as const).map((theme) => (
            <button
              key={theme}
              type="button"
              onClick={() => setTheme(theme)}
              className={`rounded-md border px-3 py-1.5 ${style.theme === theme ? 'border-primary bg-primary/10 text-primary' : 'border-gray-300 dark:border-gray-600'}`}
            >
              {theme === 'light' ? 'لایت' : theme === 'dark' ? 'دارک' : 'سیستم'}
            </button>
          ))}
        </div>
      </div>

      {/* Palette */}
      <div>
        <h3 className="mb-2 font-semibold">پالت رنگی</h3>
        <div className="flex gap-3">
          {(['aurora', 'sunset', 'ocean', 'classic', 'custom'] as const).map((palette) => (
            <button
              key={palette}
              type="button"
              onClick={() => setStyle('palette', palette)}
              className={`h-10 w-20 rounded-lg border ${style.palette === palette ? 'border-primary' : 'border-gray-300 dark:border-gray-600'}`}
            >
              {palette}
            </button>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <h3 className="mb-2 font-semibold">استایل سایدبار</h3>
          <select
            value={style.sidebarVariant}
            onChange={(event) => setStyle('sidebarVariant', event.target.value as typeof style.sidebarVariant)}
            className="w-full rounded-md border bg-surface text-text"
          >
            <option value="pill">Pill (قرصی)</option>
            <option value="classic">Classic (لیستی)</option>
          </select>
        </div>
        <div>
          <h3 className="mb-2 font-semibold">اندازه آیکون</h3>
          <input
            type="range"
            min={24}
            max={44}
            value={style.sidebarIconPx}
            onChange={(event) => setStyle('sidebarIconPx', Number(event.target.value))}
            className="w-full"
          />
          <div className="mt-1 text-xs">{style.sidebarIconPx}px</div>
        </div>
        <div>
          <h3 className="mb-2 font-semibold">عرض قرص</h3>
          <input
            type="range"
            min={360}
            max={390}
            value={style.sidebarPillWidthPx}
            onChange={(event) => setStyle('sidebarPillWidthPx', Number(event.target.value))}
            className="w-full"
          />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white/80 px-4 py-3 dark:border-gray-700 dark:bg-slate-900/45">
          <div className="text-right">
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">نمایش نوار گرادیانی کنار</div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">حالت تأکید فعال برای آیتم انتخاب‌شده.</div>
          </div>
          <ToggleSwitch checked={style.showInkBar} onCheckedChange={(next) => setStyle('showInkBar', next)} ariaLabel="نمایش نوار گرادیانی کنار" size="sm" />
        </div>
      </div>

      {/* Buttons */}
      <div>
        <h3 className="mb-2 font-semibold">گردی دکمه‌ها</h3>
        <input
          type="range"
          min={14}
          max={28}
          value={style.buttonRadiusPx}
          onChange={(event) => setStyle('buttonRadiusPx', Number(event.target.value))}
          className="w-full max-w-xs"
        />
        <div className="mt-1 text-xs">{style.buttonRadiusPx}px</div>
      </div>
    </div>
  );
}
