import React from 'react';
import Button from '../../components/Button';
import type { TabKey } from './settingsHelpers';

type SettingsSaveFooterProps = {
  tab: TabKey;
  infoChanged: boolean;
  isSaving: boolean;
  onSave: () => void;
};

const SettingsSaveFooter: React.FC<SettingsSaveFooterProps> = ({ tab, infoChanged, isSaving, onSave }) => {
  if (tab !== 'business' && tab !== 'sms' && tab !== 'local') return null;

  return (
    <div className="settings-save-footer sticky bottom-0 right-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-4 border-t dark:border-gray-700 z-40 print:hidden" data-ui-settings-save-footer="true">
      <div className="max-w-7xl mx-auto flex justify-end">
        <Button
          type="submit"
          form={tab === 'business' ? 'settings-form' : undefined}
          onClick={tab === 'sms' || tab === 'local' ? onSave : undefined}
          disabled={tab === 'business' || tab === 'local' ? !infoChanged || isSaving : isSaving}
          loading={isSaving}
          loadingText="در حال ذخیره تغییرات..."
          variant="primary"
          leftIcon={<i className="fa-solid fa-floppy-disk" />}
        >
          ذخیره تغییرات تنظیمات
        </Button>
      </div>
    </div>
  );
};

export default SettingsSaveFooter;
