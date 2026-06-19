export type BackupScheduleMode = 'daily' | 'weekly' | 'interval';

export type BackupScheduleConfig = {
  mode: BackupScheduleMode;
  time: string; // HH:MM
  weekdays: number[]; // cron weekdays 0-6 where 6 = Saturday
  intervalHours: number;
};

export const BACKUP_WEEKDAYS = [
  { label: 'شنبه', cron: 6 },
  { label: 'یکشنبه', cron: 0 },
  { label: 'دوشنبه', cron: 1 },
  { label: 'سه‌شنبه', cron: 2 },
  { label: 'چهارشنبه', cron: 3 },
  { label: 'پنجشنبه', cron: 4 },
  { label: 'جمعه', cron: 5 },
] as const;

export const DEFAULT_BACKUP_SCHEDULE: BackupScheduleConfig = {
  mode: 'daily',
  time: '02:00',
  weekdays: [6],
  intervalHours: 6,
};

const pad2 = (n: number) => String(Number.isFinite(n) ? n : 0).padStart(2, '0');

export const sanitizeTime = (time?: string | null) => {
  const raw = String(time || '').trim();
  const m = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return DEFAULT_BACKUP_SCHEDULE.time;
  const hh = Math.min(23, Math.max(0, Number(m[1])));
  const mm = Math.min(59, Math.max(0, Number(m[2])));
  return `${pad2(hh)}:${pad2(mm)}`;
};

export const normalizeWeekdays = (weekdays: Array<number | string> | string | undefined | null): number[] => {
  if (typeof weekdays === 'string') {
    try {
      const parsed = JSON.parse(weekdays);
      if (Array.isArray(parsed)) return normalizeWeekdays(parsed);
    } catch {}
    return DEFAULT_BACKUP_SCHEDULE.weekdays.slice();
  }
  const arr = Array.isArray(weekdays) ? weekdays : [];
  const cleaned = arr
    .map((v: number | string) => Number(v))
    .filter((n: number) => Number.isInteger(n) && n >= 0 && n <= 6);
  const unique = Array.from(new Set(cleaned));
  return unique.length ? unique.sort((a: number, b: number) => a - b) : DEFAULT_BACKUP_SCHEDULE.weekdays.slice();
};

export const buildBackupCronExpr = (cfg: Partial<BackupScheduleConfig> = {}) => {
  const mode = cfg.mode || DEFAULT_BACKUP_SCHEDULE.mode;
  const time = sanitizeTime(cfg.time || DEFAULT_BACKUP_SCHEDULE.time);
  const [hour, minute] = time.split(':').map((v: number | string) => Number(v));
  const weekdays = normalizeWeekdays(cfg.weekdays || DEFAULT_BACKUP_SCHEDULE.weekdays);
  const intervalHours = Math.max(1, Math.min(24, Number(cfg.intervalHours || DEFAULT_BACKUP_SCHEDULE.intervalHours || 6)));

  if (mode === 'weekly') {
    return `${minute} ${hour} * * ${weekdays.join(',')}`;
  }
  if (mode === 'interval') {
    return `${minute} */${intervalHours} * * *`;
  }
  return `${minute} ${hour} * * *`;
};

export const parseBackupScheduleFromCron = (cronExpr?: string | null): BackupScheduleConfig => {
  const raw = String(cronExpr || '').trim();
  const parts = raw.split(/\s+/);
  if (parts.length === 5) {
    const [minPart, hourPart, , , dowPart] = parts;
    const minute = Number(minPart);
    if (/^\*\/\d+$/.test(hourPart)) {
      const intervalHours = Math.max(1, Math.min(24, Number(hourPart.split('/')[1] || 6)));
      return { mode: 'interval', time: `${pad2(Number.isFinite(minute) ? minute : 0)}:00`, weekdays: DEFAULT_BACKUP_SCHEDULE.weekdays.slice(), intervalHours };
    }
    if (/^[\d,]+$/.test(dowPart)) {
      const weekdays = normalizeWeekdays(dowPart.split(',').map((x) => Number(x)));
      return { mode: 'weekly', time: `${pad2(Number.isFinite(hourPart as any) ? Number(hourPart) : 2)}:${pad2(Number.isFinite(minute) ? minute : 0)}`, weekdays, intervalHours: DEFAULT_BACKUP_SCHEDULE.intervalHours };
    }
    if (/^\d+$/.test(hourPart) && /^\d+$/.test(minPart)) {
      return { mode: 'daily', time: `${pad2(Number(hourPart))}:${pad2(Number(minPart))}`, weekdays: DEFAULT_BACKUP_SCHEDULE.weekdays.slice(), intervalHours: DEFAULT_BACKUP_SCHEDULE.intervalHours };
    }
  }
  return { ...DEFAULT_BACKUP_SCHEDULE };
};

