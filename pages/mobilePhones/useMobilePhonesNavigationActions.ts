import type { PhoneEntry, PhoneHistoryEventClass, PhoneStatus } from '../../types';
import type { DashboardDrilldown, DetailsTab, InventoryViewMode, InventoryWorkspace } from './mobilePhonesControllerSupport';

type SelectionPreset = { kind: string; label: string } | null | undefined;

type MobilePhonesNavigationActionParams = {
  inventorySellableStatuses: PhoneStatus[];
  setWorkspace: (value: InventoryWorkspace) => void;
  setInventoryViewMode: (value: InventoryViewMode) => void;
  setShouldFocusExplorer: (value: boolean) => void;
  setSelectedPhoneIds: (value: number[] | ((prev: number[]) => number[])) => void;
  setDetailsTab: (value: DetailsTab) => void;
  setHistoryExplorerFilters: (value: any) => void;
  setPendingBulkAction: (value: any) => void;
  setBulkStatusTarget: (value: any) => void;
  setNotification: (value: any) => void;
  openDetailsModal: (phone: PhoneEntry) => void;
  applyDashboardDrilldown: (drilldown: DashboardDrilldown) => void;
  getSelectionPreset: () => SelectionPreset;
  getSelectedPhones: () => PhoneEntry[];
};

export function useMobilePhonesNavigationActions({
  inventorySellableStatuses,
  setWorkspace,
  setInventoryViewMode,
  setShouldFocusExplorer,
  setSelectedPhoneIds,
  setDetailsTab,
  setHistoryExplorerFilters,
  setPendingBulkAction,
  setBulkStatusTarget,
  setNotification,
  openDetailsModal,
  applyDashboardDrilldown,
  getSelectionPreset,
  getSelectedPhones,
}: MobilePhonesNavigationActionParams) {
  const focusInventoryExplorer = () => {
    setWorkspace('inventory');
    setInventoryViewMode('table');
    setShouldFocusExplorer(true);
  };

  const focusInsightsWorkspace = () => {
    setWorkspace('insights');
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const deriveSelectionDrilldown = (items: PhoneEntry[]): DashboardDrilldown => {
    if (!items.length) return { kind: 'none', value: '', label: '' };
    const allSameModel = items.every((phone) => String(phone.model || '').trim() === String(items[0]?.model || '').trim());
    const allSameSupplier = items.every((phone) => String(phone.supplierName || '').trim() === String(items[0]?.supplierName || '').trim());
    const allReturned = items.every((phone) => String(phone.status || '').includes('مرجوع'));
    const allMissingSale = items.every((phone) => !(Number(phone.salePrice || 0) > 0));
    const allLowBattery = items.every((phone) => Number(phone.batteryHealth || 0) > 0 && Number(phone.batteryHealth || 0) < 80);
    const allReadyForSale = items.every((phone) => inventorySellableStatuses.includes(phone.status) && Number(phone.salePrice || 0) > 0);
    if (allReturned) return { kind: 'none', value: '', label: 'مرجوعی‌های همین عملیات' };
    if (allSameSupplier && String(items[0]?.supplierName || '').trim()) return { kind: 'supplier', value: String(items[0]?.supplierName || '').trim(), label: String(items[0]?.supplierName || '').trim() };
    if (allSameModel && String(items[0]?.model || '').trim()) return { kind: 'model', value: String(items[0]?.model || '').trim(), label: String(items[0]?.model || '').trim() };
    if (allMissingSale) return { kind: 'missingSale', value: 'missing-sale', label: 'بی‌قیمت‌های همین عملیات' };
    if (allLowBattery) return { kind: 'lowBattery', value: 'low-battery', label: 'کم‌باتری‌های همین عملیات' };
    if (allReadyForSale) return { kind: 'readyForSale', value: 'ready-for-sale', label: 'آماده‌فروش‌های همین عملیات' };
    return { kind: 'none', value: '', label: '' };
  };

  const focusPhoneEntity = (phone: PhoneEntry, options?: { detailsTab?: DetailsTab; workspaceMode?: InventoryWorkspace; viewMode?: InventoryViewMode; focusExplorer?: boolean }) => {
    setSelectedPhoneIds([phone.id]);
    if (options?.workspaceMode) setWorkspace(options.workspaceMode);
    if (options?.viewMode) setInventoryViewMode(options.viewMode);
    if (options?.focusExplorer) setShouldFocusExplorer(true);
    window.requestAnimationFrame(() => {
      openDetailsModal(phone);
      if (options?.detailsTab) setDetailsTab(options.detailsTab);
    });
  };

  const focusInventoryResult = (items: PhoneEntry[], preferredDrilldown?: DashboardDrilldown) => {
    if (items.length === 1) {
      focusPhoneEntity(items[0], { detailsTab: 'overview', workspaceMode: 'inventory', viewMode: 'table', focusExplorer: true });
      return;
    }
    setSelectedPhoneIds(items.map((item) => item.id));
    const nextDrilldown = preferredDrilldown && preferredDrilldown.kind !== 'none'
      ? preferredDrilldown
      : deriveSelectionDrilldown(items);
    if (nextDrilldown.kind !== 'none') {
      applyDashboardDrilldown(nextDrilldown);
    } else {
      setWorkspace('inventory');
      setInventoryViewMode('table');
      setShouldFocusExplorer(true);
    }
  };

  const focusHistoryResult = (items: PhoneEntry[], eventClass: PhoneHistoryEventClass = 'audit') => {
    if (items.length === 1) {
      focusPhoneEntity(items[0], { detailsTab: 'timeline', workspaceMode: 'inventory', viewMode: 'table', focusExplorer: true });
      return;
    }
    const firstModel = items.length > 0 ? String(items[0]?.model || '').trim() : '';
    const allSameModel = items.length > 0 && items.every((phone) => String(phone.model || '').trim() === firstModel);
    setWorkspace('insights');
    setHistoryExplorerFilters((prev: any) => ({...prev,
      eventClass,
      model: allSameModel && firstModel ? firstModel : 'all',
      q: allSameModel && firstModel ? firstModel : prev.q,
    }));
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const handleSelectionPresetAction = () => {
    const selectionPreset = getSelectionPreset();
    const selectedPhones = getSelectedPhones();
    if (!selectionPreset || selectedPhones.length === 0) return;
    if (selectionPreset.kind === 'pricing-workflow') {
      applyDashboardDrilldown({ kind: 'missingSale', value: 'missing-sale', label: 'انتخاب‌های بی‌قیمت' });
      setWorkspace('inventory');
      setInventoryViewMode('table');
      setShouldFocusExplorer(true);
      return;
    }
    if (selectionPreset.kind === 'export-review') {
      setPendingBulkAction('export');
      return;
    }
    if (selectionPreset.kind === 'bulk-status') {
      const nextStatus = selectionPreset.label.includes('مرجوعی') ? 'مرجوعی' : 'موجود در انبار';
      setBulkStatusTarget(nextStatus);
      setNotification({ type: 'success', text: `پریست گروهی روی «${nextStatus}» قرار گرفت.` });
      return;
    }
    setNotification({ type: 'success', text: 'موارد انتخاب‌شده یکدست نیستند؛ ابتدا آن‌ها را با فیلترهای موجودی تفکیک کنید.' });
  };

  return {
    focusInventoryExplorer,
    focusInsightsWorkspace,
    deriveSelectionDrilldown,
    focusPhoneEntity,
    focusInventoryResult,
    focusHistoryResult,
    handleSelectionPresetAction,
  };
}
