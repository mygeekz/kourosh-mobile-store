import { formatIsoToShamsi } from '../../utils/dateUtils';
import { getAuthHeaders } from '../../utils/apiUtils';
import { apiFetch } from '../../utils/apiFetch';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';

type PartnerTelegramPreset = 'custom' | 'balance' | 'settlement' | 'payment_confirm' | 'supply_followup' | 'statement';

type PartnerCommunicationActionParams = {
  token?: string | null;
  profile: any;
  ledger: any[];
  partnerTgQuickReply: string;
  setNotification: (value: any) => void;
  setPrefillChannels: (value: { sms: boolean; telegram: boolean }) => void;
  setPrefillMessageText: (value: string) => void;
  setIsMessageModalOpen: (value: boolean) => void;
  openLedgerModal: () => void;
  setPartnerTgPreset: (value: PartnerTelegramPreset) => void;
  setPartnerTgQuickReply: (value: string) => void;
  setPartnerTgConvLoading: (value: boolean) => void;
  fetchPartnerTelegramConversation: (partnerId: number) => void;
};

const sanitizePhone = (value?: string | null) => String(value || '').replace(/[^\d+]/g, '');

export function usePartnerDetailCommunicationActions({
  token,
  profile,
  ledger,
  partnerTgQuickReply,
  setNotification,
  setPrefillChannels,
  setPrefillMessageText,
  setIsMessageModalOpen,
  openLedgerModal,
  setPartnerTgPreset,
  setPartnerTgQuickReply,
  setPartnerTgConvLoading,
  fetchPartnerTelegramConversation,
}: PartnerCommunicationActionParams) {
  const partnerTelegramChatId = String((profile as any).telegramChatId || (profile as any).telegram_chat_id || '').trim();
  const partnerTelegramLinkedAtRaw = String((profile as any).telegram_linked_at || '').trim();
  const partnerTelegramLinked = !!partnerTelegramChatId;
  const partnerTelegramLinkedAt = partnerTelegramLinkedAtRaw ? formatIsoToShamsi(partnerTelegramLinkedAtRaw) : null;

  const openTelegramReport = async () => {
    try {
      if (!token || !profile?.id) return;
      setNotification(null);
      const res = await apiFetch(`/api/reports/partner/${profile.id}/message`, { headers: getAuthHeaders(token) });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message || 'خطا در دریافت گزارش');
      setPrefillChannels({ sms: false, telegram: true });
      setPrefillMessageText(String(json?.data?.text || ''));
      setIsMessageModalOpen(true);
    } catch (e: any) {
      setNotification({ type: 'error', text: e?.message || 'خطا در آماده‌سازی گزارش' });
    }
  };

  const openTel = () => {
    const phone = sanitizePhone(profile.phoneNumber);
    if (phone) window.open(`tel:${phone}`, '_self');
    else setNotification({ type: 'error', text: 'برای این همکار شماره تماس ثبت اطلاعات نشده است.' });
  };

  const openWhatsApp = () => {
    const phone = sanitizePhone(profile.phoneNumber).replace(/^0/, '98');
    if (phone) window.open(`https://wa.me/${phone}`, '_blank', 'noopener,noreferrer');
    else setNotification({ type: 'error', text: 'برای این همکار شماره تماس ثبت اطلاعات نشده است.' });
  };

  const openPartnerTelegram = () => {
    setPrefillMessageText(`سلام ${profile.partnerName} عزیز،`);
    setPrefillChannels({ telegram: true, sms: false });
    setIsMessageModalOpen(true);
  };

  const openPartnerPayment = () => openLedgerModal();
  const scrollToLedger = () => document.getElementById('partner-ledger-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const scrollToHistory = () => document.getElementById('partner-history-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const printProfile = () => window.print();

  const buildPartnerTelegramVars = () => {
    const balance = Number(profile.currentBalance || 0);
    const balanceLabel = balance > 0
      ? `بدهی فروشگاه به همکار: ${formatCurrencyText(balance, readStoredCurrencyUnit())}`
      : balance < 0
        ? `طلب فروشگاه از همکار: ${formatCurrencyText(Math.abs(balance), readStoredCurrencyUnit())}`
        : 'حساب همکار تسویه است';
    const ledgerCount = ledger.length.toLocaleString('fa-IR');
    const lastLedgerDate = ledger[0]?.transactionDate ? formatIsoToShamsi(ledger[0].transactionDate) : '—';
    const partnerLink = typeof window === 'undefined' ? '' : `${window.location.origin}/#/partners/${profile.id}`;
    return {
      name: String(profile.partnerName || ''),
      phone: String(profile.phoneNumber || ''),
      balance: balanceLabel,
      amount: formatCurrencyText(Math.abs(balance), readStoredCurrencyUnit()),
      ledgerCount,
      lastLedgerDate,
      link: partnerLink,
    };
  };

  const resolvePartnerTelegramText = (rawText: string) => {
    const vars = buildPartnerTelegramVars();
    return String(rawText || '').replace(/\{(name|phone|balance|amount|ledgerCount|lastLedgerDate|link)\}/g, (match, key) => {
      return (vars as any)[key] || match;
    });
  };

  const applyPartnerTgPreset = (preset: PartnerTelegramPreset) => {
    setPartnerTgPreset(preset);
    const map: Record<PartnerTelegramPreset, string> = {
      custom: '',
      balance: `👋 سلام {name} عزیز،

📋 وضعیت فعلی حساب شما در فروشگاه کوروش:

💰 مانده حساب: {balance}

📑 تعداد رکوردهای دفتر: {ledgerCount}

🕒 آخرین گردش مالی: {lastLedgerDate}`,

      settlement: `👋 سلام {name} عزیز،

🧾 برای هماهنگی تسویه حساب، لطفاً وضعیت مانده را بررسی کنید:

💰 مانده فعلی: {balance}

📨 در صورت انجام پرداخت، لطفاً رسید و شماره پیگیری را ارسال بفرمایید.`,

      payment_confirm: `👋 سلام {name} عزیز،

✅ یک تراکنش پرداخت/دریافت مربوط به حساب همکاری شما ثبت شد.

🕒 آخرین گردش مالی: {lastLedgerDate}

💰 وضعیت فعلی حساب: {balance}`,

      supply_followup: `👋 سلام {name} عزیز،

📦 برای پیگیری تأمین کالا و هماهنگی مربوط به موجودی یا فاکتور خرید با شما در ارتباط هستیم.

💰 وضعیت فعلی حساب: {balance}`,

      statement: `📊 گزارش خلاصه حساب همکاری

👤 نام همکار: {name}
📞 شماره تماس: {phone}

💰 مانده حساب: {balance}
📑 تعداد رکوردهای دفتر: {ledgerCount}
🕒 آخرین گردش مالی: {lastLedgerDate}

🔗 لینک دسترسی سریع: {link}`,

    };
    if (map[preset]) setPartnerTgQuickReply(map[preset]);
  };

  const sendPartnerTelegramQuickReply = async () => {
    if (!token || !profile?.id) return;
    if (!partnerTelegramChatId) return setNotification({ type: 'error', text: 'این همکار به تلگرام لینک نشده است.' });
    const raw = String(partnerTgQuickReply || '').trim();
    if (!raw) return setNotification({ type: 'error', text: 'متن پیام همکار خالی است.' });
    const text = resolvePartnerTelegramText(raw);
    setPartnerTgConvLoading(true);
    try {
      const response = await apiFetch('/api/messages/send', {
        method: 'POST',
        body: JSON.stringify({
          recipientType: 'partner',
          recipientId: Number(profile.id),
          recipientName: profile.partnerName,
          telegramChatId: partnerTelegramChatId,
          channels: ['telegram'],
          text,
          saveToProfile: false,
          variables: buildPartnerTelegramVars(),
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || json?.success === false) throw new Error(json?.message || 'ارسال پیام تلگرام همکار انجام نشد.');
      setNotification({ type: 'success', text: 'پیام همکار در صف ارسال تلگرام قرار گرفت.' });
      setPartnerTgQuickReply('');
      setPartnerTgPreset('custom');
      fetchPartnerTelegramConversation(Number(profile.id));
    } catch (error: any) {
      setNotification({ type: 'error', text: error?.message || 'ارسال پیام تلگرام همکار انجام نشد.' });
    } finally {
      setPartnerTgConvLoading(false);
    }
  };

  return {
    openTelegramReport,
    openTel,
    openWhatsApp,
    openPartnerTelegram,
    openPartnerPayment,
    scrollToLedger,
    scrollToHistory,
    printProfile,
    partnerTelegramChatId,
    partnerTelegramLinked,
    partnerTelegramLinkedAt,
    buildPartnerTelegramVars,
    resolvePartnerTelegramText,
    applyPartnerTgPreset,
    sendPartnerTelegramQuickReply,
  };
}
