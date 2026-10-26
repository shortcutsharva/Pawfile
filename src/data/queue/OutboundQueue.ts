import { getAll, getOne, run } from '@/db/client';
import { getTransport } from '@/data/transport';
import type { QueuedWrite, SheetName } from '@/data/types';
import { nowISO } from '@/utils/date';

export const MAX_RETRIES = 5;

interface QueueRow {
  id: string;
  sheet: string;
  type: string;
  entityId: string;
  payload: string;
  createdAt: string;
  retries: number;
  lastError: string | null;
}

function rowToWrite(row: QueueRow): QueuedWrite {
  return {
    id: row.id,
    sheet: row.sheet as SheetName,
    type: row.type as QueuedWrite['type'],
    entityId: row.entityId,
    payload: row.payload,
    createdAt: row.createdAt,
    retries: row.retries,
    lastError: row.lastError,
  };
}

export const OutboundQueue = {
  async enqueue(
    sheet: SheetName,
    type: QueuedWrite['type'],
    entityId: string,
    entity: unknown,
  ): Promise<void> {
    if (getTransport().mode === 'local') return;
    const id = `${type}-${sheet}-${entityId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await run(
      `INSERT INTO outbound_queue (id, sheet, type, entityId, payload, createdAt, retries, lastError)
       VALUES (?, ?, ?, ?, ?, ?, 0, NULL)`,
      [id, sheet, type, entityId, JSON.stringify(entity), nowISO()],
    );
    notifyQueue();
  },

  async all(): Promise<QueuedWrite[]> {
    const rows = await getAll<QueueRow>('SELECT * FROM outbound_queue ORDER BY createdAt ASC');
    return rows.map(rowToWrite);
  },

  async pending(limit = 50): Promise<QueuedWrite[]> {
    const rows = await getAll<QueueRow>(
      'SELECT * FROM outbound_queue WHERE retries < ? ORDER BY createdAt ASC LIMIT ?',
      [MAX_RETRIES, limit],
    );
    return rows.map(rowToWrite);
  },

  async markSynced(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const placeholders = ids.map(() => '?').join(',');
    await run(`DELETE FROM outbound_queue WHERE id IN (${placeholders})`, ids);
    notifyQueue();
  },

  async markFailed(id: string, error: string): Promise<void> {
    const row = await getOne<QueueRow>('SELECT * FROM outbound_queue WHERE id = ?', [id]);
    if (!row) return;
    await run('UPDATE outbound_queue SET retries = ?, lastError = ? WHERE id = ?', [
      row.retries + 1,
      error.slice(0, 500),
      id,
    ]);
    notifyQueue();
  },

  async remove(id: string): Promise<void> {
    await run('DELETE FROM outbound_queue WHERE id = ?', [id]);
    notifyQueue();
  },

  async removeByEntity(sheet: SheetName, entityId: string): Promise<void> {
    await run('DELETE FROM outbound_queue WHERE sheet = ? AND entityId = ?', [sheet, entityId]);
    notifyQueue();
  },

  async clear(): Promise<void> {
    await run('DELETE FROM outbound_queue');
    notifyQueue();
  },

  async resetRetries(): Promise<void> {
    await run('UPDATE outbound_queue SET retries = 0, lastError = NULL');
    notifyQueue();
  },

  async depth(): Promise<number> {
    const row = await getOne<{ count: number }>('SELECT COUNT(*) as count FROM outbound_queue');
    return row?.count ?? 0;
  },

  async entityIds(): Promise<Set<string>> {
    const rows = await getAll<{ entityId: string }>(
      'SELECT DISTINCT entityId FROM outbound_queue',
    );
    return new Set(rows.map((row) => row.entityId));
  },

  async entityKeys(): Promise<Set<string>> {
    const rows = await getAll<{ sheet: string; entityId: string }>(
      'SELECT sheet, entityId FROM outbound_queue',
    );
    return new Set(rows.map((row) => `${row.sheet}:${row.entityId}`));
  },
};

type Listener = () => void;
const queueListeners = new Set<Listener>();

export function subscribeQueue(listener: Listener): () => void {
  queueListeners.add(listener);
  return () => queueListeners.delete(listener);
}

export function notifyQueue(): void {
  queueListeners.forEach((listener) => listener());
}
