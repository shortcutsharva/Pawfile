import { dueLabel, dueStateFor, formatDate, overdueDays } from '@/utils/date';

const now = new Date('2026-10-14T12:00:00.000Z');

describe('date and due helpers', () => {
  it('classifies overdue, today, and upcoming dates', () => {
    expect(dueStateFor('2026-10-13T12:00:00.000Z', now)).toBe('overdue');
    expect(dueStateFor('2026-10-14T12:30:00.000Z', now)).toBe('today');
    expect(dueStateFor('2026-10-20T12:00:00.000Z', now)).toBe('upcoming');
    expect(dueStateFor(null, now)).toBe('none');
  });

  it('reports overdue days without counting today as overdue', () => {
    expect(overdueDays('2026-10-13T12:00:00.000Z', now)).toBe(1);
    expect(overdueDays('2026-10-11T12:00:00.000Z', now)).toBe(3);
    expect(overdueDays('2026-10-14T13:00:00.000Z', now)).toBe(0);
  });

  it('formats due labels with the expected urgency language', () => {
    expect(dueLabel('2026-10-12T12:00:00.000Z', now)).toBe('2 days overdue');
    expect(dueLabel('2026-10-14T16:00:00.000Z', now)).toContain('Due today');
    expect(dueLabel('2026-10-15T16:00:00.000Z', now)).toContain('Due tomorrow');
    expect(dueLabel(null, now)).toBe('No due date');
  });

  it('formats dates in the dd Mon yyyy style', () => {
    expect(formatDate('2026-10-12T12:00:00.000Z')).toBe('12 Oct 2026');
  });
});
