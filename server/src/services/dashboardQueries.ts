import type { Db } from '../db';
import { createFileToken } from '../auth';
import {
  addDaysToKey,
  currentMonthKey,
  isOverdue,
  istDateKey,
  nextDueValue,
} from './dates';

type Row = Record<string, unknown>;

const STATUS_LABELS: Record<string, string> = {
  to_attend: 'To attend',
  follow_up: 'Follow-up',
  in_progress: 'In progress',
  closed: 'Closed',
};

function truncate(value: unknown, max = 500): string {
  const text = value === null || value === undefined ? '' : String(value);
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function mintFileUrl(secret: string, fileId: unknown): string | null {
  if (typeof fileId !== 'string' || !fileId) return null;
  return `/api/files/${fileId}?token=${createFileToken(secret, fileId)}`;
}

function timestampKey(value: unknown): string {
  if (typeof value !== 'string' || !value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value.slice(0, 10) : istDateKey(parsed);
}

function openHearing(hearings: Row[]): Row | null {
  const open = hearings
    .filter((hearing) => !hearing.outcome && hearing.status !== 'outcome_recorded')
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  return open[0] ?? null;
}

function caseSummary(caseRow: Row, actions: Row[], hearings: Row[]): Row {
  const openActions = actions.filter((action) => !action.isClosed);
  const hearing = openHearing(hearings);
  return {
    caseId: caseRow.caseId,
    title: caseRow.title,
    animalType: caseRow.animalType,
    complaintCategory: caseRow.complaintCategory,
    state: caseRow.state,
    district: caseRow.district,
    urgency: caseRow.urgency,
    status: caseRow.status,
    rescueStatus: caseRow.rescueStatus,
    legalStatus: caseRow.legalStatus,
    complainantName: caseRow.complainantName,
    complainantPhone: caseRow.complainantPhone,
    createdAt: caseRow.createdAt,
    updatedAt: caseRow.updatedAt,
    openActions: openActions.length,
    overdueActions: openActions.filter((action) => isOverdue(action)).length,
    nextDue: nextDueValue(openActions),
    nextHearing: hearing
      ? { date: hearing.date, time: hearing.time, court: hearing.court }
      : null,
  };
}

function groupByKey(rows: Row[], key: string): Map<string, Row[]> {
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const value = String(row[key] ?? '');
    const list = groups.get(value) ?? [];
    list.push(row);
    groups.set(value, list);
  }
  return groups;
}

export function getSummary(db: Db, secret: string): Row {
  const cases = db.prepare('SELECT * FROM cases WHERE isDeleted = 0').all() as Row[];
  const caseIds = new Set(cases.map((row) => String(row.caseId)));
  const actions = (
    db.prepare('SELECT * FROM actions WHERE isDeleted = 0').all() as Row[]
  ).filter((row) => caseIds.has(String(row.caseId)));
  const hearings = (
    db.prepare('SELECT * FROM hearings WHERE isDeleted = 0').all() as Row[]
  ).filter((row) => caseIds.has(String(row.caseId)));
  const contactCount = db
    .prepare('SELECT COUNT(*) AS count FROM contacts WHERE isDeleted = 0')
    .get() as { count: number };

  const openCases = cases.filter((row) => row.status === 'open');
  const openActions = actions.filter((row) => !row.isClosed);
  const overdueActions = openActions.filter((row) => isOverdue(row));
  const today = istDateKey();
  const weekEnd = addDaysToKey(today, 7);
  const upcomingHearings = hearings
    .filter(
      (row) =>
        !row.outcome &&
        row.status !== 'outcome_recorded' &&
        String(row.date) >= today &&
        String(row.date) <= weekEnd,
    )
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));

  const monthKey = currentMonthKey();
  const rescuedThisMonth = actions.filter(
    (row) =>
      row.type === 'rescue' &&
      row.rescueStatus === 'rescued' &&
      timestampKey(row.closedAt ?? row.updatedAt).slice(0, 7) === monthKey,
  ).length;

  const byStatus = Object.entries(
    openActions.reduce<Record<string, number>>((counts, row) => {
      const key = String(row.actionStatus ?? 'unknown');
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {}),
  ).map(([key, count]) => ({ label: STATUS_LABELS[key] ?? key, count }));

  const byCategory = Object.entries(
    cases.reduce<Record<string, number>>((counts, row) => {
      const key = String(row.complaintCategory || 'Unspecified');
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {}),
  )
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  const byUrgency = Object.entries(
    openCases.reduce<Record<string, number>>((counts, row) => {
      const key = String(row.urgency || 'Medium');
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {}),
  ).map(([label, count]) => ({ label, count }));

  const months: string[] = [];
  const now = new Date();
  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
    months.push(date.toISOString().slice(0, 7));
  }
  const monthly = months.map((month) => ({
    month,
    count: cases.filter((row) => timestampKey(row.createdAt).slice(0, 7) === month).length,
  }));

  const caseById = new Map(cases.map((row) => [String(row.caseId), row]));
  const recentActivity = (
    db.prepare('SELECT * FROM history ORDER BY createdAt DESC LIMIT 10').all() as Row[]
  ).map((row) => ({
    historyId: row.historyId,
    caseId: row.caseId,
    caseTitle: caseById.get(String(row.caseId))?.title ?? '',
    eventType: row.eventType,
    description: truncate(row.description, 240),
    actorName: row.actorName,
    isConflict: Boolean(row.isConflict),
    createdAt: row.createdAt,
  }));

  return {
    totals: {
      cases: cases.length,
      openCases: openCases.length,
      closedCases: cases.length - openCases.length,
      highUrgency: openCases.filter((row) => row.urgency === 'High').length,
      openActions: openActions.length,
      overdueActions: overdueActions.length,
      hearingsNext7Days: upcomingHearings.length,
      rescuedThisMonth,
      contacts: contactCount.count,
    },
    byStatus,
    byCategory,
    byUrgency,
    monthly,
    recentCases: [...cases]
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
      .slice(0, 8)
      .map((row) =>
        caseSummary(
          row,
          actions.filter((action) => action.caseId === row.caseId),
          hearings.filter((hearing) => hearing.caseId === row.caseId),
        ),
      ),
    upcomingHearings: upcomingHearings.slice(0, 8).map((row) => ({
      ...row,
      caseTitle: caseById.get(String(row.caseId))?.title ?? '',
    })),
    recentActivity,
  };
}

export interface CaseListParams {
  search?: string;
  status?: string;
  urgency?: string;
  rescueStatus?: string;
  legalStatus?: string;
  page?: number;
  pageSize?: number;
}

export function listCases(db: Db, params: CaseListParams): Row {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(params.pageSize ?? 25)));
  const where: string[] = ['c.isDeleted = 0'];
  const values: unknown[] = [];

  if (params.search?.trim()) {
    const search = `%${params.search.trim()}%`;
    where.push(
      '(c.caseId LIKE ? OR c.title LIKE ? OR c.complainantName LIKE ? OR c.complainantPhone LIKE ? OR c.district LIKE ? OR c.state LIKE ?)',
    );
    values.push(search, search, search, search, search, search);
  }
  if (params.status) {
    where.push('c.status = ?');
    values.push(params.status);
  }
  if (params.urgency) {
    where.push('c.urgency = ?');
    values.push(params.urgency);
  }
  if (params.rescueStatus) {
    where.push('c.rescueStatus = ?');
    values.push(params.rescueStatus);
  }
  if (params.legalStatus) {
    where.push('c.legalStatus = ?');
    values.push(params.legalStatus);
  }

  const whereSql = where.join(' AND ');
  const total = (
    db.prepare(`SELECT COUNT(*) AS count FROM cases c WHERE ${whereSql}`).get(...values) as {
      count: number;
    }
  ).count;
  const rows = db
    .prepare(
      `SELECT c.* FROM cases c WHERE ${whereSql} ORDER BY c.updatedAt DESC LIMIT ? OFFSET ?`,
    )
    .all(...values, pageSize, (page - 1) * pageSize) as Row[];

  if (!rows.length) return { items: [], total, page, pageSize };
  const caseIds = rows.map((row) => String(row.caseId));
  const placeholders = caseIds.map(() => '?').join(', ');
  const actions = db
    .prepare(`SELECT * FROM actions WHERE isDeleted = 0 AND caseId IN (${placeholders})`)
    .all(...caseIds) as Row[];
  const hearings = db
    .prepare(`SELECT * FROM hearings WHERE isDeleted = 0 AND caseId IN (${placeholders})`)
    .all(...caseIds) as Row[];
  const actionsByCase = groupByKey(actions, 'caseId');
  const hearingsByCase = groupByKey(hearings, 'caseId');

  return {
    items: rows.map((row) =>
      caseSummary(
        row,
        actionsByCase.get(String(row.caseId)) ?? [],
        hearingsByCase.get(String(row.caseId)) ?? [],
      ),
    ),
    total,
    page,
    pageSize,
  };
}

