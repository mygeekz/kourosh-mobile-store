// pages/AuditLog.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuditLogEntry, NotificationMessage } from '../types';
import { apiFetch } from '../utils/apiFetch';
import Notification from '../components/Notification';
import { useAuth } from '../contexts/AuthContext';
import TableToolbar from '../components/TableToolbar';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

/**
 * Displays a paginated list of audit log entries. Only Admin and Manager roles
 * may access this page. The log shows user actions like create/update/delete
 * operations along with timestamps and optional descriptions.
 */
const AuditLogPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [offset, setOffset] = useState<number>(0);
  const [limit] = useState<number>(100);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    if (currentUser) {
      const allowed = ['Admin', 'Manager'];
      if (!allowed.includes(currentUser.roleName)) {
        setNotification({ type: 'error', text: 'شما اجازه دسترسی به این صفحه را ندارید.' });
        navigate('/');
        return;
      }
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const res = await apiFetch(`/api/audit-log?limit=${limit}&offset=${offset}`);
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || 'خطا در دریافت داده‌ها');
        setLogs(json.data || []);
      } catch (err: any) {
        setNotification({ type: 'error', text: err.message || 'خطا در عملیاتی ناشناخته در دریافت داده‌ها' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, [offset, limit]);

  const tableHeaderClass = 'px-4 py-2 border-b text-right bg-gray-50 dark:bg-gray-800 whitespace-nowrap';
  const tableCellClass = 'px-4 py-2 border-b text-right text-sm align-top';

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    const includes = (v?: any) => String(v ?? '').toLowerCase().includes(q);
    return logs.filter((x) =>
      includes(x.username) ||
      includes(x.role) ||
      includes(x.action) ||
      includes(x.entityType) ||
      includes(x.entityId) ||
      includes(x.description) ||
      includes(new Date(x.createdAt).toLocaleString('fa-IR')),
    );
  }, [logs, search]);

  const handlePrev = () => {
    setOffset((prev) => Math.max(0, prev - limit));
  };
  const handleNext = () => {
    if (logs.length < limit) return;
    setOffset((prev) => prev + limit);
  };

  return (
    <div className="space-y-8 text-right max-w-7xl mx-auto px-4" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <div className="app-card p-4 md:p-6">
        <div className="mb-4">
          <div className="text-xl md:text-2xl font-black">گزارش لاگ عملیات</div>
          <div className="mt-1 text-sm text-muted">
            تاریخچهٔ اقداماتی که توسط کاربران انجام شده است. برای فیلتر کردن، از جستجو استفاده کنید.
          </div>
        </div>

        <TableToolbar
          title="لیست لاگ‌ها"
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="جستجو: کاربر، عملیات، موجودیت، توضیحات…"
          actions={
            <div className="text-xs text-muted whitespace-nowrap">
              {isLoading ? 'در حال دریافت…' : `${filteredLogs.length.toLocaleString('fa-IR')} مورد`}
            </div>
          }
        />

        {isLoading ? (
          <div className="space-y-4">
            {/* Desktop skeleton */}
            <div className="hidden md:block overflow-x-auto">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/40">
                <div className="grid grid-cols-7 gap-3">
                  {Array.from({ length: 21 }).map((_, i) => (
                    <Skeleton key={i} className="h-9" rounded="lg" />
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile skeleton cards */}
            <div className="md:hidden space-y-4 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-5 w-2/3" rounded="lg" />
                      <Skeleton className="h-4 w-1/2" rounded="lg" />
                    </div>
                    <Skeleton className="h-5 w-16" rounded="lg" />
                  </div>
                  <div className="mt-4 space-y-2">
                    <Skeleton className="h-4 w-full" rounded="lg" />
                    <Skeleton className="h-4 w-4/5" rounded="lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            icon={search ? 'fa-solid fa-magnifying-glass' : 'fa-regular fa-folder-open'}
            title={search ? 'چیزی پیدا نشد' : 'هیچ رکوردی برای نمایش وجود ندارد'}
            description={search ? 'عبارت جستجو را تغییر دهید یا پاک کنید.' : 'بعد از ثبت عملیات، لاگ‌ها در این بخش نمایش داده می‌شوند.'}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className={tableHeaderClass}>تاریخ</th>
                    <th className={tableHeaderClass}>کاربر</th>
                    <th className={tableHeaderClass}>نقش</th>
                    <th className={tableHeaderClass}>عملیات</th>
                    <th className={tableHeaderClass}>نوع موجودیت</th>
                    <th className={tableHeaderClass}>شناسه</th>
                    <th className={tableHeaderClass}>توضیحات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((entry) => (
                    <tr key={entry.id} className="hover:bg-primary/5">
                      <td className={tableCellClass}>{new Date(entry.createdAt).toLocaleString('fa-IR')}</td>
                      <td className={tableCellClass}>{entry.username ?? '-'}</td>
                      <td className={tableCellClass}>{entry.role ?? '-'}</td>
                      <td className={tableCellClass}>{entry.action}</td>
                      <td className={tableCellClass}>{entry.entityType ?? '-'}</td>
                      <td className={tableCellClass}>{entry.entityId != null ? entry.entityId : '-'}</td>
                      <td className={tableCellClass}>{entry.description ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-4 p-4">
              {filteredLogs.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-gray-900 dark:text-gray-50 truncate">{entry.action}</div>
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-300">
                        {new Date(entry.createdAt).toLocaleString('fa-IR')}
                      </div>
                    </div>
                    <div className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary whitespace-nowrap">
                      {entry.role ?? '-'}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="text-muted">کاربر:</div>
                    <div className="font-semibold">{entry.username ?? '-'}</div>
                    <div className="text-muted">موجودیت:</div>
                    <div className="font-semibold">{entry.entityType ?? '-'}</div>
                    <div className="text-muted">شناسه:</div>
                    <div className="font-semibold">{entry.entityId != null ? entry.entityId : '-'}</div>
                  </div>

                  {entry.description ? (
                    <div className="mt-3 text-xs text-gray-700 dark:text-gray-200 leading-6">
                      <span className="text-muted">توضیحات: </span>
                      {entry.description}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            {/* Pagination controls */}
            <div className="flex justify-between items-center mt-4">
              <button
                type="button"
                onClick={handlePrev}
                disabled={offset === 0}
                className="h-10 px-4 bg-primary text-white rounded-lg disabled:opacity-50"
              >
                قبلی
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={logs.length < limit}
                className="h-10 px-4 bg-primary text-white rounded-lg disabled:opacity-50"
              >
                بعدی
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuditLogPage;