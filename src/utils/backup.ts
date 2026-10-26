import { differenceInCalendarDays } from 'date-fns';
import { toDate } from '@/utils/date';

export const BACKUP_INTERVAL_DAYS = 7;
export const MAX_AUTO_BACKUPS = 4;

export function isBackupDue(
  lastBackupAt: string | null | undefined,
  now = new Date(),
  enabled = true,
): boolean {
  if (!enabled) return false;
  if (!lastBackupAt) return true;
  const last = toDate(lastBackupAt);
  if (!last) return true;
  if (last > now) return false;
  return differenceInCalendarDays(now, last) >= BACKUP_INTERVAL_DAYS;
}

export function missingIds(incoming: string[], existing: Set<string>): string[] {
  return [...new Set(incoming)].filter((id) => id && !existing.has(id));
}
