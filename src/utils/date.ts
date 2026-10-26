import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  format,
  isSameDay,
  isValid,
  parse,
  parseISO,
  startOfDay,
} from 'date-fns';
import type { DueState } from '@/data/types';

export const nowISO = (): string => new Date().toISOString();

export function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  if (/^\d{1,2}:\d{2}$/.test(value)) {
    const time = parse(value, 'HH:mm', new Date());
    return isValid(time) ? time : null;
  }
  const parsed = value.length <= 10 ? parse(value, 'yyyy-MM-dd', new Date()) : parseISO(value);
  return isValid(parsed) ? parsed : null;
}

export function formatDate(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? format(date, 'dd MMM yyyy') : '—';
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? format(date, 'dd MMM yyyy, h:mm aaa') : '—';
}

export function formatTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? format(date, 'h:mm aaa') : '—';
}

export function formatDayLabel(value: string | Date): string {
  const date = toDate(value);
  return date ? format(date, 'EEE dd MMM') : '—';
}

export function formatMonthLabel(value: string | Date): string {
  const date = toDate(value);
  return date ? format(date, 'MMMM yyyy') : '—';
}

export function dateKey(value: string | Date): string {
  const date = toDate(value);
  return date ? format(date, 'yyyy-MM-dd') : '';
}

export function combineDateAndTime(dateValue: string, time: string): string {
  const datePart = dateKey(dateValue);
  const parsed = parse(`${datePart} ${time || '09:00'}`, 'yyyy-MM-dd HH:mm', new Date());
  return isValid(parsed) ? parsed.toISOString() : new Date().toISOString();
}

export function dueStateFor(value: string | null | undefined, now = new Date()): DueState {
  const date = toDate(value);
  if (!date) return 'none';
  if (date < now) return 'overdue';
  if (isSameDay(date, now)) return 'today';
  return 'upcoming';
}

export function overdueDays(value: string | null | undefined, now = new Date()): number {
  const date = toDate(value);
  if (!date || date >= now) return 0;
  return Math.max(1, differenceInCalendarDays(now, date));
}

export function dueLabel(value: string | null | undefined, now = new Date()): string {
  const date = toDate(value);
  if (!date) return 'No due date';
  const days = differenceInCalendarDays(date, now);
  if (date < now) {
    const overdue = Math.max(1, differenceInCalendarDays(now, date));
    return overdue === 1 ? '1 day overdue' : `${overdue} days overdue`;
  }
  if (isSameDay(date, now)) return `Due today, ${format(date, 'h:mm aaa')}`;
  if (days === 1) return `Due tomorrow, ${format(date, 'h:mm aaa')}`;
  if (days <= 7) return `Due ${format(date, 'EEE dd MMM')}, ${format(date, 'h:mm aaa')}`;
  return `Due ${format(date, 'dd MMM')}`;
}

export function hearingLabel(dateValue: string, time: string): string {
  const date = toDate(dateValue);
  if (!date) return 'Hearing date not set';
  return `Hearing ${format(date, 'dd MMM')}, ${formatTime(time)}`;
}

export function startOfToday(): Date {
  return startOfDay(new Date());
}

export function nextFollowUpDefault(): string {
  const now = new Date();
  const hour = now.getHours();
  const date = new Date(now);
  if (hour >= 23) {
    date.setDate(date.getDate() + 1);
    date.setHours(9, 0, 0, 0);
  } else {
    date.setHours(hour + 1, 0, 0, 0);
  }
  return date.toISOString();
}

export function isDueWithin(value: string | null | undefined, days: number, now = new Date()): boolean {
  const date = toDate(value);
  if (!date) return false;
  return date >= now && date <= endOfDay(addDays(now, days));
}

export function weekdayShort(value: Date): string {
  return format(value, 'EEE');
}

export function dayNumber(value: Date): string {
  return format(value, 'd');
}
