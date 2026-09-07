import React from 'react';
import { useStyle } from '../../hooks/useStyle';
import { Button, PanelCard, RangeField, TextField } from '@/components/ui';
import ToggleSwitch from '../../components/ToggleSwitch';
import { APP_STYLE_TEMPLATES } from './styleTemplates';
import { STANDARD_STYLE_PALETTES, type StandardStylePalette } from '../../config/stylePalettes';
import { useSettingsStyleProfileState } from './useSettingsStyleProfileState';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const faNumber = (value: number | string) => Number(value).toLocaleString('fa-IR');

type SegmentItem = {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: string;
  hint?: string;
};

const SegmentGroup: React.FC<{ label: string; items: SegmentItem[] }> = ({ label, items }) => (
  <div className="style-control-fieldset" role="group" aria-label={label}>
    <div className="style-control-fieldset__label">{label}</div>
    <div className="style-control-segments">
      {items.map((item) => (
        <Button
          key={item.label}
          type="button"
          size="sm"
          variant={item.active ? 'primary' : 'secondary'}
          aria-pressed={item.active}
          onClick={item.onClick}
          className="style-control-segment"
          leftIcon={item.icon ? <i className={item.icon} aria-hidden="true" /> : undefined}
        >
          <span className="style-control-segment__copy">
            <span>{item.label}</span>
            {item.hint ? <small>{item.hint}</small> : null}
          </span>
        </Button>
      ))}
    </div>
  </div>
);

const SliderField: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (value: number) => void;
}> = ({ label, value, min, max, suffix = '', onChange }) => (
  <label className="style-control-slider">
    <span className="style-control-slider__head">
      <span>{label}</span>
      <strong>{faNumber(value)}{suffix}</strong>
    </span>
    <RangeField
      controlOnly
      min={min}
      max={max}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      aria-label={label}
    />
  </label>
);

