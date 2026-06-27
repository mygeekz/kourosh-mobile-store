import React, { useEffect, useMemo, useRef, useState } from 'react';
import InventoryModal from './InventoryModal';
import ModalActions from './ModalActions';
import ModalField from './ModalField';
import ToggleSwitch from './ToggleSwitch';
import { apiFetch } from '../utils/apiFetch';
import { humanizeTelegramErrorText } from '../utils/telegramErrorMessage';

type RecipientType = 'customer' | 'partner' | 'manual';
type ChannelKey = 'sms' | 'telegram';

type MessageComposerVariables = { amount?: string | number | null; dueDate?: string | null; link?: string | null };

type Props = {
  open: boolean;
  onClose: () => void;
  onQueued?: () => void;
  initialRecipient?: { type: RecipientType; id?: number; name?: string; phoneNumber?: string; telegramChatId?: string };
  initialText?: string;
  initialChannels?: { sms?: boolean; telegram?: boolean };
  initialVariables?: MessageComposerVariables;
};

type PersonOption = { id: number; name: string; phoneNumber?: string | null; telegramChatId?: string | null };

const MESSAGE_LIMIT = 900;

const recipientTypeMeta: Record<RecipientType, { label: string; icon: string; hint: string }> = {
  customer: { label: 'مشتری', icon: 'fa-solid fa-user', hint: 'ارسال به مشتری ثبت‌شده' },
  partner: { label: 'همکار', icon: 'fa-solid fa-handshake', hint: 'ارسال به همکار یا تأمین‌کننده' },
  manual: { label: 'دستی', icon: 'fa-solid fa-keyboard', hint: 'بدون اتصال به پرونده' },
};

const channelMeta: Record<ChannelKey, { title: string; icon: string; hint: string }> = {
  sms: { title: 'پیامک', icon: 'fa-solid fa-mobile-screen-button', hint: 'شماره موبایل لازم است' },
  telegram: { title: 'تلگرام', icon: 'fa-solid fa-paper-plane', hint: 'Chat ID لازم است' },
};

const quickTemplates = [
  { key: 'installment_due', label: 'سررسید قسط', icon: 'fa-regular fa-calendar-check', text: 'سلام {name} عزیز، یادآوری می‌شود موعد پرداخت قسط شما نزدیک است. لطفاً برای پرداخت یا هماهنگی با فروشگاه اقدام بفرمایید.' },
  { key: 'installment_overdue', label: 'قسط معوق', icon: 'fa-solid fa-triangle-exclamation', text: 'سلام {name} عزیز، قسط شما از موعد پرداخت عبور کرده است. لطفاً برای تسویه یا هماهنگی وضعیت پرداخت با فروشگاه تماس بگیرید.' },
  { key: 'check_reminder', label: 'یادآوری چک', icon: 'fa-solid fa-money-check-dollar', text: 'سلام {name} عزیز، لطفاً وضعیت چک/پرداخت ثبت‌شده در پرونده خود را پیش از سررسید بررسی بفرمایید.' },
  { key: 'partial_payment', label: 'پرداخت جزئی', icon: 'fa-solid fa-receipt', text: 'سلام {name} عزیز، پرداخت شما ثبت شد و مانده حساب در پرونده به‌روزرسانی گردید. سپاس از همراهی شما.' },
  { key: 'ready', label: 'آماده تحویل', icon: 'fa-solid fa-box-open', text: 'سلام {name} عزیز، سفارش شما آماده تحویل است. برای هماهنگی با فروشگاه در ارتباط باشید.' },
  { key: 'thanks', label: 'تشکر خرید', icon: 'fa-regular fa-heart', text: 'سلام {name} عزیز، از خرید و اعتماد شما سپاسگزاریم. در صورت نیاز به پیگیری، همراه شما هستیم.' },
];


const emojiPresets = ['😊', '🙏', '✅', '💬', '📌', '⏰', '💳', '📱', '🤝', '❤️', '🌟', '🔔'];

