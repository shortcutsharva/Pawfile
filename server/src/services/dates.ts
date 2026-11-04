const IST_OFFSET = '+05:30';
const IST_TIME_ZONE = 'Asia/Kolkata';

export function nowISO(): string {
  return new Date().toISOString();
}

export function istDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') values[part.type] = part.value;
  }
  return `${values.year}-${values.month}-${values.day}`;
}

export function addDaysToKey(key: string, days: number): string {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function currentMonthKey(date = new Date()): string {
  return istDateKey(date).slice(0, 7);
}

export function parseDueDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T00:00:00${IST_OFFSET}`);
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    return new Date(`${trimmed}${IST_OFFSET}`);
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isOverdue(action: Record<string, unknown>, now = new Date()): boolean {
  const due = parseDueDate(action.dueValue ?? action.followUpDate);
  return due ? due < now : false;
}

export function nextDueValue(actions: Record<string, unknown>[]): string | null {
  let selected: { raw: string; date: Date } | null = null;
  for (const action of actions) {
    const raw = action.dueValue ?? action.followUpDate;
    const date = parseDueDate(raw);
    if (!date || typeof raw !== 'string') continue;
    if (!selected || date < selected.date) selected = { raw, date };
  }
  return selected?.raw ?? null;
}
