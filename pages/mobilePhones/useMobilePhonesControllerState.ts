import { useEffect, useRef, useState } from 'react';
import {
  PhoneEntry,
  NewPhoneEntryData,
  NotificationMessage,
  PhoneStatus,
  Partner,
  PhoneEntryUpdatePayload,
  PhoneInventoryEvent,
  PhoneInventoryChangeReport,
  PhoneInventoryExplorerEvent,
  PhoneInventoryEnterpriseReport,
  PhoneInventoryDashboardReport,
  PhoneHistoryEventClass,
} from '../../types';
import { ImportSheetRow } from '../../utils/dataImportExport';
import { PHONE_RAM_OPTIONS, PHONE_STORAGE_OPTIONS, PHONE_CONDITIONS, PHONE_STATUSES } from '../../constants';
import {
  type BulkConfirmAction,
  type DashboardDrilldown,
  type DetailsTab,
  type InventorySortMode,
  type InventoryViewMode,
  type InventoryWorkspace,
  type PricingBehaviorDecision,
  type PricingIntelligenceSettings,
  type SavedInventoryView,
  loadPricingBehaviorDecisions,
  loadPricingIntelligenceSettings,
} from './mobilePhonesControllerSupport';

export function useMobilePhonesControllerState() {
 const [phones, setPhones] = useState<PhoneEntry[]>([]);
 const [filteredPhones, setFilteredPhones] = useState<PhoneEntry[]>([]);
 const [searchTerm, setSearchTerm] = useState('');
 const [partners, setPartners] = useState<Partner[]>([]);
 const [phoneModels, setPhoneModels] = useState<string[]>([]);
 const [phoneColors, setPhoneColors] = useState<string[]>([]);

 const initialNewPhoneState: NewPhoneEntryData = {
 model: '',
 color: '',
 storage: PHONE_STORAGE_OPTIONS[0],
 ram: PHONE_RAM_OPTIONS[0],
 imei: '',
 batteryHealth: '100',
 condition: PHONE_CONDITIONS[0],
 purchasePrice: '',
 currentPurchasePrice: '',
 salePrice: '',
 status: PHONE_STATUSES[0],
 notes: '',
 supplierId: '',
 };
 const [newPhone, setNewPhone] = useState<NewPhoneEntryData>(initialNewPhoneState);
 const [purchaseDateSelected, setPurchaseDateSelected] = useState<Date | null>(null);
 const [formErrors, setFormErrors] = useState<Partial<Record<keyof NewPhoneEntryData | 'purchaseDate', string>>>({});
 const [pricingBehaviorDecisions, setPricingBehaviorDecisions] = useState<PricingBehaviorDecision[]>(() => loadPricingBehaviorDecisions());
 const [pricingSuggestionApplied, setPricingSuggestionApplied] = useState(false);
 const [pricingIntelligenceSettings, setPricingIntelligenceSettings] = useState<PricingIntelligenceSettings>(() => loadPricingIntelligenceSettings());

 const [isLoading, setIsLoading] = useState(false);
 const [isFetching, setIsFetching] = useState(true);
 const [isFetchingPartners, setIsFetchingPartners] = useState(true);
 const [notification, setNotification] = useState<NotificationMessage | null>(null);
 const [isPhoneImportExportOpen, setIsPhoneImportExportOpen] = useState(false);
 const [phoneImportRows, setPhoneImportRows] = useState<ImportSheetRow[]>([]);
 const [phoneImportFileName, setPhoneImportFileName] = useState('');
 const [phoneImportReport, setPhoneImportReport] = useState<{ created: number; updated: number; skipped: number; errors: string[] } | null>(null);
 const [isImportingPhones, setIsImportingPhones] = useState(false);

 // Edit modal
 const [isEditModalOpen, setIsEditModalOpen] = useState(false);
 const [editEntryContext, setEditEntryContext] = useState<null | 'pricing' | 'status-review'>(null);
 const [editingPhone, setEditingPhone] = useState<Partial<PhoneEntry>>({});
 const [editReadyForSalePulse, setEditReadyForSalePulse] = useState<null | { model: string; from: 'pricing' | 'status-review' }>(null);
 const [editPurchaseDateSelected, setEditPurchaseDateSelected] = useState<Date | null>(null);
 const [editFormErrors, setEditFormErrors] = useState<Partial<Record<keyof PhoneEntryUpdatePayload | 'purchaseDate', string>>>({});
 const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

 // Delete modal
 const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
 const [deletingPhoneId, setDeletingPhoneId] = useState<number | null>(null);
 const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

 // Barcode
 const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
 const [selectedPhoneForBarcode, setSelectedPhoneForBarcode] = useState<PhoneEntry | null>(null);

 // Details drawer
 const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
 const [selectedPhoneForDetails, setSelectedPhoneForDetails] = useState<PhoneEntry | null>(null);
 const [detailsTab, setDetailsTab] = useState<DetailsTab>('overview');
 const [detailsHistory, setDetailsHistory] = useState<PhoneInventoryEvent[]>([]);
 const [isDetailsHistoryLoading, setIsDetailsHistoryLoading] = useState(false);
 const [detailsHistoryError, setDetailsHistoryError] = useState<string | null>(null);
 const [historyReport, setHistoryReport] = useState<PhoneInventoryChangeReport | null>(null);
 const [isHistoryReportLoading, setIsHistoryReportLoading] = useState(false);
 const [enterpriseHistoryReport, setEnterpriseHistoryReport] = useState<PhoneInventoryEnterpriseReport | null>(null);
 const [dashboardReport, setDashboardReport] = useState<PhoneInventoryDashboardReport | null>(null);
 const [historyExplorerEvents, setHistoryExplorerEvents] = useState<PhoneInventoryExplorerEvent[]>([]);
 const [isHistoryExplorerLoading, setIsHistoryExplorerLoading] = useState(false);
 const [historyExplorerFilters, setHistoryExplorerFilters] = useState<{ q: string; eventClass: PhoneHistoryEventClass; model: string; startDate: string; endDate: string }>({ q: '', eventClass: 'all', model: 'all', startDate: '', endDate: '' });
 const [inventoryExplorerDateRange, setInventoryExplorerDateRange] = useState<{ startDate: string; endDate: string }>({ startDate: '', endDate: '' });
 const explorerRef = useRef<HTMLDivElement | null>(null);
 const [shouldFocusExplorer, setShouldFocusExplorer] = useState(false);
 const [dashboardDrilldown, setDashboardDrilldown] = useState<DashboardDrilldown>({ kind: 'none', value: '', label: '' });

 const [selectedPhoneIds, setSelectedPhoneIds] = useState<number[]>([]);
 const [bulkStatusTarget, setBulkStatusTarget] = useState<PhoneStatus | 'all'>('all');
 const [bulkSupplierTarget, setBulkSupplierTarget] = useState<string>('all');
 const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
 const [pendingBulkAction, setPendingBulkAction] = useState<BulkConfirmAction | null>(null);
 const [activeTableMenuId, setActiveTableMenuId] = useState<number | null>(null);
 const [activeCardMenuId, setActiveCardMenuId] = useState<number | null>(null);
 const [isConfirmingBulkAction, setIsConfirmingBulkAction] = useState(false);
 const activeTableMenuRef = useRef<HTMLDivElement | null>(null);

 const [workspace, setWorkspace] = useState<InventoryWorkspace>('inventory');
 const [inventoryViewMode, setInventoryViewMode] = useState<InventoryViewMode>('cards');
 const [sortMode, setSortMode] = useState<InventorySortMode>('newest');
 const [savedView, setSavedView] = useState<SavedInventoryView>('all');
 const [statusFilter, setStatusFilter] = useState<string>('all');
 const [supplierFilter, setSupplierFilter] = useState<string>('all');
 const [modelFilter, setModelFilter] = useState<string>('all');
 const [batteryFilter, setBatteryFilter] = useState<'all' | 'low' | 'good'>('all');

 useEffect(() => {
 if (activeTableMenuId === null) return;
 const handlePointerDown = (event: MouseEvent | TouchEvent) => {
 const target = event.target as Node | null;
 if (target && activeTableMenuRef.current?.contains(target)) return;
 setActiveTableMenuId(null);
 };
 const handleEscape = (event: KeyboardEvent) => {
 if (event.key === 'Escape') setActiveTableMenuId(null);
 };
 document.addEventListener('mousedown', handlePointerDown);
 document.addEventListener('touchstart', handlePointerDown);
 document.addEventListener('keydown', handleEscape);
 return () => {
 document.removeEventListener('mousedown', handlePointerDown);
 document.removeEventListener('touchstart', handlePointerDown);
 document.removeEventListener('keydown', handleEscape);
 };
 }, [activeTableMenuId]);


return {
    phones,
    setPhones,
    filteredPhones,
    setFilteredPhones,
    searchTerm,
    setSearchTerm,
    partners,
    setPartners,
    phoneModels,
    setPhoneModels,
    phoneColors,
    setPhoneColors,
    initialNewPhoneState,
    newPhone,
    setNewPhone,
    purchaseDateSelected,
    setPurchaseDateSelected,
    formErrors,
    setFormErrors,
    pricingBehaviorDecisions,
    setPricingBehaviorDecisions,
    pricingSuggestionApplied,
    setPricingSuggestionApplied,
    pricingIntelligenceSettings,
    setPricingIntelligenceSettings,
    isLoading,
    setIsLoading,
    isFetching,
    setIsFetching,
    isFetchingPartners,
    setIsFetchingPartners,
    notification,
    setNotification,
    isPhoneImportExportOpen,
    setIsPhoneImportExportOpen,
    phoneImportRows,
    setPhoneImportRows,
    phoneImportFileName,
    setPhoneImportFileName,
    phoneImportReport,
    setPhoneImportReport,
    isImportingPhones,
    setIsImportingPhones,
    isEditModalOpen,
    setIsEditModalOpen,
    editEntryContext,
    setEditEntryContext,
    editingPhone,
    setEditingPhone,
    editReadyForSalePulse,
    setEditReadyForSalePulse,
    editPurchaseDateSelected,
    setEditPurchaseDateSelected,
    editFormErrors,
    setEditFormErrors,
    isSubmittingEdit,
    setIsSubmittingEdit,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    deletingPhoneId,
    setDeletingPhoneId,
    isSubmittingDelete,
    setIsSubmittingDelete,
    isBarcodeModalOpen,
    setIsBarcodeModalOpen,
    selectedPhoneForBarcode,
    setSelectedPhoneForBarcode,
    isDetailsModalOpen,
    setIsDetailsModalOpen,
    selectedPhoneForDetails,
    setSelectedPhoneForDetails,
    detailsTab,
    setDetailsTab,
    detailsHistory,
    setDetailsHistory,
    isDetailsHistoryLoading,
    setIsDetailsHistoryLoading,
    detailsHistoryError,
    setDetailsHistoryError,
    historyReport,
    setHistoryReport,
    isHistoryReportLoading,
    setIsHistoryReportLoading,
    enterpriseHistoryReport,
    setEnterpriseHistoryReport,
    dashboardReport,
    setDashboardReport,
    historyExplorerEvents,
    setHistoryExplorerEvents,
    isHistoryExplorerLoading,
    setIsHistoryExplorerLoading,
    historyExplorerFilters,
    setHistoryExplorerFilters,
    inventoryExplorerDateRange,
    setInventoryExplorerDateRange,
    shouldFocusExplorer,
    setShouldFocusExplorer,
    dashboardDrilldown,
    setDashboardDrilldown,
    selectedPhoneIds,
    setSelectedPhoneIds,
    bulkStatusTarget,
    setBulkStatusTarget,
    bulkSupplierTarget,
    setBulkSupplierTarget,
    isBulkSubmitting,
    setIsBulkSubmitting,
    pendingBulkAction,
    setPendingBulkAction,
    activeTableMenuId,
    setActiveTableMenuId,
    activeCardMenuId,
    setActiveCardMenuId,
    isConfirmingBulkAction,
    setIsConfirmingBulkAction,
    workspace,
    setWorkspace,
    inventoryViewMode,
    setInventoryViewMode,
    sortMode,
    setSortMode,
    savedView,
    setSavedView,
    statusFilter,
    setStatusFilter,
    supplierFilter,
    setSupplierFilter,
    modelFilter,
    setModelFilter,
    batteryFilter,
    setBatteryFilter,
    explorerRef,
    activeTableMenuRef,
  };
}
