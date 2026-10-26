import {
  buildWorklistItem,
  filterWorklist,
  sortWorklist,
  defaultFilters,
} from '@/data/worklistCore';
import { makeAction, makeCase, makeHearing } from '@/data/__tests__/fixtures';

const now = new Date('2026-10-14T12:00:00.000Z');

function item(overrides: Parameters<typeof makeAction>[0] = {}, caseOverrides = {}) {
  const action = makeAction(overrides);
  const caseRecord = makeCase({ caseId: action.caseId, ...caseOverrides });
  return buildWorklistItem(action, caseRecord, [], now);
}

describe('worklist', () => {
  it('computes the due value from the legal action next hearing', () => {
    const action = makeAction({
      type: 'legal',
      actionId: 'ACT-1042-legal',
      actionStatus: 'in_progress',
      rescueStatus: 'na',
      legalStatus: 'hearing_scheduled',
      followUpDate: '2026-10-20T10:00:00.000Z',
    });
    const hearing = makeHearing({ actionId: action.actionId, date: '2026-10-16', time: '11:00' });
    const built = buildWorklistItem(action, makeCase(), [hearing], now);
    expect(built.hearing?.hearingId).toBe(hearing.hearingId);
    expect(built.dueState).toBe('upcoming');
    expect(built.dueLabel).toContain('16 Oct');
  });

  it('filters by status, assignee, due state, and search', () => {
    const overdue = item({ followUpDate: '2026-10-10T10:00:00.000Z', dueValue: '2026-10-10T10:00:00.000Z' });
    const today = item(
      { actionId: 'ACT-1040-rescue', caseId: '1040', assignedToId: 'CNT-1', assignedToName: 'Rescue Team A' },
      { caseId: '1040', title: 'Cattle cruelty', district: 'Hassan' },
    );
    today.action.dueValue = '2026-10-14T15:00:00.000Z';
    today.dueState = 'today';
    today.dueLabel = 'Due today';
    const items = [overdue, today];

    expect(filterWorklist(items, { ...defaultFilters, due: 'overdue' }, now)).toHaveLength(1);
    expect(filterWorklist(items, { ...defaultFilters, assignedTo: 'CNT-1' }, now)).toHaveLength(1);
    expect(filterWorklist(items, { ...defaultFilters, search: 'hassan' }, now)).toHaveLength(1);
    expect(filterWorklist(items, { ...defaultFilters, search: 'missing' }, now)).toHaveLength(0);
  });

  it('sorts overdue actions first, then due date', () => {
    const overdue = item({
      actionId: 'ACT-1-rescue',
      followUpDate: '2026-10-10T10:00:00.000Z',
      dueValue: '2026-10-10T10:00:00.000Z',
    });
    const later = item({
      actionId: 'ACT-2-rescue',
      caseId: '1043',
      followUpDate: '2026-10-20T10:00:00.000Z',
      dueValue: '2026-10-20T10:00:00.000Z',
    });
    const soon = item({
      actionId: 'ACT-3-rescue',
      caseId: '1044',
      followUpDate: '2026-10-15T10:00:00.000Z',
      dueValue: '2026-10-15T10:00:00.000Z',
    });
    const sorted = sortWorklist([later, soon, overdue]);
    expect(sorted.map((entry) => entry.action.actionId)).toEqual([
      'ACT-1-rescue',
      'ACT-3-rescue',
      'ACT-2-rescue',
    ]);
  });

  it('flags an action with no next action', () => {
    const built = item({ nextAction: '' });
    expect(built.hasNextAction).toBe(false);
  });
});
