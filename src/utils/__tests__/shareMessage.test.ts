import { buildRescueShareMessage, sanitizeDialNumber, sanitizePhone } from '@/utils/shareMessage';
import { makeAction, makeCase } from '@/data/__tests__/fixtures';

describe('external sharing', () => {
  it('masks complainant details by default', () => {
    const message = buildRescueShareMessage(makeCase(), makeAction(), {
      actorName: 'Ravi Kumar',
    });
    expect(message).toContain('Complainant: Hidden');
    expect(message).not.toContain('Priya');
    expect(message).not.toContain('9988776655');
    expect(message).not.toContain('Near City Bus Stand');
    expect(message).toContain('Viewing arranged by Ravi Kumar');
  });

  it('includes the exact address only when opted in', () => {
    const message = buildRescueShareMessage(makeCase(), makeAction(), {
      includeExactAddress: true,
    });
    expect(message).toContain('Location: Near City Bus Stand');
  });

  it('includes complainant details only when opted in', () => {
    const message = buildRescueShareMessage(makeCase(), makeAction(), {
      includeComplainant: true,
    });
    expect(message).toContain('Complainant: Priya S');
  });

  it('normalizes Indian phone numbers for WhatsApp', () => {
    expect(sanitizePhone('98765 43210')).toBe('919876543210');
    expect(sanitizePhone('+91 98765 43210')).toBe('919876543210');
  });

  it('strips DTMF and scheme characters before dialing', () => {
    expect(sanitizeDialNumber('+91 98765 43210')).toBe('+919876543210');
    expect(sanitizeDialNumber('98765,43210;5')).toBe('98765432105');
    expect(sanitizeDialNumber('*#06#')).toBe('06');
    expect(sanitizeDialNumber('')).toBe('');
    expect(sanitizeDialNumber('call me')).toBe('');
  });
});
