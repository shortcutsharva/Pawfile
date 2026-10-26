import { actionsRepository } from '@/data/repositories/actions';
import { casesRepository } from '@/data/repositories/cases';
import { hearingsRepository } from '@/data/repositories/hearings';
import { documentsRepository } from '@/data/repositories/documents';
import { historyRepository } from '@/data/repositories/history';
import type {
  Action,
  AlertItem,
  Case,
  DocumentMeta,
  Hearing,
  HistoryEntry,
  WorklistItem,
} from '@/data/types';
import {
  buildWorklistItem,
  defaultFilters,
  filterWorklist,
  sortWorklist,
  type WorklistFilters,
  type WorklistResult,
} from '@/data/worklistCore';
import { formatDate, toDate } from '@/utils/date';

export { buildWorklistItem, defaultFilters, filterWorklist, sortWorklist };
export type { WorklistFilters, WorklistResult };

export async function getWorklist(filters: WorklistFilters): Promise<WorklistResult> {
  const [cases, actions, hearings] = await Promise.all([
    casesRepository.getAll(),
    actionsRepository.getAll(),
    hearingsRepository.getAll(),
  ]);
  const caseById = new Map(cases.map((caseRecord) => [caseRecord.caseId, caseRecord]));
  const now = new Date();
  const items = actions
    .filter((action) => !action.isDeleted)
    .map((action) => {
      const caseRecord = caseById.get(action.caseId);
      if (!caseRecord || caseRecord.isDeleted) return null;
      return buildWorklistItem(action, caseRecord, hearings, now);
    })
    .filter((item): item is WorklistItem => item !== null)
    .filter((item) => item.caseRecord.status === 'open')
    .filter((item) => (filters.status === 'closed' ? true : item.action.actionStatus !== 'closed'))
    .filter((item) => (filters.status === 'closed' ? item.action.actionStatus === 'closed' : true));

  const filtered = sortWorklist(filterWorklist(items, filters, now));
  return {
    rescue: filtered.filter((item) => item.action.type === 'rescue'),
    legal: filtered.filter((item) => item.action.type === 'legal'),
    total: filtered.length,
  };
}

export async function getCaseDetail(caseId: string): Promise<{
  caseRecord: Case | null;
  actions: Action[];
  hearings: Hearing[];
  documents: DocumentMeta[];
  history: HistoryEntry[];
}> {
  const [caseRecord, actions, hearings, documents, history] = await Promise.all([
    casesRepository.getById(caseId),
    actionsRepository.getAll(),
    hearingsRepository.getAll(),
    documentsRepository.getAll(),
    historyRepository.listByCase(caseId),
  ]);
  return {
    caseRecord,
    actions: actions.filter((action) => action.caseId === caseId),
    hearings: hearings.filter((hearing) => hearing.caseId === caseId),
    documents: documents.filter((document) => document.caseId === caseId),
    history,
  };
}

export async function getAllCases(search = '', includeClosed = true): Promise<Case[]> {
  const cases = await casesRepository.getAll();
  const query = search.trim().toLowerCase();
  return cases.filter((caseRecord) => {
    if (!includeClosed && caseRecord.status === 'closed') return false;
    if (!query) return true;
    return [
      caseRecord.caseId,
      caseRecord.title,
      caseRecord.animalType,
      caseRecord.district,
      caseRecord.state,
      caseRecord.complainantName,
    ].some((value) => String(value ?? '').toLowerCase().includes(query));
  });
}

export type CaseSort = 'recent' | 'due' | 'caseId';

export interface CaseSummary {
  caseRecord: Case;
  action: Action | null;
  item: WorklistItem | null;
}

