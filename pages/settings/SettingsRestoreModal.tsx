import React from 'react';
import Modal from '../../components/Modal';
import ModalActions from '../../components/ModalActions';

type SettingsRestoreModalProps = {
  isOpen: boolean;
  dbFileName: string | null;
  onClose: () => void;
  onRestore: () => void;
};

const SettingsRestoreModal: React.FC<SettingsRestoreModalProps> = ({ isOpen, dbFileName, onClose, onRestore }) => {
  if (!isOpen) return null;

  return (
    <Modal title="تأیید بازیابی اطلاعات" onClose={onClose} variant="compact" iconClass="fa-solid fa-rotate-left" wrapperClassName="restore-backup-modal-v22">
      <div className="app-modal-confirm-card app-modal-confirm-card--danger">
        <span className="app-modal-confirm-card__icon"><i className="fa-solid fa-triangle-exclamation" /></span>
        <div className="min-w-0">
          <p className="app-modal-confirm-card__title">بازیابی فایل بکاپ، اطلاعات فعلی را جایگزین می‌کند.</p>
          <p className="app-modal-confirm-card__text">
            فایل انتخاب‌شده: <bdi className="app-modal-confirm-card__file">{dbFileName || 'فایل انتخاب نشده'}</bdi>
          </p>
          <p className="app-modal-confirm-card__hint">این عملیات برگشت‌پذیر نیست؛ قبل از تأیید، از درست بودن فایل مطمئن شو.</p>
        </div>
      </div>
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
