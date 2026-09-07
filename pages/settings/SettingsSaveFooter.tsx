import React from 'react';
import Button from '../../components/Button';
import type { TabKey } from './settingsHelpers';
import { Surface } from '@/components/ui';
type SettingsSaveFooterProps = {
  tab: TabKey;
  infoChanged: boolean;
  isSaving: boolean;
  onSave: () => void;
};

const SettingsSaveFooter: React.FC<SettingsSaveFooterProps> = ({ tab, infoChanged, isSaving, onSave }) => {
  if (tab !== 'business' && tab !== 'sms' && tab !== 'local') return null;

  return (
    <Surface
      surface="glass"
      variant="bar"
      scheme="adaptive"
      className="settings-save-footer relative z-0 rounded-none border-x-0 border-b-0 print:hidden"
      contentClassName="mx-auto flex max-w-7xl justify-end p-4"
      data-ui-settings-save-footer="true"
    >
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
    </Surface>
  );
};

export default SettingsSaveFooter;
