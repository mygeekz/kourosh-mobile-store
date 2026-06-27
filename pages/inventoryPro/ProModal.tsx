import React from "react";
import Modal from "../../components/Modal";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  widthClassName?: string;
};

export default function ProModal({ open, title, onClose, children, widthClassName }: Props) {
  return (
    <Modal
      isOpen={open}
      title={title}
      onClose={onClose}
      variant="operational"
      size="xl"
      tone="info"
      widthClass={widthClassName || "max-w-[980px]"}
      panelClassName="inventory-pro-modal"
      bodyClassName="inventory-pro-modal__body p-4 max-h-[78vh] overflow-auto"
      ariaDescription="پنجره عملیاتی مدیریت موجودی پیشرفته"
    >
      {children}
    </Modal>
  );
}
