import {
  deriveActionStatus,
  isActionClosed,
  isLegalClosed,
  isRescueClosed,
  LEGAL_TO_ACTION,
  RESCUE_TO_ACTION,
} from '@/data/derive';

describe('status derivation', () => {
  it('maps rescue statuses to the shared action status', () => {
    expect(deriveActionStatus('rescue', 'to_attend', 'na')).toBe('to_attend');
    expect(deriveActionStatus('rescue', 'awaiting_confirmation', 'na')).toBe('follow_up');
    expect(deriveActionStatus('rescue', 'in_progress', 'na')).toBe('in_progress');
    expect(deriveActionStatus('rescue', 'rescued', 'na')).toBe('closed');
    expect(deriveActionStatus('rescue', 'unsuccessful', 'na')).toBe('closed');
  });

  it('maps legal statuses to the shared action status', () => {
    expect(deriveActionStatus('legal', 'na', 'complaint_filed')).toBe('to_attend');
    expect(deriveActionStatus('legal', 'na', 'police_follow_up')).toBe('follow_up');
    expect(deriveActionStatus('legal', 'na', 'fir_registered')).toBe('in_progress');
    expect(deriveActionStatus('legal', 'na', 'hearing_scheduled')).toBe('in_progress');
    expect(deriveActionStatus('legal', 'na', 'concluded')).toBe('closed');
  });

  it('keeps rescue and legal closure independent', () => {
    expect(isRescueClosed('rescued')).toBe(true);
    expect(isRescueClosed('unsuccessful')).toBe(true);
    expect(isRescueClosed('in_progress')).toBe(false);
    expect(isLegalClosed('concluded')).toBe(true);
    expect(isLegalClosed('hearing_scheduled')).toBe(false);

    const completedRescue = {
      type: 'rescue' as const,
      rescueStatus: 'rescued' as const,
      legalStatus: 'na' as const,
    };
    expect(isActionClosed(completedRescue)).toBe(true);
  });

  it('covers every status value', () => {
    expect(Object.keys(RESCUE_TO_ACTION)).toHaveLength(6);
    expect(Object.keys(LEGAL_TO_ACTION)).toHaveLength(6);
  });
});
