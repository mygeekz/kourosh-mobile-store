import React from 'react';

type Props = {
  ctx: Record<string, any>;
};

const PartnerTelegramLinkModalSection: React.FC<Props> = ({ ctx }) => {
  const {
    TelegramLinkModal,
    deepLink,
    openPartnerQrLinkModal,
    setNotification,
    setTgQrOpen,
    text,
    tgBotUsernameMissing,
    tgQrDeepLink,
    tgQrLoading,
    tgQrOpen,
  } = ctx;

  return (
    <>
{tgQrOpen && (
        <TelegramLinkModal
          isOpen={tgQrOpen}
          onClose={() => setTgQrOpen(false)}
          title="QR لینک شدن تلگرام همکار"
          entityLabel="همکار"
          loading={tgQrLoading}
          deepLink={tgQrDeepLink}
          botUsernameMissing={tgBotUsernameMissing}
          onRefresh={openPartnerQrLinkModal}
          onCopy={async () => {
            try {
              await navigator.clipboard.writeText(tgQrDeepLink);
              setNotification({ type: 'success', text: 'لینک ربات کپی شد.' });
            } catch {
              setNotification({ type: 'error', text: 'کپی لینک عملیات ناموفق بود.' });
            }
          }}
        />
      )}
    </>
  );
};

export default PartnerTelegramLinkModalSection;