const hslToHex = (hue: number, saturation: number, lightness: number) => {
  const h = (((hue % 360) + 360) % 360) / 360;
  const s = clamp(saturation, 0, 100) / 100;
  const l = clamp(lightness, 0, 100) / 100;
  const hueToRgb = (p: number, q: number, tValue: number) => {
    let t = tValue;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + ((q - p) * 6 * t);
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + ((q - p) * (2 / 3 - t) * 6);
    return p;
  };
  let r = l;
  let g = l;
  let b = l;
  if (s !== 0) {
    const q = l < 0.5 ? l * (1 + s) : l + s - (l * s);
    const pValue = (2 * l) - q;
    r = hueToRgb(pValue, q, h + (1 / 3));
    g = hueToRgb(pValue, q, h);
    b = hueToRgb(pValue, q, h - (1 / 3));
  }
  const toHex = (channel: number) => Math.round(channel * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const hexToHsl = (hex: string) => {
  const normalized = hex.replace('#', '').trim();
  const parsed = Number.parseInt(normalized, 16);
  const r = ((parsed >> 16) & 255) / 255;
  const g = ((parsed >> 8) & 255) / 255;
  const b = (parsed & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * (((b - r) / delta) + 2);
    else hue = 60 * (((r - g) / delta) + 4);
  }
  if (hue < 0) hue += 360;
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs((2 * lightness) - 1));
  return {
    hue: Math.round(hue),
    saturation: Math.round(saturation * 100),
    lightness: Math.round(lightness * 100),
  };
};

const normalizeHexColor = (value: string) => {
  const normalized = value.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(normalized)) {
    const expanded = normalized.split('').map((char) => `${char}${char}`).join('');
    return `#${expanded.toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(normalized)) return `#${normalized.toUpperCase()}`;
  return null;
};

const ColorStateEditor: React.FC<{
  label: string;
  description: string;
  hue: number;
  saturation: number;
  lightness: number;
  state: 'primary' | 'press' | 'active';
  icon: string;
  onChange: (value: { hue: number; saturation: number; lightness: number }) => void;
}> = ({ label, description, hue, saturation, lightness, state, icon, onChange }) => {
  const liveHex = hslToHex(hue, saturation, lightness).toUpperCase();
  const [hexDraft, setHexDraft] = React.useState(liveHex);
  const normalizedDraft = normalizeHexColor(hexDraft);
  const hasHexError = hexDraft.trim().length > 0 && !normalizedDraft;

  React.useEffect(() => {
    setHexDraft(liveHex);
  }, [liveHex]);

  const commitHex = (value: string) => {
    const normalized = normalizeHexColor(value);
    if (!normalized) return false;
    onChange(hexToHsl(normalized));
    setHexDraft(normalized);
    return true;
  };

  const onHexInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let value = event.target.value.toUpperCase().replace(/\s+/g, '');
    if (value && !value.startsWith('#')) value = `#${value}`;
    value = value.slice(0, 7);
    setHexDraft(value);
    if (normalizeHexColor(value)) commitHex(value);
  };

  return (
    <div className="style-color-editor" data-style-color-state={state}>
      <div className="style-color-editor__head">
        <span className="style-color-editor__icon" aria-hidden="true"><i className={icon} /></span>
        <span className="style-color-editor__copy">
          <strong>{label}</strong>
          <small>{description}</small>
        </span>
      </div>

      <div className="style-color-editor__visual-row">
        <span className="style-color-editor__swatch" aria-hidden="true" />
        <label className="style-color-editor__picker-action">
          <TextField
            controlOnly
            unstyled
            type="color"
            className="style-color-editor__picker"
            value={liveHex}
            onChange={(event) => {
              const nextHex = event.target.value.toUpperCase();
              setHexDraft(nextHex);
              onChange(hexToHsl(nextHex));
            }}
            aria-label={`انتخاب بصری ${label}`}
          />
          <span><strong>انتخاب رنگ</strong><small>Color Picker</small></span>
          <i className="fa-solid fa-chevron-left" aria-hidden="true" />
        </label>
      </div>

      <div className="style-color-editor__hex-field">
        <span className="style-color-editor__hex-label">HEX</span>
        <TextField
          controlOnly
          value={hexDraft}
          onChange={onHexInputChange}
          onBlur={() => {
            if (!commitHex(hexDraft)) setHexDraft(liveHex);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur();
            }
          }}
          className="style-color-editor__hex-input"
          dir="ltr"
          inputMode="text"
          maxLength={7}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-label={`کد هگز ${label}`}
          aria-invalid={hasHexError || undefined}
        />
      </div>

      <div className="style-color-editor__meta" aria-live="polite">
        <span>HSL</span>
        <code dir="ltr">{hue} / {saturation}% / {lightness}%</code>
        {hasHexError ? <small>کد هگز باید مثل #1A73E8 باشد.</small> : null}
      </div>
    </div>
  );
};

const ToggleField: React.FC<{
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: string;
}> = ({ title, description, checked, onChange, icon }) => (
  <div className="style-control-toggle">
    <span className="style-control-toggle__icon" aria-hidden="true"><i className={icon} /></span>
    <span className="style-control-toggle__copy">
      <strong>{title}</strong>
      <small>{description}</small>
    </span>
    <ToggleSwitch checked={checked} onCheckedChange={onChange} ariaLabel={title} size="sm" />
  </div>
);

const PaletteChoice: React.FC<{
  tone: StandardStylePalette;
  title: string;
  active: boolean;
  onClick: () => void;
}> = ({ tone, title, active, onClick }) => (
  <Button
    type="button"
    variant="secondary"
    size="sm"
    aria-label={title}
    aria-pressed={active}
    data-palette-choice={tone}
    className="style-palette-choice"
    onClick={onClick}
    leftIcon={<span className="style-palette-choice__swatch" aria-hidden="true" />}
    rightIcon={<i className={active ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'} aria-hidden="true" />}
  >
    {title}
  </Button>
);

const StyleSettings: React.FC = () => {
  const { style, setStyle, setMany, resetStyle, syncBrandFromStoreName } = useStyle();
  const {
    styleProfileName,
    setStyleProfileName,
    styleProfiles,
    activeStyleProfile,
    getAppStyleTemplateState,
    getSavedStyleProfileState,
    saveCurrentStyleProfile,
    applyStyleProfile,
    deleteStyleProfile,
    applyAppStyleTemplate,
    reapplyActiveStyleProfile,
    updateActiveSavedStyleProfile,
    clearActiveStyleProfile,
  } = useSettingsStyleProfileState(style, setMany);
  const resetStyleWorkspace = () => {
    clearActiveStyleProfile();
    resetStyle();
  };

  const applyPalette = (palette: StandardStylePalette) => {
    const preset = STANDARD_STYLE_PALETTES[palette];
    setMany({
      palette,
      brandMode: 'custom',
      primaryHue: preset.hue,
      primaryS: preset.saturation,
      primaryL: preset.lightness,
      buttonPreset: preset.buttonPreset,
      buttonPressHue: preset.buttonPress.hue,
      buttonPressS: preset.buttonPress.saturation,
      buttonPressL: preset.buttonPress.lightness,
      buttonActiveHue: preset.buttonActive.hue,
      buttonActiveS: preset.buttonActive.saturation,
      buttonActiveL: preset.buttonActive.lightness,
    });
  };

  return (
    <div className="style-workspace" data-ui-style-control-center="true" dir="rtl">
      <header className="style-workspace__header">
        <div className="style-workspace__title">
          <span className="style-workspace__title-icon" aria-hidden="true"><i className="fa-solid fa-palette" /></span>
          <span>
            <strong>شخصی‌سازی ظاهر</strong>
            <small>کنترل یکپارچه رنگ، چیدمان، اجزا و دسترس‌پذیری رابط کاربری</small>
          </span>
        </div>
        <div className="style-workspace__actions">
          <Button type="button" variant="secondary" size="sm" onClick={resetStyleWorkspace} leftIcon={<i className="fa-solid fa-rotate-left" />}>بازنشانی</Button>
          <Button type="button" variant="primary" size="sm" onClick={saveCurrentStyleProfile} leftIcon={<i className="fa-solid fa-floppy-disk" />}>ذخیره پروفایل</Button>
        </div>
      </header>

      <section className="style-live-preview" aria-labelledby="style-live-preview-title">
        <div className="style-live-preview__header">
          <span id="style-live-preview-title"><i className="fa-solid fa-eye" /> پیش‌نمایش زنده</span>
          <small>نمای واقعی اجزای اصلی با تنظیمات فعلی</small>
        </div>
        <div className="style-live-preview__content">
          <div className="style-live-preview__brand">
            <span className="style-live-preview__swatch" aria-hidden="true" />
            <span><strong>رنگ فعال</strong><small dir="ltr">{hslToHex(style.primaryHue, style.primaryS, style.primaryL).toUpperCase()} • HSL {style.primaryHue} / {style.primaryS} / {style.primaryL}</small></span>
          </div>
          <span className="style-live-preview__nav"><i className="fa-solid fa-house" /> آیتم فعال</span>
          <TextField value="ورودی متن نمونه" readOnly aria-label="ورودی متن نمونه" icon={<i className="fa-solid fa-pen" />} />
          <div className="style-live-preview__actions">
            <Button type="button" variant="primary" size="sm" data-qa-style-focus-target="primary" leftIcon={<i className="fa-solid fa-check" />}>عادی</Button>
            <Button type="button" variant="primary" size="sm" data-style-button-preview-state="press" leftIcon={<i className="fa-solid fa-hand-pointer" />}>هنگام کلیک</Button>
            <Button type="button" variant="secondary" size="sm" aria-pressed="true" data-style-button-preview-state="active" leftIcon={<i className="fa-solid fa-circle-check" />}>بعد از کلیک</Button>
            <Button type="button" variant="secondary" size="sm" data-qa-style-hover-target="secondary" leftIcon={<i className="fa-solid fa-eye" />}>ثانویه</Button>
          </div>
          <div className="style-live-preview__card">
            <i className="fa-solid fa-chart-line" />
            <span><strong>کارت نمونه</strong><small>سطح و فاصله استاندارد</small></span>
          </div>
        </div>
      </section>

      <div className="style-settings-grid">
        <PanelCard className="style-settings-card" title="حالت نمایش و رنگ سازمانی" subtitle="تم و رنگ مرجع کل رابط را انتخاب کن." icon={<i className="fa-solid fa-sun" />}>
          <SegmentGroup label="حالت نمایش" items={[
            { label: 'روشن', icon: 'fa-solid fa-sun', active: style.theme === 'light', onClick: () => setStyle('theme', 'light') },
            { label: 'تیره', icon: 'fa-solid fa-moon', active: style.theme === 'dark', onClick: () => setStyle('theme', 'dark') },
            { label: 'سیستم', icon: 'fa-solid fa-laptop', active: style.theme === 'system', onClick: () => setStyle('theme', 'system') },
          ]} />
          <div className="style-control-fieldset">
            <div className="style-control-fieldset__label">رنگ سازمانی</div>
            <div className="style-palette-grid">
              <PaletteChoice tone="aurora" title="لوکس اجرایی" active={style.palette === 'aurora'} onClick={() => applyPalette('aurora')} />
              <PaletteChoice tone="classic" title="کلاسیک iOS" active={style.palette === 'classic'} onClick={() => applyPalette('classic')} />
              <PaletteChoice tone="ocean" title="اقیانوس" active={style.palette === 'ocean'} onClick={() => applyPalette('ocean')} />
              <PaletteChoice tone="sunset" title="فروش گرم" active={style.palette === 'sunset'} onClick={() => applyPalette('sunset')} />
              <PaletteChoice tone="midnight" title="شب حرفه‌ای" active={style.palette === 'midnight'} onClick={() => applyPalette('midnight')} />
              <PaletteChoice tone="gold" title="طلایی مات" active={style.palette === 'gold'} onClick={() => applyPalette('gold')} />
            </div>
            {style.palette === 'custom' ? (
              <div className="style-custom-palette-status" aria-live="polite">
                <span><i className="fa-solid fa-sliders" aria-hidden="true" />پالت سفارشی فعال است</span>
                <code dir="ltr">{hslToHex(style.primaryHue, style.primaryS, style.primaryL).toUpperCase()}</code>
              </div>
            ) : null}
          </div>
          <Button type="button" variant="secondary" size="sm" className="style-control-wide-action" onClick={() => syncBrandFromStoreName(style.brandSource)} leftIcon={<i className="fa-solid fa-store" />}>هماهنگ‌سازی با نام فروشگاه</Button>
        </PanelCard>

        <PanelCard className="style-settings-card" title="چیدمان و تراکم" subtitle="فضای صفحه و نمایش داده‌ها را متناسب با مانیتور تنظیم کن." icon={<i className="fa-solid fa-table-cells-large" />}>
          <div className="style-card-control-grid style-card-control-grid--two">
            <SegmentGroup label="تراکم رابط" items={[
              { label: 'فشرده', icon: 'fa-solid fa-compress', active: style.uiDensity === 'compact', onClick: () => setStyle('uiDensity', 'compact') },
              { label: 'راحت', icon: 'fa-solid fa-expand', active: style.uiDensity === 'comfortable', onClick: () => setStyle('uiDensity', 'comfortable') },
            ]} />
            <SegmentGroup label="تراکم جدول مالی" items={[
              { label: 'راحت', active: style.financeTableDensity === 'comfortable', onClick: () => setStyle('financeTableDensity', 'comfortable') },
              { label: 'فشرده', active: style.financeTableDensity === 'compact', onClick: () => setStyle('financeTableDensity', 'compact') },
              { label: 'حداکثر', active: style.financeTableDensity === 'ultra', onClick: () => setStyle('financeTableDensity', 'ultra') },
            ]} />
          </div>
          <div className="style-card-control-grid style-card-control-grid--two">
            <SliderField label="عرض سایدبار" value={style.sidebarPillWidthPx} min={196} max={280} suffix="px" onChange={(value) => setStyle('sidebarPillWidthPx', clamp(value, 196, 280))} />
            <SliderField label="اندازه آیکن سایدبار" value={style.sidebarIconPx} min={24} max={34} suffix="px" onChange={(value) => setStyle('sidebarIconPx', clamp(value, 24, 34))} />
          </div>
          <ToggleField title="نشانگر صفحه فعال" description="صفحه جاری را در سایدبار مشخص می‌کند." checked={style.showInkBar} onChange={(value) => setStyle('showInkBar', value)} icon="fa-solid fa-location-dot" />
        </PanelCard>

        <PanelCard className="style-settings-card" title="فرم‌ها و اجزای رابط" subtitle="هندسه کنترل‌ها، کارت‌ها و دکمه‌های استاندارد را مدیریت کن." icon={<i className="fa-solid fa-cube" />}>
          <div className="style-card-control-grid style-card-control-grid--three">
            <SliderField label="گردی کنترل‌ها" value={style.controlRadiusPx} min={12} max={20} suffix="px" onChange={(value) => setStyle('controlRadiusPx', clamp(value, 12, 20))} />
            <SliderField label="گردی کارت‌ها" value={style.cardRadiusPx} min={16} max={28} suffix="px" onChange={(value) => setStyle('cardRadiusPx', clamp(value, 16, 28))} />
            <SliderField label="گردی دکمه‌ها" value={style.buttonRadiusPx} min={14} max={28} suffix="px" onChange={(value) => setStyle('buttonRadiusPx', clamp(value, 14, 28))} />
          </div>
          <SegmentGroup label="سبک دکمه‌ها" items={[
            { label: 'برند', active: style.buttonPreset === 'classic', onClick: () => setStyle('buttonPreset', 'classic') },
            { label: 'لوکس', active: style.buttonPreset === 'luxury', onClick: () => setStyle('buttonPreset', 'luxury') },
            { label: 'آبی', active: style.buttonPreset === 'ocean', onClick: () => setStyle('buttonPreset', 'ocean') },
            { label: 'گرم', active: style.buttonPreset === 'sunset', onClick: () => setStyle('buttonPreset', 'sunset') },
            { label: 'خنثی', active: style.buttonPreset === 'mono', onClick: () => setStyle('buttonPreset', 'mono') },
          ]} />
          <div className="style-color-palette" role="group" aria-label="پالت رنگ دکمه‌ها">
            <div className="style-color-palette__header">
              <span>
                <strong>پالت رنگ دکمه‌ها</strong>
                <small>رنگ اصلی، لحظه کلیک و حالت انتخاب‌شده را مستقل و با Color Picker یا کد HEX تنظیم کن.</small>
              </span>
              <span className="style-color-palette__badge">۳ حالت مستقل</span>
            </div>

            <div className="style-color-editor-grid">
              <ColorStateEditor
                state="primary"
                icon="fa-solid fa-droplet"
                label="عادی / قبل از کلیک"
                description="رنگ اصلی برند و دکمه‌های Primary"
                hue={style.primaryHue}
                saturation={style.primaryS}
                lightness={style.primaryL}
                onChange={(value) => setMany({
                  palette: 'custom',
                  brandMode: 'custom',
                  primaryHue: value.hue,
                  primaryS: value.saturation,
                  primaryL: value.lightness,
                })}
              />
              <ColorStateEditor
                state="press"
                icon="fa-solid fa-hand-pointer"
                label="هنگام کلیک"
                description="رنگ لحظه‌ای Pointer/Mouse Down و :active"
                hue={style.buttonPressHue}
                saturation={style.buttonPressS}
                lightness={style.buttonPressL}
                onChange={(value) => setMany({
                  buttonPressHue: value.hue,
                  buttonPressS: value.saturation,
                  buttonPressL: value.lightness,
                })}
              />
              <ColorStateEditor
                state="active"
                icon="fa-solid fa-circle-check"
                label="بعد از کلیک / انتخاب‌شده"
                description="رنگ پایدار Tab، فیلتر، Toggle و کنترل انتخاب‌شده"
                hue={style.buttonActiveHue}
                saturation={style.buttonActiveS}
                lightness={style.buttonActiveL}
                onChange={(value) => setMany({
                  buttonActiveHue: value.hue,
                  buttonActiveS: value.saturation,
                  buttonActiveL: value.lightness,
                })}
              />
            </div>

            <div className="style-color-palette__note">
              <i className="fa-solid fa-circle-info" aria-hidden="true" />
              <span>با وارد کردن HEX برای رنگ اصلی، پالت روی حالت «سفارشی» می‌رود؛ رنگ کلیک و انتخاب‌شده مستقل باقی می‌مانند.</span>
            </div>
          </div>
          <div className="style-card-control-grid style-card-control-grid--two">
            <SegmentGroup label="سایه" items={[
              { label: 'کم', active: style.buttonShadow === 'soft', onClick: () => setStyle('buttonShadow', 'soft') },
              { label: 'متوسط', active: style.buttonShadow === 'medium', onClick: () => setStyle('buttonShadow', 'medium') },
              { label: 'زیاد', active: style.buttonShadow === 'strong', onClick: () => setStyle('buttonShadow', 'strong') },
            ]} />
            <SegmentGroup label="حرکت" items={[
              { label: 'آرام', active: style.buttonMotion === 'calm', onClick: () => setStyle('buttonMotion', 'calm') },
              { label: 'متعادل', active: style.buttonMotion === 'balanced', onClick: () => setStyle('buttonMotion', 'balanced') },
              { label: 'پویا', active: style.buttonMotion === 'expressive', onClick: () => setStyle('buttonMotion', 'expressive') },
            ]} />
          </div>
        </PanelCard>

        <PanelCard className="style-settings-card" title="دسترس‌پذیری" subtitle="خوانایی و حرکت رابط را برای شرایط مختلف بهینه کن." icon={<i className="fa-solid fa-universal-access" />}>
          <div className="style-accessibility-list">
            <ToggleField title="کنتراست بیشتر" description="مرزها و متن‌های کم‌رنگ را واضح‌تر می‌کند." checked={style.highContrast} onChange={(value) => setStyle('highContrast', value)} icon="fa-solid fa-circle-half-stroke" />
            <ToggleField title="کاهش حرکت" description="انیمیشن‌های غیرضروری رابط را محدود می‌کند." checked={style.reducedMotion} onChange={(value) => setStyle('reducedMotion', value)} icon="fa-solid fa-person-walking-arrow-loop-left" />
          </div>

        </PanelCard>

        <PanelCard className="style-settings-card style-settings-card--wide" title="پروفایل‌های ظاهری" subtitle="یک ترکیب آماده اعمال کن یا تنظیم فعلی را برای استفاده بعدی نگه دار." icon={<i className="fa-solid fa-bookmark" />}>
          {activeStyleProfile ? (
            <div className="style-profile-row" aria-live="polite" data-style-profile-state={activeStyleProfile.modified ? 'modified' : 'active'}>
              <span className="style-profile-row__icon" aria-hidden="true">
                <i className={activeStyleProfile.modified ? 'fa-solid fa-pen-to-square' : 'fa-solid fa-circle-check'} />
              </span>
              <span className="style-profile-row__copy">
                <strong>{activeStyleProfile.name}</strong>
                <small>{activeStyleProfile.modified ? 'تغییر یافته نسبت به پروفایل' : activeStyleProfile.kind === 'template' ? 'قالب آماده فعال است' : 'پروفایل ذخیره‌شده فعال است'}</small>
              </span>
              {activeStyleProfile.modified ? (
                <div className="flex flex-wrap justify-end gap-2">
                  {activeStyleProfile.kind === 'saved' ? (
                    <Button type="button" size="xs" variant="primary" onClick={updateActiveSavedStyleProfile} leftIcon={<i className="fa-solid fa-floppy-disk" />}>به‌روزرسانی همین پروفایل</Button>
                  ) : null}
                  <Button type="button" size="xs" variant="secondary" onClick={reapplyActiveStyleProfile} leftIcon={<i className="fa-solid fa-rotate-left" />}>بازاعمال</Button>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-extrabold text-primary"><i className="fa-solid fa-check" aria-hidden="true" />فعال</span>
              )}
            </div>
          ) : (
            <div className="style-profile-empty">پروفایل مشخصی فعال نیست؛ یک قالب آماده را اعمال کن یا تنظیم فعلی را ذخیره کن.</div>
          )}

          <div className="style-template-grid">
            {APP_STYLE_TEMPLATES.map((template) => {
              const templateState = getAppStyleTemplateState(template);
              return (
                <Button
                  key={template.key}
                  type="button"
                  variant="secondary"
                  className="style-template-card"
                  aria-pressed={templateState !== 'idle'}
                  data-style-profile-state={templateState}
                  onClick={() => applyAppStyleTemplate(template)}
                  leftIcon={<i className={template.icon} />}
                  rightIcon={templateState === 'active'
                    ? <i className="fa-solid fa-circle-check" aria-hidden="true" />
                    : templateState === 'modified'
                      ? <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
                      : undefined}
                >
                  <span className="style-template-card__copy">
                    <strong>{template.label}</strong>
                    <small>{templateState === 'active' ? `فعال • ${template.hint}` : templateState === 'modified' ? `تغییر یافته • ${template.hint}` : template.hint}</small>
                  </span>
                </Button>
              );
            })}
          </div>
          <div className="style-profile-create">
            <TextField value={styleProfileName} onChange={(event) => setStyleProfileName(event.target.value)} label="نام پروفایل جدید" placeholder="مثلاً نمای صندوق فروش" icon={<i className="fa-solid fa-pen" />} />
            <Button type="button" variant="primary" onClick={saveCurrentStyleProfile} leftIcon={<i className="fa-solid fa-floppy-disk" />}>ذخیره تنظیم فعلی</Button>
          </div>
          <div className="style-profile-list" aria-label="پروفایل‌های ذخیره‌شده">
            {styleProfiles.length ? styleProfiles.map((profile) => {
              const profileState = getSavedStyleProfileState(profile);
              return (
                <div key={profile.id} className="style-profile-row" data-style-profile-state={profileState}>
                  <span className="style-profile-row__icon" aria-hidden="true"><i className={profileState === 'active' ? 'fa-solid fa-circle-check' : profileState === 'modified' ? 'fa-solid fa-pen-to-square' : 'fa-solid fa-bookmark'} /></span>
                  <span className="style-profile-row__copy">
                    <strong>{profile.name}</strong>
                    <small>{profileState === 'active' ? 'فعال' : profileState === 'modified' ? 'تغییر یافته نسبت به پروفایل' : new Date(profile.createdAt).toLocaleDateString('fa-IR-u-ca-persian')}</small>
                  </span>
                  <Button
                    type="button"
                    size="xs"
                    variant={profileState === 'active' ? 'primary' : 'secondary'}
                    onClick={() => applyStyleProfile(profile)}
                    leftIcon={<i className={profileState === 'active' ? 'fa-solid fa-check' : 'fa-solid fa-rotate-left'} />}
                  >
                    {profileState === 'active' ? 'فعال' : profileState === 'modified' ? 'بازاعمال' : 'اعمال'}
                  </Button>
                  <Button type="button" size="xs" variant="danger" aria-label={`حذف ${profile.name}`} onClick={() => deleteStyleProfile(profile.id)} leftIcon={<i className="fa-solid fa-trash" />} />
                </div>
              );
            }) : <div className="style-profile-empty">هنوز پروفایل اختصاصی ذخیره نشده است.</div>}
          </div>
        </PanelCard>
      </div>
    </div>
  );
};

export default StyleSettings;
