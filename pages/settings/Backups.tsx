import React, { useEffect, useState } from 'react';
import Notification from '../../components/Notification';
import Button from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import type { NotificationMessage } from '../../types';

type BackupRow = { fileName: string; size: number; mtime: string };

const getErrorMessage = (error: unknown, fallback = 'خطا در عملیات') => error instanceof Error ? error.message : fallback;

const fmtSize = (n: number) => {
  const b = Number(n || 0);
  if (b < 1024) return `${b} B`;
  if (b < 1024*1024) return `${(b/1024).toFixed(1)} KB`;
  if (b < 1024*1024*1024) return `${(b/1024/1024).toFixed(1)} MB`;
  return `${(b/1024/1024/1024).toFixed(1)} GB`;
};

export default function Backups() {
  const { token, user } = useAuth();
  const [rows, setRows] = useState<BackupRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const fetchList = async () => {
    if (!token) return;
    setIsLoading(true);
    setNotification(null);
    try {
      const res = await fetch('/api/admin/backups', { headers: { Authorization: `Bearer ${token}` } });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در دریافت لیست بکاپ‌ها');
      setRows(js.data || []);
    } catch (e: unknown) {
      setNotification({ message: getErrorMessage(e), type: 'error' });
    } finally { setIsLoading(false); }
  };

  const createNow = async () => {
    if (!token) return;
    setIsLoading(true);
    setNotification(null);
    try {
      const res = await fetch('/api/admin/backups', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در ایجاد بکاپ');
      setNotification({ message: 'بکاپ ایجاد شد.', type: 'success' });
      await fetchList();
    } catch (e: unknown) {
      setNotification({ message: getErrorMessage(e), type: 'error' });
    } finally { setIsLoading(false); }
  };

  const download = async (fileName: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/backups/${encodeURIComponent(fileName)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('خطا در دانلود بکاپ');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e: unknown) {
      setNotification({ message: getErrorMessage(e), type: 'error' });
    }
  };

  useEffect(() => { fetchList(); /* eslint-disable-next-line */ }, [token]);

  if (user?.role !== 'Admin' && user?.role !== 'Manager') {
    return <div className="p-6 text-gray-600 dark:text-gray-300" dir="rtl">دسترسی غیرمجاز</div>;
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Backup center</div>
            <div className="text-xl font-black text-slate-900 dark:text-slate-100">بکاپ خودکار دیتابیس</div>
            <div className="text-sm leading-7 text-slate-600 dark:text-slate-300">بکاپ سرور به‌صورت خودکار اجرا می‌شود و این صفحه برای مدیریت نسخه‌ها و بازیابی سریع است.</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={createNow} variant="primary" leftIcon={<i className="fa-solid fa-database" />}>
              ایجاد بکاپ الان
            </Button>
            <Button onClick={fetchList} variant="secondary" leftIcon={<i className="fa-solid fa-rotate" />}>
              بروزرسانی
            </Button>
          </div>
        </div>
      </div>

      {notification ? <Notification message={notification.message} type={notification.type} /> : null}

      <div className="rounded-[28px] border border-slate-200/80 bg-white shadow-sm overflow-hidden dark:bg-slate-900/70 dark:border-slate-800">
        {isLoading ? (
          <div className="p-10 text-center text-gray-500 dark:text-gray-400">در حال پردازش اطلاعات...</div>
        ) : rows.length === 0 ? (
          <div className="p-10">
            <div className="mx-auto max-w-2xl rounded-[24px] border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center dark:border-slate-700 dark:bg-slate-950/30">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                <i className="fa-solid fa-box-archive" />
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100">فعلاً بکاپی ثبت اطلاعات نشده است</div>
              <div className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-500 dark:text-slate-400">
                پس از ساخت اولین نسخه، فهرست فایل‌ها، زمان ایجاد و ابزارهای دانلود/بازیابی همین‌جا ظاهر می‌شوند.
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <Button onClick={createNow} variant="primary" leftIcon={<i className="fa-solid fa-box-archive" />}>
                  ایجاد اولین بکاپ
                </Button>
                <Button onClick={fetchList} variant="secondary" leftIcon={<i className="fa-solid fa-rotate" />}>
                  بروزرسانی
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/70">
                <tr className="text-right">
                  <th className="p-3">فایل</th>
                  <th className="p-3">حجم</th>
                  <th className="p-3">تاریخ</th>
                  <th className="p-3">دانلود</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.fileName} className="border-t border-gray-100 dark:border-slate-800">
                    <td className="p-3 font-semibold whitespace-nowrap">{r.fileName}</td>
                    <td className="p-3 whitespace-nowrap">{fmtSize(r.size)}</td>
                    <td className="p-3 whitespace-nowrap">{new Date(r.mtime).toLocaleString('fa-IR')}</td>
                    <td className="p-3">
                      <Button onClick={() => download(r.fileName)} variant="secondary" size="xs" leftIcon={<i className="fa-solid fa-download" />}>
                        دانلود
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400">
        تنظیمات زمان‌بندی: <code>BACKUP_CRON</code> و <code>BACKUP_TZ</code> (پیش‌فرض: 02:00 Asia/Tehran)
      </div>
    </div>
  );
}
