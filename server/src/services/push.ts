import type { Db } from '../db';
import { SHEETS, tableColumns, type SheetName } from '../tables';
import { nowISO } from './dates';

export interface PushFailure {
  id: string;
  error: string;
}

export interface PushResult {
  succeeded: string[];
  failed: PushFailure[];
  versions: { id: string; serverVersion: number }[];
}

type Row = Record<string, unknown>;

function bind(value: unknown): unknown {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value !== null && typeof value === 'object') return JSON.stringify(value);
  return value;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'Push failed';
}

export function pushRows(db: Db, sheet: SheetName, rows: Row[]): PushResult {
  const spec = SHEETS[sheet];
  const columns = new Set(tableColumns(db, spec.table));
  const now = nowISO();
  const succeeded: string[] = [];
  const failed: PushFailure[] = [];
  const versions: { id: string; serverVersion: number }[] = [];

  const runBatch = db.transaction((batch: Row[]) => {
    for (const row of batch) {
      const rawId = row[spec.pk];
      const id = rawId === undefined || rawId === null ? '' : String(rawId);
      try {
        if (!id) throw new Error(`Missing ${spec.pk}`);
        if (spec.requiresCreatedAt && !row.createdAt) throw new Error('Missing createdAt');
        if (spec.requiresUpdatedAt && !row.updatedAt) throw new Error('Missing updatedAt');

        const values: Row = {};
        for (const [key, value] of Object.entries(row)) {
          if (value === undefined) continue;
          if (!columns.has(key)) continue;
          values[key] = bind(value);
        }
        values[spec.pk] = id;

        if (spec.hasSyncColumns) {
          const existing = db
            .prepare(`SELECT serverVersion FROM ${spec.table} WHERE ${spec.pk} = ?`)
            .get(id) as { serverVersion?: number } | undefined;
          const clientVersion = Number.isFinite(Number(row.serverVersion))
            ? Number(row.serverVersion)
            : 0;
          const serverVersion = Math.max(existing?.serverVersion ?? 0, clientVersion) + 1;
          values.syncedAt = now;
          values.serverVersion = serverVersion;
          versions.push({ id, serverVersion });
        } else if (sheet === 'History') {
          values.syncedAt = now;
        } else if (sheet === 'SyncMetadata') {
          values.updatedAt = now;
        }

        const columnNames = Object.keys(values);
        const placeholders = columnNames.map(() => '?').join(', ');
        const assign = columnNames
          .filter((column) => column !== spec.pk)
          .map((column) => `${column} = excluded.${column}`)
          .join(', ');

        if (sheet === 'History') {
          db.prepare(
            `INSERT INTO ${spec.table} (${columnNames.join(', ')}) VALUES (${placeholders}) ON CONFLICT(${spec.pk}) DO NOTHING`,
          ).run(...columnNames.map((column) => values[column]));
        } else {
          const updateClause = assign ? `DO UPDATE SET ${assign}` : 'DO NOTHING';
          db.prepare(
            `INSERT INTO ${spec.table} (${columnNames.join(', ')}) VALUES (${placeholders}) ON CONFLICT(${spec.pk}) ${updateClause}`,
          ).run(...columnNames.map((column) => values[column]));
        }

        succeeded.push(id);
      } catch (error) {
        failed.push({ id, error: message(error) });
      }
    }
  });

  runBatch(rows);
  return { succeeded, failed, versions };
}