export function getCaseDetail(db: Db, caseId: string, secret: string): Row | null {
  const caseRow = db
    .prepare('SELECT * FROM cases WHERE caseId = ? AND isDeleted = 0')
    .get(caseId) as Row | undefined;
  if (!caseRow) return null;

  const actions = db
    .prepare('SELECT * FROM actions WHERE caseId = ? AND isDeleted = 0 ORDER BY createdAt DESC')
    .all(caseId) as Row[];
  const hearings = db
    .prepare(
      'SELECT * FROM hearings WHERE caseId = ? AND isDeleted = 0 ORDER BY date ASC, time ASC',
    )
    .all(caseId) as Row[];
  const documents = (
    db
      .prepare(
        `SELECT d.*, m.fileId AS mediaFileId
           FROM documents d
           LEFT JOIN media_files m ON m.fileId = d.driveFileId
          WHERE d.caseId = ? AND d.isDeleted = 0
          ORDER BY d.createdAt DESC`,
      )
      .all(caseId) as Row[]
  ).map((row) => ({
    documentId: row.documentId,
    caseId: row.caseId,
    actionId: row.actionId,
    category: row.category,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    uploadStatus: row.uploadStatus,
    uploadError: row.uploadError,
    createdAt: row.createdAt,
    url: mintFileUrl(secret, row.mediaFileId),
  }));
  const history = (
    db
      .prepare('SELECT * FROM history WHERE caseId = ? ORDER BY createdAt DESC LIMIT 200')
      .all(caseId) as Row[]
  ).map((row) => ({
    historyId: row.historyId,
    caseId: row.caseId,
    actionId: row.actionId,
    eventType: row.eventType,
    actorName: row.actorName,
    description: truncate(row.description, 500),
    oldValue: truncate(row.oldValue, 500),
    newValue: truncate(row.newValue, 500),
    metadata: truncate(row.metadata, 500),
    isConflict: Boolean(row.isConflict),
    createdAt: row.createdAt,
  }));

  return { case: caseRow, actions, hearings, documents, history };
}

