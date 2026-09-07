import { useRef, useState } from 'react';
import { DEFAULT_BACKUP_SCHEDULE } from '../../utils/backupSchedule';
import { type BackupItem } from './index';
import type { DatabaseRestoreAuditRecord, DatabaseRestoreProgressSnapshot } from '../../shared/databaseRestoreProgress';

export function useSettingsBackupState() {
  const [dbFile, setDbFile] = useState<File | null>(null);
  const [isRestoringDb, setIsRestoringDb] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<DatabaseRestoreProgressSnapshot | null>(null);
  const [restoreHistory, setRestoreHistory] = useState<DatabaseRestoreAuditRecord[]>([]);
  const dbFileInputRef = useRef<HTMLInputElement>(null);

  const [backupList, setBackupList] = useState<BackupItem[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [backupEnabled, setBackupEnabled] = useState(true);
  const [backupScheduleMode, setBackupScheduleMode] = useState<'daily' | 'weekly' | 'interval'>(DEFAULT_BACKUP_SCHEDULE.mode);
  const [backupScheduleTime, setBackupScheduleTime] = useState(DEFAULT_BACKUP_SCHEDULE.time);
  const [backupScheduleWeekdays, setBackupScheduleWeekdays] = useState<number[]>(DEFAULT_BACKUP_SCHEDULE.weekdays);
  const [backupScheduleIntervalHours, setBackupScheduleIntervalHours] = useState(DEFAULT_BACKUP_SCHEDULE.intervalHours);
  const [backupTimezone, setBackupTimezone] = useState('Asia/Tehran');
  const [backupRetention, setBackupRetention] = useState(14);
  const [initialBackupSettings, setInitialBackupSettings] = useState({
    enabled: true,
    mode: DEFAULT_BACKUP_SCHEDULE.mode,
    time: DEFAULT_BACKUP_SCHEDULE.time,
    weekdays: [...DEFAULT_BACKUP_SCHEDULE.weekdays],
    intervalHours: DEFAULT_BACKUP_SCHEDULE.intervalHours,
    timezone: 'Asia/Tehran',
    retention: 14,
  });
  const [isSavingBackupSchedule, setIsSavingBackupSchedule] = useState(false);
  const [backupOperationKey, setBackupOperationKey] = useState<string | null>(null);

  return {
    dbFile,
    setDbFile,
    isRestoringDb,
    setIsRestoringDb,
    isRestoreModalOpen,
    setIsRestoreModalOpen,
    restoreProgress,
    setRestoreProgress,
    restoreHistory,
    setRestoreHistory,
    backupList,
    setBackupList,
    isLoadingBackups,
    setIsLoadingBackups,
    backupEnabled,
    setBackupEnabled,
    backupScheduleMode,
    setBackupScheduleMode,
    backupScheduleTime,
    setBackupScheduleTime,
    backupScheduleWeekdays,
    setBackupScheduleWeekdays,
    backupScheduleIntervalHours,
    setBackupScheduleIntervalHours,
    backupTimezone,
    setBackupTimezone,
    backupRetention,
    setBackupRetention,
    initialBackupSettings,
    setInitialBackupSettings,
    isSavingBackupSchedule,
    setIsSavingBackupSchedule,
    backupOperationKey,
    setBackupOperationKey,
    dbFileInputRef,
  };
}
