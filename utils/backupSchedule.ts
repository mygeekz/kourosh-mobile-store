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
    const startHour = Math.min(23, Math.max(0, hour));
    const hours: number[] = [];
    for (let value = startHour; value < 24; value += intervalHours) hours.push(value);
    for (let value = startHour - intervalHours; value >= 0; value -= intervalHours) hours.unshift(value);
    return `${minute} ${Array.from(new Set(hours)).join(',')} * * *`;
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
      return { mode: 'interval', time: `00:${pad2(Number.isFinite(minute) ? minute : 0)}`, weekdays: DEFAULT_BACKUP_SCHEDULE.weekdays.slice(), intervalHours };
    }
    if (/^\d+(,\d+)+$/.test(hourPart) && dowPart === '*') {
      const hours = hourPart.split(',').map(Number).filter((value) => Number.isInteger(value) && value >= 0 && value <= 23);
      const uniqueHours = Array.from(new Set(hours)).sort((a, b) => a - b);
      const inferredInterval = uniqueHours.length > 1
        ? Math.max(1, Math.min(24, uniqueHours[1] - uniqueHours[0]))
        : DEFAULT_BACKUP_SCHEDULE.intervalHours;
      return {
        mode: 'interval',
        time: `${pad2(uniqueHours[0] ?? 0)}:${pad2(Number.isFinite(minute) ? minute : 0)}`,
        weekdays: DEFAULT_BACKUP_SCHEDULE.weekdays.slice(),
        intervalHours: inferredInterval,
      };
    }
    if (/^[\d,]+$/.test(dowPart)) {
      const weekdays = normalizeWeekdays(dowPart.split(',').map((x) => Number(x)));
      const parsedHour = Number(hourPart);
      return { mode: 'weekly', time: `${pad2(Number.isFinite(parsedHour) ? parsedHour : 2)}:${pad2(Number.isFinite(minute) ? minute : 0)}`, weekdays, intervalHours: DEFAULT_BACKUP_SCHEDULE.intervalHours };
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
    const time = sanitizeTime(typeof settings.backup_schedule_time === 'string' ? settings.backup_schedule_time : DEFAULT_BACKUP_SCHEDULE.time);
    const weekdays = normalizeWeekdays(Array.isArray(settings.backup_schedule_weekdays) || typeof settings.backup_schedule_weekdays === 'string' ? settings.backup_schedule_weekdays : undefined);
    const intervalHours = Math.max(1, Math.min(24, Number(settings.backup_schedule_interval_hours ?? DEFAULT_BACKUP_SCHEDULE.intervalHours)));
    return { mode: mode === 'weekly' || mode === 'interval' ? mode : 'daily', time, weekdays, intervalHours };
  }
  if (String(settings.backup_cron || '').trim()) return parseBackupScheduleFromCron(String(settings.backup_cron));
  return { ...DEFAULT_BACKUP_SCHEDULE };
};

const zonedPartsFormatterCache = new Map<string, Intl.DateTimeFormat>();

const getZonedPartsFormatter = (timeZone: string) => {
  const cached = zonedPartsFormatterCache.get(timeZone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  zonedPartsFormatterCache.set(timeZone, formatter);
  return formatter;
};

const normalizeTimeZone = (timeZone?: string) => {
  const candidate = String(timeZone || 'Asia/Tehran').trim() || 'Asia/Tehran';
  try {
    getZonedPartsFormatter(candidate).format(new Date());
    return candidate;
  } catch {
    return 'Asia/Tehran';
  }
};

const getZonedParts = (date: Date, timeZone: string) => {
  const values = Object.fromEntries(getZonedPartsFormatter(timeZone).formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour === '24' ? '0' : values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
};

const getTimeZoneOffsetMs = (date: Date, timeZone: string) => {
  const parts = getZonedParts(date, timeZone);
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - date.getTime();
};

const zonedDateTimeToUtc = (
  parts: { year: number; month: number; day: number; hour: number; minute: number },
  timeZone: string,
) => {
  const utcGuess = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0, 0);
  let candidate = new Date(utcGuess - getTimeZoneOffsetMs(new Date(utcGuess), timeZone));
  const correctedOffset = getTimeZoneOffsetMs(candidate, timeZone);
  candidate = new Date(utcGuess - correctedOffset);
  return candidate;
};

const addGregorianDays = (parts: { year: number; month: number; day: number }, days: number) => {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
};

const getGregorianWeekday = (parts: { year: number; month: number; day: number }) =>
  new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();

export const computeNextBackupRun = (
  cfg: Partial<BackupScheduleConfig> = {},
  from: Date = new Date(),
  requestedTimeZone = 'Asia/Tehran',
) => {
  const mode = cfg.mode || DEFAULT_BACKUP_SCHEDULE.mode;
  const time = sanitizeTime(cfg.time || DEFAULT_BACKUP_SCHEDULE.time);
  const weekdays = normalizeWeekdays(cfg.weekdays || DEFAULT_BACKUP_SCHEDULE.weekdays);
  const intervalHours = Math.max(1, Math.min(24, Number(cfg.intervalHours || DEFAULT_BACKUP_SCHEDULE.intervalHours || 6)));
  const timeZone = normalizeTimeZone(requestedTimeZone);
  const now = new Date(from);
  const current = getZonedParts(now, timeZone);
  const [hour, minute] = time.split(':').map(Number);
  const today = { year: current.year, month: current.month, day: current.day };

  const candidateForDay = (dayOffset: number) => {
    const dateParts = addGregorianDays(today, dayOffset);
    return zonedDateTimeToUtc({ ...dateParts, hour, minute }, timeZone);
  };

  if (mode === 'weekly') {
    const currentWeekday = getGregorianWeekday(today);
    const candidates = weekdays.map((weekday) => {
      let delta = (weekday - currentWeekday + 7) % 7;
      let candidate = candidateForDay(delta);
      if (candidate <= now) {
        delta += 7;
        candidate = candidateForDay(delta);
      }
      return candidate;
    });
    candidates.sort((a, b) => a.getTime() - b.getTime());
    return candidates[0] || null;
  }

  if (mode === 'interval') {
    let baseline = candidateForDay(0);
    if (baseline > now) return baseline;
    const stepMs = intervalHours * 60 * 60 * 1000;
    const steps = Math.floor((now.getTime() - baseline.getTime()) / stepMs) + 1;
    baseline = new Date(baseline.getTime() + steps * stepMs);
    return baseline;
  }

  const todayCandidate = candidateForDay(0);
  return todayCandidate > now ? todayCandidate : candidateForDay(1);
};

export const formatNextBackupRunLabel = (
  cfg: Partial<BackupScheduleConfig> = {},
  from: Date = new Date(),
  requestedTimeZone = 'Asia/Tehran',
) => {
  const timeZone = normalizeTimeZone(requestedTimeZone);
  const next = computeNextBackupRun(cfg, from, timeZone);
  if (!next) return 'نامشخص';
  return next.toLocaleString('fa-IR-u-ca-persian', {
    timeZone,
    dateStyle: 'full',
    timeStyle: 'short',
  });
};
