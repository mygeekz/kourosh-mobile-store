import { TextareaField } from '@/components/ui';
import { IconGlyph, inferIconGlyphTone } from '@/components/ui';
import { apiFetch } from "../../utils/apiFetch";
import React from 'react';
import type { CustomerDetailsPageData } from '../../types';
import type { TelegramConversationItem } from '../viewBoundaryTypes';

type Props = {
  ctx: Record<string, any> & {
    tgConvItems: TelegramConversationItem[];
    tgFilteredConvItems: TelegramConversationItem[];
    setCustomerData: React.Dispatch<React.SetStateAction<CustomerDetailsPageData | null>>;
    setTgQuickReply: React.Dispatch<React.SetStateAction<string>>;
    setTgShowChatId: React.Dispatch<React.SetStateAction<boolean>>;
  };
};

const CustomerTelegramConversationSection: React.FC<Props> = ({ ctx }) => {
  const {
    MessageComposerModal,
    TelegramLinkModal,
    amount,
    applyTgQuickPreset,
    chatId,
    deepLink,
    el,
    fetchTelegramConversation,
    formatIsoToShamsi,
    getAuthHeaders,
    id,
    isMessageModalOpen,
    js,
    json,
    jumpToFirstTgResult,
    name,
    nearBottom,
    nextChatId,
    ok,
    openQrLinkModal,
    optedOut,
    prefillChannels,
    prefillMessageText,
    profile,
    res,
    rows,
    sendTgQuickReply,
    setCustomerData,
    setIsMessageModalOpen,
    setNotification,
    setTgAttachment,
    setTgChatIdInput,
    setTgDirectionFilter,
    setTgIsSending,
    setTgNewSinceScroll,
    setTgQrOpen,
    setTgQuickReply,
    setTgReplyTo,
    setTgSearchQuery,
    setTgShowChatId,
    tgAttachment,
    tgChatIdInput,
    tgConvError,
    tgConvItems,
    tgConvLoading,
    tgConvMeta,
    tgDirectionFilter,
    tgFilteredConvItems,
    tgIsSending,
    tgNewSinceScroll,
    tgQrBotUsernameMissing,
    tgQrDeepLink,
    tgQrExpectedPhone,
    tgQrExpiresAt,
    tgQrLoading,
    tgQrOpen,
    tgQuickPreset,
    tgQuickPreviewText,
    tgQuickReply,
    tgReplyTo,
    tgSearchQuery,
    tgShowChatId,
    tgTimelineRef,
    token,
    uploadTelegramAttachment,
    url,
    value,
  } = ctx;

  return (
    <>
<MessageComposerModal
        open={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        initialRecipient={{
          type: 'customer',
          id: profile.id,
          name: profile.fullName,
          phoneNumber: profile.phoneNumber,
          telegramChatId: (profile as any).telegramChatId,
        }}
        initialText={prefillMessageText}
        initialChannels={prefillChannels}
        initialVariables={{
          amount: Number(profile.currentBalance || 0),
          dueDate: String((profile as any).lastPurchaseDate || (profile as any).createdAt || ''),
          link: typeof window !== 'undefined' ? window.location.href : '',
        }}
        onQueued={() => setNotification({ type: 'success', text: 'پیام در صف ارسال قرار گرفت. وضعیت را در «صف ارسال» ببینید.' })}
      />

      <TelegramLinkModal
        isOpen={tgQrOpen}
        onClose={() => setTgQrOpen(false)}
        title="اتصال تلگرام"
        entityLabel={profile.fullName || 'مشتری'}
        loading={tgQrLoading}
        deepLink={tgQrDeepLink}
        botUsernameMissing={tgQrBotUsernameMissing}
        expectedPhone={tgQrExpectedPhone || profile.phoneNumber || ''}
        expiresAt={tgQrExpiresAt}
        onRefresh={openQrLinkModal}
        onCopy={async () => {
          if (!tgQrDeepLink) return;
          try {
            await navigator.clipboard.writeText(tgQrDeepLink);
            setNotification({ type: 'success', text: 'لینک اتصال تلگرام کپی شد.' });
          } catch {
            setNotification({ type: 'error', text: 'کپی لینک اتصال انجام نشد.' });
          }
        }}
      />

      {/* Telegram Command Center */}
      <section className="rounded-[32px] border border-slate-200 bg-white p-5 text-slate-900 shadow-[0_28px_80px_-52px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50" aria-label="مرکز گفتگوی تلگرام مشتری">
        {(() => {
          const chatId = String((profile as any).telegramChatId || (profile as any).telegram_chat_id || tgConvMeta?.chatId || '').trim();
          const telegramUserId = String((profile as any).telegram_user_id || '').trim();
          const optedOut = Number((profile as any).telegramOptedOut ?? (profile as any).telegram_opted_out ?? tgConvMeta?.telegramOptedOut ?? 0) === 1;
          const invalid = Number((profile as any).telegram_invalid ?? (profile as any).telegramInvalid ?? tgConvMeta?.telegramInvalid ?? 0) === 1;
          const linked = !!chatId;
          const secureLinked = !!telegramUserId;
          const legacyDelivery = linked && !secureLinked;
          const outboxCount = tgConvItems.filter((item) => item.direction === 'out').length;
          const inboxCount = tgConvItems.filter((item) => item.direction === 'in').length;
          const failedCount = tgConvItems.filter((item) => item.direction === 'out' && String(item.status || '') === 'failed').length;
          const lastInteractionAt = tgConvItems.length ? tgConvItems[tgConvItems.length - 1]?.createdAt : null;
          const canSendTelegram = linked && !optedOut && !invalid;
          const retryTelegramOutbox = async (outboxId: string) => {
            if (!token) return;
            setTgIsSending(true);
            try {
              const res = await apiFetch('/api/telegram/customer-actions/retry-outbox', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
                body: JSON.stringify({ outboxId }),
              });
              const js = await res.json().catch(() => ({}));
              if (!res.ok || js?.success === false) throw new Error(js?.message || 'ارسال مجدد انجام نشد.');
              setNotification({ type: 'success', text: 'پیام برای ارسال مجدد در صف قرار گرفت.' });
              fetchTelegramConversation(profile.id);
            } catch (e: any) {
              setNotification({ type: 'error', text: e?.message || 'ارسال مجدد انجام نشد.' });
            } finally {
              setTgIsSending(false);
            }
          };

          const saveManualChatId = async () => {
            const nextChatId = tgChatIdInput.trim();
            if (!token) return;
            if (!nextChatId) return setNotification({ type: 'error', text: 'ابتدا Chat ID را وارد کنید.' });
            setTgIsSending(true);
            try {
              const res = await apiFetch('/api/telegram/customers/link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
                body: JSON.stringify({ customerId: profile.id, chatId: nextChatId }),
              });
              const js = await res.json().catch(() => ({}));
              if (!res.ok || js?.success === false) throw new Error(js?.message || 'ذخیره Chat ID انجام نشد.');
              setCustomerData((prev) => prev ? {
                ...prev,
                profile: {
                  ...(prev as any).profile,
                  telegramChatId: nextChatId,
                  telegram_chat_id: nextChatId,
                } as any,
              } as any : prev);
              setNotification({ type: 'success', text: 'مقصد ارسال ذخیره شد؛ این عملیات دسترسی تلگرام ایجاد نکرد.' });
              fetchTelegramConversation(profile.id);
            } catch (e: any) {
              setNotification({ type: 'error', text: e?.message || 'ذخیره Chat ID انجام نشد.' });
            } finally {
              setTgIsSending(false);
            }
          };

          const unlinkChatId = async () => {
            if (!token || !linked) return;
            setTgIsSending(true);
            try {
              const res = await apiFetch('/api/telegram/customers/unlink', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
                body: JSON.stringify({ customerId: profile.id }),
              });
              const js = await res.json().catch(() => ({}));
              if (!res.ok || js?.success === false) throw new Error(js?.message || 'حذف اتصال تلگرام انجام نشد.');
              setCustomerData((prev) => prev ? {
                ...prev,
                profile: {
                  ...(prev as any).profile,
                  telegramChatId: '',
                  telegram_chat_id: '',
                  telegram_user_id: '',
                  telegram_linked_at: null,
                } as any,
              } as any : prev);
              setTgChatIdInput('');
              setNotification({ type: 'success', text: 'اتصال تلگرام مشتری حذف شد.' });
              fetchTelegramConversation(profile.id);
            } catch (e: any) {
              setNotification({ type: 'error', text: e?.message || 'حذف اتصال انجام نشد.' });
            } finally {
              setTgIsSending(false);
            }
          };

          const toggleTelegramOptout = async () => {
            if (!token) return;
            setTgIsSending(true);
            try {
              const nextOptedOut = !optedOut;
              const res = await apiFetch('/api/telegram/customers/optout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
                body: JSON.stringify({ customerId: profile.id, optedOut: nextOptedOut }),
              });
              const js = await res.json().catch(() => ({}));
              if (!res.ok || js?.success === false) throw new Error(js?.message || 'تغییر وضعیت دریافت پیام انجام نشد.');
              setCustomerData((prev) => prev ? {
                ...prev,
                profile: {
                  ...(prev as any).profile,
                  telegramOptedOut: nextOptedOut,
                  telegram_opted_out: nextOptedOut ? 1 : 0,
                } as any,
              } as any : prev);
              setNotification({ type: 'success', text: nextOptedOut ? 'دریافت پیام تلگرام غیرفعال شد.' : 'دریافت پیام تلگرام فعال شد.' });
            } catch (e: any) {
              setNotification({ type: 'error', text: e?.message || 'تغییر وضعیت دریافت پیام انجام نشد.' });
            } finally {
              setTgIsSending(false);
            }
          };

          const sendTelegramAction = async (kind: 'menu' | 'status') => {
            if (!token) return;
            if (!canSendTelegram) return setNotification({ type: 'error', text: 'برای ارسال، اتصال تلگرام باید فعال و معتبر باشد.' });
            setTgIsSending(true);
            try {
              const url = kind === 'menu'
                ? '/api/telegram/customer-actions/send-menu'
                : '/api/telegram/customer-actions/send-account-status';
              const res = await apiFetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
                body: JSON.stringify({ customerId: profile.id }),
              });
              const js = await res.json().catch(() => ({}));
              if (!res.ok || js?.success === false) throw new Error(js?.message || 'ارسال پیام انجام نشد.');
              setNotification({ type: 'success', text: kind === 'menu' ? 'منوی ربات ارسال شد یا در صف ارسال قرار گرفت.' : 'وضعیت حساب ارسال شد یا در صف ارسال قرار گرفت.' });
              fetchTelegramConversation(profile.id);
            } catch (e: any) {
              setNotification({ type: 'error', text: e?.message || 'ارسال پیام انجام نشد.' });
            } finally {
              setTgIsSending(false);
            }
          };

          return (
            <div className="space-y-4">
              <div className="customer-telegram-header flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex items-start gap-3">
                  <IconGlyph tone="info" className="h-14 w-14" aria-hidden="true"><i className="fa-brands fa-telegram text-[24px]" /></IconGlyph>
                  <div>
                    <div className="customer-telegram-actions flex flex-wrap items-center gap-2">
                      <h2 className="text-[24px] font-black tracking-[-0.03em] text-slate-950 dark:text-slate-50">گفتگو تلگرام مشتری</h2>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">Inbox + Outbox</span>
                    </div>
                    <p className="mt-1 text-[13px] leading-7 text-slate-500 dark:text-slate-400">مرکز فرمان ارتباط با مشتری؛ گفتگو، ارسال سریع، مدیریت Chat ID و خطاهای ارسال در یک پنل واحد.</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => fetchTelegramConversation(profile.id)} disabled={tgConvLoading} className="customer-telegram-action-btn inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[11px] font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                    <i className={["fa-solid fa-rotate", tgConvLoading ? "fa-spin" : ""].join(' ')} />
                    تازه‌سازی
                  </button>
                  <button type="button" onClick={() => sendTelegramAction('status')} disabled={!canSendTelegram || tgIsSending} className="customer-telegram-action-btn inline-flex h-10 items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3.5 text-[11px] font-black text-sky-700 shadow-sm transition hover:bg-sky-100 disabled:opacity-50 dark:border-sky-900/40 dark:bg-sky-950/25 dark:text-sky-200">
                    <i className="fa-solid fa-wallet" />
                    ارسال وضعیت حساب
                  </button>
                  <button type="button" onClick={() => sendTelegramAction('menu')} disabled={!canSendTelegram || !secureLinked || tgIsSending} className="customer-telegram-action-btn inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-3.5 text-[11px] font-black text-white shadow-[0_18px_36px_-22px_rgba(37,99,235,0.9)] transition hover:bg-blue-700 disabled:opacity-50">
                    <i className="fa-solid fa-paper-plane" />
                    ارسال منوی ربات
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-5">
                {[
                  { label: 'کل پیام‌ها', value: tgConvItems.length.toLocaleString('fa-IR'), icon: 'fa-regular fa-message', tone: 'text-slate-700 bg-slate-50 border-slate-200' },
                  { label: 'دریافتی', value: inboxCount.toLocaleString('fa-IR'), icon: 'fa-solid fa-arrow-down', tone: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
                  { label: 'ارسالی', value: outboxCount.toLocaleString('fa-IR'), icon: 'fa-solid fa-arrow-up', tone: 'text-sky-700 bg-sky-50 border-sky-100' },
                  { label: 'ناموفق', value: failedCount.toLocaleString('fa-IR'), icon: 'fa-solid fa-triangle-exclamation', tone: failedCount ? 'text-rose-700 bg-rose-50 border-rose-100' : 'text-slate-600 bg-slate-50 border-slate-200' },
                  { label: 'آخرین تعامل', value: lastInteractionAt ? formatIsoToShamsi(lastInteractionAt) : '—', icon: 'fa-regular fa-clock', tone: 'text-violet-700 bg-violet-50 border-violet-100' },
                ].map((item) => (
                  <div key={item.label} className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-right">
                        <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">{item.label}</div>
                        <div className="mt-1 text-[18px] font-black text-slate-950 dark:text-slate-50">{item.value}</div>
                      </div>
                      <IconGlyph tone={inferIconGlyphTone(item.tone)} className="h-10 w-10 shrink-0 text-[15px]" aria-hidden="true">
                        <i className={item.icon} />
                      </IconGlyph>
                    </div>
                  </div>
                ))}
              </div>

              {legacyDelivery ? (
                <div className="rounded-[24px] border border-amber-200 bg-amber-50/80 p-4 text-right text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                  <div className="text-[14px] font-black">اتصال تلگرام قدیمی — نیازمند تأیید امن مجدد</div>
                  <p className="mt-1 text-[12px] leading-6">این Chat ID فقط برای ارسال خروجی حفظ شده است و دسترسی به منو، اطلاعات مالی یا Mini App ایجاد نمی‌کند.</p>
                </div>
              ) : !linked ? (
                <div className="rounded-[24px] border border-amber-200 bg-amber-50/80 p-4 text-right text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                  <div className="text-[14px] font-black">اتصال امن تأیید نشده است.</div>
                  <p className="mt-1 text-[12px] leading-6">برای دسترسی تعاملی، لینک امن را صادر کنید. Chat ID دستی فقط مقصد ارسال است.</p>
                </div>
              ) : null}

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(390px,0.75fr)]">
                <div className="space-y-4">
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/35">
                    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        {([
                          { key: 'all', label: 'همه' },
                          { key: 'in', label: 'دریافتی' },
                          { key: 'out', label: 'ارسالی' },
                          { key: 'failed', label: 'ناموفق' },
                        ] as const).map((item) => (
                          <button key={item.key} type="button" onClick={() => setTgDirectionFilter(item.key)} className={["inline-flex h-10 items-center rounded-2xl border px-4 text-[12px] font-black transition", tgDirectionFilter === item.key ? 'border-blue-600 bg-blue-600 text-white shadow-[0_12px_28px_-18px_rgba(37,99,235,0.85)]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200'].join(' ')}>
                            {item.label}
                          </button>
                        ))}
                      </div>
                      <div
                        style={{
                          height: 44,
                          minWidth: 280,
                          maxWidth: 420,
                          flex: '1 1 280px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          borderRadius: 16,
                          border: '1px solid rgb(226, 232, 240)',
                          background: '#fff',
                          padding: '0 12px',
                          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                          overflow: 'hidden',
                          position: 'relative',
                        }}
                      >
                        <div
                          role="textbox"
                          contentEditable
                          suppressContentEditableWarning
                          onInput={(e) => setTgSearchQuery(e.currentTarget.textContent || '')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              jumpToFirstTgResult();
                            }
                          }}
                          style={{
                            flex: '1 1 auto',
                            minWidth: 0,
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            border: 'none',
                            outline: 'none',
                            boxShadow: 'none',
                            background: 'transparent',
                            padding: 0,
                            margin: 0,
                            color: '#334155',
                            fontSize: 14,
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                          }}
                        >
                          {tgSearchQuery ? tgSearchQuery : ''}
                        </div>
                        {!tgSearchQuery ? (
                          <span
                            style={{
                              position: 'absolute',
                              pointerEvents: 'none',
                              color: '#94a3b8',
                              fontSize: 14,
                              fontWeight: 700,
                              marginRight: 0,
                            }}
                          >
                            جستجو در گفتگو...
                          </span>
                        ) : null}
                        <i className="fa-solid fa-magnifying-glass shrink-0 text-xs text-slate-400" />
                      </div>
                      <button type="button" onClick={jumpToFirstTgResult} disabled={!tgFilteredConvItems.length} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-[12px] font-black text-slate-600 shadow-sm disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                        <i className="fa-solid fa-location-crosshairs" />
                        پرش
                      </button>
                    </div>

                    <div className="relative rounded-[26px] border border-slate-200 bg-white p-4 shadow-inner dark:border-slate-800 dark:bg-slate-950">
                      <div ref={tgTimelineRef} onScroll={(e) => { const el = e.currentTarget; const nearBottom = (el.scrollHeight - el.scrollTop - el.clientHeight) < 140; if (nearBottom) setTgNewSinceScroll(false); }} className="max-h-[560px] space-y-4 overflow-y-auto px-2 py-1">
                        {tgConvError ? (
                          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200">{tgConvError}</div>
                        ) : null}

                        {tgFilteredConvItems.length === 0 && !tgConvLoading ? (
                          <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center dark:border-slate-700 dark:bg-slate-900/50">
                            <i className="fa-brands fa-telegram mb-3 text-[34px] text-slate-300 dark:text-slate-600" />
                            <div className="text-[14px] font-black text-slate-600 dark:text-slate-300">هنوز پیامی برای نمایش وجود ندارد.</div>
                            <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">با ارسال اولین پیام، تایم‌لاین گفتگو اینجا نمایش داده می‌شود.</p>
                          </div>
                        ) : null}

                        {tgFilteredConvItems.map((m) => {
                          const outgoing = m.direction === 'out';
                          const status = outgoing ? (m.status || '') : '';
                          const isFailed = status === 'failed';
                          const isPending = status === 'pending' || status === 'processing';
                          const isSent = status === 'done' || status === 'sent';
                          const statusLabel = !outgoing ? 'دریافتی' : isSent ? 'ارسال‌شده' : isFailed ? 'ناموفق' : isPending ? 'در صف ارسال' : 'در حال پردازش';

                          return (
                            <div id={`tg-customer-msg-${m.id}`} key={m.id} className={["flex items-end gap-3", outgoing ? "justify-start" : "justify-end"].join(' ')}>
                              {outgoing ? <IconGlyph tone="info" className="h-10 w-10 shrink-0" aria-hidden="true"><i className="fa-brands fa-telegram" /></IconGlyph> : null}
                              <div className={["max-w-[78%] rounded-[24px] border px-4 py-3 text-sm leading-7 shadow-sm transition", outgoing ? (isFailed ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-100" : "border-blue-100 bg-blue-50/90 text-slate-800 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-slate-100") : "border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"].join(' ')}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const mid = Number((m as any).telegramMessageId || 0);
                                    if (mid) setTgReplyTo({ telegramMessageId: mid, preview: String((m as any).text || '').slice(0, 80) });
                                  }}
                                  className="w-full text-right"
                                >
                                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-slate-400 dark:text-slate-500">
                                    <span>{outgoing ? 'شما' : profile.fullName}</span>
                                    <span>{formatIsoToShamsi(m.createdAt)}</span>
                                  </div>
                                  {(m as any).kind === 'photo' && (m as any).mediaUrl ? (
                                    <div className="space-y-2"><img src={(m as any).mediaUrl} alt="photo" className="max-h-64 rounded-2xl border border-slate-200 object-contain dark:border-slate-700" />{m.text ? <div className="whitespace-pre-wrap">{m.text}</div> : null}</div>
                                  ) : (m as any).kind === 'document' && (m as any).mediaUrl ? (
                                    <div className="space-y-2"><a href={(m as any).mediaUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-black text-sky-600 dark:text-sky-300"><i className="fa-regular fa-file-lines" /> فایل پیوست</a>{m.text ? <div className="whitespace-pre-wrap">{m.text}</div> : null}</div>
                                  ) : (
                                    <div className="whitespace-pre-wrap">{m.text || '—'}</div>
                                  )}
                                </button>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <span className={["inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black", !outgoing ? 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300' : isSent ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200' : isFailed ? 'border-rose-200 bg-white text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200'].join(' ')}>{statusLabel}</span>
                                  {outgoing && m.errorCategory ? <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" title={m.lastError || ''}>{m.errorCategory}</span> : null}
                                  {isFailed ? (
                                    <>
                                      <button type="button" onClick={() => retryTelegramOutbox(String(m.id))} disabled={tgIsSending} className="inline-flex rounded-full border border-rose-200 bg-white px-2.5 py-1 text-[10px] font-black text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/40 dark:bg-slate-950 dark:text-rose-200">
                                        <i className="fa-solid fa-rotate-left ml-1" />
                                        تلاش مجدد
                                      </button>
                                      <button type="button" onClick={() => setNotification({ type: 'error', text: m.lastError || 'خطای ثبت‌شده برای این پیام موجود نیست.' })} className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                                        مشاهده خطا
                                      </button>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                              {!outgoing ? <IconGlyph tone="neutral" className="h-10 w-10 shrink-0" aria-hidden="true"><i className="fa-regular fa-user" /></IconGlyph> : null}
                            </div>
                          );
                        })}

                        {tgNewSinceScroll ? (
                          <button type="button" onClick={() => { const el = tgTimelineRef.current; if (el) { el.scrollTop = el.scrollHeight; setTgNewSinceScroll(false); } }} className="absolute bottom-5 left-5 rounded-full bg-slate-900 px-4 py-2 text-xs font-black text-white shadow-lg dark:bg-white dark:text-slate-900">
                            مشاهده جدیدترین پیام‌ها
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      {[
                        { key: 'hello', label: 'سلام' },
                        { key: 'installment_reminder', label: 'یادآوری قسط' },
                        { key: 'payment_link', label: 'پیگیری مانده حساب' },
                        { key: 'custom', label: 'متن آزاد' },
                      ].map((preset: any) => (
                        <button key={preset.key} type="button" onClick={() => applyTgQuickPreset(preset.key)} className={["inline-flex h-9 items-center rounded-2xl border px-3 text-[11px] font-black transition", tgQuickPreset === preset.key ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'].join(' ')}>
                          {preset.label}
                        </button>
                      ))}
                      <label className="mr-auto inline-flex h-9 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-[11px] font-black text-slate-600 transition hover:bg-white cursor-pointer dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                        <i className="fa-solid fa-paperclip" />
                        پیوست
                        <input type="file" className="hidden" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadTelegramAttachment(f); e.currentTarget.value = ''; }} />
                      </label>
                    </div>

                    {tgReplyTo ? (
                      <div className="mb-3 rounded-2xl border border-sky-200 bg-sky-50/70 px-3 py-2 text-xs text-sky-800 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-200">
                        <div className="flex items-center justify-between gap-2"><div className="truncate"><span className="font-black ml-2">Reply:</span> #{tgReplyTo.telegramMessageId} — {tgReplyTo.preview}</div><button type="button" onClick={() => setTgReplyTo(null)} data-skip-global-button="true" className="grid h-8 w-8 place-items-center !border-0 !bg-transparent text-sky-700 !shadow-none transition hover:text-sky-900 dark:text-sky-200 dark:hover:text-sky-100"><i className="fa-solid fa-xmark" /></button></div>
                      </div>
                    ) : null}

                    {tgAttachment ? (
                      <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200">
                        <div className="flex items-center justify-between gap-2"><div className="truncate"><span className="font-black ml-2">پیوست:</span>{tgAttachment.originalName || tgAttachment.relPath}</div><button type="button" onClick={() => setTgAttachment(null)} data-skip-global-button="true" className="grid h-8 w-8 place-items-center !border-0 !bg-transparent text-emerald-700 !shadow-none transition hover:text-emerald-900 dark:text-emerald-200 dark:hover:text-emerald-100"><i className="fa-solid fa-xmark" /></button></div>
                      </div>
                    ) : null}

                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)]">
                      <div>
                        <TextareaField controlOnly value={tgQuickReply} onChange={(e) => setTgQuickReply(e.target.value)} rows={5} placeholder="متن پیام خود را بنویسید..." className="w-full resize-y rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-800 outline-none transition    dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 " />
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {["{name}","{phone}","{amount}","{dueDate}","{link}","{installmentNo}","{remainingAmount}"].map((ch) => (
                            <button key={ch} type="button" onClick={() => setTgQuickReply(v => (v || '') + ch)} className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 text-[10px] font-black text-slate-600 hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">{ch}</button>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/45">
                        <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">پیش‌نمایش متن پیام</div>
                        <div className="mt-2 max-h-[118px] overflow-y-auto whitespace-pre-wrap text-[12px] leading-6 text-slate-700 dark:text-slate-200">{tgQuickPreviewText || 'هنوز متنی برای پیش‌نمایش وارد نشده است.'}</div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button type="button" onClick={sendTgQuickReply} disabled={tgIsSending || !canSendTelegram || (!tgQuickReply.trim() && !tgAttachment)} className="inline-flex h-12 min-w-[220px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white shadow-[0_18px_36px_-20px_rgba(37,99,235,0.9)] transition hover:bg-blue-700 disabled:opacity-50">
                        <i className={["fa-solid fa-paper-plane", tgIsSending ? "fa-bounce" : ""].join(' ')} />
                        {tgIsSending ? 'در حال ارسال...' : 'ارسال تلگرام'}
                      </button>

                      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">پیوست، Reply و متغیرهای سریع پشتیبانی می‌شود.</span>
                    </div>
                  </div>
                </div>

                <aside className="space-y-4">
                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <div className="customer-extra-card-header mb-4 flex items-start justify-between gap-3">
                      <div className="text-right">
                        <div className="text-[16px] font-black text-slate-900 dark:text-slate-50">کارت تلگرام مشتری</div>
                        <p className="mt-1 text-[12px] leading-6 text-slate-500 dark:text-slate-400">اتصال، دریافت پیام و Chat ID مشتری.</p>
                      </div>
                      <IconGlyph tone="neutral" className="h-11 w-11" aria-hidden="true"><i className="fa-solid fa-id-card" /></IconGlyph>
                    </div>

                    <div className="rounded-[22px] border border-slate-200 bg-slate-50/75 p-4 dark:border-slate-800 dark:bg-slate-900/35">
                      <div className="text-[18px] font-black text-slate-950 dark:text-slate-50">{profile.fullName}</div>
                      <div className="mt-1 text-[12px] font-bold text-slate-500 dark:text-slate-400">مشتری #{profile.id.toLocaleString('fa-IR')}</div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-right dark:border-emerald-900/40 dark:bg-emerald-950/20">
                          <div className="text-[11px] font-black text-emerald-700 dark:text-emerald-200">وضعیت ارتباط</div>
                          <div className="mt-1 text-[13px] font-black text-emerald-700 dark:text-emerald-200">{secureLinked && !invalid ? 'متصل امن' : legacyDelivery ? 'قدیمی؛ فقط ارسال' : invalid ? 'خطادار' : 'بدون اتصال امن'}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-3 text-right dark:border-slate-800 dark:bg-slate-950">
                          <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">آخرین فعالیت</div>
                          <div className="mt-1 text-[13px] font-black text-slate-900 dark:text-slate-50">{lastInteractionAt ? formatIsoToShamsi(lastInteractionAt) : '—'}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-[22px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="text-[12px] font-black text-slate-700 dark:text-slate-200">Chat ID</div>
                        <button type="button" onClick={() => setTgShowChatId(v => !v)} disabled={!tgChatIdInput.trim()} className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-slate-50 px-3 text-[11px] font-black text-slate-600 transition hover:bg-white disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">{tgShowChatId ? 'مخفی' : 'نمایش'}</button>
                      </div>
                      <div className="flex gap-2">
                        <input type={tgShowChatId ? 'text' : 'password'} inputMode="numeric" dir="ltr" value={tgChatIdInput} onChange={(e) => setTgChatIdInput(e.target.value)} placeholder="مثلاً -1001234567890" className="h-11 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-900 outline-none    dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100" />
                        <button type="button" onClick={async () => { if (!tgChatIdInput.trim()) return; try { await navigator.clipboard.writeText(tgChatIdInput.trim()); setNotification({ type: 'success', text: 'Chat ID کپی شد.' }); } catch { setNotification({ type: 'error', text: 'کپی Chat ID انجام نشد.' }); } }} disabled={!tgChatIdInput.trim()} data-skip-global-button="true" className="inline-flex h-6 w-6 items-center justify-center !border-0 !bg-transparent text-slate-500 !shadow-none transition hover:text-slate-900 disabled:opacity-50 dark:text-slate-300 dark:hover:text-white"><i className="fa-regular fa-copy" /></button>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button type="button" onClick={saveManualChatId} disabled={tgIsSending || !tgChatIdInput.trim()} className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 text-[12px] font-black text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200"><i className="fa-regular fa-floppy-disk" /> ذخیره مقصد ارسال</button>
                        <button type="button" onClick={unlinkChatId} disabled={tgIsSending || !linked} className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 text-[12px] font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200"><i className="fa-regular fa-trash-can" /> حذف اتصال</button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <div className="mb-4 text-[15px] font-black text-slate-900 dark:text-slate-50">وضعیت دریافت پیام</div>
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                        <span className="text-[12px] font-black text-slate-500 dark:text-slate-400">دریافت پیام</span>
                        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-black ${optedOut ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-200' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-200'}`}><i className={`fa-solid ${optedOut ? 'fa-ban' : 'fa-circle-check'}`} />{optedOut ? 'غیرفعال' : 'فعال'}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                        <span className="text-[12px] font-black text-slate-500 dark:text-slate-400">ارسال پیام</span>
                        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-black ${canSendTelegram ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-200' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-200'}`}><i className={`fa-solid ${canSendTelegram ? 'fa-signal' : 'fa-triangle-exclamation'}`} />{canSendTelegram ? 'فعال' : 'متوقف'}</span>
                      </div>
                    </div>
                    <button type="button" onClick={toggleTelegramOptout} disabled={tgIsSending} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-[12px] font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                      <i className="fa-solid fa-toggle-on" />
                      {optedOut ? 'فعال‌سازی دریافت پیام' : 'غیرفعال‌سازی دریافت پیام'}
                    </button>
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-center text-[12px] leading-6 text-slate-500 dark:border-slate-800 dark:bg-slate-900/45 dark:text-slate-400">
                      اطلاعات ارتباط فقط برای ارسال پیام‌های تجاری و پیگیری مشتری استفاده می‌شود.
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-right">
                        <div className="text-[14px] font-black text-slate-900 dark:text-slate-50">اطلاعات بیشتر</div>
                        <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">جزئیات اتصال و تاریخچه پیام‌ها</p>
                      </div>
                      <i className="fa-solid fa-chevron-down text-slate-400" />
                    </div>
                    <div className="mt-4 space-y-3 text-[12px] font-bold text-slate-500 dark:text-slate-400">
                      <div className="flex justify-between gap-3"><span>نام کاربری</span><span dir="ltr">{(profile as any).telegramUsername || (profile as any).telegram_username || '—'}</span></div>
                      <div className="flex justify-between gap-3"><span>تاریخ اتصال</span><span>{(profile as any).telegram_linked_at ? formatIsoToShamsi((profile as any).telegram_linked_at) : '—'}</span></div>
                      <div className="flex justify-between gap-3"><span>تعداد پیام‌ها</span><span>{tgConvItems.length.toLocaleString('fa-IR')}</span></div>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          );
        })()}
      </section>
    </>
  );
};

export default CustomerTelegramConversationSection;
