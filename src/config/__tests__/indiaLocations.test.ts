import { INDIA_DISTRICTS, INDIA_STATES_AND_UTS, normalizeStateName } from '@/config/indiaLocations';

describe('India location master', () => {
  it('lists every state and union territory', () => {
    expect(INDIA_STATES_AND_UTS).toHaveLength(36);
    expect(INDIA_STATES_AND_UTS).toContain('Karnataka');
    expect(INDIA_STATES_AND_UTS).toContain('Delhi');
    expect(INDIA_STATES_AND_UTS).toContain('Ladakh');
  });

  it('has non-empty, unique districts for every state', () => {
    for (const state of INDIA_STATES_AND_UTS) {
      const districts = INDIA_DISTRICTS[state];
      expect(districts.length).toBeGreaterThan(0);
      expect(new Set(districts).size).toBe(districts.length);
      expect(districts.every((district) => district.trim().length > 0)).toBe(true);
    }
  });

  it('keeps the familiar Karnataka districts', () => {
    expect(INDIA_DISTRICTS.Karnataka).toEqual(
      expect.arrayContaining(['Mysuru', 'Bengaluru Urban', 'Dakshina Kannada', 'Udupi']),
    );
  });

  it('normalizes common state aliases', () => {
    expect(normalizeStateName('Orissa')).toBe('Odisha');
    expect(normalizeStateName('Pondicherry')).toBe('Puducherry');
    expect(normalizeStateName('Uttaranchal')).toBe('Uttarakhand');
    expect(normalizeStateName('NCT of Delhi')).toBe('Delhi');
    expect(normalizeStateName('karnataka')).toBe('Karnataka');
    expect(normalizeStateName('  Jammu & Kashmir ')).toBe('Jammu and Kashmir');
  });
});