const cleanText = (value: unknown) => String(value ?? '').trim();

const formatPreviewAmount = (value: unknown) => {
  if (value == null || value === '') return '—';
  const normalized = String(value).replace(/,/g, '').trim();
  const numeric = Number(normalized);
  if (Number.isFinite(numeric)) return numeric.toLocaleString('fa-IR');
  return String(value);
};

const resolveComposerTemplate = (rawText: string, variables: { name?: string; phone?: string; amount?: string | number | null; dueDate?: string | null; link?: string | null }) => {
  const fallbackName = cleanText(variables.name) || 'مشتری';
  const fallbackPhone = cleanText(variables.phone) || 'شماره موبایل';
  const fallbackAmount = formatPreviewAmount(variables.amount);
  const fallbackDueDate = cleanText(variables.dueDate) || '—';
  const fallbackLink = cleanText(variables.link) || '—';
  return String(rawText || '').replace(/\{(name|phone|amount|dueDate|link)\}/g, (match, key) => {
    switch (key) {
      case 'name': return fallbackName;
      case 'phone': return fallbackPhone;
      case 'amount': return fallbackAmount;
      case 'dueDate': return fallbackDueDate;
      case 'link': return fallbackLink;
      default: return match;
    }
  });
};

const humanizeComposerError = (message: unknown) => {
  const raw = cleanText(message);
  if (!raw) return 'ارسال پیام انجام نشد. تنظیمات پیام‌رسانی یا صف ارسال را بررسی کنید.';
  if (/BodyId|bodyId|pattern|BaseServiceNumber|متن آزاد|سفارشی/i.test(raw)) {
    return 'ارسال پیامک هنوز کامل تنظیم نشده است. الگوی «پیام آزاد» را در تنظیمات پیامک ثبت کنید یا فعلاً تلگرام را انتخاب کنید.';
  }
  if (/telegram|api\.telegram|chat_id|socket hang up|timeout|econn|forbidden|unauthorized|parse|markdown|html|request to/i.test(raw)) {
    return humanizeTelegramErrorText(raw);
  }
  return raw;
};

const normalizeChannels = (value?: { sms?: boolean; telegram?: boolean }): Record<ChannelKey, boolean> => {
  if (value?.telegram) return { sms: false, telegram: true };
  return { sms: true, telegram: false };
};

const toPersonOption = (raw: any, fallbackNameKey: 'customerName' | 'partnerName'): PersonOption => ({
  id: Number(raw?.id),
  name: cleanText(raw?.name || raw?.fullName || raw?.[fallbackNameKey] || raw?.displayName || raw?.phoneNumber || 'بدون نام'),
  phoneNumber: cleanText(raw?.phoneNumber || raw?.phone || raw?.mobile || raw?.mobileNumber) || null,
  telegramChatId: cleanText(raw?.telegramChatId || raw?.telegram_chat_id || raw?.chatId) || null,
});

