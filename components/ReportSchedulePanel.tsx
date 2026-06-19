import React, { useEffect, useMemo, useState } from 'react';
import moment from 'jalali-moment';
import Notification from './Notification';
import ShamsiDatePicker from './ShamsiDatePicker';
import { useAuth } from '../contexts/AuthContext';
import { getAuthHeaders } from '../utils/apiUtils';
import type { NotificationMessage } from '../types';

type Props = {
  reportKey: string;
  reportTitle: string;
};

type ScheduleRow = {
  id: number;
  reportKey: string;
  cronExpr: string;
  channel: string;
  isEnabled: number;
  payloadJson?: string | null;
  createdAt?: string;
};

const pad2 = (n: number) => String(n).padStart(2, '0');

const weekdayDefs = [
  { label: 'یکشنبه', cron: 0 },
  { label: 'دوشنبه', cron: 1 },
  { label: 'سه‌شنبه', cron: 2 },
  { label: 'چهارشنبه', cron: 3 },
  { label: 'پنجشنبه', cron: 4 },
  { label: 'جمعه', cron: 5 },
  { label: 'شنبه', cron: 6 },
];

function buildCron(scheduleType: 'daily' | 'weekly' | 'monthly', timeHHmm: string, weekdays: number[], monthDay: number) {
  const [hhS, mmS] = (timeHHmm || '09:00').split(':');
  const hh = Math.max(0, Math.min(23, Number(hhS) || 9));
  const mm = Math.max(0, Math.min(59, Number(mmS) || 0));

  if (scheduleType === 'weekly') {
    const days = (weekdays && weekdays.length ? weekdays : [6]).join(','); // default شنبه
    return `${mm} ${hh} * * ${days}`;
  }
  if (scheduleType === 'monthly') {
    const d = Math.max(1, Math.min(31, Number(monthDay) || 1));
    return `${mm} ${hh} ${d} * *`;
  }
  return `${mm} ${hh} * * *`;
}

// شمسـی برای متن/پیام (هم‌راستا با کل پروژه)
const toJ = (d: Date | null) => (d ? moment(d).locale('fa').format('jYYYY/jMM/jDD') : null);

