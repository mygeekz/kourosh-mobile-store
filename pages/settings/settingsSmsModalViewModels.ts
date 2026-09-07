import type { Dispatch, SetStateAction } from 'react';
import type { SmsPatternDef } from '../../components/SmsBulkTestModal';

export type SettingsSmsPatternStudioModalViewModel = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  bodyId: string;
  tokenLabels: string[];
  previewTemplate: string;
  initialTab: 'preview' | 'send';
};

export type SettingsSmsBulkModalViewModel = {
  isOpen: boolean;
  onClose: () => void;
  patterns: SmsPatternDef[];
  defaultSelectedKeys: string[];
  getBodyId: (key: string) => string;
};

export type SettingsSmsModalViewModel = {
  patternStudio: SettingsSmsPatternStudioModalViewModel;
  bulkCheck: SettingsSmsBulkModalViewModel;
};

export type BuildSettingsSmsModalViewModelArgs = {
  smsCheckOpen: boolean;
  setSmsCheckOpen: Dispatch<SetStateAction<boolean>>;
  smsCheckTitle: string;
  smsCheckBodyId: string;
  smsCheckTokenLabels: string[];
  smsPrevOpen: boolean;
  setSmsPrevOpen: Dispatch<SetStateAction<boolean>>;
  smsPrevTitle: string;
  smsPrevTemplate: string;
  smsPrevTokenLabels: string[];
  smsBulkOpen: boolean;
  setSmsBulkOpen: Dispatch<SetStateAction<boolean>>;
  smsBulkDefaults: string[];
  meliPatternDefs: SmsPatternDef[];
  getSmsInfoString: (key: string) => string;
};

export const buildSettingsSmsModalViewModel = ({
  smsCheckOpen,
  setSmsCheckOpen,
  smsCheckTitle,
  smsCheckBodyId,
  smsCheckTokenLabels,
  smsPrevOpen,
  setSmsPrevOpen,
  smsPrevTitle,
  smsPrevTemplate,
  smsPrevTokenLabels,
  smsBulkOpen,
  setSmsBulkOpen,
  smsBulkDefaults,
  meliPatternDefs,
  getSmsInfoString,
}: BuildSettingsSmsModalViewModelArgs): SettingsSmsModalViewModel => {
  const initialTab = smsCheckOpen ? 'send' : 'preview';
  return {
    patternStudio: {
      isOpen: smsCheckOpen || smsPrevOpen,
      onClose: () => {
        setSmsCheckOpen(false);
        setSmsPrevOpen(false);
      },
      title: smsCheckOpen ? smsCheckTitle : smsPrevTitle,
      bodyId: smsCheckBodyId,
      tokenLabels: smsCheckOpen ? smsCheckTokenLabels : smsPrevTokenLabels,
      previewTemplate: smsPrevTemplate,
      initialTab,
    },
    bulkCheck: {
      isOpen: smsBulkOpen,
      onClose: () => setSmsBulkOpen(false),
      patterns: meliPatternDefs,
      defaultSelectedKeys: smsBulkDefaults,
      getBodyId: getSmsInfoString,
    },
  };
};
