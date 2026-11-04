import type { Db } from '../db';
import { nowISO } from './dates';

const FALLBACK_BAND_START = 900_000;
const FALLBACK_BAND_END = 900_999;
const MIN_CASE_ID = 1000;
const MAX_BLOCK_SIZE = 500;

export function allocateBlock(
  db: Db,
  deviceId: string,
  requestedSize: number,
): { start: number; end: number } {
  const size = Math.min(Math.max(Math.floor(requestedSize) || 50, 1), MAX_BLOCK_SIZE);

  const allocate = db.transaction(() => {
    const stored = db
      .prepare("SELECT value FROM server_state WHERE key = 'nextCaseId'")
      .get() as { value: string } | undefined;

    let next = Number(stored?.value ?? 0);
    if (!Number.isFinite(next) || next <= 0) {
      const row = db
        .prepare(
          `SELECT MAX(CAST(caseId AS INTEGER)) AS maxId
             FROM cases
            WHERE CAST(caseId AS INTEGER) >= ?
              AND CAST(caseId AS INTEGER) < ?
              AND CAST(caseId AS INTEGER) NOT BETWEEN ? AND ?`,
        )
        .get(MIN_CASE_ID, FALLBACK_BAND_START, FALLBACK_BAND_START, FALLBACK_BAND_END) as {
        maxId: number | null;
      };
      next = Math.max(MIN_CASE_ID, (row.maxId ?? 0) + 1);
    }

    const start = next;
    const end = next + size - 1;
    db.prepare(
      `INSERT INTO server_state (key, value, updatedAt) VALUES ('nextCaseId', ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt`,
    ).run(String(end + 1), nowISO());

    return { start, end };
  });

  void deviceId;
  return allocate();
}
