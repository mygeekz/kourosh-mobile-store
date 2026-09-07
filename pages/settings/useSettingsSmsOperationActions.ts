import { useCallback, type Dispatch, type SetStateAction } from 'react';

type UseSettingsSmsOperationActionsParams = {
  setSmsCheckTitle: Dispatch<SetStateAction<string>>;
  setSmsCheckBodyId: Dispatch<SetStateAction<string>>;
  setSmsCheckTokenLabels: Dispatch<SetStateAction<string[]>>;
  setSmsCheckOpen: Dispatch<SetStateAction<boolean>>;
  setSmsPrevTitle: Dispatch<SetStateAction<string>>;
  setSmsPrevTemplate: Dispatch<SetStateAction<string>>;
  setSmsPrevTokenLabels: Dispatch<SetStateAction<string[]>>;
  setSmsPrevOpen: Dispatch<SetStateAction<boolean>>;
  setSmsBulkDefaults: Dispatch<SetStateAction<string[]>>;
  setSmsBulkOpen: Dispatch<SetStateAction<boolean>>;
};

export function useSettingsSmsOperationActions({
  setSmsCheckTitle,
  setSmsCheckBodyId,
  setSmsCheckTokenLabels,
  setSmsCheckOpen,
  setSmsPrevTitle,
  setSmsPrevTemplate,
  setSmsPrevTokenLabels,
  setSmsPrevOpen,
  setSmsBulkDefaults,
  setSmsBulkOpen,
}: UseSettingsSmsOperationActionsParams) {
  const openSmsPatternCheck = useCallback((
    title: string,
    bodyId: string,
    tokenLabels: string[],
    previewTemplate = '',
  ) => {
    setSmsCheckTitle(title);
    setSmsCheckBodyId(bodyId || '');
    setSmsCheckTokenLabels(tokenLabels);
    setSmsPrevTitle(title);
    setSmsPrevTemplate(previewTemplate || '');
    setSmsPrevTokenLabels(tokenLabels);
    setSmsPrevOpen(false);
    setSmsCheckOpen(true);
  }, [
    setSmsCheckTitle,
    setSmsCheckBodyId,
    setSmsCheckTokenLabels,
    setSmsCheckOpen,
    setSmsPrevTitle,
    setSmsPrevTemplate,
    setSmsPrevTokenLabels,
    setSmsPrevOpen,
  ]);

  const openSmsPatternPreview = useCallback((
    title: string,
    previewTemplate: string,
    tokenLabels: string[],
    bodyId = '',
  ) => {
    setSmsPrevTitle(title);
    setSmsPrevTemplate(previewTemplate || '');
    setSmsPrevTokenLabels(tokenLabels);
    setSmsCheckTitle(title);
    setSmsCheckBodyId(bodyId || '');
    setSmsCheckTokenLabels(tokenLabels);
    setSmsCheckOpen(false);
    setSmsPrevOpen(true);
  }, [
    setSmsPrevTitle,
    setSmsPrevTemplate,
    setSmsPrevTokenLabels,
    setSmsPrevOpen,
    setSmsCheckTitle,
    setSmsCheckBodyId,
    setSmsCheckTokenLabels,
    setSmsCheckOpen,
  ]);

  const openSmsBulkPanel = useCallback(() => {
    setSmsBulkOpen(true);
  }, [setSmsBulkOpen]);

  const openSmsBulkCheck = useCallback((keys: string[]) => {
    setSmsBulkDefaults(keys);
    setSmsBulkOpen(true);
  }, [setSmsBulkDefaults, setSmsBulkOpen]);

  return {
    openSmsPatternCheck,
    openSmsPatternPreview,
    openSmsBulkPanel,
    openSmsBulkCheck,
  };
}
