import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Notification from '../components/Notification';
import { PageShell, PanelCard, Table, Skeleton } from '../components/ui';
import { apiFetch } from '../utils/apiFetch';
import { formatCurrencyText, readStoredCurrencyUnit } from '../utils/currency';
import type { NotificationMessage } from '../types';

type DrilldownPayload = {
  kind: string;
  entity: { id: number; title: string };
  target: { label: string; amount: number };
  entries?: any[];
  items?: any[];
  checks?: any[];
  allocations?: any[];
  capitalAllocations?: any[];
  summary?: Record<string, unknown>;
};

const money = (value: unknown) => formatCurrencyText(Number(value || 0), readStoredCurrencyUnit());
const AccountingDrilldownPage: React.FC = () => {
  const { kind = '', id = '' } = useParams();
  const [data, setData] = useState<DrilldownPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void apiFetch(`/api/accounting-reconciliation/drilldown/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload?.success) throw new Error(payload?.message || 'دریافت مسیر عدد مالی ناموفق بود.');
        if (active) setData(payload.data);
      })
      .catch((error) => active && setNotification({ type: 'error', text: error?.message || 'خطا در دریافت Drill-down حسابداری.' }))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id, kind]);

  const rows = useMemo(() => Array.isArray(data?.entries) ? data!.entries! : [], [data]);
  return (
    <PageShell
      title="مسیر رسیدن به عدد"
      subtitle="این صفحه فقط عدد نهایی را نشان نمی‌دهد؛ تمام اسناد تشکیل‌دهنده و جمع جاری قابل مشاهده است."
      icon={<i className="fa-solid fa-route" aria-hidden="true" />}
      actions={<Link to="/accounting-reconciliation" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"><i className="fa-solid fa-scale-balanced" /> مرکز تطبیق</Link>}
    >
      <Notification message={notification} onClose={() => setNotification(null)} />
      {loading ? <div className="mx-auto max-w-6xl p-4"><Skeleton className="h-44 w-full" /></div> : data ? (
        <div className="mx-auto max-w-6xl space-y-4 px-3 py-4 sm:px-4">
          <PanelCard
            variant="metric"
            title={data.target?.label || 'عدد مالی'}
            metricValue={money(data.target?.amount)}
            metricHint={data.entity?.title || `${data.kind} #${data.entity?.id}`}
            tone={Number(data.target?.amount || 0) === 0 ? 'success' : 'info'}
            icon={<i className="fa-solid fa-calculator" aria-hidden="true" />}
          />
          <PanelCard title="اسناد تشکیل‌دهنده" subtitle={`${rows.length.toLocaleString('fa-IR')} ردیف در مسیر محاسبه`} icon={<i className="fa-solid fa-list-ul" aria-hidden="true" />} density="compact">
            {rows.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <thead><tr><th>تاریخ / مرجع</th><th>شرح</th><th>افزایش</th><th>کاهش</th><th>مانده پس از ردیف</th></tr></thead>
                  <tbody>
                    {rows.map((row, index) => {
                      const delta = Number(row.delta || 0);
                      const increase = delta > 0 ? delta : 0;
                      const decrease = delta < 0 ? Math.abs(delta) : 0;
                      return (
                        <tr key={String(row.id ?? index)}>
                          <td><div className="font-bold">{String(row.transactionDate || row.saleDate || row.createdAt || '—')}</div><div className="text-[11px] text-slate-500" dir="ltr">{row.referenceType || 'source'}:{row.referenceId ?? row.id ?? '—'}</div></td>
                          <td className="min-w-[16rem]">{String(row.description || row.itemDescription || row.notes || row.allocationType || '—')}</td>
                          <td className="font-black text-emerald-700 dark:text-emerald-300">{increase ? money(increase) : '—'}</td>
                          <td className="font-black text-rose-700 dark:text-rose-300">{decrease ? money(decrease) : '—'}</td>
                          <td className="font-black">{row.runningBalance == null ? '—' : money(row.runningBalance)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            ) : <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-bold text-slate-500 dark:border-slate-700">برای این عدد ردیف تشکیل‌دهنده‌ای ثبت نشده است.</div>}
          </PanelCard>
          {data.allocations?.length ? <PanelCard title="تخصیص‌های سود" subtitle="سهم‌های منجمد و فعال مرتبط با این عدد" density="compact"><pre className="overflow-x-auto whitespace-pre-wrap text-xs" dir="ltr">{JSON.stringify(data.allocations, null, 2)}</pre></PanelCard> : null}
          {data.checks?.length ? <PanelCard title="چک‌های پرونده" density="compact"><pre className="overflow-x-auto whitespace-pre-wrap text-xs" dir="ltr">{JSON.stringify(data.checks, null, 2)}</pre></PanelCard> : null}
        </div>
      ) : null}
    </PageShell>
  );
};
export default AccountingDrilldownPage;
