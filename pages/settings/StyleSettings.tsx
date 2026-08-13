import React from 'react';
import { useStyle } from '../../hooks/useStyle';
import { Button, PanelCard, RangeField, TextField } from '@/components/ui';
import ToggleSwitch from '../../components/ToggleSwitch';
import { APP_STYLE_TEMPLATES } from './styleTemplates';
import { STANDARD_STYLE_PALETTES, type StandardStylePalette } from '../../config/stylePalettes';
import { useSettingsStyleProfileState } from './useSettingsStyleProfileState';
import StyleButtonLab from './StyleButtonLab';
import { useStyleQualityStatus, type QualityReportStatus } from '../../hooks/useDashboardVisualQualityStatus';
import QualityBrowserRuntimeStatus from './QualityBrowserRuntimeStatus';

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
  const { status: styleQuality, loading: qualityLoading, refresh: refreshQuality } = useStyleQualityStatus();

  const qualityLabel = React.useCallback((report: QualityReportStatus) => {
    if (!report.hasReport) return 'هنوز اجرا نشده';
    if (report.failed > 0) return `${report.failed.toLocaleString('fa-IR')} خطا`;
    return 'سالم';
  }, []);

  const revealQualityReportDetails = React.useCallback((target: HTMLElement) => {
    const disclosure = target.querySelector<HTMLDetailsElement>('[data-ui-style-report-details="true"]');
    if (disclosure) disclosure.open = true;
  }, []);

  const scrollToQualitySection = React.useCallback((id: 'loading-button-quality' | 'dashboard-visual-quality' | 'pwa-platform-install-quality') => {
    const target = document.getElementById(id);
    if (!target) return;
    revealQualityReportDetails(target);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${id}`);
    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: style.reducedMotion ? 'auto' : 'smooth', block: 'start' });
    });
  }, [revealQualityReportDetails, style.reducedMotion]);

  React.useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    if (!['style-quality-center', 'loading-button-quality', 'dashboard-visual-quality', 'pwa-platform-install-quality'].includes(hash)) return;
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(hash);
      if (!target) return;
      if (hash !== 'style-quality-center') revealQualityReportDetails(target);
      target.scrollIntoView({ block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [revealQualityReportDetails]);

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
            <span><strong>رنگ فعال</strong><small>HSL {faNumber(style.primaryHue)} / {faNumber(style.primaryS)} / {faNumber(style.primaryL)}</small></span>
          </div>
          <span className="style-live-preview__nav"><i className="fa-solid fa-house" /> آیتم فعال</span>
          <TextField value="ورودی متن نمونه" readOnly aria-label="ورودی متن نمونه" icon={<i className="fa-solid fa-pen" />} />
          <div className="style-live-preview__actions">
            <Button type="button" variant="primary" size="sm" data-qa-style-focus-target="primary" leftIcon={<i className="fa-solid fa-check" />}>دکمه اصلی</Button>
            <Button type="button" variant="secondary" size="sm" data-qa-style-hover-target="secondary" leftIcon={<i className="fa-solid fa-eye" />}>دکمه ثانویه</Button>
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
          <details className="style-control-advanced">
            <summary><span><i className="fa-solid fa-droplet" />تنظیم دقیق رنگ برند</span><i className="fa-solid fa-chevron-down" /></summary>
            <div className="style-card-control-grid style-card-control-grid--three">
              <SliderField label="طیف رنگ" value={style.primaryHue} min={0} max={360} onChange={(value) => setMany({ palette: 'custom', brandMode: 'custom', primaryHue: value })} />
              <SliderField label="شدت رنگ" value={style.primaryS} min={40} max={100} onChange={(value) => setMany({ palette: 'custom', brandMode: 'custom', primaryS: value })} />
              <SliderField label="روشنایی" value={style.primaryL} min={22} max={70} onChange={(value) => setMany({ palette: 'custom', brandMode: 'custom', primaryL: value })} />
            </div>
          </details>
        </PanelCard>

        <div
          id="style-quality-center"
          className="style-settings-card--wide"
          aria-label="مرکز کنترل کیفیت استایل"
          data-ui-style-quality-center="true"
        >
          <PanelCard
            className="style-settings-card"
            title="مرکز کنترل کیفیت استایل"
            subtitle="آزمایش تعاملی دکمه‌ها، وضعیت مرورگر و گزارش‌های واقعی Loading، داشبورد و نصب PWA در یک پنل یکپارچه نمایش داده می‌شوند."
            icon={<i className="fa-solid fa-vial-circle-check" />}
            actions={(
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void refreshQuality()}
                loading={qualityLoading}
                loadingText="در حال بازخوانی وضعیت…"
                leftIcon={<i className="fa-solid fa-rotate" aria-hidden="true" />}
              >
                بازخوانی وضعیت
              </Button>
            )}
          >
            <QualityBrowserRuntimeStatus />

            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              <Button
                type="button"
                size="md"
                variant={styleQuality.loadingButton.failed > 0 ? 'warning' : 'secondary'}
                className="min-h-14 !justify-between !px-4"
                onClick={() => scrollToQualitySection('loading-button-quality')}
                leftIcon={<i className="fa-solid fa-spinner" aria-hidden="true" />}
              >
                <span className="flex min-w-0 flex-col items-start gap-0.5 text-right">
                  <span>گزارش دکمه‌های Loading</span>
                  <small className="text-xs font-black opacity-80">{qualityLabel(styleQuality.loadingButton)}</small>
                </span>
              </Button>
              <Button
                type="button"
                size="md"
                variant={styleQuality.dashboard.failed > 0 ? 'warning' : 'secondary'}
                className="min-h-14 !justify-between !px-4"
                onClick={() => scrollToQualitySection('dashboard-visual-quality')}
                leftIcon={<i className="fa-solid fa-chart-line" aria-hidden="true" />}
              >
                <span className="flex min-w-0 flex-col items-start gap-0.5 text-right">
                  <span>گزارش ماتریس داشبورد</span>
                  <small className="text-xs font-black opacity-80">{qualityLabel(styleQuality.dashboard)}</small>
                </span>
              </Button>
              <Button
                type="button"
                size="md"
                variant={styleQuality.pwaPlatformInstall.failed > 0 ? 'warning' : 'secondary'}
                className="min-h-14 !justify-between !px-4"
                onClick={() => scrollToQualitySection('pwa-platform-install-quality')}
                leftIcon={<i className="fa-solid fa-display" aria-hidden="true" />}
              >
                <span className="flex min-w-0 flex-col items-start gap-0.5 text-right">
                  <span>گزارش نصب PWA</span>
                  <small className="text-xs font-black opacity-80">{qualityLabel(styleQuality.pwaPlatformInstall)}</small>
                </span>
              </Button>
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <StyleButtonLab />
            </div>
          </PanelCard>
        </div>

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
