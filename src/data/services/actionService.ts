import { actionsRepository } from '@/data/repositories/actions';
import { hearingsRepository } from '@/data/repositories/hearings';
import { logHistory } from '@/data/repositories/history';
import { deriveActionStatus } from '@/data/derive';
import type { Action } from '@/data/types';
import { nowISO } from '@/utils/date';

export async function nextHearingDateFor(actionId: string): Promise<string | null> {
  const hearings = await hearingsRepository.getAll();
  const open = hearings
    .filter((hearing) => hearing.actionId === actionId && !hearing.outcome && !hearing.isDeleted)
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  if (!open.length) return null;
  const next = open[0];
  return next.date ? `${next.date}T${next.time || '09:00'}:00` : null;
}

export async function computeDueValue(action: Action): Promise<string | null> {
  if (action.type === 'legal') {
    const nextHearing = await nextHearingDateFor(action.actionId);
    if (nextHearing) return nextHearing;
  }
  return action.followUpDate ?? null;
}

export async function refreshActionDerivedFields(action: Action): Promise<Action> {
  const actionStatus = deriveActionStatus(action.type, action.rescueStatus, action.legalStatus);
  const isClosed = actionStatus === 'closed';
  const dueValue = await computeDueValue(action);
  return {
    ...action,
    actionStatus,
    isClosed,
    dueValue,
    closedAt: isClosed ? action.closedAt ?? nowISO() : null,
  };
}

export async function updateAction(
  actionId: string,
  patch: Partial<Action>,
  history?: { description: string; eventType?: Parameters<typeof logHistory>[0]['eventType'] },
): Promise<Action> {
  const existing = await actionsRepository.getById(actionId);
  if (!existing) throw new Error(`Action ${actionId} not found`);
  const merged = await refreshActionDerivedFields({ ...existing, ...patch });
  const saved = await actionsRepository.update(actionId, merged);
  if (history) {
    await logHistory({
      caseId: saved.caseId,
      actionId: saved.actionId,
      eventType: history.eventType ?? 'updated',
      description: history.description,
      oldValue: existing,
      newValue: saved,
    });
  }
  return saved;
}
