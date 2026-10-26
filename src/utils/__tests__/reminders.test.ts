import { computeHearingReminders, followUpReminderAt } from '@/utils/reminders';

const now = new Date('2026-10-14T12:00:00.000Z');

function hearingIn(days: number, hour = 11): Date {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

describe('hearing reminder lead times', () => {
  it('schedules all future lead times', () => {
    const specs = computeHearingReminders(hearingIn(10), [7, 3, 1], now);
    expect(specs.map((spec) => spec.leadDays)).toEqual([1, 3, 7]);
    expect(specs.every((spec) => !spec.immediate)).toBe(true);
  });

  it('skips lead times that have already passed', () => {
    const specs = computeHearingReminders(hearingIn(2), [7, 3, 1], now);
    expect(specs.map((spec) => spec.leadDays)).toEqual([1]);
    expect(specs[0].immediate).toBe(false);
  });

  it('fires the closest reminder immediately when its time has passed', () => {
    const specs = computeHearingReminders(hearingIn(0, 18), [7, 3, 1], now);
    expect(specs).toHaveLength(1);
    expect(specs[0].leadDays).toBe(1);
    expect(specs[0].immediate).toBe(true);
    expect(specs[0].at.getTime()).toBeGreaterThan(now.getTime());
  });

  it('does not schedule reminders for a hearing that already passed', () => {
    expect(computeHearingReminders(hearingIn(-1), [7, 3, 1], now)).toHaveLength(0);
  });

  it('fires overdue follow-ups immediately', () => {
    const due = new Date(now.getTime() - 60_000);
    expect(followUpReminderAt(due, now).getTime()).toBeGreaterThan(now.getTime());
    expect(followUpReminderAt(new Date(now.getTime() + 60_000), now).getTime()).toBe(
      now.getTime() + 60_000,
    );
  });
});
