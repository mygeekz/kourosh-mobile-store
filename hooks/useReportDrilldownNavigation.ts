import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  getNavigationReturnRestoreRecord,
  navigateWithReturnContext,
  type ReportDrilldownReturnUiState,
} from '../utils/navigationReturnContext';
import type { NavigationEntityLabelContext } from '../utils/navigationEntityLabelResolver';

type ReportUiState = Record<string, unknown>;

type DrilldownOptions = {
  contextLabel?: string;
  anchorId?: string;
  targetEntity?: NavigationEntityLabelContext;
};

type UseReportDrilldownNavigationOptions<T extends ReportUiState> = {
  reportKey: string;
  uiState: T;
  restoreUiState: (state: T) => void;
};

const getClosestNavigationAnchor = (target: EventTarget | null): string | undefined => {
  if (!(target instanceof Element)) return undefined;
  const node = target.closest<HTMLElement>('[data-navigation-anchor]');
  const value = node?.dataset.navigationAnchor?.trim();
  return value || undefined;
};

export const reportNavigationAnchor = (reportKey: string, entityKey: string | number) =>
  `report:${String(reportKey).trim()}:${String(entityKey).trim()}`;

export const useReportDrilldownNavigation = <T extends ReportUiState>({
  reportKey,
  uiState,
  restoreUiState,
}: UseReportDrilldownNavigationOptions<T>) => {
  const location = useLocation();
  const navigate = useNavigate();
  const restoreRef = React.useRef(restoreUiState);
  const appliedRestoreIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    restoreRef.current = restoreUiState;
  }, [restoreUiState]);

  React.useEffect(() => {
    const record = getNavigationReturnRestoreRecord(location.state);
    if (!record || appliedRestoreIdRef.current === record.id) return;
    const reportState = record.originUiState as ReportDrilldownReturnUiState | undefined;
    if (!reportState || reportState.kind !== 'report-drilldown' || reportState.reportKey !== reportKey) return;
    appliedRestoreIdRef.current = record.id;
    restoreRef.current((reportState.state || {}) as T);
  }, [location.key, location.state, reportKey]);

  const openDrilldown = React.useCallback((targetPath: string, options: DrilldownOptions = {}) => {
    const originPath = `${location.pathname}${location.search}${location.hash}`;
    navigateWithReturnContext(navigate, targetPath, {
      originPath,
      originPathname: location.pathname,
      originContextLabel: options.contextLabel,
      originAnchorId: options.anchorId,
      originUiState: {
        kind: 'report-drilldown',
        reportKey,
        state: uiState,
      },
      targetEntity: options.targetEntity,
    });
  }, [location.hash, location.pathname, location.search, navigate, reportKey, uiState]);

  const onDrilldownClick = React.useCallback((
    event: React.MouseEvent<HTMLElement>,
    targetPath: string,
    options: DrilldownOptions = {},
  ) => {
    if (event.defaultPrevented) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const anchorId = options.anchorId || getClosestNavigationAnchor(event.currentTarget);
    openDrilldown(targetPath, { ...options, anchorId });
  }, [openDrilldown]);

  return { openDrilldown, onDrilldownClick };
};

export default useReportDrilldownNavigation;
