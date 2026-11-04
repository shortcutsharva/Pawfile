import type { Db } from './db';

export const SHEET_NAMES = [
  'Cases',
  'Actions',
  'Hearings',
  'Contacts',
  'Documents',
  'History',
  'SyncMetadata',
  'Config',
] as const;

export type SheetName = (typeof SHEET_NAMES)[number];

export interface TableSpec {
  table: string;
  pk: string;
  hasSyncColumns: boolean;
  pullExpression: string | null;
  requiresCreatedAt: boolean;
  requiresUpdatedAt: boolean;
}

export const SHEETS: Record<SheetName, TableSpec> = {
  Cases: {
    table: 'cases',
    pk: 'caseId',
    hasSyncColumns: true,
    pullExpression: 'COALESCE(syncedAt, updatedAt, createdAt)',
    requiresCreatedAt: true,
    requiresUpdatedAt: true,
  },
  Actions: {
    table: 'actions',
    pk: 'actionId',
    hasSyncColumns: true,
    pullExpression: 'COALESCE(syncedAt, updatedAt, createdAt)',
    requiresCreatedAt: true,
    requiresUpdatedAt: true,
  },
  Hearings: {
    table: 'hearings',
    pk: 'hearingId',
    hasSyncColumns: true,
    pullExpression: 'COALESCE(syncedAt, updatedAt, createdAt)',
    requiresCreatedAt: true,
    requiresUpdatedAt: true,
  },
  Contacts: {
    table: 'contacts',
    pk: 'contactId',
    hasSyncColumns: true,
    pullExpression: 'COALESCE(syncedAt, updatedAt, createdAt)',
    requiresCreatedAt: true,
    requiresUpdatedAt: true,
  },
  Documents: {
    table: 'documents',
    pk: 'documentId',
    hasSyncColumns: true,
    pullExpression: 'COALESCE(syncedAt, updatedAt, createdAt)',
    requiresCreatedAt: true,
    requiresUpdatedAt: true,
  },
  History: {
    table: 'history',
    pk: 'historyId',
    hasSyncColumns: false,
    pullExpression: 'syncedAt',
    requiresCreatedAt: true,
    requiresUpdatedAt: false,
  },
  SyncMetadata: {
    table: 'sync_metadata',
    pk: 'key',
    hasSyncColumns: false,
    pullExpression: 'updatedAt',
    requiresCreatedAt: false,
    requiresUpdatedAt: true,
  },
  Config: {
    table: 'config',
    pk: 'key',
    hasSyncColumns: false,
    pullExpression: null,
    requiresCreatedAt: false,
    requiresUpdatedAt: false,
  },
};

export function isSheetName(value: string): value is SheetName {
  return (SHEET_NAMES as readonly string[]).includes(value);
}

const columnCache = new Map<string, string[]>();

export function tableColumns(db: Db, table: string): string[] {
  const cached = columnCache.get(table);
  if (cached) return cached;
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  const columns = rows.map((row) => row.name);
  columnCache.set(table, columns);
  return columns;
}

export function clearColumnCache(): void {
  columnCache.clear();
}
