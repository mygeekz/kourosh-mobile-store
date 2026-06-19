import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { NotificationMessage } from '../../../types';
import type { SalesAgentLeadCardData } from '../SalesAgentLeadCard';

type SalesAgentComposerChannels = {
  sms: boolean;
  telegram: boolean;
};

type SalesAgentComposerRecipient = {
  type: 'customer';
  id?: number;
  name?: string;
  phoneNumber?: string;
};

type UseSalesAgentComposerStateArgs = {
  setNotification: Dispatch<SetStateAction<NotificationMessage | null>>;
};

const resolveSalesAgentComposerChannels = (lead?: SalesAgentLeadCardData | null): SalesAgentComposerChannels => {
  const raw = String(lead?.recommendedChannel || '').trim();
  if (/telegram|تلگرام/i.test(raw) && !/sms|پیامک/i.test(raw)) return { sms: false, telegram: true };
  return { sms: true, telegram: false };
};

export default function useSalesAgentComposerState({
  setNotification,
}: UseSalesAgentComposerStateArgs) {
  const [salesAgentComposerLead, setSalesAgentComposerLead] = useState<SalesAgentLeadCardData | null>(null);

  const initialRecipient = useMemo<SalesAgentComposerRecipient | undefined>(() => {
    if (!salesAgentComposerLead) return undefined;
    return {
      type: 'customer',
      id: salesAgentComposerLead.customerId ? Number(salesAgentComposerLead.customerId) : undefined,
      name: salesAgentComposerLead.customerName,
      phoneNumber: salesAgentComposerLead.phoneNumber,
    };
  }, [salesAgentComposerLead]);

  const initialText = salesAgentComposerLead?.message || '';
  const initialChannels = useMemo(
    () => resolveSalesAgentComposerChannels(salesAgentComposerLead),
    [salesAgentComposerLead]
  );

  const closeComposer = () => setSalesAgentComposerLead(null);
  const handleQueued = () => {
    setSalesAgentComposerLead(null);
    setNotification({ type: 'success', text: 'پیام دستیار فروش در صف ارسال قرار گرفت.' });
  };

  return {
    salesAgentComposerLead,
    setSalesAgentComposerLead,
    closeComposer,
    handleComposerQueued: handleQueued,
    composerInitialRecipient: initialRecipient,
    composerInitialText: initialText,
    composerInitialChannels: initialChannels,
  };
}
