import { addDays, isWithinInterval, startOfDay, startOfMonth, subMonths } from 'date-fns';
import { actionsRepository } from '@/data/repositories/actions';
import { casesRepository } from '@/data/repositories/cases';
import { hearingsRepository } from '@/data/repositories/hearings';
import type { Action, Case, Hearing } from '@/data/types';
import { toDate } from '@/utils/date';

export interface ReportSummary {
  openActions: number;
  overdue: number;
  hearingsThisWeek: number;
  rescuedThisMonth: number;
  byStatus: { label: string; count: number }[];
  recentlyConcluded: Case[];
  cases: Case[];
  actions: Action[];
  hearings: Hearing[];
}

export async function getReportSummary(): Promise<ReportSummary> {
  const [cases, actions, hearings] = await Promise.all([
    casesRepository.getAll(),
    actionsRepository.getAll(),
    hearingsRepository.getAll(),
  ]);
  const now = new Date();
  const weekEnd = addDays(startOfDay(now), 7);
  const monthStart = startOfMonth(subMonths(now, 0));
  const openActions = actions.filter((action) => !action.isClosed && !action.isDeleted);
  const overdue = openActions.filter((action) => {
    const due = toDate(action.dueValue ?? action.followUpDate);
    return due ? due < now : false;
  }).length;
  const hearingsThisWeek = hearings.filter((hearing) => {
    if (hearing.outcome || hearing.isDeleted) return false;
    const date = toDate(`${hearing.date}T${hearing.time || '09:00'}:00`);
    return date ? isWithinInterval(date, { start: startOfDay(now), end: weekEnd }) : false;
  }).length;
  const rescuedThisMonth = actions.filter((action) => {
    if (action.type !== 'rescue' || action.rescueStatus !== 'rescued') return false;
    const closed = toDate(action.closedAt ?? action.updatedAt);
    return closed ? closed >= monthStart : false;
  }).length;

  const statusGroups: Record<string, number> = {};
  openActions.forEach((action) => {
    statusGroups[action.actionStatus] = (statusGroups[action.actionStatus] ?? 0) + 1;
  });
  const labels: Record<string, string> = {
    to_attend: 'To attend',
    follow_up: 'Follow-up',
    in_progress: 'In progress',
    closed: 'Closed',
  };

  return {
    openActions: openActions.length,
    overdue,
    hearingsThisWeek,
    rescuedThisMonth,
    byStatus: Object.entries(statusGroups).map(([key, count]) => ({
      label: labels[key] ?? key,
      count,
    })),
    recentlyConcluded: cases
      .filter((caseRecord) => caseRecord.status === 'closed')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 10),
    cases,
    actions,
    hearings,
  };
}
