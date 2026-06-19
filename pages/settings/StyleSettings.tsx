import React, { useMemo } from 'react';
import { useStyle } from '../../hooks/useStyle';
import Button from '../../components/Button';
import ToggleSwitch from '../../components/ToggleSwitch';

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const faNumber = (value: number | string) => Number(value).toLocaleString('fa-IR');

type SegmentItem = { label: string; active: boolean; onClick: () => void; icon?: string; disabled?: boolean };

type CardProps = { title: string; subtitle?: string; icon: string; children: React.ReactNode; className?: string };

const sectionShell = 'rounded-[30px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_46px_-36px_rgba(15,23,42,0.24)] dark:border-slate-800 dark:bg-slate-950/90';

const SectionCard: React.FC<CardProps> = ({ title, subtitle, icon, children, className = '' }) => (
  <section className={`${sectionShell} ${className}`} dir="rtl">
    <div className="flex items-start justify-between gap-3 border-b border-slate-200/70 pb-4 dark:border-slate-800">
      <div className="min-w-0 text-right">
        <h3 className="text-base font-black tracking-tight text-slate-950 dark:text-white">{title}</h3>
        {subtitle ? <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
        <i className={icon} />
      </span>
    </div>
    <div className="mt-5">{children}</div>
  </section>
);

const Segments: React.FC<{ items: SegmentItem[]; columns?: string }> = ({ items, columns = 'grid-cols-[repeat(auto-fit,minmax(112px,1fr))]' }) => (
  <div className={`grid gap-2 ${columns}`} dir="rtl">
    {items.map((item) => (
      <button
        key={item.label}
        type="button"
        disabled={item.disabled}
        onClick={item.onClick}
        title={item.label}
        className={`inline-flex min-h-[44px] w-full min-w-0 items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-center text-xs font-black leading-5 transition disabled:cursor-not-allowed disabled:opacity-50 ${
          item.active
            ? 'border-[hsl(var(--primary)/0.38)] bg-[hsl(var(--primary)/0.10)] text-[hsl(var(--primary))] shadow-[0_14px_28px_-24px_hsl(var(--primary)/0.55)]'
            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900'
        }`}
      >
        {item.icon ? <i className={`${item.icon} shrink-0 text-[11px]`} /> : null}
        <span className="min-w-0 whitespace-normal break-normal leading-5 [overflow-wrap:normal]">{item.label}</span>
      </button>
    ))}
  </div>
);

const SliderField: React.FC<{ title: string; value: number; min: number; max: number; step?: number; disabled?: boolean; onChange: (next: number) => void }> = ({ title, value, min, max, step = 1, disabled, onChange }) => (
  <div className={`rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/45 ${disabled ? 'pointer-events-none opacity-45' : ''}`}>
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="text-right text-xs font-black text-slate-700 dark:text-slate-200">{title}</div>
      <span className="inline-flex min-w-12 items-center justify-center rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-black text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">{faNumber(value)}</span>
    </div>
    <input type="range" min={min} max={max} step={step} disabled={disabled} value={value} onChange={(e) => onChange(parseInt(e.target.value, 10))} className="w-full accent-[hsl(var(--primary))]" />
  </div>
);

const PaletteButton: React.FC<{ title: string; hint: string; active: boolean; swatch: React.CSSProperties; onClick: () => void }> = ({ title, hint, active, swatch, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-[24px] border p-4 text-right transition ${
      active
        ? 'border-[hsl(var(--primary)/0.42)] bg-[hsl(var(--primary)/0.08)] shadow-[0_18px_34px_-28px_hsl(var(--primary)/0.5)]'
        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/70 dark:hover:border-slate-700 dark:hover:bg-slate-900'
    }`}
  >
    <div className="flex items-center gap-3">
      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-white/70 shadow-inner ring-1 ring-slate-200/70 dark:border-slate-800 dark:ring-slate-700/70" style={swatch}>
        <span className="absolute inset-x-2 bottom-2 h-1.5 rounded-full bg-white/85 shadow-sm" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-black ${active ? 'text-[hsl(var(--primary))]' : 'text-slate-900 dark:text-slate-100'}`}>{title}</span>
        <span className="mt-1 block text-[11px] leading-5 text-slate-500 dark:text-slate-400">{hint}</span>
      </span>
      {active ? <i className="fa-solid fa-check text-[12px] text-[hsl(var(--primary))]" /> : null}
    </div>
  </button>
);

const PreviewMetric: React.FC<{ label: string; value: string; icon: string }> = ({ label, value, icon }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/45">
    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
      <i className={icon} />
      {label}
    </div>
    <div className="mt-1 text-sm font-black text-slate-900 dark:text-slate-100">{value}</div>
  </div>
);

const StyleSettings: React.FC = () => {
  const { style, setStyle, setMany, resetStyle } = useStyle();

  const brandSwatch = useMemo(
    () => ({ background: `linear-gradient(135deg, hsl(${style.primaryHue} ${style.primaryS}% ${Math.min(72, style.primaryL + 14)}%), hsl(${style.primaryHue} ${style.primaryS}% ${style.primaryL}%), hsl(${(style.primaryHue + 34) % 360} ${Math.max(52, style.primaryS - 8)}% ${Math.max(34, style.primaryL - 8)}%))` }),
    [style.primaryHue, style.primaryS, style.primaryL]
  );

  const applyPalette = (palette: 'aurora' | 'ocean' | 'sunset' | 'classic') => {
    const presets = {
      aurora: { primaryHue: 258, primaryS: 90, primaryL: 50, sidebarHoverHue: 258, sidebarHoverS: 78, sidebarHoverL: 58, buttonPreset: 'luxury' as const },
      ocean: { primaryHue: 201, primaryS: 92, primaryL: 48, sidebarHoverHue: 201, sidebarHoverS: 78, sidebarHoverL: 56, buttonPreset: 'ocean' as const },
      sunset: { primaryHue: 18, primaryS: 92, primaryL: 52, sidebarHoverHue: 18, sidebarHoverS: 82, sidebarHoverL: 58, buttonPreset: 'sunset' as const },
      classic: { primaryHue: 215, primaryS: 18, primaryL: 38, sidebarHoverHue: 215, sidebarHoverS: 18, sidebarHoverL: 52, buttonPreset: 'classic' as const },
    }[palette];
    setMany({ palette, brandMode: 'custom', ...presets });
  };

  const applyExecutive = () => setMany({
    theme: 'system',
    palette: 'classic',
    brandMode: 'custom',
    primaryHue: 215,
    primaryS: 18,
    primaryL: 38,
    sidebarHoverHue: 215,
    sidebarHoverS: 18,
    sidebarHoverL: 52,
    uiDensity: 'compact',
    financeTableDensity: 'compact',
    sidebarVariant: 'pill',
    sidebarIconPx: 30,
    sidebarPillWidthPx: 220,
    showInkBar: false,
    buttonPreset: 'classic',
    buttonRadiusPx: 18,
    buttonShadow: 'soft',
    buttonMotion: 'balanced',
    buttonIconMode: 'auto',
    buttonIconSide: 'start',
  });

  return (
    <div className="space-y-5" dir="rtl">
      <section className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_18px_46px_-36px_rgba(15,23,42,0.24)] dark:border-slate-800 dark:bg-slate-950/90">
        <div className="grid gap-5 p-5 md:p-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 text-right">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                <i className="fa-solid fa-wand-magic-sparkles" />
                مرکز استایل
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--primary)/0.24)] bg-[hsl(var(--primary)/0.08)] px-3 py-1 text-[11px] font-black text-[hsl(var(--primary))]">
                {style.brandMode === 'auto' ? 'برند خودکار' : 'برند دستی'}
              </span>
            </div>
            <h2 className="text-[26px] font-black tracking-tight text-slate-950 dark:text-white">ظاهر، رنگ برند و دکمه‌ها</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
              این بخش فقط تنظیمات موجود استایل را مرتب می‌کند: رنگ اصلی، سایدبار، دکمه‌ها، تراکم رابط و پیش‌نمایش عملیاتی. هیچ تنظیم تکراری ساخته نشده است.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button type="button" variant="primary" size="sm" onClick={applyExecutive} leftIcon={<i className="fa-brands fa-apple" />}>اعمال Apple Minimal</Button>
              <Button type="button" variant="secondary" size="sm" onClick={resetStyle} leftIcon={<i className="fa-solid fa-rotate-left" />}>بازگشت به پیش‌فرض</Button>
            </div>
          </div>

          <aside className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex items-center gap-3">
              <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[24px] border border-white/70 shadow-inner ring-1 ring-slate-200/70 dark:border-slate-800 dark:ring-slate-700/70" style={brandSwatch}>
                <span className="absolute inset-x-3 bottom-3 h-2 rounded-full bg-white/80 shadow-sm" />
                <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-white/80" />
              </span>
              <div className="min-w-0 flex-1 text-right">
                <div className="text-sm font-black text-slate-900 dark:text-slate-100">رنگ فعال سیستم</div>
                <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">HSL: {faNumber(style.primaryHue)} / {faNumber(style.primaryS)} / {faNumber(style.primaryL)}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <PreviewMetric label="قالب" value={style.palette === 'classic' ? 'کلاسیک' : style.palette === 'ocean' ? 'آبی' : style.palette === 'sunset' ? 'گرم' : style.palette === 'aurora' ? 'لوکس' : 'دستی'} icon="fa-solid fa-palette" />
              <PreviewMetric label="دکمه" value={style.buttonPreset === 'classic' ? 'کلاسیک' : style.buttonPreset === 'luxury' ? 'لوکس' : style.buttonPreset} icon="fa-solid fa-hand-pointer" />
            </div>
          </aside>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <SectionCard icon="fa-solid fa-palette" title="پالت و حالت نمایش" subtitle="گزینه‌های اصلی برندینگ را از اینجا کنترل کن؛ انتخاب‌ها بلافاصله روی کل برنامه اعمال می‌شود.">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <PaletteButton title="Apple Minimal" hint="خنثی، رسمی و مناسب استفاده کامرشیال" active={style.palette === 'classic'} swatch={{ background: 'linear-gradient(135deg,#f8fafc,#64748b,#0f172a)' }} onClick={() => applyPalette('classic')} />
              <PaletteButton title="Luxury" hint="لوکس با تأکید رنگ برند" active={style.palette === 'aurora'} swatch={{ background: 'linear-gradient(135deg,#ede9fe,#7c3aed,#312e81)' }} onClick={() => applyPalette('aurora')} />
              <PaletteButton title="Ocean" hint="آبی تمیز برای فضای عملیاتی" active={style.palette === 'ocean'} swatch={{ background: 'linear-gradient(135deg,#e0f2fe,#0284c7,#0f172a)' }} onClick={() => applyPalette('ocean')} />
              <PaletteButton title="Warm" hint="گرم و پرانرژی، مناسب فروش" active={style.palette === 'sunset'} swatch={{ background: 'linear-gradient(135deg,#ffedd5,#f97316,#7c2d12)' }} onClick={() => applyPalette('sunset')} />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <div className="mb-2 text-xs font-black text-slate-700 dark:text-slate-200">حالت رنگ برنامه</div>
                <Segments columns="grid-cols-[repeat(auto-fit,minmax(82px,1fr))]" items={[
                  { label: 'روشن', icon: 'fa-solid fa-sun', active: style.theme === 'light', onClick: () => setStyle('theme', 'light') },
                  { label: 'تیره', icon: 'fa-solid fa-moon', active: style.theme === 'dark', onClick: () => setStyle('theme', 'dark') },
                  { label: 'سیستم', icon: 'fa-solid fa-laptop', active: style.theme === 'system', onClick: () => setStyle('theme', 'system') },
                ]} />
              </div>
              <div>
                <div className="mb-2 text-xs font-black text-slate-700 dark:text-slate-200">تراکم رابط</div>
                <Segments columns="grid-cols-[repeat(auto-fit,minmax(112px,1fr))]" items={[
                  { label: 'فشرده', icon: 'fa-solid fa-compress', active: style.uiDensity === 'compact', onClick: () => setStyle('uiDensity', 'compact') },
                  { label: 'بازتر', icon: 'fa-solid fa-expand', active: style.uiDensity === 'comfortable', onClick: () => setStyle('uiDensity', 'comfortable') },
                ]} />
              </div>
            </div>
          </SectionCard>

          <SectionCard icon="fa-solid fa-bars-staggered" title="سایدبار و ناوبری" subtitle="اندازه و وضعیت انتخاب‌شده سایدبار را بدون ایجاد بلوک‌های تیره و ناخوانا کنترل کن.">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <div className="mb-2 text-xs font-black text-slate-700 dark:text-slate-200">نوع سایدبار</div>
                <Segments columns="grid-cols-[repeat(auto-fit,minmax(112px,1fr))]" items={[
                  { label: 'کپسولی', icon: 'fa-solid fa-grip-lines', active: style.sidebarVariant === 'pill', onClick: () => setStyle('sidebarVariant', 'pill') },
                  { label: 'کلاسیک', icon: 'fa-solid fa-bars', active: style.sidebarVariant === 'classic', onClick: () => setStyle('sidebarVariant', 'classic') },
                ]} />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/45">
                <div className="text-right">
                  <div className="text-xs font-black text-slate-700 dark:text-slate-200">نوار تأکید فعال</div>
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">برای آیتم فعال در سایدبار.</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-black ${style.showInkBar ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>{style.showInkBar ? 'فعال' : 'خاموش'}</span>
                  <ToggleSwitch checked={style.showInkBar} onCheckedChange={(next) => setStyle('showInkBar', next)} ariaLabel="نوار تأکید فعال" size="sm" />
                </div>
              </div>
              <SliderField title="اندازه آیکون سایدبار" value={style.sidebarIconPx} min={24} max={44} onChange={(next) => setStyle('sidebarIconPx', clamp(next, 24, 44))} />
              <SliderField title="عرض سایدبار کپسولی" value={style.sidebarPillWidthPx} min={196} max={280} disabled={style.sidebarVariant !== 'pill'} onChange={(next) => setStyle('sidebarPillWidthPx', clamp(next, 196, 280))} />
            </div>
          </SectionCard>

          <SectionCard icon="fa-solid fa-hand-pointer" title="دکمه‌ها" subtitle="سبک، انحنا، سایه و حرکت دکمه‌ها از همین تنظیمات موجود کنترل می‌شود.">
            <div className="space-y-4">
              <div>
                <div className="mb-2 text-xs font-black text-slate-700 dark:text-slate-200">سبک رنگ دکمه‌ها</div>
                <Segments columns="grid-cols-[repeat(auto-fit,minmax(108px,1fr))]" items={[
                  { label: 'لوکس', icon: 'fa-solid fa-gem', active: style.buttonPreset === 'luxury', onClick: () => setStyle('buttonPreset', 'luxury') },
                  { label: 'کلاسیک', icon: 'fa-brands fa-apple', active: style.buttonPreset === 'classic', onClick: () => setStyle('buttonPreset', 'classic') },
                  { label: 'آبی', icon: 'fa-solid fa-water', active: style.buttonPreset === 'ocean', onClick: () => setStyle('buttonPreset', 'ocean') },
                  { label: 'گرم', icon: 'fa-solid fa-fire', active: style.buttonPreset === 'sunset', onClick: () => setStyle('buttonPreset', 'sunset') },
                  { label: 'خنثی', icon: 'fa-solid fa-circle', active: style.buttonPreset === 'mono', onClick: () => setStyle('buttonPreset', 'mono') },
                ]} />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <SliderField title="گردی گوشه دکمه" value={style.buttonRadiusPx} min={14} max={28} onChange={(next) => setStyle('buttonRadiusPx', clamp(next, 14, 28))} />
                <div>
                  <div className="mb-2 text-xs font-black text-slate-700 dark:text-slate-200">جایگاه آیکون</div>
                  <Segments columns="grid-cols-[repeat(auto-fit,minmax(112px,1fr))]" items={[
                    { label: 'ابتدای دکمه', icon: 'fa-solid fa-align-right', active: style.buttonIconSide === 'start', onClick: () => setStyle('buttonIconSide', 'start') },
                    { label: 'انتهای دکمه', icon: 'fa-solid fa-align-left', active: style.buttonIconSide === 'end', onClick: () => setStyle('buttonIconSide', 'end') },
                  ]} />
                </div>
              </div>
              <details className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/45">
                <summary className="cursor-pointer list-none text-xs font-black text-slate-700 dark:text-slate-200"><i className="fa-solid fa-sliders ml-2 text-slate-400" />تنظیمات بیشتر دکمه</summary>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <div className="mb-2 text-xs font-black text-slate-700 dark:text-slate-200">شدت سایه</div>
                    <Segments columns="grid-cols-[repeat(auto-fit,minmax(82px,1fr))]" items={[
                      { label: 'کم', active: style.buttonShadow === 'soft', onClick: () => setStyle('buttonShadow', 'soft') },
                      { label: 'متوسط', active: style.buttonShadow === 'medium', onClick: () => setStyle('buttonShadow', 'medium') },
                      { label: 'زیاد', active: style.buttonShadow === 'strong', onClick: () => setStyle('buttonShadow', 'strong') },
                    ]} />
                  </div>
                  <div>
                    <div className="mb-2 text-xs font-black text-slate-700 dark:text-slate-200">حرکت</div>
                    <Segments columns="grid-cols-[repeat(auto-fit,minmax(82px,1fr))]" items={[
                      { label: 'آرام', active: style.buttonMotion === 'calm', onClick: () => setStyle('buttonMotion', 'calm') },
                      { label: 'متعادل', active: style.buttonMotion === 'balanced', onClick: () => setStyle('buttonMotion', 'balanced') },
                      { label: 'پویا', active: style.buttonMotion === 'expressive', onClick: () => setStyle('buttonMotion', 'expressive') },
                    ]} />
                  </div>
                  <div>
                    <div className="mb-2 text-xs font-black text-slate-700 dark:text-slate-200">آیکون خودکار</div>
                    <Segments columns="grid-cols-[repeat(auto-fit,minmax(112px,1fr))]" items={[
                      { label: 'فعال', active: style.buttonIconMode === 'auto', onClick: () => setStyle('buttonIconMode', 'auto') },
                      { label: 'دستی', active: style.buttonIconMode === 'manual', onClick: () => setStyle('buttonIconMode', 'manual') },
                    ]} />
                  </div>
                </div>
              </details>
            </div>
          </SectionCard>

          <SectionCard icon="fa-solid fa-table-cells" title="تراکم جدول‌های مالی" subtitle="نمایش جدول‌های اقساط، فاکتورها، دفتر مشتری و پنل همکار را بر اساس فضای صفحه تنظیم کن.">
            <div className="space-y-4">
              <Segments columns="grid-cols-[repeat(auto-fit,minmax(126px,1fr))]" items={[
                { label: 'راحت', icon: 'fa-solid fa-expand', active: style.financeTableDensity === 'comfortable', onClick: () => setStyle('financeTableDensity', 'comfortable') },
                { label: 'فشرده', icon: 'fa-solid fa-table-list', active: style.financeTableDensity === 'compact', onClick: () => setStyle('financeTableDensity', 'compact') },
                { label: 'خیلی فشرده', icon: 'fa-solid fa-compress', active: style.financeTableDensity === 'ultra', onClick: () => setStyle('financeTableDensity', 'ultra') },
              ]} />
              <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/70">
                <table className="min-w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2">ردیف مالی</th>
                      <th className="px-3 py-2">مبلغ</th>
                      <th className="px-3 py-2">وضعیت</th>
                      <th className="px-3 py-2 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    <tr>
                      <td className="px-3 py-2 font-black text-slate-800 dark:text-slate-100">فروش اقساطی</td>
                      <td className="px-3 py-2 font-black text-emerald-700 dark:text-emerald-300">۱۲,۰۰۰,۰۰۰ تومان</td>
                      <td className="px-3 py-2"><span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 font-black text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">در جریان</span></td>
                      <td className="px-3 py-2 text-center"><span className="finance-table-action finance-table-action--view"><i className="fa-solid fa-eye" />مشاهده</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">
                این گزینه فقط روی جدول‌های مالی اثر می‌گذارد؛ فرم‌ها، کارت‌ها و منوی اصلی بدون تغییر می‌مانند.
              </p>
            </div>
          </SectionCard>

          <details className={sectionShell}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-right">
              <span className="min-w-0">
                <span className="block text-base font-black text-slate-950 dark:text-white">تنظیمات پیشرفته رنگ</span>
                <span className="mt-1 block text-xs leading-6 text-slate-500 dark:text-slate-400">برای زمانی که پالت‌های آماده کافی نیستند.</span>
              </span>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"><i className="fa-solid fa-chevron-down" /></span>
            </summary>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              <SliderField title="رنگ اصلی" value={style.primaryHue} min={0} max={360} onChange={(next) => setMany({ palette: 'custom', brandMode: 'custom', primaryHue: clamp(next, 0, 360) })} />
              <SliderField title="شدت رنگ" value={style.primaryS} min={40} max={100} onChange={(next) => setMany({ palette: 'custom', brandMode: 'custom', primaryS: clamp(next, 40, 100) })} />
              <SliderField title="روشنایی رنگ" value={style.primaryL} min={30} max={70} onChange={(next) => setMany({ palette: 'custom', brandMode: 'custom', primaryL: clamp(next, 30, 70) })} />
              <SliderField title="رنگ انتخاب سایدبار" value={style.sidebarHoverHue} min={0} max={360} onChange={(next) => setStyle('sidebarHoverHue', clamp(next, 0, 360))} />
              <SliderField title="شدت انتخاب" value={style.sidebarHoverS} min={40} max={100} onChange={(next) => setStyle('sidebarHoverS', clamp(next, 40, 100))} />
              <SliderField title="خوانایی انتخاب" value={style.sidebarHoverL} min={44} max={70} onChange={(next) => setStyle('sidebarHoverL', clamp(next, 44, 70))} />
            </div>
          </details>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <SectionCard icon="fa-solid fa-eye" title="پیش‌نمایش زنده" subtitle="نمونه اجزای واقعی سیستم با همین تنظیمات.">
            <div className="space-y-4">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/45">
                <div className="mb-3 text-xs font-black text-slate-700 dark:text-slate-200">دکمه‌های عملیاتی</div>
                <div className="grid grid-cols-1 gap-2">
                  <Button type="button" size="sm" variant="primary" leftIcon={<i className="fa-solid fa-cash-register" />}>ثبت فروش</Button>
                  <Button type="button" size="sm" variant="secondary" leftIcon={<i className="fa-solid fa-file-invoice" />}>مشاهده فاکتور</Button>
                  <Button type="button" size="sm" variant="danger" leftIcon={<i className="fa-solid fa-trash" />}>حذف رکورد</Button>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
                <div className="mb-3 text-xs font-black text-slate-700 dark:text-slate-200">نمونه سایدبار</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"><i className="fa-solid fa-chart-line" />داشبورد</div>
                  <div className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--primary)/0.22)] bg-[hsl(var(--primary)/0.08)] px-3 py-2 text-sm font-black text-[hsl(var(--primary))]"><i className="fa-solid fa-gears" />تنظیمات</div>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"><i className="fa-solid fa-users" />اشخاص</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <PreviewMetric label="آیکون" value={`${faNumber(style.sidebarIconPx)}px`} icon="fa-solid fa-icons" />
                <PreviewMetric label="گردی دکمه" value={`${faNumber(style.buttonRadiusPx)}px`} icon="fa-solid fa-square" />
                <PreviewMetric label="سایه" value={style.buttonShadow === 'soft' ? 'کم' : style.buttonShadow === 'medium' ? 'متوسط' : 'زیاد'} icon="fa-solid fa-layer-group" />
                <PreviewMetric label="حرکت" value={style.buttonMotion === 'calm' ? 'آرام' : style.buttonMotion === 'balanced' ? 'متعادل' : 'پویا'} icon="fa-solid fa-bolt" />
                <PreviewMetric label="جدول مالی" value={style.financeTableDensity === 'comfortable' ? 'راحت' : style.financeTableDensity === 'ultra' ? 'خیلی فشرده' : 'فشرده'} icon="fa-solid fa-table-cells" />
              </div>
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
};

export default StyleSettings;
