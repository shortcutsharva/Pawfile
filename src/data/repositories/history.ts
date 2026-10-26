import * as Crypto from 'expo-crypto';
import { getAll, getOne, run } from '@/db/client';
import { OutboundQueue } from '@/data/queue/OutboundQueue';
import { notifyTable, bool } from '@/data/repository';
import { getSettings, shortDeviceId } from '@/data/settings';
import type { HistoryEntry, HistoryEventType, SheetName } from '@/data/types';
import { nowISO } from '@/utils/date';

const SHEET: SheetName = 'History';

interface HistoryRow {
  historyId: string;
  caseId: string;
  actionId: string;
  eventType: string;
  actorName: string;
  actorDeviceId: string;
  oldValue: string;
  newValue: string;
  description: string;
  metadata: string;
  isConflict: number;
  createdAt: string;
  syncedAt: string | null;
}

function rowToEntity(row: HistoryRow): HistoryEntry {
  return {
    historyId: row.historyId,
    caseId: row.caseId ?? '',
    actionId: row.actionId ?? '',
    eventType: row.eventType as HistoryEventType,
    actorName: row.actorName ?? '',
    actorDeviceId: row.actorDeviceId ?? '',
    oldValue: row.oldValue ?? '',
    newValue: row.newValue ?? '',
    description: row.description ?? '',
    metadata: row.metadata ?? '',
    isConflict: bool(row.isConflict),
    createdAt: row.createdAt,
    syncedAt: row.syncedAt,
  };
}

export interface LogHistoryInput {
  caseId: string;
  actionId?: string;
  eventType: HistoryEventType;
  description: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
  isConflict?: boolean;
}

export const historyRepository = {
  async listByCase(caseId: string): Promise<HistoryEntry[]> {
    const rows = await getAll<HistoryRow>(
      'SELECT * FROM history WHERE caseId = ? ORDER BY createdAt DESC',
      [caseId],
    );
    return rows.map(rowToEntity);
  },

  async getAll(): Promise<HistoryEntry[]> {
    const rows = await getAll<HistoryRow>('SELECT * FROM history ORDER BY createdAt DESC');
    return rows.map(rowToEntity);
  },

  async getById(id: string): Promise<HistoryEntry | null> {
    const row = await getOne<HistoryRow>('SELECT * FROM history WHERE historyId = ?', [id]);
    return row ? rowToEntity(row) : null;
  },

  async getIds(): Promise<Set<string>> {
    const rows = await getAll<{ historyId: string }>('SELECT historyId FROM history');
    return new Set(rows.map((row) => row.historyId));
  },

  async markSynced(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const placeholders = ids.map(() => '?').join(',');
    await run(`UPDATE history SET syncedAt = ? WHERE historyId IN (${placeholders})`, [
      nowISO(),
      ...ids,
    ]);
    notifyTable('history');
  },

  async insert(entry: HistoryEntry, queue = true): Promise<HistoryEntry> {
    await run(
      `INSERT OR REPLACE INTO history
       (historyId, caseId, actionId, eventType, actorName, actorDeviceId, oldValue, newValue, description, metadata, isConflict, createdAt, syncedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.historyId,
        entry.caseId,
        entry.actionId,
        entry.eventType,
        entry.actorName,
        entry.actorDeviceId,
        entry.oldValue,
        entry.newValue,
        entry.description,
        entry.metadata,
        entry.isConflict ? 1 : 0,
        entry.createdAt,
        entry.syncedAt,
      ],
    );
    if (queue) {
      await OutboundQueue.enqueue(SHEET, 'create', entry.historyId, entry);
    }
    notifyTable('history');
    return entry;
  },
};

export async function logHistory(input: LogHistoryInput): Promise<HistoryEntry> {
  const settings = getSettings();
  const now = nowISO();
  const entry: HistoryEntry = {
    historyId: `HST-${shortDeviceId(settings.deviceId)}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`,
    caseId: input.caseId,
    actionId: input.actionId ?? '',
    eventType: input.eventType,
    actorName: settings.actorName || 'Activist',
    actorDeviceId: settings.deviceId,
    oldValue: input.oldValue === undefined ? '' : JSON.stringify(input.oldValue),
    newValue: input.newValue === undefined ? '' : JSON.stringify(input.newValue),
    description: input.description,
    metadata: input.metadata === undefined ? '' : JSON.stringify(input.metadata),
    isConflict: input.isConflict ?? false,
    createdAt: now,
    syncedAt: null,
  };
  return historyRepository.insert(entry);
}

export function newHistoryId(prefix = 'HST'): string {
  return `${prefix}-${Crypto.randomUUID()}`;
}