export function listContacts(db: Db, params: { search?: string; type?: string; state?: string }): Row[] {
  const where: string[] = ['isDeleted = 0'];
  const values: unknown[] = [];
  if (params.search?.trim()) {
    const search = `%${params.search.trim()}%`;
    where.push('(name LIKE ? OR organization LIKE ? OR phone LIKE ? OR phone2 LIKE ? OR email LIKE ? OR district LIKE ? OR state LIKE ?)');
    values.push(search, search, search, search, search, search, search);
  }
  if (params.type) {
    where.push('type = ?');
    values.push(params.type);
  }
  if (params.state) {
    where.push('state = ?');
    values.push(params.state);
  }
  return db
    .prepare(`SELECT * FROM contacts WHERE ${where.join(' AND ')} ORDER BY name ASC LIMIT 500`)
    .all(...values) as Row[];
}

export function listHearings(
  db: Db,
  params: { from?: string; to?: string; status?: string },
): Row[] {
  const where: string[] = ['h.isDeleted = 0', 'c.isDeleted = 0'];
  const values: unknown[] = [];
  if (params.from) {
    where.push('h.date >= ?');
    values.push(params.from);
  }
  if (params.to) {
    where.push('h.date <= ?');
    values.push(params.to);
  }
  if (params.status) {
    where.push('h.status = ?');
    values.push(params.status);
  }
  return db
    .prepare(
      `SELECT h.*, c.title AS caseTitle
         FROM hearings h
         JOIN cases c ON c.caseId = h.caseId
        WHERE ${where.join(' AND ')}
        ORDER BY h.date ASC, h.time ASC
        LIMIT 500`,
    )
    .all(...values) as Row[];
}

export function listDocuments(
  db: Db,
  params: { caseId?: string; category?: string },
  secret: string,
): Row[] {
  const where: string[] = ['d.isDeleted = 0', 'c.isDeleted = 0'];
  const values: unknown[] = [];
  if (params.caseId) {
    where.push('d.caseId = ?');
    values.push(params.caseId);
  }
  if (params.category) {
    where.push('d.category = ?');
    values.push(params.category);
  }
  return (
    db
      .prepare(
        `SELECT d.*, m.fileId AS mediaFileId, c.title AS caseTitle
           FROM documents d
           JOIN cases c ON c.caseId = d.caseId
           LEFT JOIN media_files m ON m.fileId = d.driveFileId
          WHERE ${where.join(' AND ')}
          ORDER BY d.createdAt DESC
          LIMIT 500`,
      )
      .all(...values) as Row[]
  ).map((row) => ({
    documentId: row.documentId,
    caseId: row.caseId,
    caseTitle: row.caseTitle,
    category: row.category,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    uploadStatus: row.uploadStatus,
    createdAt: row.createdAt,
    url: mintFileUrl(secret, row.mediaFileId),
  }));
}

export function listActivity(db: Db, params: { page?: number; pageSize?: number }): Row {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(params.pageSize ?? 50)));
  const total = (db.prepare('SELECT COUNT(*) AS count FROM history').get() as { count: number })
    .count;
  const rows = db
    .prepare(
      `SELECT h.*, c.title AS caseTitle
         FROM history h
         LEFT JOIN cases c ON c.caseId = h.caseId AND c.isDeleted = 0
        ORDER BY h.createdAt DESC
        LIMIT ? OFFSET ?`,
    )
    .all(pageSize, (page - 1) * pageSize) as Row[];
  return {
    items: rows.map((row) => ({
      historyId: row.historyId,
      caseId: row.caseId,
      caseTitle: row.caseTitle ?? '',
      actionId: row.actionId,
      eventType: row.eventType,
      actorName: row.actorName,
      description: truncate(row.description, 500),
      oldValue: truncate(row.oldValue, 500),
      newValue: truncate(row.newValue, 500),
      metadata: truncate(row.metadata, 500),
      isConflict: Boolean(row.isConflict),
      createdAt: row.createdAt,
    })),
    total,
    page,
    pageSize,
  };
}
