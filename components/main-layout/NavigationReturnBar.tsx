import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../Button';
import NavigationBreadcrumbQuickPreview from './NavigationBreadcrumbQuickPreview';
import {
  buildNavigationReturnRestoreState,
  getNavigationReturnChain,
  getNavigationReturnRecord,
  removeNavigationReturnRecords,
  stripNavigationReturnParam,
  type NavigationReturnRecord,
} from '../../utils/navigationReturnContext';
import {
  buildOperationalNavigationBreadcrumb,
  type OperationalBreadcrumbStage,
} from '../../utils/operationalNavigationBreadcrumb';

type PreviewState = {
  stageKey: string;
  anchor: HTMLElement;
  pinned: boolean;
};

export const NavigationReturnBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const hidePreviewTimerRef = React.useRef<number | null>(null);
  const [previewState, setPreviewState] = React.useState<PreviewState | null>(null);
  const record = React.useMemo(
    () => getNavigationReturnRecord(location.search, location.state),
    [location.search, location.state],
  );
  const chain = React.useMemo(() => (record ? getNavigationReturnChain(record) : []), [record]);
  const stages = React.useMemo(
    () => (record ? buildOperationalNavigationBreadcrumb(record, location.pathname, location.search) : []),
    [location.pathname, location.search, record],
  );
  const previewStage = React.useMemo(
    () => (previewState ? stages.find((stage) => stage.key === previewState.stageKey) || null : null),
    [previewState, stages],
  );

  const cancelPreviewClose = React.useCallback(() => {
    if (hidePreviewTimerRef.current != null && typeof window !== 'undefined') {
      window.clearTimeout(hidePreviewTimerRef.current);
    }
    hidePreviewTimerRef.current = null;
  }, []);

  const closePreview = React.useCallback(() => {
    cancelPreviewClose();
    setPreviewState(null);
  }, [cancelPreviewClose]);

  const schedulePreviewClose = React.useCallback(() => {
    cancelPreviewClose();
    if (typeof window === 'undefined') return;
    hidePreviewTimerRef.current = window.setTimeout(() => {
      setPreviewState((current) => (current?.pinned ? current : null));
      hidePreviewTimerRef.current = null;
    }, 140);
  }, [cancelPreviewClose]);

  const showPreview = React.useCallback((stage: OperationalBreadcrumbStage, anchor: HTMLElement, pinned = false) => {
    if (!stage.preview) return;
    cancelPreviewClose();
    setPreviewState((current) => {
      if (!pinned && current?.pinned) return current;
      return { stageKey: stage.key, anchor, pinned };
    });
  }, [cancelPreviewClose]);

  const togglePinnedPreview = React.useCallback((stage: OperationalBreadcrumbStage, anchor: HTMLElement) => {
    if (!stage.preview) return;
    cancelPreviewClose();
    setPreviewState((current) => {
      if (current?.stageKey === stage.key && current.pinned) return null;
      return { stageKey: stage.key, anchor, pinned: true };
    });
  }, [cancelPreviewClose]);

  React.useEffect(() => {
    setPreviewState(null);
    return cancelPreviewClose;
  }, [cancelPreviewClose, location.key]);

  React.useEffect(() => {
    if (!previewState?.pinned || typeof document === 'undefined') return undefined;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (previewState.anchor.contains(target)) return;
      if (target instanceof Element && target.closest('[data-ui-breadcrumb-quick-preview="true"]')) return;
      setPreviewState(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewState(null);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [previewState]);

  if (!record) return null;

  const returnToRecord = (targetRecord: NavigationReturnRecord) => {
    closePreview();
    const targetIndex = chain.findIndex((item) => item.id === targetRecord.id);
    const recordsToClear = targetIndex >= 0 ? chain.slice(targetIndex) : [targetRecord];
    removeNavigationReturnRecords(recordsToClear.map((item) => item.id));
    navigate(targetRecord.originPath, {
      replace: true,
      state: buildNavigationReturnRestoreState(targetRecord),
    });
  };

  const handleReturn = () => {
    closePreview();
    removeNavigationReturnRecords([record.id]);
    navigate(record.originPath, {
      replace: true,
      state: buildNavigationReturnRestoreState(record),
    });
  };

  const handleDismiss = () => {
    closePreview();
    removeNavigationReturnRecords(chain.map((item) => item.id));
    const cleanPath = stripNavigationReturnParam(`${location.pathname}${location.search}`);
    navigate(`${cleanPath}${location.hash}`, { replace: true, state: {} });
  };

  const openStage = (stage: OperationalBreadcrumbStage) => {
    if (stage.current) return;
    closePreview();
    if (stage.record) {
      returnToRecord(stage.record as NavigationReturnRecord);
      return;
    }
    if (stage.path) navigate(stage.path, { replace: true, state: location.state });
  };

  return (
    <>
      <div
        className="border-b border-slate-200 bg-white/95 px-[var(--app-page-gap)] py-1.5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 print:hidden"
        data-ui-navigation-return="true"
        data-ui-operational-breadcrumb="true"
        role="navigation"
        aria-label="بازگشت به مبدا"
        dir="rtl"
      >
        <div className="mx-auto flex min-w-0 max-w-[1600px] items-center gap-2 sm:gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            <span className="hidden shrink-0 items-center gap-1.5 text-[10px] font-black text-slate-400 md:inline-flex dark:text-slate-500">
              <i className="fa-solid fa-route text-[10px]" aria-hidden="true" />
              مسیر بررسی
            </span>

            <div className="min-w-0 flex-1 overflow-x-auto" data-ui-operational-breadcrumb-scroll="true">
              <ol className="flex min-w-max items-center gap-1 whitespace-nowrap py-0.5" aria-label="مراحل بررسی">
                {stages.map((stage, index) => {
                  const hasPreview = Boolean(stage.preview);
                  const isPreviewOpen = previewState?.stageKey === stage.key;
                  return (
                    <React.Fragment key={stage.key}>
                      {index > 0 ? (
                        <li className="inline-flex shrink-0 items-center text-slate-300 dark:text-slate-700" aria-hidden="true">
                          <i className="fa-solid fa-chevron-left text-[8px]" />
                        </li>
                      ) : null}
                      <li
                        className="inline-flex min-w-0 shrink-0 items-center"
                        data-ui-breadcrumb-stage="true"
                        data-breadcrumb-stage-key={stage.key}
                        onMouseEnter={(event) => showPreview(stage, event.currentTarget, false)}
                        onMouseLeave={schedulePreviewClose}
                        onFocusCapture={(event) => showPreview(stage, event.currentTarget, false)}
                        onBlurCapture={(event) => {
                          if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                          schedulePreviewClose();
                        }}
                      >
                        {(stage.record || stage.path) && !stage.current ? (
                          <button
                            type="button"
                            onClick={() => openStage(stage)}
                            data-skip-global-button="true"
                            className="inline-flex h-7 max-w-[220px] items-center gap-1.5 rounded-lg px-1.5 text-[10.5px] font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100 dark:focus-visible:ring-slate-700 sm:max-w-[280px]"
                            title={stage.detail ? `${stage.label} — ${stage.detail}` : `بازگشت به ${stage.label}`}
                            aria-label={stage.record ? `بازگشت به ${stage.label}` : `رفتن به ${stage.label}`}
                          >
                            <i className={`${stage.iconClass} shrink-0 text-[9px]`} aria-hidden="true" />
                            <span className="truncate">{stage.label}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(event) => {
                              if (!hasPreview) return;
                              togglePinnedPreview(stage, event.currentTarget.closest<HTMLElement>('[data-ui-breadcrumb-stage="true"]') || event.currentTarget);
                            }}
                            data-skip-global-button="true"
                            className="inline-flex h-7 max-w-[230px] items-center gap-1.5 rounded-lg px-1.5 text-[10.5px] font-black text-slate-900 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:text-slate-100 dark:hover:bg-slate-900 dark:focus-visible:ring-slate-700 sm:max-w-[300px]"
                            title={stage.detail || stage.label}
                            aria-current={stage.current ? 'page' : undefined}
                            aria-haspopup={hasPreview ? 'dialog' : undefined}
                            aria-expanded={hasPreview ? isPreviewOpen : undefined}
                          >
                            <i className={`${stage.iconClass} shrink-0 text-[9px] text-slate-500 dark:text-slate-400`} aria-hidden="true" />
                            <span className="truncate">{stage.label}</span>
                          </button>
                        )}

                        {hasPreview ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              const anchor = event.currentTarget.closest<HTMLElement>('[data-ui-breadcrumb-stage="true"]') || event.currentTarget;
                              togglePinnedPreview(stage, anchor);
                            }}
                            data-skip-global-button="true"
                            className={`inline-flex h-7 w-6 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-200 dark:focus-visible:ring-slate-700 ${isPreviewOpen ? 'text-slate-700 dark:text-slate-200' : ''}`}
                            title={`پیش‌نمایش سریع ${stage.label}`}
                            aria-label={`پیش‌نمایش سریع ${stage.label}`}
                            aria-haspopup="dialog"
                            aria-expanded={isPreviewOpen}
                          >
                            <i className={`fa-solid ${previewState?.stageKey === stage.key && previewState.pinned ? 'fa-thumbtack' : 'fa-circle-info'} text-[9px]`} aria-hidden="true" />
                          </button>
                        ) : null}
                      </li>
                    </React.Fragment>
                  );
                })}
              </ol>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="xs"
            onClick={handleReturn}
            leftIcon={<i className="fa-solid fa-arrow-right" />}
            className="shrink-0"
            tooltip={`بازگشت به ${record.originTitle}`}
          >
            <span className="sr-only">بازگشت به همان تراکنش</span>
            <span className="hidden lg:inline" aria-hidden="true">یک مرحله بازگشت</span>
            <span className="lg:hidden" aria-hidden="true">بازگشت</span>
          </Button>
          <button
            type="button"
            onClick={handleDismiss}
            data-skip-global-button="true"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-transparent text-slate-400 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-200 dark:focus-visible:ring-slate-700"
            aria-label="بستن مسیر عملیاتی"
            title="بستن مسیر عملیاتی"
          >
            <i className="fa-solid fa-xmark text-[11px]" />
          </button>
        </div>
      </div>

      {previewState && previewStage?.preview ? (
        <NavigationBreadcrumbQuickPreview
          stage={previewStage}
          anchor={previewState.anchor}
          pinned={previewState.pinned}
          canOpenStage={Boolean((previewStage.record || previewStage.path) && !previewStage.current)}
          onOpenStage={() => openStage(previewStage)}
          onMouseEnter={cancelPreviewClose}
          onMouseLeave={schedulePreviewClose}
          onClose={closePreview}
        />
      ) : null}
    </>
  );
};

export default NavigationReturnBar;
