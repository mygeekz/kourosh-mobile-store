import React from "react";
import Modal from "./Modal";
import { cn } from "../utils/cn";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  widthClassName?: string;
  overlayClassName?: string;
  panelClassName?: string;
  bodyClassName?: string;
  iconClassName?: string;
  eyebrow?: React.ReactNode;
  hideCloseButton?: boolean;
  tone?: "danger" | "warning" | "violet" | "info" | "success" | "neutral";
  layout?: "vertical" | "horizontal" | "split";
  variant?: "compact" | "operational" | "expansive";
};

const inferInventoryVariant = (widthClassName?: string, explicitVariant?: Props["variant"]): Props["variant"] => {
  if (explicitVariant) return explicitVariant;
  if (/max-w-\[1180px\]|max-w-(5xl|6xl|7xl)|96vw|min\(/.test(widthClassName || "")) return "expansive";
  return "operational";
};

const inferInventoryTone = (title: string, explicitTone?: Props["tone"]): Props["tone"] => {
  if (explicitTone) return explicitTone;
  if (/حذف|پاک|delete/i.test(title)) return "danger";
  if (/ایمپورت|import|خروجی|export|بارکد|barcode/i.test(title)) return "info";
  return "neutral";
};

/**
 * Compatibility wrapper for inventory/product/message modals.
 *
 * This component intentionally delegates portal, focus, scroll-lock, overlay, aria,
 * escape and responsive shell behavior to the shared Modal/DialogShell system.
 * Legacy callers keep using `open`, `widthClassName`, `iconClassName` and
 * `eyebrow`, but no longer maintain a separate high-z-index modal stack.
 */
export default function InventoryModal({
  open,
  title,
  onClose,
  children,
  widthClassName = "max-w-[1180px]",
  overlayClassName = "",
  panelClassName = "",
  bodyClassName = "",
  iconClassName,
  eyebrow = "انبار",
  hideCloseButton = false,
  tone,
  layout,
  variant,
}: Props) {
  const resolvedVariant = inferInventoryVariant(widthClassName, variant);
  const resolvedTone = inferInventoryTone(title, tone);

  return (
    <Modal
      isOpen={open}
      title={title}
      onClose={onClose}
      widthClass={widthClassName}
      wrapperClassName={cn("inventory-modal-overlay", overlayClassName)}
      panelClassName={cn("inventory-modal-foundation", panelClassName)}
      bodyClassName={cn("inventory-modal-body", bodyClassName)}
      iconClass={iconClassName}
      kicker={typeof eyebrow === "string" ? eyebrow : "انبار"}
      hideCloseButton={hideCloseButton}
      tone={resolvedTone}
      variant={resolvedVariant}
      layout={layout || (resolvedVariant === "expansive" ? "split" : "vertical")}
      closeOnBackdrop
    >
      {children}
    </Modal>
  );
}
