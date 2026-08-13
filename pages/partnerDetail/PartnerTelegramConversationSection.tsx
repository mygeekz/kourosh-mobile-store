import { TextareaField } from '@/components/ui';
import { IconGlyph } from '@/components/ui';
import React from 'react';
import type { TelegramConversationItem } from '../viewBoundaryTypes';

export type PartnerTelegramConversationContext = Record<string, any> & {
  partnerTgConvItems: TelegramConversationItem[];
  partnerTgFilteredConvItems: TelegramConversationItem[];
};

type Props = {
  ctx: PartnerTelegramConversationContext;
};

const PartnerTelegramConversationSection: React.FC<Props> = ({ ctx }) => {
  const {
    Button,
    MessageComposerModal,
    amount,
    applyPartnerTgPreset,
    balance,
    credit,
    current,
    el,
    formatIsoToShamsi,
    id,
    isMessageModalOpen,
    item,
    jumpToFirstPartnerTgResult,
    kind,
    name,
    nearBottom,
    nextValue,
    openPartnerQrLinkModal,
    partnerTelegramChatId,
    partnerTelegramLinked,
    partnerTelegramLinkedAt,
    partnerTgConvError,
    partnerTgConvItems,
    partnerTgConvLoading,
    partnerTgDirectionFilter,
    partnerTgFilteredConvItems,
    partnerTgNewSinceScroll,
    partnerTgPreset,
    partnerTgQuickReply,
    partnerTgTimelineRef,
    phone,
    prefillChannels,
    prefillMessageText,
    profile,
    resolvePartnerTelegramText,
    rows,
    sendPartnerTelegramQuickReply,
    setIsMessageModalOpen,
    setNotification,
    setPartnerTgDirectionFilter,
    setPartnerTgNewSinceScroll,
    setPartnerTgQuickReply,
    setPartnerTgSearchQuery,
    target,
    text,
    token,
    value,
  } = ctx;

  return (
    <>
<MessageComposerModal
        open={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        initialRecipient={{
          type: 'partner',
          id: profile.id,
          name: profile.partnerName,
          phoneNumber: profile.phoneNumber,
          telegramChatId: (profile as any).telegramChatId,
        }}
        initialText={prefillMessageText}
        initialChannels={prefillChannels}
        initialVariables={{
          amount: Number(profile.currentBalance || 0),
          dueDate: String((profile as any).createdAt || ''),
          link: typeof window !== 'undefined' ? window.location.href : '',
        }}
        onQueued={() => setNotification({ type: 'success', text: 'پیام در صف ارسال قرار گرفت. وضعیت را در «صف ارسال» ببینید.' })}
      />

      {/* گفتگوی تلگرام همکار */}
      <section
        dir="rtl"
        className="partner-telegram-customer-copy-v119 rounded-[32px] border border-slate-200 bg-white p-5 text-slate-900 shadow-[0_28px_80px_-52px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
        aria-label="مرکز گفتگوی تلگرام همکار"
      >
        {(() => {
          const linked = partnerTelegramLinked;
          const chatId = partnerTelegramChatId;
          const secureLinked = Boolean(String((profile as any).telegram_user_id || '').trim());
          const legacyDelivery = linked && !secureLinked;
          const outboxCount = partnerTgConvItems.filter((item) => item.direction === 'out').length;
          const inboxCount = partnerTgConvItems.filter((item) => item.direction === 'in').length;
          const failedCount = partnerTgConvItems.filter((item) => item.direction === 'out' && String(item.status || '') === 'failed').length;
          const lastInteractionAt = partnerTgConvItems.length ? partnerTgConvItems[partnerTgConvItems.length - 1]?.createdAt : null;

          return (
            <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
              <aside className="space-y-4">
                <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="mb-4 flex items-center justify-start gap-2 text-right">
                    <IconGlyph tone="neutral" className="h-10 w-10 shrink-0" aria-hidden="true"><i className="fa-solid fa-id-card" /></IconGlyph>
                    <div className="text-right">
                      <div className="text-[13px] font-black text-slate-900 dark:text-slate-50">کارت تلگرام همکار</div>
                      <div className="mt-0.5 text-[10px] font-bold text-slate-400 dark:text-slate-500">اتصال، وضعیت پیام و Chat ID همکار</div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-gradient-to-b from-white to-slate-50/70 p-4 text-right dark:border-slate-800 dark:from-slate-950 dark:to-slate-900/40">
                    <div className="flex items-center justify-between gap-3">
                      <IconGlyph tone="neutral" className="h-16 w-16 shrink-0" aria-hidden="true"><i className="fa-solid fa-user-tie text-xl" /></IconGlyph>
                      <div className="min-w-0 flex-1 text-right">
                        <div className="text-[18px] font-black text-slate-950 dark:text-slate-50">{profile.partnerName}</div>
                        <div className="mt-1 text-[12px] font-bold text-slate-500 dark:text-slate-400">شناسه همکار: {Number(profile.id || 0).toLocaleString('fa-IR')}</div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950">
                        <div className="text-[10px] font-black text-slate-400 dark:text-slate-500">آخرین فعالیت</div>
                        <div className="mt-1 text-[13px] font-black text-slate-900 dark:text-slate-50">{lastInteractionAt ? formatIsoToShamsi(lastInteractionAt) : (partnerTelegramLinkedAt || '—')}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950">
                        <div className="text-[10px] font-black text-slate-400 dark:text-slate-500">وضعیت ربات</div>
                        <div className={["mt-1 inline-flex items-center gap-1.5 text-[13px] font-black", secureLinked ? "text-emerald-700 dark:text-emerald-300" : legacyDelivery ? "text-amber-700 dark:text-amber-300" : "text-rose-600 dark:text-rose-300"].join(' ')}>
                          <i className="fa-solid fa-circle text-[8px]" />
                          {secureLinked ? 'متصل امن' : legacyDelivery ? 'قدیمی؛ فقط ارسال' : 'لینک امن نشده'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="mb-3 flex items-center justify-start gap-2 text-right">
                    <IconGlyph tone="neutral" className="h-9 w-9 shrink-0" aria-hidden="true"><i className="fa-solid fa-link" /></IconGlyph>
                    <div className="text-right text-[14px] font-black text-slate-900 dark:text-slate-50">Chat ID</div>
                  </div>
                  <div className="flex h-12 items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-950">
                    <span className="min-w-0 flex-1 truncate text-left text-[13px] font-bold text-slate-600 dark:text-slate-300" dir="ltr">{chatId || 'ثبت نشده'}</span>
                    <i className="fa-brands fa-telegram text-sky-500" />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={openPartnerQrLinkModal}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 text-[11px] font-black text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200"
                    >
                      <i className="fa-solid fa-floppy-disk" />
                      {secureLinked ? 'مدیریت اتصال امن' : 'ایجاد لینک امن'}
                    </button>
                    <button
                      type="button"
                      onClick={openPartnerQrLinkModal}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white text-[11px] font-black text-rose-600 transition hover:bg-rose-50 dark:border-rose-900/40 dark:bg-slate-950 dark:text-rose-300"
                    >
                      <i className="fa-solid fa-rotate-right" />
                      تأیید امن مجدد
                    </button>
                  </div>
                  {legacyDelivery ? (
                    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-[11px] leading-6 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                      اتصال تلگرام قدیمی — نیازمند تأیید امن مجدد. مقصد فعلی فقط برای ارسال خروجی حفظ شده است.
                    </div>
                  ) : null}
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="mb-3 w-full text-right text-[15px] font-black text-slate-900 dark:text-slate-50">وضعیت دریافت پیام</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                      <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400">دریافت پیام</span>
                      <span className={["inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black", linked ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"].join(' ')}>
                        <i className={linked ? "fa-solid fa-circle-check" : "fa-solid fa-circle-minus"} />
                        {linked ? 'فعال' : 'غیرفعال'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                      <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400">ارسال پیام</span>
                      <span className={["inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black", linked && !failedCount ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200" : "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-200"].join(' ')}>
                        <i className={linked && !failedCount ? "fa-solid fa-circle-check" : "fa-solid fa-triangle-exclamation"} />
                        {linked && !failedCount ? 'فعال' : 'نیازمند بررسی'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-[11px] leading-6 text-slate-600 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-slate-300">
                    <i className="fa-solid fa-circle-info ml-1 text-amber-500" />
                    پیام‌ها از ربات تلگرام همکار دریافت و ارسال می‌شوند.
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="mb-3 flex items-center justify-start gap-2 text-right">
                    <i className="fa-solid fa-chevron-down text-xs text-slate-400" />
                    <div className="text-right text-[14px] font-black text-slate-900 dark:text-slate-50">اطلاعات بیشتر</div>
                  </div>
                  <div className="space-y-2 text-[12px] font-bold text-slate-500 dark:text-slate-400">
                    <div className="flex items-center justify-between gap-3">
                      <span dir="ltr" className="truncate">{linked ? chatId : '-'}</span>
                      <span>جزئیات اتصال ربات و لاگ‌ها</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>{profile.phoneNumber || '-'}</span>
                      <span>شماره تماس</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>{partnerTelegramLinkedAt || '-'}</span>
                      <span>تاریخ اتصال</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>{partnerTgConvItems.length.toLocaleString('fa-IR')}</span>
                      <span>تعداد پیام‌ها</span>
                    </div>
                  </div>
                </div>
              </aside>

              <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="mb-5 space-y-3">
                  <div className="partner-telegram-header-v124">
                    <div className="partner-telegram-header-v124__actions">
                      {([
                        { key: 'all', label: 'همه' },
                        { key: 'out', label: 'ارسالی' },
                        { key: 'in', label: 'دریافتی' },
                      ] as const).map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setPartnerTgDirectionFilter(item.key)}
                          className={["inline-flex h-10 min-w-[78px] items-center justify-center rounded-2xl border px-4 text-[12px] font-black transition", partnerTgDirectionFilter === item.key ? 'border-amber-200 bg-amber-100 text-slate-800 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200'].join(' ')}
                        >
                          {item.label}
                        </button>
                      ))}

                      <span className={["inline-flex h-10 items-center gap-2 rounded-2xl border px-4 text-[12px] font-black", linked ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200' : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'].join(' ')}>
                        <i className="fa-solid fa-link" />
                        {linked ? 'لینک شده' : 'لینک نشده'}
                      </span>
                    </div>

                    <div className="partner-telegram-header-v124__title">
                      <span className="partner-telegram-header-v124__icon">
                        <i className="fa-brands fa-telegram text-[22px]" />
                      </span>
                      <div className="partner-telegram-header-v124__copy">
                        <h2 className="text-[22px] font-black tracking-[-0.03em] text-slate-950 dark:text-slate-50">گفتگوی تلگرام همکار</h2>
                        <p className="mt-1 text-[12px] leading-6 text-slate-500 dark:text-slate-400">اتصال ربات، ثبت ID، پیام‌ها و پیگیری گفتگو.</p>
                      </div>
                    </div>
                  </div>

                  <div className="partner-telegram-search-row-v120 flex items-center justify-end">
                    <div className="partner-telegram-searchbox-v120" role="search">
                      <div
                        className="partner-telegram-searchbox-v120__input"
                        role="textbox"
                        contentEditable
                        suppressContentEditableWarning
                        data-placeholder="جستجو در گفتگو..."
                        onInput={(event) => {
                          const nextValue = (event.currentTarget.textContent || '').replace(/\u00a0/g, ' ');
                          setPartnerTgSearchQuery(nextValue);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            jumpToFirstPartnerTgResult();
                          }
                        }}
                        onBlur={(event) => {
                          const normalizedValue = (event.currentTarget.textContent || '').replace(/\u00a0/g, ' ').trim();
                          if (!normalizedValue) event.currentTarget.textContent = '';
                          setPartnerTgSearchQuery(normalizedValue);
                        }}
                      />
                      <i className="fa-solid fa-magnifying-glass" />
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-inner dark:border-slate-800 dark:bg-slate-950">
                  <div className="mb-4 rounded-[22px] border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                    <div className="mb-2 text-right text-[14px] font-black text-slate-900 dark:text-slate-50">خلاصه آخرین گفتگو</div>
                    <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] font-bold text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <i className="fa-regular fa-clock" />
                        <span>{lastInteractionAt ? formatIsoToShamsi(lastInteractionAt) : '—'}</span>
                      </div>
                      <div className="min-w-0 flex-1 truncate text-right text-slate-700 dark:text-slate-200">
                        {partnerTgConvItems.length ? String(partnerTgConvItems[partnerTgConvItems.length - 1]?.text || 'آخرین پیام بدون متن') : 'هنوز گفتگویی ثبت نشده است.'}
                      </div>
                    </div>
                  </div>

                  <div className="relative rounded-[26px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                    <div
                      ref={partnerTgTimelineRef}
                      onScroll={(e) => {
                        const el = e.currentTarget;
                        const nearBottom = (el.scrollHeight - el.scrollTop - el.clientHeight) < 140;
                        if (nearBottom) setPartnerTgNewSinceScroll(false);
                      }}
                      className="min-h-[250px] max-h-[440px] space-y-4 overflow-y-auto px-2 py-1"
                    >
                      {partnerTgConvError ? (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200">{partnerTgConvError}</div>
                      ) : null}

                      {!linked ? (
                        <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center dark:border-slate-700 dark:bg-slate-900/50">
                          <i className="fa-brands fa-telegram mb-3 text-[34px] text-slate-300 dark:text-slate-600" />
                          <div className="text-[14px] font-black text-slate-600 dark:text-slate-300">همکار هنوز به تلگرام وصل نیست.</div>
                          <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">ابتدا اتصال تلگرام را فعال کنید تا تایم‌لاین گفتگو نمایش داده شود.</p>
                        </div>
                      ) : partnerTgFilteredConvItems.length === 0 && !partnerTgConvLoading ? (
                        <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center dark:border-slate-700 dark:bg-slate-900/50">
                          <i className="fa-brands fa-telegram mb-3 text-[34px] text-slate-300 dark:text-slate-600" />
                          <div className="text-[14px] font-black text-slate-600 dark:text-slate-300">هنوز پیامی برای نمایش وجود ندارد.</div>
                          <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">با ارسال اولین پیام، تایم‌لاین گفتگو اینجا نمایش داده می‌شود.</p>
                        </div>
                      ) : null}

                      {partnerTgFilteredConvItems.map((message) => {
                        const outgoing = message.direction === 'out';
                        const status = outgoing ? (message.status || '') : '';
                        const isFailed = status === 'failed';
                        const isPending = status === 'pending' || status === 'processing';
                        const isSent = status === 'done' || status === 'sent';
                        const statusLabel = !outgoing ? 'دریافتی' : isSent ? 'ارسال‌شده' : isFailed ? 'ناموفق' : isPending ? 'در صف ارسال' : 'در حال پردازش';

                        return (
                          <div id={`tg-partner-msg-${message.id}`} key={message.id} className={["flex items-end gap-3", outgoing ? "justify-start" : "justify-end"].join(' ')}>
                            {outgoing ? <IconGlyph tone="info" className="h-10 w-10 shrink-0" aria-hidden="true"><i className="fa-brands fa-telegram" /></IconGlyph> : null}
                            <div className={["max-w-[78%] rounded-[24px] border px-4 py-3 text-sm leading-7 shadow-sm transition", outgoing ? (isFailed ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-100" : "border-emerald-200 bg-emerald-50/90 text-slate-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-slate-100") : "border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"].join(' ')}>
                              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-slate-400 dark:text-slate-500">
                                <span>{outgoing ? 'فروشگاه' : profile.partnerName}</span>
                                <span>{formatIsoToShamsi(message.createdAt)}</span>
                              </div>
                              {message.kind === 'photo' && message.mediaUrl ? (
                                <div className="space-y-2"><img src={message.mediaUrl} alt="photo" className="max-h-64 rounded-2xl border border-slate-200 object-contain dark:border-slate-700" />{message.text ? <div className="whitespace-pre-wrap">{message.text}</div> : null}</div>
                              ) : message.kind === 'document' && message.mediaUrl ? (
                                <div className="space-y-2"><a href={message.mediaUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-black text-sky-600 dark:text-sky-300"><i className="fa-regular fa-file-lines" /> فایل پیوست</a>{message.text ? <div className="whitespace-pre-wrap">{message.text}</div> : null}</div>
                              ) : (
                                <div className="whitespace-pre-wrap">{message.text || '—'}</div>
                              )}
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className={["inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black", !outgoing ? 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300' : isSent ? 'border-emerald-200 bg-white text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200' : isFailed ? 'border-rose-200 bg-white text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200'].join(' ')}>{statusLabel}</span>
                                {outgoing && message.errorCategory ? <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" title={message.lastError || ''}>{message.errorCategory}</span> : null}
                                {message.lastError ? <span className="text-[10px] font-semibold text-rose-500">{message.lastError}</span> : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {partnerTgNewSinceScroll ? (
                      <button
                        type="button"
                        onClick={() => {
                          const el = partnerTgTimelineRef.current;
                          if (el) {
                            el.scrollTop = el.scrollHeight;
                            setPartnerTgNewSinceScroll(false);
                          }
                        }}
                        className="absolute bottom-4 left-4 rounded-full bg-slate-900 px-3 py-2 text-xs font-black text-white shadow-lg dark:bg-white dark:text-slate-900"
                      >
                        پیام جدید ▾
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 rounded-[28px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                  <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
                    {[
                      { key: 'balance', label: 'پیگیری مانده حساب', icon: 'fa-regular fa-credit-card' },
                      { key: 'settlement', label: 'هماهنگی تسویه', icon: 'fa-regular fa-pen-to-square' },
                      { key: 'payment_confirm', label: 'تأیید پرداخت', icon: 'fa-solid fa-bell' },
                      { key: 'custom', label: 'متن آزاد', icon: 'fa-regular fa-pen-to-square' },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => applyPartnerTgPreset(item.key as typeof partnerTgPreset)}
                        className={["inline-flex h-10 items-center gap-2 rounded-2xl border px-4 text-[12px] font-black transition", partnerTgPreset === item.key ? 'border-blue-600 bg-blue-600 text-white shadow-[0_12px_28px_-18px_rgba(37,99,235,0.85)]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200'].join(' ')}
                      >
                        <i className={item.icon} />
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 text-right dark:border-slate-800 dark:bg-slate-900/40">
                      <div className="text-[13px] font-black text-slate-900 dark:text-slate-50">پیش‌نمایش پیام</div>
                      <div className="mt-3 whitespace-pre-wrap text-[13px] leading-7 text-slate-700 dark:text-slate-200">{resolvePartnerTelegramText(partnerTgQuickReply) || 'هنوز متنی برای ارسال وارد نشده است.'}</div>
                    </div>
                    <div>
                      <TextareaField controlOnly
                        value={partnerTgQuickReply}
                        onChange={(e) => setPartnerTgQuickReply(e.target.value)}
                        rows={6}
                        placeholder="متن پیام"
                        className="w-full resize-y rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-800 outline-none transition    dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 "
                      />
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          <span>متغیرها:</span>
                          {['{name}', '{phone}', '{amount}', '{dueDate}', '{link}'].map((token) => (
                            <span key={token} dir="ltr" className="rounded-full border border-slate-200 bg-white px-3 py-1.5 dark:border-slate-800 dark:bg-slate-950">{token}</span>
                          ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            onClick={() => setNotification({ type: 'success', text: 'زمان‌بندی پیام همکار در نسخه بعدی تکمیل می‌شود.' })}
                            disabled={!linked || !partnerTgQuickReply.trim()}
                            variant="secondary"
                            size="sm"
                            className="justify-center !rounded-2xl"
                            leftIcon={<i className="fa-regular fa-clock" />}
                          >
                            زمان‌بندی ارسال
                          </Button>
                          <Button
                            type="button"
                            onClick={sendPartnerTelegramQuickReply}
                            disabled={partnerTgConvLoading || !linked || !partnerTgQuickReply.trim()}
                            loading={partnerTgConvLoading}
                            loadingText="در حال ارسال..."
                            variant="success"
                            size="sm"
                            className="min-w-[190px] justify-center !rounded-2xl"
                            leftIcon={<i className="fa-solid fa-paper-plane" />}
                          >
                            ارسال تلگرام
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </section>
    </>
  );
};

export default PartnerTelegramConversationSection;
