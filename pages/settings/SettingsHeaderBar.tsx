import React from 'react';
import Button from '../../components/Button';
import ToggleSwitch from '../../components/ToggleSwitch';
import { Surface } from '@/components/ui';
type SettingsViewMode = 'simple' | 'advanced';

type SettingsHeaderBarProps = {
  infoChanged: boolean;
  isSaving: boolean;
  settingsViewMode: SettingsViewMode;
  setSettingsViewMode: (mode: SettingsViewMode) => void;
  onRevert: () => void;
  onSave: () => void;
};

const SettingsHeaderBar: React.FC<SettingsHeaderBarProps> = ({
  infoChanged,
  isSaving,
  settingsViewMode,
  setSettingsViewMode,
  onRevert,
  onSave,
}) => (
  <Surface
    surface="glass"
    variant="bar"
    scheme="adaptive"
    className="settings-command-bar relative z-0 -mx-4 rounded-none border-x-0 border-t-0 print:hidden"
    contentClassName="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3"
    data-ui-settings-header="true"
  >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <i className="fa-solid fa-gear" />
        </div>
        <div className="leading-tight">
          <div className="text-lg font-extrabold text-text">تنظیمات</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">پیکربندی حرفه‌ای فروشگاه، پیام‌رسانی، کاربران و امنیت داده‌ها</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`px-3 py-1 rounded-full text-xs border ${
            infoChanged
              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-800'
          }`}
          title={infoChanged ? 'تغییرات ذخیره‌نشده دارید' : 'همه چیز ذخیره شده است'}
        >
          {infoChanged ? 'تغییرات ذخیره‌نشده' : 'ذخیره شده'}
        </span>

        <div className="settings-view-toggle-control flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950/80" data-settings-view-toggle="true">
          <div className="text-right leading-tight">
            <div className="text-[11px] font-black text-slate-700 dark:text-slate-200">نمایش تنظیمات</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">{settingsViewMode === 'simple' ? 'ساده' : 'پیشرفته'}</div>
          </div>
          <ToggleSwitch
            checked={settingsViewMode === 'advanced'}
            onCheckedChange={(checked) => setSettingsViewMode(checked ? 'advanced' : 'simple')}
            ariaLabel="تغییر حالت نمایش تنظیمات"
            size="sm"
          />
        </div>

        <Button
          type="button"
          onClick={onRevert}
          disabled={!infoChanged || isSaving}
          variant="secondary"
          size="sm"
          className="settings-top-command"
          leftIcon={<i className="fa-solid fa-arrow-rotate-left" />}
        >
          بازگشت
        </Button>

        <Button
          type="button"
          onClick={onSave}
          disabled={!infoChanged || isSaving}
          loading={isSaving}
          loadingText="در حال ذخیره…"
          variant="primary"
          size="sm"
          className="settings-top-command"
          leftIcon={<i className="fa-solid fa-floppy-disk" />}
        >
          ذخیره تغییرات
        </Button>
      </div>
  </Surface>
);

export default SettingsHeaderBar;
