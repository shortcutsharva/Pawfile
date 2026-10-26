import { isItemPending } from '@/utils/pending';

describe('pending sync matching', () => {
  const pending = new Set(['case-1', 'action-2', 'hearing-3']);

  it('matches any queued entity on the card', () => {
    expect(isItemPending(pending, 'action-2', 'case-x')).toBe(true);
    expect(isItemPending(pending, null, undefined, 'hearing-3')).toBe(true);
  });

  it('does not match unrelated or empty ids', () => {
    expect(isItemPending(pending, 'case-x', '', null)).toBe(false);
    expect(isItemPending(new Set(), 'case-1')).toBe(false);
  });
});
