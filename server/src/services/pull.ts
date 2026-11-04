import type { Db } from '../db';
import { SHEETS, type SheetName } from '../tables';

export function pullRows(
  db: Db,
  sheet: SheetName,
  since: string | null | undefined,
): Record<string, unknown>[] {
  const spec = SHEETS[sheet];
  const statements: string[] = [];
  const params: unknown[] = [];

  if (spec.pullExpression && since) {
    const sinceMs = Date.parse(since);
    if (!Number.isNaN(sinceMs)) {
      const overlap = new Date(sinceMs - 2 * 60 * 1000).toISOString();
      statements.push(`WHERE ${spec.pullExpression} >= ?`);
      params.push(overlap);
    }
  }

  const order = spec.pullExpression ? `ORDER BY ${spec.pullExpression} ASC` : '';
  const sql = `SELECT * FROM ${spec.table} ${statements.join(' ')} ${order}`;
  return db.prepare(sql).all(...params) as Record<string, unknown>[];
}