const MessageComposerModal: React.FC<Props> = ({ open, onClose, onQueued, initialRecipient, initialText, initialChannels, initialVariables }) => {
  const [recipientType, setRecipientType] = useState<RecipientType>(initialRecipient?.type ?? 'customer');
  const [recipientId, setRecipientId] = useState<string>(initialRecipient?.id ? String(initialRecipient.id) : '');
  const [recipientName, setRecipientName] = useState<string>(initialRecipient?.name ?? '');
  const [phoneNumber, setPhoneNumber] = useState<string>(initialRecipient?.phoneNumber ?? '');
  const [telegramChatId, setTelegramChatId] = useState<string>(initialRecipient?.telegramChatId ?? '');
  const [saveTelegramChatId, setSaveTelegramChatId] = useState<boolean>(true);
  const [channels, setChannels] = useState<Record<ChannelKey, boolean>>(() => {
    const wantsSms = Boolean(initialChannels?.sms);
    const wantsTelegram = Boolean(initialChannels?.telegram);
    if (wantsSms && !wantsTelegram) return { sms: true, telegram: false };
    if (wantsTelegram && !wantsSms) return { sms: false, telegram: true };
    if (wantsSms && wantsTelegram) {
      return initialRecipient?.telegramChatId && !initialRecipient?.phoneNumber
        ? { sms: false, telegram: true }
        : { sms: true, telegram: false };
    }
    return { sms: true, telegram: false };
  });
  const [text, setText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [customers, setCustomers] = useState<PersonOption[]>([]);
  const [partners, setPartners] = useState<PersonOption[]>([]);
  const openInitializedRef = useRef(false);

  const recipientLocked = !!initialRecipient?.id && (initialRecipient?.type === 'customer' || initialRecipient?.type === 'partner');

  useEffect(() => {
    if (!open) {
      openInitializedRef.current = false;
      return;
    }
    if (openInitializedRef.current) return;
    openInitializedRef.current = true;
    setErr(null);
    setShowEmojiPicker(false);

    if (initialRecipient) {
      setRecipientType(initialRecipient.type ?? 'customer');
      setRecipientId(initialRecipient.id ? String(initialRecipient.id) : '');
      setRecipientName(initialRecipient.name ?? '');
      setPhoneNumber(initialRecipient.phoneNumber ?? '');
      setTelegramChatId(initialRecipient.telegramChatId ?? '');
    } else {
      setRecipientType('customer');
      setRecipientId('');
      setRecipientName('');
      setPhoneNumber('');
      setTelegramChatId('');
    }

    setChannels(normalizeChannels(initialChannels));
    setText(typeof initialText === 'string' ? initialText : '');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const [cRes, pRes] = await Promise.all([
          apiFetch('/api/customers').catch(() => null),
          apiFetch('/api/partners').catch(() => null),
        ]);
        if (cancelled) return;
        if (cRes && 'ok' in cRes) {
          const c = await (cRes as Response).json().catch(() => null);
          if ((cRes as Response).ok && c?.success && Array.isArray(c.data)) setCustomers(c.data.map((item: any) => toPersonOption(item, 'customerName')).filter((item: PersonOption) => item.id));
        }
        if (pRes && 'ok' in pRes) {
          const p = await (pRes as Response).json().catch(() => null);
          if ((pRes as Response).ok && p?.success && Array.isArray(p.data)) setPartners(p.data.map((item: any) => toPersonOption(item, 'partnerName')).filter((item: PersonOption) => item.id));
        }
      } catch {
        // Manual mode remains usable even when lookup fails.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const options = useMemo(() => (recipientType === 'partner' ? partners : customers), [recipientType, customers, partners]);

  useEffect(() => {
    if (!open || recipientType === 'manual') return;
    const idNum = Number(recipientId);
    if (!idNum) return;
    const found = options.find((x) => x.id === idNum);
    if (!found) return;
    setRecipientName(found.name ?? '');
    setPhoneNumber(found.phoneNumber ?? '');
    setTelegramChatId(found.telegramChatId ?? '');
  }, [recipientId, recipientType, options, open]);

  const activeChannels = useMemo(() => (Object.keys(channels) as ChannelKey[]).filter((key) => channels[key]), [channels]);
  const normalizedPhone = phoneNumber.replace(/\D/g, '');
  const charsLeft = MESSAGE_LIMIT - text.length;

  const validation = useMemo(() => {
    const next: Record<string, string> = {};
    if (!activeChannels.length) next.channels = 'مسیر ارسال را انتخاب کنید.';
    if (recipientType !== 'manual' && !Number(recipientId)) next.recipientId = 'گیرنده را انتخاب کنید.';
    if (recipientType === 'manual' && !recipientName.trim()) next.recipientName = 'نام گیرنده را وارد کنید.';
    if (!text.trim()) next.text = 'متن پیام را وارد کنید.';
    if (text.length > MESSAGE_LIMIT) next.text = `متن پیام حداکثر ${MESSAGE_LIMIT.toLocaleString('fa-IR')} کاراکتر باشد.`;
    if (channels.sms && (!normalizedPhone || normalizedPhone.length < 10)) next.phoneNumber = 'برای پیامک، شماره موبایل معتبر لازم است.';
    if (channels.telegram && !telegramChatId.trim()) next.telegramChatId = 'برای تلگرام، Chat ID گیرنده لازم است.';
    return next;
  }, [activeChannels.length, recipientType, recipientId, recipientName, text, channels.sms, channels.telegram, normalizedPhone, telegramChatId]);

  const validationMessage = Object.values(validation)[0] || '';
  const canSend = !validationMessage && !loading;

  const tgBotUsername =
    (import.meta as any)?.env?.VITE_TELEGRAM_BOT_USERNAME ||
    (import.meta as any)?.env?.VITE_TELEGRAM_BOT ||
    '';

  const tgStartLink = useMemo(() => {
    const bot = String(tgBotUsername || '').trim().replace(/^@/, '');
    if (!bot || recipientType === 'manual') return '';
    const idNum = Number(recipientId);
    if (!idNum) return '';
    return `https://t.me/${bot}?start=${recipientType}_${idNum}`;
  }, [tgBotUsername, recipientType, recipientId]);

  const previewVariables = useMemo(() => ({
    name: (recipientName || initialRecipient?.name || 'مشتری').trim(),
    phone: phoneNumber || initialRecipient?.phoneNumber || '',
    amount: initialVariables?.amount ?? '',
    dueDate: initialVariables?.dueDate ?? '',
    link: initialVariables?.link ?? '',
  }), [recipientName, initialRecipient?.name, initialRecipient?.phoneNumber, phoneNumber, initialVariables?.amount, initialVariables?.dueDate, initialVariables?.link]);

  const resolvedPreview = useMemo(() => resolveComposerTemplate(text, previewVariables), [text, previewVariables]);

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      setErr('کپی انجام نشد. دسترسی مرورگر به کلیپ‌بورد را بررسی کنید.');
    }
  };

  const setOnlyIfSafe = (nextType: RecipientType) => {
    if (recipientLocked) return;
    setRecipientType(nextType);
    setRecipientId('');
    setRecipientName('');
    setPhoneNumber('');
    setTelegramChatId('');
  };

  const selectChannel = (key: ChannelKey) => {
    setChannels({ sms: key === 'sms', telegram: key === 'telegram' });
  };

  const handleSend = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setErr(null);
    if (!canSend) {
      setErr(validationMessage || 'اطلاعات پیام کامل نیست.');
      return;
    }

    const payload = {
      recipientType,
      recipientId: recipientType === 'manual' ? undefined : Number(recipientId),
      recipientName: recipientName.trim() || undefined,
      phoneNumber: channels.sms ? (phoneNumber || undefined) : undefined,
      telegramChatId: channels.telegram ? (telegramChatId || undefined) : undefined,
      channels: activeChannels,
      text: text.trim(),
      variables: previewVariables,
      saveToProfile: recipientType === 'manual' ? false : channels.telegram ? saveTelegramChatId : false,
    };

    setLoading(true);
    try {
      const res = await apiFetch('/api/messages/send', { method: 'POST', body: JSON.stringify(payload) });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setErr(humanizeComposerError(json?.message));
        return;
      }
      onQueued?.();
      onClose();
      setText('');
    } catch (e: any) {
      setErr(humanizeComposerError(e?.message || 'خطای ارتباط با سرور هنگام ارسال پیام.'));
    } finally {
      setLoading(false);
    }
  };


  const appendEmoji = (emoji: string) => {
    setText((prev) => `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}${emoji}`);
    setShowEmojiPicker(false);
  };


  const selectedChannelLabel = activeChannels.map((key) => channelMeta[key].title).join('، ') || 'انتخاب نشده';
  const recipientDisplayName = (recipientName || previewVariables.name || 'گیرنده').trim();
  const readyChecks = [
    { key: 'recipient', label: 'گیرنده', done: recipientType === 'manual' ? Boolean(recipientName.trim()) : Boolean(Number(recipientId)) },
    { key: 'channel', label: 'کانال', done: Boolean(activeChannels.length) },
    { key: 'address', label: channels.telegram ? 'Chat ID' : 'شماره', done: channels.telegram ? Boolean(telegramChatId.trim()) : Boolean(normalizedPhone && normalizedPhone.length >= 10) },
    { key: 'text', label: 'متن', done: Boolean(text.trim()) && text.length <= MESSAGE_LIMIT },
  ];

  const deliveryScore = Math.round((readyChecks.filter((item) => item.done).length / readyChecks.length) * 100);

  return (
    <InventoryModal
      open={open}
      onClose={onClose}
      title="ارسال پیام"
      widthClassName="max-w-[1120px]"
      overlayClassName="message-composer-modal-overlay"
      panelClassName="message-composer-canonical-panel"
      bodyClassName="message-composer-canonical-body"
      iconClassName="fa-solid fa-message"
      eyebrow="پیام‌رسانی"
      hideCloseButton
      variant="expansive"
      layout="vertical"
      tone="info"
    >
      <form onSubmit={handleSend} className="message-composer-canonical modal-template-form modal-template-form--message" dir="rtl">
        <section className="message-composer-status" aria-label="آمادگی ارسال پیام">
          <div className="message-composer-status__metrics">
            <div className="modal-template-metric message-composer-status__metric">
              <span className="modal-template-metric__icon is-success"><i className="fa-solid fa-comment-sms" /></span>
              <div className="modal-template-metric__copy">
                <strong>{selectedChannelLabel || 'انتخاب نشده'}</strong>
                <span>مسیر ارسال</span>
              </div>
            </div>
            <div className="modal-template-metric message-composer-status__metric">
              <span className="modal-template-metric__icon"><i className="fa-solid fa-font" /></span>
              <div className="modal-template-metric__copy">
                <strong>{charsLeft.toLocaleString('fa-IR')}</strong>
                <span>کاراکتر باقی‌مانده از {MESSAGE_LIMIT.toLocaleString('fa-IR')}</span>
              </div>
            </div>
          </div>

          <div className="message-composer-status__main">
            <p>گام‌های ارسال پیام را کامل کنید. خروجی نهایی قبل از ورود به صف ارسال قابل کنترل است.</p>
            <div className="message-composer-progress" aria-hidden="true"><span style={{ width: `${deliveryScore}%` }} /></div>
            <div className="message-composer-checks">
              {readyChecks.map((item) => (
                <span key={item.key} className={item.done ? 'is-done' : ''}>
                  <i className={item.done ? 'fa-solid fa-check' : 'fa-regular fa-circle'} />
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {err ? (
          <div className="message-composer-alert" role="alert">
            <i className="fa-solid fa-circle-exclamation" />
            <span>{err}</span>
          </div>
        ) : null}

        <div className="message-composer-grid">
          <section className="modal-template-card message-composer-card message-composer-route">
            <header className="message-composer-card__head">
              <span className="message-composer-card__icon"><i className="fa-solid fa-user" /></span>
              <div>
                <h4>گیرنده و مسیر ارسال</h4>
                <p>گیرنده، کانال، شماره تماس و وضعیت اتصال را یکجا کنترل کنید.</p>
              </div>
            </header>

            <div className="message-composer-segment" role="tablist" aria-label="نوع گیرنده">
              {(Object.keys(recipientTypeMeta) as RecipientType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  disabled={recipientLocked}
                  className={recipientType === type ? 'is-active' : ''}
                  onClick={() => setOnlyIfSafe(type)}
                >
                  <i className={recipientTypeMeta[type].icon} />
                  <span>{recipientTypeMeta[type].label}</span>
                </button>
              ))}
            </div>

            {recipientType === 'manual' ? (
              <ModalField label="نام گیرنده" iconClass="fa-solid fa-user-pen" required error={validation.recipientName}>
                <input
                  value={recipientName}
                  onChange={(event) => setRecipientName(event.target.value)}
                  placeholder="مثلاً آقای محمدی"
                />
              </ModalField>
            ) : recipientLocked ? (
              <ModalField label={recipientType === 'partner' ? 'همکار انتخاب‌شده' : 'مشتری انتخاب‌شده'} iconClass="fa-solid fa-user" required error={validation.recipientId}>
                <input value={recipientName || 'بدون نام'} readOnly />
              </ModalField>
            ) : (
              <ModalField label={recipientType === 'partner' ? 'انتخاب همکار' : 'انتخاب مشتری'} iconClass="fa-solid fa-user" required error={validation.recipientId}>
                <select value={recipientId} onChange={(e) => setRecipientId(e.target.value)}>
                  <option value="">انتخاب کنید</option>
                  {options.map((person) => (
                    <option key={person.id} value={person.id}>{person.name}</option>
                  ))}
                </select>
              </ModalField>
            )}

            <div className="message-composer-channel-block">
              <div className="message-composer-label-row">
                <span>کانال ارسال <em>*</em></span>
              </div>
              <div className="message-composer-channel-grid">
                {(['sms', 'telegram'] as ChannelKey[]).map((key) => {
                  const active = channels[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      className={active ? 'is-active' : ''}
                      onClick={() => selectChannel(key)}
                      aria-pressed={active}
                    >
                      <span className="message-composer-channel__radio" />
                      <span className="message-composer-channel__copy">
                        <strong>{channelMeta[key].title}</strong>
                        <small>{active ? 'انتخاب‌شده' : channelMeta[key].hint}</small>
                      </span>
                      <span className={`message-composer-channel__icon message-composer-channel__icon--${key}`}><i className={channelMeta[key].icon} /></span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="message-composer-inline-fields">
              {channels.sms ? (
                <ModalField label="شماره موبایل" iconClass="fa-solid fa-phone" required error={validation.phoneNumber}>
                  <input
                    value={phoneNumber}
                    inputMode="tel"
                    dir="ltr"
                    onChange={(event) => setPhoneNumber(event.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="09xxxxxxxxx"
                  />
                </ModalField>
              ) : null}

              {channels.telegram ? (
                <ModalField label="Chat ID تلگرام" iconClass="fa-brands fa-telegram" required error={validation.telegramChatId}>
                  <input
                    value={telegramChatId}
                    dir="ltr"
                    onChange={(event) => setTelegramChatId(event.target.value)}
                    placeholder="123456789"
                  />
                </ModalField>
              ) : null}
            </div>

            {channels.telegram && recipientType !== 'manual' ? (
              <div className="message-composer-route-footer">
                <div className="message-composer-save-chatid">
                  <ToggleSwitch checked={saveTelegramChatId} onCheckedChange={setSaveTelegramChatId} ariaLabel="ذخیره Chat ID تلگرام" size="sm" />
                  <span>ذخیره Chat ID در پرونده</span>
                </div>
                {tgStartLink ? (
                  <button type="button" onClick={() => copyToClipboard(tgStartLink)}>
                    <i className="fa-solid fa-link" />
                    کپی لینک اتصال
                  </button>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="modal-template-card message-composer-card message-composer-compose">
            <header className="message-composer-card__head">
              <span className="message-composer-card__icon"><i className="fa-solid fa-pen-nib" /></span>
              <div>
                <h4>متن پیام</h4>
                <p>قالب آماده انتخاب کنید یا متن اختصاصی بنویسید؛ پیش‌نمایش قبل از ثبت دیده می‌شود.</p>
              </div>
            </header>

            <div className="message-composer-template-grid" aria-label="قالب‌های سریع">
              {quickTemplates.map((template) => (
                <button key={template.key} type="button" onClick={() => setText(template.text)}>
                  <i className={template.icon} />
                  {template.label}
                </button>
              ))}
            </div>

            <div className="message-composer-text-field">
              <ModalField label="متن پیام" iconClass="fa-solid fa-message" required error={validation.text}>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="متن پیام را بنویسید…"
                  rows={8}
                />
                <div className="message-composer-textarea-meta">
                  <span>{text.length.toLocaleString('fa-IR')} / {MESSAGE_LIMIT.toLocaleString('fa-IR')} کاراکتر</span>
                  <button
                    type="button"
                    className="message-composer-emoji-trigger"
                    aria-expanded={showEmojiPicker}
                    aria-label="انتخاب ایموجی"
                    onClick={() => setShowEmojiPicker((current) => !current)}
                  >
                    <i className="fa-regular fa-face-smile" />
                  </button>
                </div>
                {showEmojiPicker ? (
                  <div className="message-composer-emoji-picker" role="listbox" aria-label="ایموجی‌های سریع">
                    {emojiPresets.map((emoji) => (
                      <button key={emoji} type="button" role="option" onClick={() => appendEmoji(emoji)}>
                        {emoji}
                      </button>
                    ))}
                  </div>
                ) : null}
              </ModalField>
            </div>

            <div className="message-composer-variables">
              <span>متغیرهای قابل استفاده</span>
              <div>
                {(['name', 'phone', 'amount', 'dueDate', 'link'] as const).map((key) => (
                  <button key={key} type="button" onClick={() => setText((prev) => `${prev}${prev ? ' ' : ''}{${key}}`)}>
                    {`{${key}}`}
                    <small>{key === 'name' ? 'نام مشتری' : key === 'phone' ? 'شماره تماس' : key === 'amount' ? 'مبلغ' : key === 'dueDate' ? 'سررسید' : 'لینک پرداخت'}</small>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        <section className="message-composer-preview">
          <header className="message-composer-preview__head">
            <span><i className="fa-solid fa-eye" /> پیش‌نمایش پیام</span>
            <strong>{deliveryScore.toLocaleString('fa-IR')}٪ آماده ارسال</strong>
          </header>
          <div className="message-composer-preview-card">
            <div className="message-composer-preview-recipient">
              <span className="message-composer-preview-avatar"><i className="fa-solid fa-user" /></span>
              <div>
                <strong>{recipientDisplayName}</strong>
                <small>{selectedChannelLabel}</small>
              </div>
              <em>{activeChannels.length ? 'آماده بررسی' : 'کانال انتخاب نشده'}</em>
            </div>

            <div className="message-composer-preview-body">
              {resolvedPreview.trim() ? (
                <div className="message-composer-preview-bubble">
                  {resolvedPreview.trim()}
                  <span><i className="fa-solid fa-check-double" /> 11:30</span>
                </div>
              ) : (
                <div className="message-composer-preview-empty">
                  <span><i className="fa-regular fa-message" /></span>
                  <strong>هنوز متنی وارد نشده است.</strong>
                  <small>برای دیدن پیش‌نمایش، متن پیام را در باکس بالا وارد کنید.</small>
                </div>
              )}
            </div>
          </div>
        </section>

        <ModalActions
          className="message-composer-actions"
          onCancel={onClose}
          helperTitle="ثبت در صف ارسال"
          helperText="پیام پس از ثبت، در صف ارسال قرار می‌گیرد و در زمان‌بندی تعیین‌شده ارسال خواهد شد."
          helperIconClass="fa-solid fa-circle-info"
          submitText="ثبت در صف ارسال"
          submittingText="در حال ثبت پیام..."
          isSubmitting={loading}
          submitDisabled={!canSend}
          cancelIconClass="fa-solid fa-arrow-right"
          submitIconClass="fa-solid fa-paper-plane"
        />
      </form>
    </InventoryModal>
  );
};

export default MessageComposerModal;
