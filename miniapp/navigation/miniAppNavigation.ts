import { Bell, Home, ListChecks, MoreHorizontal, Package, ShoppingCart, Smartphone, Store, UserCheck, WalletCards, type LucideIcon } from "../../components/lucide-react";
import type { MiniAppIdentity, MiniAppIdentityKind, MiniAppWorkspaceKind } from "../types";

type Destination = {
  id: string;
  route: string;
  label: string;
  icon: LucideIcon;
  parentSection: string;
  placement?: "dock" | "more";
  permissions?: string[];
  matches: string[];
  backTo?: string;
  description?: string;
};

// Visibility mirrors existing route permissions; it never grants access.
const destinations: Record<MiniAppIdentityKind, Destination[]> = {
  staff: [
    { id: "home", route: "/", label: "خانه", icon: Home, parentSection: "home", placement: "dock", permissions: ["dashboard.read"], matches: ["/"] },
    { id: "sales", route: "/sales", label: "فروش", icon: Store, parentSection: "sales", placement: "dock", permissions: ["sales.read", "profits.read"], matches: ["/sales"] },
    { id: "directory", route: "/directory", label: "اشخاص", icon: UserCheck, parentSection: "directory", placement: "dock", permissions: ["customers.read", "partners.read"], matches: ["/directory"] },
    { id: "customer-detail", route: "/customers/:id", label: "اطلاعات مشتری", icon: UserCheck, parentSection: "directory", permissions: ["customers.read"], matches: ["/customers/*"], backTo: "/directory?type=customer" },
    { id: "partner-detail", route: "/partners/:id", label: "اطلاعات همکار", icon: UserCheck, parentSection: "directory", permissions: ["partners.read"], matches: ["/partners/*"], backTo: "/directory?type=partner" },
    { id: "operations", route: "/operations", label: "عملیات", icon: Package, parentSection: "operations", placement: "dock", permissions: ["repairs.read", "inventory.read"], matches: ["/operations"] },
    { id: "more", route: "/more", label: "بیشتر", icon: MoreHorizontal, parentSection: "more", placement: "dock", matches: ["/more"] },
    { id: "dues", route: "/dues", label: "اقساط و سررسیدها", icon: ListChecks, parentSection: "more", placement: "more", permissions: ["installments.read"], matches: ["/dues"], backTo: "/more", description: "معوق، امروز و ۷ روز آینده" },
    { id: "installment-detail", route: "/installments/:id", label: "جزئیات اقساط", icon: ListChecks, parentSection: "more", permissions: ["installments.read"], matches: ["/installments/*"], backTo: "/dues" },
    { id: "notifications", route: "/notifications", label: "اعلان‌های مدیریت", icon: Bell, parentSection: "more", placement: "more", matches: ["/notifications"], backTo: "/more", description: "پیام‌ها و اعلان‌های حساب مدیریتی شما" },
  ],
  partner: [
    { id: "home", route: "/", label: "نمای کلی", icon: Home, parentSection: "home", placement: "dock", matches: ["/"] },
    { id: "purchases", route: "/purchases", label: "کالاها", icon: Package, parentSection: "purchases", placement: "dock", matches: ["/purchases"] },
    { id: "phones", route: "/phones", label: "تسویه‌ها", icon: Smartphone, parentSection: "phones", placement: "dock", matches: ["/phones"] },
    { id: "account", route: "/account", label: "حساب", icon: WalletCards, parentSection: "account", placement: "dock", matches: ["/account"] },
    { id: "ledger", route: "/ledger", label: "گردش حساب", icon: ListChecks, parentSection: "account", matches: ["/ledger"], backTo: "/account" },
    { id: "more", route: "/more", label: "حساب", icon: WalletCards, parentSection: "account", matches: ["/more"], backTo: "/account" },
  ],
  customer: [
    { id: "home", route: "/", label: "خانه", icon: Home, parentSection: "home", placement: "dock", matches: ["/"] },
    { id: "account", route: "/account", label: "حساب", icon: WalletCards, parentSection: "account", placement: "dock", matches: ["/account"] },
    { id: "installments", route: "/installments", label: "اقساط", icon: ListChecks, parentSection: "installments", placement: "dock", matches: ["/installments"] },
    { id: "installment-detail", route: "/installments/:id", label: "جزئیات اقساط", icon: ListChecks, parentSection: "installments", matches: ["/installments/*"], backTo: "/installments" },
    { id: "purchases", route: "/purchases", label: "خریدها", icon: ShoppingCart, parentSection: "purchases", placement: "dock", matches: ["/purchases"] },
    { id: "invoice", route: "/invoices/:invoiceRef", label: "جزئیات خرید", icon: ShoppingCart, parentSection: "purchases", matches: ["/invoices/*"], backTo: "/purchases" },
  ],
};

export const workspaceLabels: Record<MiniAppWorkspaceKind, string> = {
  manager: "مدیریت فروشگاه", partner: "حساب همکار", customer: "حساب مشتری",
};

export const getMiniAppDestinations = (identity: MiniAppIdentity) =>
  destinations[identity.kind].filter(item => !item.permissions || item.permissions.some(permission => identity.permissions?.includes(permission)));

export const resolveMiniAppDestination = (identity: MiniAppIdentity, pathname: string) =>
  getMiniAppDestinations(identity).find(item => item.matches.some(pattern =>
    pattern.endsWith("/*") ? pathname.startsWith(pattern.slice(0, -1)) : pathname === pattern));

// Preserve ManagerHome's established fallback order. More also remains usable
// for a staff account with only its existing personal notifications available.
export const getMiniAppHomeRoute = (identity: MiniAppIdentity): string => {
  const visible = getMiniAppDestinations(identity);
  for (const id of ["home", "directory", "dues", "operations", "sales", "more"]) {
    const destination = visible.find(item => item.id === id);
    if (destination) return destination.route;
  }
  return "/";
};
