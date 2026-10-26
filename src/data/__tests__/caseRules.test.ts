import { buildCaseTitle, createsAction } from '@/data/caseRules';

describe('case registration rules', () => {
  it('creates actions for yes, not sure, and to assess', () => {
    expect(createsAction('yes')).toBe(true);
    expect(createsAction('not_sure')).toBe(true);
    expect(createsAction('to_assess')).toBe(true);
    expect(createsAction('no')).toBe(false);
  });

  it('builds readable titles from animal and category', () => {
    expect(buildCaseTitle('Dog', 'Injury')).toBe('Injured Dog');
    expect(buildCaseTitle('Cattle', 'Cruelty')).toBe('Cattle cruelty');
    expect(buildCaseTitle('Bird', 'Abandonment')).toBe('Abandoned Bird');
    expect(buildCaseTitle('Cat', 'Neglect')).toBe('Neglect Cat');
  });
});
