import type { ActionStatus, LegalStatus, RescueStatus } from '@/theme/status';

export const RESCUE_TO_ACTION: Record<RescueStatus, ActionStatus> = {
  to_attend: 'to_attend',
  awaiting_confirmation: 'follow_up',
  in_progress: 'in_progress',
  rescued: 'closed',
  unsuccessful: 'closed',
  na: 'closed',
};

export const LEGAL_TO_ACTION: Record<LegalStatus, ActionStatus> = {
  complaint_filed: 'to_attend',
  police_follow_up: 'follow_up',
  fir_registered: 'in_progress',
  hearing_scheduled: 'in_progress',
  concluded: 'closed',
  na: 'closed',
};

export function deriveActionStatus(
  type: 'rescue' | 'legal',
  rescueStatus: RescueStatus,
  legalStatus: LegalStatus,
): ActionStatus {
  return type === 'rescue' ? RESCUE_TO_ACTION[rescueStatus] : LEGAL_TO_ACTION[legalStatus];
}

export function isRescueClosed(status: RescueStatus): boolean {
  return status === 'rescued' || status === 'unsuccessful';
}

export function isLegalClosed(status: LegalStatus): boolean {
  return status === 'concluded';
}

export function isActionClosed(action: {
  type: 'rescue' | 'legal';
  rescueStatus: RescueStatus;
  legalStatus: LegalStatus;
}): boolean {
  return action.type === 'rescue'
    ? isRescueClosed(action.rescueStatus)
    : isLegalClosed(action.legalStatus);
}

export function actionStatusLabel(status: ActionStatus): string {
  return {
    to_attend: 'To attend',
    follow_up: 'Follow-up',
    in_progress: 'In progress',
    closed: 'Closed',
  }[status];
}

export function rescueStatusLabel(status: RescueStatus): string {
  return {
    to_attend: 'To attend',
    awaiting_confirmation: 'Awaiting confirmation',
    in_progress: 'Rescue in progress',
    rescued: 'Rescued',
    unsuccessful: 'Unsuccessful',
    na: 'Not applicable',
  }[status];
}

export function legalStatusLabel(status: LegalStatus): string {
  return {
    complaint_filed: 'Complaint filed',
    police_follow_up: 'Police follow-up',
    fir_registered: 'FIR registered',
    hearing_scheduled: 'Hearing scheduled',
    concluded: 'Concluded',
    na: 'Not applicable',
  }[status];
}

export const NEXT_RESCUE_STATUS: Record<RescueStatus, RescueStatus[]> = {
  to_attend: ['awaiting_confirmation', 'in_progress', 'rescued', 'unsuccessful'],
  awaiting_confirmation: ['in_progress', 'to_attend', 'rescued', 'unsuccessful'],
  in_progress: ['rescued', 'unsuccessful', 'to_attend'],
  rescued: ['in_progress'],
  unsuccessful: ['in_progress'],
  na: [],
};

export const NEXT_LEGAL_STATUS: Record<LegalStatus, LegalStatus[]> = {
  complaint_filed: ['police_follow_up', 'fir_registered', 'concluded'],
  police_follow_up: ['fir_registered', 'complaint_filed', 'concluded'],
  fir_registered: ['hearing_scheduled', 'police_follow_up', 'concluded'],
  hearing_scheduled: ['hearing_scheduled', 'concluded', 'fir_registered'],
  concluded: ['hearing_scheduled', 'fir_registered'],
  na: [],
};
