import React from 'react';
import Modal from '../../components/Modal';
import ModalActions from '../../components/ModalActions';
import { ModalAlert } from '../../components/modals';

type SettingsRestoreModalProps = {
  isOpen: boolean;
  dbFileName: string | null;
  onClose: () => void;
  onRestore: () => void;
};

const SettingsRestoreModal: React.FC<SettingsRestoreModalProps> = ({ isOpen, dbFileName, onClose, onRestore }) => {
  if (!isOpen) return null;

  const selectedFile = dbFileName || 'فایل انتخاب نشده';

  return (
    <Modal
      title="تأیید بازیابی اطلاعات"
      onClose={onClose}
      isOpen={isOpen}
      variant="compact"
      size="md"
      layout="horizontal"
      tone="danger"
      iconClass="fa-solid fa-rotate-left"
      kicker="بازیابی بکاپ"
      ariaDescription="بازیابی فایل بکاپ، اطلاعات فعلی را جایگزین می‌کند."
    >
      <ModalAlert
        tone="danger"
        iconClass="fa-solid fa-triangle-exclamation"
        eyebrow="عملیات حساس و غیرقابل بازگشت"
        title="بازیابی فایل بکاپ، اطلاعات فعلی را جایگزین می‌کند."
        text="قبل از تأیید، مطمئن شو فایل انتخاب‌شده مربوط به همین سیستم و نسخه درست پایگاه داده است."
        fileLabel="فایل انتخاب‌شده"
        fileName={selectedFile}
        fileMode="inline"
      />

      <ModalActions
        onCancel={onClose}
        cancelText="انصراف"
        submitText="تأیید و بازیابی"
        submitType="button"
        onSubmitClick={onRestore}
        submitVariant="danger"
        submitIconClass="fa-solid fa-rotate-left"
      />
    </Modal>
  );
};

export default SettingsRestoreModal;
