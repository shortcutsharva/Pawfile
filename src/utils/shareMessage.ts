import type { Action, Case } from '@/data/types';

export function maskName(name: string): string {
  if (!name.trim()) return 'Hidden';
  return 'Hidden';
}

export function maskPhone(phone: string): string {
  if (!phone.trim()) return 'Hidden';
  return 'Hidden';
}

export function sanitizePhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

/**
 * Builds a dialable number for a tel: URI. A stored phone value is free text, so anything that is
 * not a digit or a leading + (DTMF separators, extra scheme components, control characters) is
 * dropped before it reaches the dialer.
 */
export function sanitizeDialNumber(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return '';
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/[^\d]/g, '');
  if (!digits) return '';
  return `${hasPlus ? '+' : ''}${digits}`.slice(0, 16);
}

export interface ShareOptions {
  includeComplainant?: boolean;
  includeExactAddress?: boolean;
  actorName?: string;
}

export function buildRescueShareMessage(
  caseRecord: Case,
  action: Action,
  options: ShareOptions = {},
): string {
  const lines = [
    `*Animal rescue request · Case #${caseRecord.caseId}*`,
    `${caseRecord.title} (${caseRecord.animalType})`,
    `Area: ${caseRecord.district}${caseRecord.state ? `, ${caseRecord.state}` : ''}`,
    `Urgency: ${caseRecord.urgency}`,
  ];
  if (options.includeExactAddress && caseRecord.locationText) {
    lines.push(`Location: ${caseRecord.locationText}`);
  }
  lines.push(`Status: ${action.actionStatus.replace('_', ' ')}`);
  if (action.nextAction) lines.push(`Next action: ${action.nextAction}`);
  lines.push(
    `Complainant: ${
      options.includeComplainant ? caseRecord.complainantName || 'Not provided' : 'Hidden'
    }`,
  );
  lines.push(`Viewing arranged by ${options.actorName || 'Activist'}`);
  lines.push('');
  lines.push('Respond with ACCEPTED or DECLINED.');
  return lines.join('\n');
}