export default function ReportSchedulePanel({ reportKey, reportTitle }: Props) {
  const { token } = useAuth();

  const [scheduleType, setScheduleType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [timeHHmm, setTimeHHmm] = useState('09:00');
  const [weekdays, setWeekdays] = useState<number[]>([6]); // شنبه
  const [monthDay, setMonthDay] = useState(1);

  const [fromDate, setFromDate] = useState<Date | null>(() => moment().subtract(7, 'days').toDate());
  const [toDate, setToDate] = useState<Date | null>(() => moment().toDate());

  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const cronExpr = useMemo(
    () => buildCron(scheduleType, timeHHmm, weekdays, monthDay),
    [scheduleType, timeHHmm, weekdays, monthDay]
  );

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/schedules', { headers: { ...(getAuthHeaders(token) as any) } });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || 'دریافت زمان‌بندی‌ها انجام نشد.');
      const list = Array.isArray(json.data) ? (json.data as ScheduleRow[]) : [];
      setRows(list.filter((r) => String(r.reportKey) === String(reportKey) && String(r.channel || 'telegram') === 'telegram'));
    } catch (e: any) {
      setNotification({ type: 'error', message: e?.message || 'دریافت زمان‌بندی‌ها انجام نشد.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [reportKey]);

  const toggleWeekday = (d: number) => {
    setWeekdays((prev) => {
      const s = new Set(prev);
      if (s.has(d)) s.delete(d);
      else s.add(d);
      return Array.from(s).sort((a, b) => a - b);
    });
  };

  const create = async () => {
    setSaving(true);
    try {
      const payloadJson = {
        range: { fromJ: toJ(fromDate), toJ: toJ(toDate) },
        ui: { scheduleType, timeHHmm, weekdays, monthDay },
      };
      const res = await fetch('/api/reports/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(getAuthHeaders(token) as any) },
        body: JSON.stringify({ reportKey, cronExpr, payloadJson, channel: 'telegram' }),
      });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || 'ثبت زمان‌بندی انجام نشد.');
      setNotification({ type: 'success', message: 'زمان‌بندی ذخیره شد و ارسال خودکار فعال است.' });
      await load();
    } catch (e: any) {
      setNotification({ type: 'error', message: e?.message || 'ذخیره زمان‌بندی انجام نشد.' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/reports/schedules/${id}`, {
        method: 'DELETE',
        headers: { ...(getAuthHeaders(token) as any) },
      });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || 'حذف زمان‌بندی انجام نشد.');
      setNotification({ type: 'success', message: 'زمان‌بندی حذف شد.' });
      await load();
    } catch (e: any) {
      setNotification({ type: 'error', message: e?.message || 'حذف زمان‌بندی انجام نشد.' });
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">ارسال خودکار به تلگرام</div>
          <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
            گزارش «{reportTitle}» طبق زمان‌بندی زیر به تلگرام ارسال می‌شود (به Chat IDهای بخش گزارشات).
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/10 text-sm"
          >
            بروزرسانی
          </button>
          <button
            type="button"
            onClick={create}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 text-sm"
          >
            {saving ? 'در حال ذخیره تغییرات…' : 'ذخیره تغییرات زمان‌بندی'}
          </button>
        </div>
      </div>

      {notification ? <div className="mt-3"><Notification type={notification.type} message={notification.message} /></div> : null}

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="font-semibold text-sm mb-2">بازه گزارش</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">از</div>
              <ShamsiDatePicker selectedDate={fromDate} onDateChange={setFromDate} inputClassName="w-full min-w-[170px]" />
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">تا</div>
              <ShamsiDatePicker selectedDate={toDate} onDateChange={setToDate} inputClassName="w-full min-w-[170px]" />
            </div>
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-300 mt-2">
            (این بازه در پیام به صورت شمسی ارسال می‌شود.)
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="font-semibold text-sm mb-2">زمان‌بندی</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs text-gray-600 dark:text-gray-300">
              نوع
              <select
                className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                value={scheduleType}
                onChange={(e) => setScheduleType(e.target.value as any)}
              >
                <option value="daily">روزانه</option>
                <option value="weekly">هفتگی</option>
                <option value="monthly">ماهانه</option>
              </select>
            </label>

            <label className="text-xs text-gray-600 dark:text-gray-300">
              ساعت
              <input
                type="time"
                className="mt-1 w-full min-w-[170px] px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                value={timeHHmm}
                onChange={(e) => setTimeHHmm(e.target.value)}
              />
            </label>
          </div>

          {scheduleType === 'weekly' ? (
            <div className="mt-3">
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">روزهای هفته</div>
              <div className="flex flex-wrap gap-2">
                {weekdayDefs.map((w) => (
                  <button
                    key={w.cron}
                    type="button"
                    onClick={() => toggleWeekday(w.cron)}
                    className={
                      'px-3 py-1.5 rounded-full text-xs border ' +
                      (weekdays.includes(w.cron)
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/10')
                    }
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {scheduleType === 'monthly' ? (
            <div className="mt-3">
              <label className="text-xs text-gray-600 dark:text-gray-300">
                روز ماه
                <input
                  type="number"
                  min={1}
                  max={31}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                  value={monthDay}
                  onChange={(e) => setMonthDay(Number(e.target.value) || 1)}
                />
              </label>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-5">

        <div className="flex items-center justify-between">
          <div className="font-semibold text-sm">زمان‌بندی‌های این گزارش</div>
          {loading ? <div className="text-xs text-gray-500">در حال دریافت اطلاعات…</div> : null}
        </div>

        {rows.length === 0 ? (
          <div className="mt-2 text-sm text-gray-500">فعلاً زمان‌بندی‌ای برای این گزارش ثبت نشده است.</div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-600 dark:text-gray-300">
                  <th className="text-right py-2 px-2">ID</th>
                  <th className="text-right py-2 px-2">زمان ارسال</th>
                  <th className="text-right py-2 px-2">بازه</th>
                  <th className="text-right py-2 px-2">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  let rangeLabel = '-';
                  let scheduleLabel = '';
                  try {
                    const p = r.payloadJson ? JSON.parse(r.payloadJson) : null;
                    const fj = p?.range?.fromJ;
                    const tj = p?.range?.toJ;
                    if (fj || tj) rangeLabel = `${fj || '-'} تا ${tj || '-'}`;

                    const ui = p?.ui;
                    const t = (ui?.timeHHmm || '').trim();
                    const type = ui?.scheduleType as ('daily'|'weekly'|'monthly'|undefined);
                    if (type && t) {
                      if (type === 'daily') scheduleLabel = `روزانه • ${t}`;
                      if (type === 'weekly') {
                        const days: number[] = Array.isArray(ui?.weekdays) ? ui.weekdays : [];
                        const map: Record<number, string> = {0:'یکشنبه',1:'دوشنبه',2:'سه‌شنبه',3:'چهارشنبه',4:'پنجشنبه',5:'جمعه',6:'شنبه'};
                        const names = days.length ? days.map((d:number)=>map[d] || String(d)).join('، ') : '—';
                        scheduleLabel = `هفتگی (${names}) • ${t}`;
                      }
                      if (type === 'monthly') {
                        const d = ui?.monthDay ? Number(ui.monthDay) : null;
                        scheduleLabel = `ماهانه (روز ${d || 1}) • ${t}`;
                      }
                    }
                  } catch {}

                  if (!scheduleLabel) {
                    // fallback parse cron (mm hh * * *)
                    try {
                      const parts = String(r.cronExpr || '').trim().split(/\s+/);
                      if (parts.length >= 5) {
                        const mm = pad2(Number(parts[0]) || 0);
                        const hh = pad2(Number(parts[1]) || 0);
                        const dom = parts[2];
                        const dow = parts[4];
                        const t = `${hh}:${mm}`;
                        if (dom === '*' && (dow === '*' || dow === '?')) scheduleLabel = `روزانه • ${t}`;
                        else if (dom === '*' && dow !== '*' && dow !== '?') scheduleLabel = `هفتگی • ${t}`;
                        else if (dom !== '*' && dom !== '?') scheduleLabel = `ماهانه • ${t}`;
                      }
                    } catch {}
                  }
                  return (
                    <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700">
                      <td className="py-2 px-2 font-mono">{r.id}</td>
                      <td className="py-2 px-2">{scheduleLabel}</td>
                      <td className="py-2 px-2">{rangeLabel}</td>
                      <td className="py-2 px-2">
                        <button
                          onClick={() => remove(r.id)}
                          className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10 text-xs"
                        >
                          حذف مورد
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