export const parseBackupScheduleFromSettings = (settings: Record<string, unknown> = {}): BackupScheduleConfig => {
  const hasExplicit = String(settings.backup_schedule_mode || '').trim() || String(settings.backup_schedule_time || '').trim() || String(settings.backup_schedule_weekdays || '').trim() || String(settings.backup_schedule_interval_hours || '').trim();
  if (hasExplicit) {
    const mode = String(settings.backup_schedule_mode || 'daily').trim() as BackupScheduleMode;
    const time = sanitizeTime(settings.backup_schedule_time || DEFAULT_BACKUP_SCHEDULE.time);
    const weekdays = normalizeWeekdays(settings.backup_schedule_weekdays);
    const intervalHours = Math.max(1, Math.min(24, Number(settings.backup_schedule_interval_hours || DEFAULT_BACKUP_SCHEDULE.intervalHours)));
    return { mode: mode === 'weekly' || mode === 'interval' ? mode : 'daily', time, weekdays, intervalHours };
  }
  if (String(settings.backup_cron || '').trim()) return parseBackupScheduleFromCron(String(settings.backup_cron));
  return { ...DEFAULT_BACKUP_SCHEDULE };
};

const makeDateAtTime = (base: Date, time: string) => {
  const [hh, mm] = sanitizeTime(time).split(':').map(Number);
  const d = new Date(base);
  d.setSeconds(0, 0);
  d.setHours(hh, mm, 0, 0);
  return d;
};

export const computeNextBackupRun = (cfg: Partial<BackupScheduleConfig> = {}, from: Date = new Date()) => {
  const mode = cfg.mode || DEFAULT_BACKUP_SCHEDULE.mode;
  const time = sanitizeTime(cfg.time || DEFAULT_BACKUP_SCHEDULE.time);
  const weekdays = normalizeWeekdays(cfg.weekdays || DEFAULT_BACKUP_SCHEDULE.weekdays);
  const intervalHours = Math.max(1, Math.min(24, Number(cfg.intervalHours || DEFAULT_BACKUP_SCHEDULE.intervalHours || 6)));
  const now = new Date(from);
  now.setSeconds(0, 0);

  if (mode === 'weekly') {
    const candidates = weekdays.map((dow: number) => {
      const candidate = makeDateAtTime(now, time);
      const currentDow = candidate.getDay();
      let delta = (dow - currentDow + 7) % 7;
      if (delta === 0 && candidate <= now) delta = 7;
      candidate.setDate(candidate.getDate() + delta);
      return candidate;
    });
    candidates.sort((a: Date, b: Date) => a.getTime() - b.getTime());
    return candidates[0] || null;
  }

  if (mode === 'interval') {
    const baseline = makeDateAtTime(now, time);
    if (baseline > now) return baseline;
    const stepMs = intervalHours * 60 * 60 * 1000;
    const elapsed = Math.max(0, now.getTime() - baseline.getTime());
    const steps = Math.floor(elapsed / stepMs) + 1;
    return new Date(baseline.getTime() + (steps * stepMs));
  }

  const candidate = makeDateAtTime(now, time);
  if (candidate > now) return candidate;
  candidate.setDate(candidate.getDate() + 1);
  return candidate;
};

export const formatNextBackupRunLabel = (cfg: Partial<BackupScheduleConfig> = {}, from: Date = new Date()) => {
  const next = computeNextBackupRun(cfg, from);
  if (!next) return 'نامشخص';
  return next.toLocaleString('fa-IR', {
    dateStyle: 'full',
    timeStyle: 'short',
  });
};
