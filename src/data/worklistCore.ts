import type { Action, Case, DueFilter, Hearing, WorklistItem } from '@/data/types';
import { dueLabel, dueStateFor, overdueDays, toDate } from '@/utils/date';

export interface WorklistFilters {
  search: string;
  status: 'all' | 'to_attend' | 'follow_up' | 'in_progress' | 'closed';
  assignedTo: string;
  due: DueFilter;
}

export const defaultFilters: WorklistFilters = {
  search: '',
  status: 'all',
  assignedTo: 'all',
  due: 'all',
};

export interface WorklistResult {
  rescue: WorklistItem[];
  legal: WorklistItem[];
  total: number;
}

export function openHearingFor(hearings: Hearing[], actionId: string): Hearing | null {
  const open = hearings
    .filter((hearing) => hearing.actionId === actionId && !hearing.outcome && !hearing.isDeleted)
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  return open[0] ?? null;
}

export function dueFor(action: Action, hearing: Hearing | null): string | null {
  if (action.type === 'legal' && hearing) {
    return `${hearing.date}T${hearing.time || '09:00'}:00`;
  }
  return action.followUpDate ?? action.dueValue ?? null;
}

export function buildWorklistItem(
  action: Action,
  caseRecord: Case,
  hearings: Hearing[],
  now = new Date(),
): WorklistItem {
  const hearing = openHearingFor(hearings, action.actionId);
  const due = dueFor(action, hearing);
  const dueState = dueStateFor(due, now);
  return {
    action,
    caseRecord,
    dueState,
    dueLabel: due ? dueLabel(due, now) : 'No due date',
    overdueDays: overdueDays(due, now),
    hasNextAction: Boolean(action.nextAction.trim()),
    hearing,
  };
}

function matchesSearch(item: WorklistItem, search: string): boolean {
  if (!search.trim()) return true;
  const query = search.trim().toLowerCase();
  const { action, caseRecord } = item;
  const values = [
    caseRecord.caseId,
    caseRecord.title,
    caseRecord.animalType,
    caseRecord.complaintCategory,
    caseRecord.locationText,
    caseRecord.district,
    caseRecord.state,
    caseRecord.complainantName,
    caseRecord.complainantPhone,
    action.assignedToName,
    action.followUpByName,
    action.nextAction,
    action.firNumber,
    action.court,
    action.policeStation,
  ];
  return values.some((value) => String(value ?? '').toLowerCase().includes(query));
}

export function filterWorklist(
  items: WorklistItem[],
  filters: WorklistFilters,
  now = new Date(),
): WorklistItem[] {
  return items.filter((item) => {
    if (!matchesSearch(item, filters.search)) return false;
    if (filters.status !== 'all' && item.action.actionStatus !== filters.status) return false;
    if (filters.assignedTo !== 'all') {
      const target = filters.assignedTo;
      if (
        item.action.assignedToId !== target &&
        item.action.assignedToName !== target &&
        item.action.followUpById !== target &&
        item.action.followUpByName !== target
      ) {
        return false;
      }
    }
    if (filters.due !== 'all') {
      if (filters.due === 'overdue' && item.dueState !== 'overdue') return false;
      if (filters.due === 'today' && item.dueState !== 'today') return false;
      if (filters.due === 'upcoming' && item.dueState !== 'upcoming') return false;
      if (filters.due === 'next7') {
        const due = toDate(item.action.dueValue ?? item.action.followUpDate);
        if (!due) return false;
        const diff = due.getTime() - now.getTime();
        if (diff < 0 || diff > 7 * 24 * 60 * 60 * 1000) return false;
      }
    }
    return true;
  });
}

export function sortWorklist(items: WorklistItem[]): WorklistItem[] {
  return [...items].sort((a, b) => {
    if (a.dueState === 'overdue' && b.dueState !== 'overdue') return -1;
    if (b.dueState === 'overdue' && a.dueState !== 'overdue') return 1;
    const aDue = toDate(a.action.dueValue ?? a.action.followUpDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bDue = toDate(b.action.dueValue ?? b.action.followUpDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    if (aDue !== bDue) return aDue - bDue;
    const aHearing = a.hearing ? `${a.hearing.date}T${a.hearing.time}` : '';
    const bHearing = b.hearing ? `${b.hearing.date}T${b.hearing.time}` : '';
    return aHearing.localeCompare(bHearing);
  });
}
