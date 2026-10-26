export type RequirementAnswer = 'yes' | 'no' | 'not_sure' | 'to_assess';

export function createsAction(answer: RequirementAnswer): boolean {
  return answer === 'yes' || answer === 'not_sure' || answer === 'to_assess';
}

export function buildCaseTitle(animalType: string, complaintCategory: string): string {
  if (complaintCategory === 'Injury') return `Injured ${animalType}`;
  if (complaintCategory === 'Cruelty') return `${animalType} cruelty`;
  if (complaintCategory === 'Abandonment') return `Abandoned ${animalType}`;
  return `${complaintCategory} ${animalType}`.trim();
}
