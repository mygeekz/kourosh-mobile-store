import { TextareaField } from '@/components/ui';
import React from 'react';
import { PeopleModalSummaryCard } from '../../components/people/PeopleUiKit';

type Props = {
  ctx: Record<string, any>;
};

const CustomerManagerNoteModal: React.FC<Props> = ({ ctx }) => {
  const {
    Modal,
    ModalActions,
    ModalField,
    handleManagerNoteSubmit,
    inputClass,
    isManagerNoteModalOpen,
    isSavingManagerNote,
    managerNoteContext,
    managerNoteDraft,
    note,
    profile,
    rows,
    setIsManagerNoteModalOpen,
    setManagerNoteDraft,
    token,
    value,
  } = ctx;

  return (
    <>
{/* مودال ثبت یادداشت مدیریتی */}
      {isManagerNoteModalOpen && (
        <Modal
          title="ثبت یادداشت مدیریتی"
          onClose={() => {
            if (isSavingManagerNote) return;
            setIsManagerNoteModalOpen(false);
          }}
          widthClass="max-w-4xl"
          iconClass="fa-solid fa-pen-to-square"
          variant="operational"
          layout="split"
          ariaDescription="ثبت یادداشت مدیریتی در تاریخچه اختصاصی پرونده مشتری"
        >
          <form onSubmit={handleManagerNoteSubmit} className="modal-template-form modal-template-form--split modal-template-form--manager-note">
            <aside className="modal-template-side">
              <PeopleModalSummaryCard
                eyebrow="یادداشت مدیریتی"
                title={profile?.fullName || 'پرونده مشتری'}
                description="این یادداشت فقط در تاریخچه مدیریتی پرونده ذخیره می‌شود و برای ثبت تصمیم، پیگیری یا توافق داخلی مناسب است."
                icon="fa-note-sticky"
                metrics={[
                  { icon: 'fa-bullseye', label: 'موضوع یادداشت', value: managerNoteContext || 'یادداشت عمومی' },
                  { icon: 'fa-align-right', label: 'وضعیت متن', value: managerNoteDraft.trim() ? `${managerNoteDraft.trim().length.toLocaleString('fa-IR')} کاراکتر` : 'هنوز نوشته نشده' },
                ]}
              />
            </aside>
            <div className="modal-template-main">
              <div className="modal-template-section modal-template-section--stack">
                <ModalField label="متن یادداشت" iconClass="fa-solid fa-pen">
                  <TextareaField controlOnly
                    rows={8}
                    value={managerNoteDraft}
                    onChange={(e) => setManagerNoteDraft(e.target.value)}
                    className={inputClass(false, true)}
                    placeholder="مثلاً: مشتری برای تسویه مانده تماس گرفته شد و برنامه پرداخت توافق شد."
                    autoFocus
                  />
                </ModalField>
              </div>
              <ModalActions
                onCancel={() => setIsManagerNoteModalOpen(false)}
                submitText="ثبت یادداشت در پرونده"
                submittingText="در حال ثبت یادداشت..."
                isSubmitting={isSavingManagerNote}
                submitDisabled={!token || !managerNoteDraft.trim()}
              />
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};

export default CustomerManagerNoteModal;
