import type { Dispatch, SetStateAction } from 'react';
import type { SmsPatternDef } from '../../components/SmsBulkTestModal';

export type SettingsSmsPatternTestModalViewModel = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  bodyId: string;
  tokenLabels: string[];
};

export type SettingsSmsPatternPreviewModalViewModel = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  tokenLabels: string[];
  previewTemplate: string;
};

export type SettingsSmsBulkModalViewModel = {
  isOpen: boolean;
  onClose: () => void;
  patterns: SmsPatternDef[];
  defaultSelectedKeys: string[];
  getBodyId: (key: string) => string;
};

export type SettingsSmsModalViewModel = {
  patternTest: SettingsSmsPatternTestModalViewModel;
  patternPreview: SettingsSmsPatternPreviewModalViewModel;
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
}: BuildSettingsSmsModalViewModelArgs): SettingsSmsModalViewModel => ({
  patternTest: {
    isOpen: smsCheckOpen,
    onClose: () => setSmsCheckOpen(false),
    title: smsCheckTitle,
    bodyId: smsCheckBodyId,
    tokenLabels: smsCheckTokenLabels,
  },
  patternPreview: {
    isOpen: smsPrevOpen,
    onClose: () => setSmsPrevOpen(false),
    title: smsPrevTitle,
    tokenLabels: smsPrevTokenLabels,
    previewTemplate: smsPrevTemplate,
  },
  bulkCheck: {
    isOpen: smsBulkOpen,
    onClose: () => setSmsBulkOpen(false),
    patterns: meliPatternDefs,
    defaultSelectedKeys: smsBulkDefaults,
    getBodyId: getSmsInfoString,
  },
});
