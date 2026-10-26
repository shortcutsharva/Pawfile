import { isBackupDue, missingIds } from '@/utils/backup';

describe('backup scheduling', () => {
  const now = new Date('2026-10-26T10:00:00.000Z');

  it('is due when no backup has run', () => {
    expect(isBackupDue(null, now)).toBe(true);
  });

  it('waits until seven calendar days have passed', () => {
    expect(isBackupDue('2026-10-20T10:00:00.000Z', now)).toBe(false);
    expect(isBackupDue('2026-10-19T10:00:00.000Z', now)).toBe(true);
  });

  it('ignores future timestamps and disabled scheduling', () => {
    expect(isBackupDue('2026-11-01T10:00:00.000Z', now)).toBe(false);
    expect(isBackupDue(null, now, false)).toBe(false);
  });
});

describe('restore diffing', () => {
  it('returns only incoming ids that do not exist', () => {
    expect(missingIds(['a', 'b', 'b', 'c', ''], new Set(['b']))).toEqual(['a', 'c']);
  });
});
