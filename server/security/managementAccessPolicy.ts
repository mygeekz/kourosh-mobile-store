export const MANAGEMENT_PERMISSIONS = [
  "dashboard.read",
  "customers.read",
  "customers.ledger.read",
  "partners.read",
  "partners.ledger.read",
  "sales.read",
  "profits.read",
  "installments.read",
  "repairs.read",
  "inventory.read",
  "reports.read",
  "notifications.manage",
  "managers.manage",
] as const;

export type ManagementPermission = (typeof MANAGEMENT_PERMISSIONS)[number];

export const MANAGEMENT_PERMISSION_LABELS: Readonly<Record<ManagementPermission, string>> = {
  "dashboard.read": "مشاهده داشبورد مدیریت",
  "customers.read": "مشاهده مشتریان",
  "customers.ledger.read": "مشاهده دفتر حساب مشتریان",
  "partners.read": "مشاهده همکاران",
  "partners.ledger.read": "مشاهده دفتر حساب همکاران",
  "sales.read": "مشاهده فروش",
  "profits.read": "مشاهده سود",
  "installments.read": "مشاهده اقساط",
  "repairs.read": "مشاهده تعمیرات",
  "inventory.read": "مشاهده موجودی",
  "reports.read": "مشاهده گزارش‌ها",
  "notifications.manage": "مدیریت اعلان‌ها",
  "managers.manage": "مدیریت مدیران و دسترسی‌ها",
};

export const SYSTEM_ACCESS_ROLE_PRESETS = [
  {
    key: "full_manager",
    name: "مدیر کامل",
    permissions: MANAGEMENT_PERMISSIONS,
  },
  {
    key: "finance_manager",
    name: "مدیر مالی",
    permissions: [
      "dashboard.read",
      "customers.read",
      "customers.ledger.read",
      "partners.read",
      "partners.ledger.read",
      "sales.read",
      "profits.read",
      "installments.read",
      "reports.read",
    ] as const satisfies readonly ManagementPermission[],
  },
  {
    key: "sales_manager",
    name: "مدیر فروش",
    permissions: [
      "dashboard.read",
      "customers.read",
      "sales.read",
      "installments.read",
      "repairs.read",
      "inventory.read",
      "reports.read",
    ] as const satisfies readonly ManagementPermission[],
  },
  {
    key: "viewer",
    name: "مشاهده‌گر",
    permissions: [
      "dashboard.read",
      "customers.read",
      "partners.read",
      "sales.read",
      "installments.read",
      "repairs.read",
      "inventory.read",
      "reports.read",
    ] as const satisfies readonly ManagementPermission[],
  },
] as const;

export const LEGACY_MANAGER_ROLE_NAMES = new Set(["Admin", "Manager"]);

export const isManagementPermission = (value: unknown): value is ManagementPermission =>
  MANAGEMENT_PERMISSIONS.includes(value as ManagementPermission);

export const hasAnyManagementPermission = (permissions: readonly string[]): boolean =>
  permissions.some(isManagementPermission);

export const hasAllManagementPermissions = (
  granted: readonly string[],
  required: readonly ManagementPermission[],
): boolean => {
  const permissionSet = new Set(granted.filter(isManagementPermission));
  return required.every((permission) => permissionSet.has(permission));
};

export const hasAnyOfManagementPermissions = (
  granted: readonly string[],
  required: readonly ManagementPermission[],
): boolean => {
  const permissionSet = new Set(granted.filter(isManagementPermission));
  return required.some((permission) => permissionSet.has(permission));
};
