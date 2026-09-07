import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Button, DataTableShell, Dialog, Table } from '@/components/ui';
import { useConfirm } from '../../contexts/ConfirmContext';
import { apiFetch } from '../../utils/apiFetch';
import { formatIsoToShamsiDateTime } from '../../utils/dateUtils';
import SettingsManagerNotificationMatrixDialog from './SettingsManagerNotificationMatrixDialog';

type TelegramManager = {
  userId: number;
  username: string;
  displayName: string;
  legacyRoleName: string;
  membershipId: number | null;
  membershipStatus: 'active' | 'suspended' | 'revoked' | 'legacy';
  accessRoles: Array<{ key: string; name: string }>;
  permissions: string[];
  telegram: {
    state: 'linked' | 'pending' | 'not_linked';
    linkedAt: string | null;
    telegramUserId: string | null;
    pendingExpiresAt: string | null;
  };
};

type LinkPayload = {
  userId: number;
  displayName?: string;
  deepLink: string;
  qrData?: string;
  expiresAt: string;
  botUsername?: string;
};

type ApiEnvelope<T> = { success?: boolean; data?: T; message?: string; code?: string };

const readApi = async <T,>(response: Response): Promise<T> => {
  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!response.ok || payload.success === false || payload.data === undefined) {
    throw new Error(String(payload.message || `خطای ${response.status}`));
  }
  return payload.data;
};

const formatDate = (value?: string | null) => value ? formatIsoToShamsiDateTime(value) : '—';

const maskTelegramUserId = (value?: string | null) => {
  const raw = String(value || '').trim();
  if (!raw) return '—';
  if (raw.length <= 5) return raw;
  return `${raw.slice(0, 3)}•••${raw.slice(-3)}`;
};

