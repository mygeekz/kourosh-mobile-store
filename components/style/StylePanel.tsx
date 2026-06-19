import React from 'react';
import ToggleSwitch from '../ToggleSwitch';
import { useStyle } from '../../hooks/useStyle';

const palettes = [
  { id:'aurora',  label:'Aurora',  from:'bg-[rgb(var(--grad-from))]', to:'bg-[rgb(var(--grad-to))]' },
  { id:'sunset',  label:'Sunset' },
  { id:'ocean',   label:'Ocean' },
];

export default function StylePanel() {
  const { style, setStyle, applyMode } = useStyle();

  return (
    <div className="space-y-6">
      {/* Mode */}
      <div>
        <h3 className="font-semibold mb-2">حالت نمایش</h3>
        <div className="flex gap-2">
          {(['light','dark','system'] as const).map(m => (
            <button
              key={m}
              onClick={() => applyMode(m)}
              className={`px-3 py-1.5 rounded-md border ${style.mode===m?'bg-primary/10 border-primary text-primary':'border-gray-300 dark:border-gray-600'}`}
            >{m==='light'?'لایت':m==='dark'?'دارک':'سیستم'}</button>
          ))}
        </div>
      </div>

      {/* Palette */}
      <div>
        <h3 className="font-semibold mb-2">پالت رنگی</h3>
        <div className="flex gap-3">
          {(['aurora','sunset','ocean'] as const).map(p => (
            <button
              key={p}
              onClick={() => setStyle('palette', p)}
              className={`w-20 h-10 rounded-lg border ${style.palette===p?'border-primary':'border-gray-300 dark:border-gray-600'}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <h3 className="font-semibold mb-2">استایل سایدبار</h3>
          <select
            value={style.sidebarVariant}
            onChange={e => setStyle('sidebarVariant', e.target.value as any)}
            className="w-full rounded-md border bg-surface text-text"
          >
            <option value="pill">Pill (قرصی)</option>
            <option value="classic">Classic (لیستی)</option>
          </select>
        </div>
        <div>
          <h3 className="font-semibold mb-2">اندازه آیکون</h3>
          <input type="range" min={32} max={52} value={style.sidebarIconPx}
            onChange={e => setStyle('sidebarIconPx', Number(e.target.value))}
            className="w-full" />
          <div className="text-xs mt-1">{style.sidebarIconPx}px</div>
        </div>
        <div>
          <h3 className="font-semibold mb-2">عرض قرص</h3>
          <input type="range" min={200} max={300} value={style.sidebarPillWidthPx}
            onChange={e => setStyle('sidebarPillWidthPx', Number(e.target.value))}
            className="w-full" />
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
        <h3 className="font-semibold mb-2">دکمه‌ها</h3>
        <select value={style.buttonRadius} onChange={e => setStyle('buttonRadius', e.target.value as any)}
          className="rounded-md border bg-surface text-text">
          <option value="sm">گوشه‌گرد کم</option>
          <option value="md">متوسط</option>
          <option value="lg">زیاد</option>
          <option value="pill">قرصی</option>
        </select>
      </div>

      {/* Invoice */}
      <div>
        <h3 className="font-semibold mb-2">فاکتور</h3>
        <select value={style.invoiceTemplate} onChange={e => setStyle('invoiceTemplate', e.target.value as any)}
          className="rounded-md border bg-surface text-text">
          <option value="clean">ساده</option>
          <option value="compact">فشرده</option>
          <option value="bold">بولد/گرادیانی</option>
        </select>
      </div>
    </div>
  );
}
