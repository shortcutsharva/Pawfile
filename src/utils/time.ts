import { format } from 'date-fns';
import { toDate } from '@/utils/date';

export function defaultsToTimeValue(time: string): string {
  const date = new Date();
  const [hours, minutes] = time.split(':').map((part) => Number(part));
  date.setHours(Number.isFinite(hours) ? hours : 9, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return date.toISOString();
}

export function timeValueToHHmm(value: string | null): string {
  const date = toDate(value);
  return date ? format(date, 'HH:mm') : '09:00';
}