const bindingMeta = (state: TelegramManager['telegram']['state']) => {
  if (state === 'linked') return { label: 'متصل', icon: 'fa-circle-check', className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200' };
  if (state === 'pending') return { label: 'در انتظار اتصال', icon: 'fa-clock', className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200' };
  return { label: 'متصل نیست', icon: 'fa-link-slash', className: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300' };
};

const TelegramManagerLinkDialog: React.FC<{
  manager: TelegramManager | null;
  payload: LinkPayload | null;
  onClose: () => void;
  onRefresh: () => void;
}> = ({ manager, payload, onClose, onRefresh }) => {
  const [copied, setCopied] = useState(false);
  const deepLink = String(payload?.deepLink || '');
  const expiresAt = payload?.expiresAt || manager?.telegram.pendingExpiresAt || null;

  const copy = async () => {
    if (!deepLink) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(deepLink);
      } else {
        const node = document.createElement('textarea');
        node.value = deepLink;
        node.setAttribute('readonly', '');
        node.style.position = 'fixed';
        node.style.opacity = '0';
        document.body.appendChild(node);
        node.select();
        document.execCommand('copy');
        node.remove();
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Dialog
      isOpen={Boolean(manager && payload)}
      onClose={onClose}
      title="اتصال امن مدیر به تلگرام"
      iconClass="fa-brands fa-telegram"
      size="lg"
      variant="operational"
      layout="vertical"
      kicker="Telegram Management Center"
    >
      <div className="space-y-4" dir="rtl">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-muted/35 p-3">
            <span className="text-xs text-muted-foreground">مدیر</span>
            <strong className="mt-1 block text-sm text-foreground">{manager?.displayName || payload?.displayName || '—'}</strong>
          </div>
          <div className="rounded-xl border border-border bg-muted/35 p-3">
            <span className="text-xs text-muted-foreground">اعتبار لینک</span>
            <strong className="mt-1 block text-sm text-foreground">{formatDate(expiresAt)}</strong>
          </div>
          <div className="rounded-xl border border-border bg-muted/35 p-3">
            <span className="text-xs text-muted-foreground">نوع اتصال</span>
            <strong className="mt-1 block text-sm text-foreground">یک‌بارمصرف و هویت‌محور</strong>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <i className="fa-solid fa-shield-halved text-primary" aria-hidden="true" />
              <strong className="text-sm text-foreground">روش اتصال</strong>
            </div>
            <ol className="space-y-2 text-sm leading-7 text-muted-foreground">
              <li>۱. مدیر QR را با حساب تلگرام خودش اسکن کند یا لینک را باز کند.</li>
              <li>۲. ربات را Start کند؛ Telegram User ID همان حساب به کاربر داخلی متصل می‌شود.</li>
              <li>۳. Username تلگرام در احراز هویت نقشی ندارد و تغییر آن اتصال را خراب نمی‌کند.</li>
            </ol>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              این لینک کوتاه‌عمر و یک‌بارمصرف است. برای اتصال حساب تلگرام متفاوت، ابتدا «اتصال مجدد» را انتخاب کنید تا Binding قبلی revoke شود.
            </div>
          </section>

          <section className="flex flex-col items-center justify-center rounded-2xl border border-border bg-white p-4 text-center dark:bg-slate-950">
            {deepLink ? (
              <QRCodeCanvas value={deepLink} size={176} includeMargin />
            ) : (
              <div className="flex h-44 w-44 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <i className="fa-solid fa-qrcode text-4xl" />
              </div>
            )}
            <span className="mt-2 text-xs text-muted-foreground">QR اتصال مدیر</span>
          </section>
        </div>

        <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-muted/20 p-3" dir="ltr">
          <code className="min-w-0 flex-1 break-all text-xs text-foreground">{deepLink || 'لینک آماده نیست'}</code>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4" data-skip-global-buttons="true">
        <Button type="button" variant="secondary" size="sm" onClick={onClose} leftIcon={<i className="fa-solid fa-xmark" />}>بستن</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onRefresh} leftIcon={<i className="fa-solid fa-rotate" />}>بررسی وضعیت</Button>
        <Button type="button" variant="secondary" size="sm" disabled={!deepLink} onClick={() => void copy()} leftIcon={<i className={copied ? 'fa-solid fa-check' : 'fa-solid fa-copy'} />}>{copied ? 'کپی شد' : 'کپی لینک'}</Button>
        <Button type="button" variant="primary" size="sm" disabled={!deepLink} onClick={() => deepLink && window.open(deepLink, '_blank', 'noopener,noreferrer')} leftIcon={<i className="fa-brands fa-telegram" />}>باز کردن تلگرام</Button>
      </div>
    </Dialog>
  );
};

const SettingsTelegramManagersPanel: React.FC = () => {
  const confirmAction = useConfirm();
  const [managers, setManagers] = useState<TelegramManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);
  const [selectedManager, setSelectedManager] = useState<TelegramManager | null>(null);
  const [linkPayload, setLinkPayload] = useState<LinkPayload | null>(null);
  const [notificationManager, setNotificationManager] = useState<TelegramManager | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/telegram/managers');
      const data = await readApi<TelegramManager[]>(response);
      setManagers(Array.isArray(data) ? data : []);
      if (selectedManager) {
        const fresh = data.find((item) => item.userId === selectedManager.userId) || null;
        setSelectedManager(fresh);
        if (fresh?.telegram.state === 'linked') setLinkPayload(null);
      }
    } catch (cause) {
      setError(String((cause as Error)?.message || cause || 'خطا در دریافت مدیران تلگرام'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedManager]);

  useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => ({
    total: managers.length,
    linked: managers.filter((item) => item.telegram.state === 'linked').length,
    pending: managers.filter((item) => item.telegram.state === 'pending').length,
  }), [managers]);

  const issueLink = async (manager: TelegramManager, reconnect = false) => {
    if (reconnect) {
      const approved = await confirmAction({
        title: 'اتصال مجدد تلگرام مدیر',
        description: `اتصال فعلی «${manager.displayName}» فوراً لغو می‌شود و یک لینک جدید صادر خواهد شد. ادامه می‌دهید؟`,
        confirmText: 'لغو قبلی و صدور لینک جدید',
        tone: 'warning',
        iconClass: 'fa-solid fa-link',
      });
      if (!approved) return;
    }
    setBusyUserId(manager.userId);
    setFeedback(null);
    try {
      const endpoint = reconnect
        ? `/api/telegram/managers/${manager.userId}/relink-token`
        : `/api/telegram/managers/${manager.userId}/link-token`;
      const response = await apiFetch(endpoint, { method: 'POST' });
      const data = await readApi<LinkPayload>(response);
      setSelectedManager(manager);
      setLinkPayload(data);
      setFeedback({ tone: 'success', text: reconnect ? 'اتصال قبلی لغو و لینک جدید صادر شد.' : 'لینک امن اتصال مدیر صادر شد.' });
      await load(true);
    } catch (cause) {
      setFeedback({ tone: 'error', text: String((cause as Error)?.message || cause || 'صدور لینک انجام نشد.') });
    } finally {
      setBusyUserId(null);
    }
  };

  const revoke = async (manager: TelegramManager) => {
    const approved = await confirmAction({
      title: 'لغو اتصال تلگرام مدیر',
      description: `دسترسی تلگرام «${manager.displayName}» لغو و نشست‌های MiniApp مدیریتی او باطل می‌شود.`,
      confirmText: 'لغو اتصال',
      tone: 'danger',
      iconClass: 'fa-solid fa-link-slash',
    });
    if (!approved) return;
    setBusyUserId(manager.userId);
    setFeedback(null);
    try {
      const response = await apiFetch(`/api/telegram/managers/${manager.userId}/link`, { method: 'DELETE' });
      await readApi<Record<string, unknown>>(response);
      setFeedback({ tone: 'success', text: 'اتصال تلگرام مدیر لغو شد.' });
      if (selectedManager?.userId === manager.userId) {
        setSelectedManager(null);
        setLinkPayload(null);
      }
      await load(true);
    } catch (cause) {
      setFeedback({ tone: 'error', text: String((cause as Error)?.message || cause || 'لغو اتصال انجام نشد.') });
    } finally {
      setBusyUserId(null);
    }
  };

  const sendTest = async (manager: TelegramManager) => {
    setBusyUserId(manager.userId);
    setFeedback(null);
    try {
      const response = await apiFetch(`/api/telegram/managers/${manager.userId}/test-message`, { method: 'POST' });
      await readApi<Record<string, unknown>>(response);
      setFeedback({ tone: 'success', text: `پیام آزمایشی برای ${manager.displayName} ارسال شد.` });
    } catch (cause) {
      setFeedback({ tone: 'error', text: String((cause as Error)?.message || cause || 'ارسال پیام آزمایشی انجام نشد.') });
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <section className="settings-section-card space-y-4" aria-label="مدیران تلگرام" data-ui-telegram-managers="v347">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-primary">
            <i className="fa-brands fa-telegram" aria-hidden="true" />
            Telegram Management Center
          </div>
          <h3 className="text-base font-bold text-foreground">مدیران تلگرام</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            اتصال امن کاربران دارای دسترسی مدیریتی به Telegram User ID؛ بدون وابستگی امنیتی به Username تلگرام.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={loading}
          loadingText="در حال بررسی..."
          onClick={() => void load()}
          leftIcon={!loading ? <i className="fa-solid fa-rotate" /> : undefined}
        >
          تازه‌سازی اتصال‌ها
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'مدیران دارای دسترسی', value: stats.total, icon: 'fa-users-gear' },
          { label: 'متصل به تلگرام', value: stats.linked, icon: 'fa-link' },
          { label: 'در انتظار اتصال', value: stats.pending, icon: 'fa-clock' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-3 rounded-xl border border-border bg-muted/25 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-primary shadow-sm"><i className={`fa-solid ${item.icon}`} /></span>
            <div><span className="block text-xs text-muted-foreground">{item.label}</span><strong className="text-base text-foreground">{item.value.toLocaleString('fa-IR')}</strong></div>
          </div>
        ))}
      </div>

      {feedback ? (
        <div className={`rounded-xl border p-3 text-sm ${feedback.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200' : feedback.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200' : 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200'}`}>
          {feedback.text}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
          <strong className="block">دسترسی به مدیران تلگرام ممکن نیست</strong>
          <span className="mt-1 block">{error}</span>
        </div>
      ) : loading ? (
        <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
          <i className="fa-solid fa-spinner fa-spin" /> در حال دریافت وضعیت مدیران تلگرام…
        </div>
      ) : managers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <i className="fa-solid fa-user-shield mb-2 text-2xl text-muted-foreground" />
          <strong className="block text-sm text-foreground">مدیر دارای Permission مدیریتی پیدا نشد</strong>
          <p className="mt-1 text-xs text-muted-foreground">ابتدا دسترسی مدیریتی کاربر را در RBAC فعال کنید.</p>
        </div>
      ) : (
        <DataTableShell className="max-w-full overflow-auto" data-settings-mode="advanced">
          <Table layout="managed" density="comfortable" className="settings-table-clean min-w-[760px]">
            <thead>
              <tr>
                <th scope="col">مدیر</th>
                <th scope="col">دسترسی</th>
                <th scope="col">وضعیت تلگرام</th>
                <th scope="col">شناسه تلگرام</th>
                <th scope="col">آخرین اتصال</th>
                <th scope="col">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {managers.map((manager) => {
                const meta = bindingMeta(manager.telegram.state);
                const busy = busyUserId === manager.userId;
                return (
                  <tr key={manager.userId}>
                    <td>
                      <div className="min-w-0">
                        <strong className="block text-sm text-foreground">{manager.displayName}</strong>
                        <span className="block text-xs text-muted-foreground" dir="ltr">@{manager.username} · #{manager.userId}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex max-w-56 flex-wrap gap-1">
                        {(manager.accessRoles.length ? manager.accessRoles : [{ key: manager.legacyRoleName, name: manager.legacyRoleName }]).map((role) => (
                          <span key={role.key} className="rounded-md border border-border bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">{role.name}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
                        <i className={`fa-solid ${meta.icon}`} /> {meta.label}
                      </span>
                      {manager.telegram.state === 'pending' && manager.telegram.pendingExpiresAt ? (
                        <span className="mt-1 block text-[11px] text-muted-foreground">انقضا: {formatDate(manager.telegram.pendingExpiresAt)}</span>
                      ) : null}
                    </td>
                    <td><bdi dir="ltr" className="text-xs text-muted-foreground">{maskTelegramUserId(manager.telegram.telegramUserId)}</bdi></td>
                    <td><span className="text-xs text-muted-foreground">{formatDate(manager.telegram.linkedAt)}</span></td>
                    <td>
                      <div className="flex flex-wrap items-center gap-1.5" data-skip-global-buttons="true">
                        <Button type="button" size="xs" variant="secondary" disabled={busy} onClick={() => setNotificationManager(manager)} leftIcon={<i className="fa-solid fa-bell" />}>اعلان‌ها</Button>
                        {manager.telegram.state !== 'linked' ? (
                          <Button type="button" size="xs" variant="primary" loading={busy} onClick={() => void issueLink(manager)} leftIcon={!busy ? <i className="fa-solid fa-link" /> : undefined}>اتصال</Button>
                        ) : (
                          <>
                            <Button type="button" size="xs" variant="secondary" disabled={busy} onClick={() => void sendTest(manager)} leftIcon={<i className="fa-regular fa-paper-plane" />}>پیام تست</Button>
                            <Button type="button" size="xs" variant="warning" disabled={busy} onClick={() => void issueLink(manager, true)} leftIcon={<i className="fa-solid fa-rotate" />}>اتصال مجدد</Button>
                            <Button type="button" size="xs" variant="danger" disabled={busy} onClick={() => void revoke(manager)} leftIcon={<i className="fa-solid fa-link-slash" />}>لغو</Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </DataTableShell>
      )}

      <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs leading-6 text-muted-foreground">
        <i className="fa-solid fa-shield-halved ml-1 text-primary" />
        Backend فقط Permission واقعی <code dir="ltr">managers.manage</code> را می‌پذیرد. شماره موبایل، نام، نقش Partner/Customer و Username تلگرام هیچ‌کدام Manager بودن را تعیین نمی‌کنند.
      </div>


      <SettingsManagerNotificationMatrixDialog
        manager={notificationManager}
        onClose={() => setNotificationManager(null)}
      />

      <TelegramManagerLinkDialog
        manager={selectedManager}
        payload={linkPayload}
        onClose={() => { setSelectedManager(null); setLinkPayload(null); }}
        onRefresh={() => void load(true)}
      />
    </section>
  );
};

export default SettingsTelegramManagersPanel;
