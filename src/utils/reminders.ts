export const HEARING_REMINDER_HOUR = 9;

export interface ReminderSpec {
  leadDays: number;
  at: Date;
  immediate: boolean;
}

export function computeHearingReminders(
  hearingDate: Date,
  enabledLeads: number[],
  now = new Date(),
  hour = HEARING_REMINDER_HOUR,
): ReminderSpec[] {
  const hearingPassed = hearingDate.getTime() <= now.getTime();
  if (hearingPassed) return [];
  const leads = [...new Set(enabledLeads)].sort((a, b) => a - b);
  const specs: ReminderSpec[] = [];
  for (const leadDays of leads) {
    const at = new Date(hearingDate);
    at.setDate(at.getDate() - leadDays);
    at.setHours(hour, 0, 0, 0);
    if (at.getTime() >= now.getTime()) {
      specs.push({ leadDays, at, immediate: false });
      continue;
    }
    if (leadDays === leads[0]) {
      specs.push({ leadDays, at: new Date(now.getTime() + 2000), immediate: true });
    }
  }
  return specs;
}

export function followUpReminderAt(due: Date, now = new Date()): Date {
  return due.getTime() < now.getTime() ? new Date(now.getTime() + 2000) : due;
}