export async function getAllCaseItems(
  search = '',
  includeClosed = true,
  sort: CaseSort = 'recent',
): Promise<CaseSummary[]> {
  const [cases, actions, hearings] = await Promise.all([
    casesRepository.getAll(),
    actionsRepository.getAll(),
    hearingsRepository.getAll(),
  ]);
  const query = search.trim().toLowerCase();
  const now = new Date();

  const summaries: CaseSummary[] = cases
    .filter((caseRecord) => includeClosed || caseRecord.status === 'open')
    .filter((caseRecord) => {
      if (!query) return true;
      const related = actions.filter((action) => action.caseId === caseRecord.caseId);
      return [
        caseRecord.caseId,
        caseRecord.title,
        caseRecord.animalType,
        caseRecord.district,
        caseRecord.state,
        caseRecord.complainantName,
        ...related.flatMap((action) => [action.firNumber, action.court, action.policeStation]),
      ].some((value) => String(value ?? '').toLowerCase().includes(query));
    })
    .map((caseRecord) => {
      const related = actions.filter((action) => action.caseId === caseRecord.caseId);
      const primary =
        related.find((action) => !action.isClosed) ??
        related.slice().sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))[0] ??
        null;
      return {
        caseRecord,
        action: primary,
        item: primary ? buildWorklistItem(primary, caseRecord, hearings, now) : null,
      };
    });

  summaries.sort((a, b) => {
    if (sort === 'caseId') return Number(b.caseRecord.caseId) - Number(a.caseRecord.caseId);
    if (sort === 'due') {
      const aDue = toDate(a.action?.dueValue ?? a.action?.followUpDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bDue = toDate(b.action?.dueValue ?? b.action?.followUpDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aDue - bDue;
    }
    return b.caseRecord.updatedAt.localeCompare(a.caseRecord.updatedAt);
  });
  return summaries;
}

export async function getAlerts(): Promise<AlertItem[]> {
  const [cases, actions, hearings] = await Promise.all([
    casesRepository.getAll(),
    actionsRepository.getAll(),
    hearingsRepository.getAll(),
  ]);
  const caseById = new Map(cases.map((caseRecord) => [caseRecord.caseId, caseRecord]));
  const now = new Date();
  const alerts: AlertItem[] = [];

  for (const action of actions) {
    if (action.isDeleted || action.isClosed) continue;
    const caseRecord = caseById.get(action.caseId);
    if (!caseRecord || caseRecord.isDeleted || caseRecord.status === 'closed') continue;
    const item = buildWorklistItem(action, caseRecord, hearings, now);
    if (item.dueState === 'overdue') {
      alerts.push({
        id: `overdue-${action.actionId}`,
        kind: 'overdue',
        caseId: action.caseId,
        actionId: action.actionId,
        title: `#${action.caseId} ${caseRecord.title}`,
        subtitle: item.dueLabel,
        date: action.dueValue ?? action.followUpDate ?? now.toISOString(),
        group: 'overdue',
      });
    } else if (item.dueState === 'today') {
      alerts.push({
        id: `today-${action.actionId}`,
        kind: 'follow_up',
        caseId: action.caseId,
        actionId: action.actionId,
        title: `#${action.caseId} ${caseRecord.title}`,
        subtitle: item.dueLabel,
        date: action.dueValue ?? action.followUpDate ?? now.toISOString(),
        group: 'today',
      });
    }
  }

  for (const hearing of hearings) {
    if (hearing.isDeleted || hearing.outcome) continue;
    const caseRecord = caseById.get(hearing.caseId);
    if (!caseRecord || caseRecord.isDeleted || caseRecord.status === 'closed') continue;
    const date = toDate(`${hearing.date}T${hearing.time || '09:00'}:00`);
    if (!date) continue;
    const isPast = date < now;
    alerts.push({
      id: `hearing-${hearing.hearingId}`,
      kind: isPast ? 'outcome_pending' : 'hearing',
      caseId: hearing.caseId,
      actionId: hearing.actionId,
      title: `#${hearing.caseId} ${caseRecord.title}`,
      subtitle: isPast
        ? 'Hearing outcome not recorded'
        : `Hearing ${formatDate(hearing.date)} at ${hearing.time}`,
      date: hearing.date,
      group: isPast ? 'overdue' : date.toDateString() === now.toDateString() ? 'today' : 'later',
    });
  }

  return alerts.sort((a, b) => a.date.localeCompare(b.date));
}

export async function getAssignees(): Promise<{ id: string; name: string }[]> {
  const actions = await actionsRepository.getAll();
  const map = new Map<string, string>();
  map.set('self', 'Self');
  actions.forEach((action) => {
    if (action.assignedToId && action.assignedToName) {
      map.set(action.assignedToId, action.assignedToName);
    }
    if (action.followUpById && action.followUpByName) {
      map.set(action.followUpById, action.followUpByName);
    }
  });
  return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
}
