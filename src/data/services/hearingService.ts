import { hearingsRepository } from '@/data/repositories/hearings';
import { actionsRepository } from '@/data/repositories/actions';
import { logHistory } from '@/data/repositories/history';
import { updateAction } from '@/data/services/actionService';
import { recomputeCaseStatuses } from '@/data/services/caseService';
import type { Hearing, HearingResult } from '@/data/types';
import type { HearingStatus } from '@/theme/status';
import { combineDateAndTime, nowISO, toDate } from '@/utils/date';

export interface AddHearingInput {
  caseId: string;
  actionId: string;
  date: string;
  time: string;
  court: string;
  purpose: string;
  attendeeId: string;
  attendeeName: string;
  reminder7d: boolean;
  reminder3d: boolean;
  reminder1d: boolean;
}

export function hearingStatusFor(hearing: Hearing, now = new Date()): HearingStatus {
  if (hearing.outcome) return 'outcome_recorded';
  const date = toDate(combineDateAndTime(hearing.date, hearing.time));
  if (date && date < now) return 'outcome_pending';
  return 'scheduled';
}

export function hearingSortValue(hearing: Hearing): string {
  return `${hearing.date}T${hearing.time || '00:00'}`;
}

export async function addHearing(input: AddHearingInput): Promise<Hearing> {
  const existing = await hearingsRepository.getAll();
  const sequence = existing.filter((hearing) => hearing.caseId === input.caseId).length + 1;
  const now = nowISO();
  const hearing: Hearing = {
    hearingId: `HRG-${input.caseId}-${sequence}`,
    caseId: input.caseId,
    actionId: input.actionId,
    date: input.date,
    time: input.time,
    court: input.court,
    purpose: input.purpose,
    attendeeId: input.attendeeId,
    attendeeName: input.attendeeName,
    outcome: '',
    result: '',
    nextHearingDate: null,
    status: 'scheduled',
    reminder7d: input.reminder7d,
    reminder3d: input.reminder3d,
    reminder1d: input.reminder1d,
    createdAt: now,
    updatedAt: now,
    syncedAt: null,
    localVersion: 1,
    serverVersion: 0,
    isDeleted: false,
  };
  const saved = { ...hearing, status: hearingStatusFor(hearing) };
  await hearingsRepository.insert(saved);

  const legalAction = await actionsRepository.getById(input.actionId);
  if (legalAction) {
    await updateAction(
      legalAction.actionId,
      {
        legalStatus: 'hearing_scheduled',
        followUpDate: combineDateAndTime(input.date, input.time),
        nextAction: input.purpose || legalAction.nextAction,
      },
      {
        description: `Hearing scheduled for ${input.date}`,
        eventType: 'hearing_added',
      },
    );
  }
  await recomputeCaseStatuses(input.caseId);
  await logHistory({
    caseId: input.caseId,
    actionId: input.actionId,
    eventType: 'hearing_added',
    description: `Hearing added for ${input.date}`,
    newValue: saved,
  });
  return saved;
}

export interface HearingOutcomeInput {
  outcome: string;
  result: HearingResult;
  nextHearingDate: string | null;
}

export async function recordHearingOutcome(
  hearingId: string,
  input: HearingOutcomeInput,
): Promise<Hearing> {
  const existing = await hearingsRepository.getById(hearingId);
  if (!existing) throw new Error(`Hearing ${hearingId} not found`);
  const saved = await hearingsRepository.update(hearingId, {
    outcome: input.outcome,
    result: input.result,
    nextHearingDate: input.nextHearingDate,
    status: 'outcome_recorded',
  });

  const legalAction = await actionsRepository.getById(existing.actionId);
  if (legalAction) {
    if (input.result === 'Case concluded') {
      await updateAction(
        legalAction.actionId,
        { legalStatus: 'concluded' },
        { description: 'Case concluded by hearing outcome', eventType: 'hearing_outcome' },
      );
    } else if (input.nextHearingDate) {
      await updateAction(
        legalAction.actionId,
        {
          legalStatus: 'hearing_scheduled',
          followUpDate: input.nextHearingDate,
        },
        { description: 'Next hearing scheduled', eventType: 'hearing_outcome' },
      );
    } else {
      await updateAction(
        legalAction.actionId,
        { legalStatus: 'police_follow_up' },
        { description: 'Hearing outcome recorded', eventType: 'hearing_outcome' },
      );
    }
    await recomputeCaseStatuses(existing.caseId);
  }

  await logHistory({
    caseId: existing.caseId,
    actionId: existing.actionId,
    eventType: 'hearing_outcome',
    description: `Hearing outcome recorded: ${input.result}`,
    oldValue: existing,
    newValue: saved,
  });
  return saved;
}

export async function refreshHearingStatuses(): Promise<void> {
  const hearings = await hearingsRepository.getAll();
  const now = new Date();
  for (const hearing of hearings) {
    const nextStatus = hearingStatusFor(hearing, now);
    if (nextStatus !== hearing.status) {
      await hearingsRepository.update(hearing.hearingId, { status: nextStatus }, false);
    }
  }
}
