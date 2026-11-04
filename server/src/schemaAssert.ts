import type { Db } from './db';

const REQUIRED_TABLES = [
  'cases',
  'actions',
  'hearings',
  'contacts',
  'documents',
  'history',
  'sync_metadata',
  'config',
  'server_state',
  'media_files',
];

const SYNC_COLUMNS = [
  'createdAt',
  'updatedAt',
  'syncedAt',
  'localVersion',
  'serverVersion',
  'isDeleted',
];

function tableColumns(db: Db, table: string): Set<string> {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return new Set(rows.map((row) => row.name));
}

export function assertSchema(db: Db): void {
  const tables = new Set(
    (
      db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all() as { name: string }[]
    ).map((row) => row.name),
  );

  for (const table of REQUIRED_TABLES) {
    if (!tables.has(table)) {
      throw new Error(`Schema drift: missing table "${table}".`);
    }
  }

  for (const table of ['cases', 'actions', 'hearings', 'contacts', 'documents']) {
    const columns = tableColumns(db, table);
    for (const column of SYNC_COLUMNS) {
      if (!columns.has(column)) {
        throw new Error(`Schema drift: "${table}" is missing column "${column}".`);
      }
    }
  }

  const historyColumns = tableColumns(db, 'history');
  for (const column of ['createdAt', 'syncedAt']) {
    if (!historyColumns.has(column)) {
      throw new Error(`Schema drift: "history" is missing column "${column}".`);
    }
  }

  const mediaColumns = tableColumns(db, 'media_files');
  for (const column of ['fileId', 'storedPath', 'mimeType', 'fileName']) {
    if (!mediaColumns.has(column)) {
      throw new Error(`Schema drift: "media_files" is missing column "${column}".`);
    }
  }
}
