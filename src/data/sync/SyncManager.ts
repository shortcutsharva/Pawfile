import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { actionsRepository } from '@/data/repositories/actions';
import { casesRepository } from '@/data/repositories/cases';
import { contactsRepository } from '@/data/repositories/contacts';
import { documentsRepository } from '@/data/repositories/documents';
import { hearingsRepository } from '@/data/repositories/hearings';
import { historyRepository } from '@/data/repositories/history';
import { OutboundQueue } from '@/data/queue/OutboundQueue';
import { getSettings, updateSettings } from '@/data/settings';
import { getTransport } from '@/data/transport';
import type { RemoteRow } from '@/data/transport/SyncTransport';
import type { HistoryEntry, SheetName, SyncEntity } from '@/data/types';
import { logHistory } from '@/data/repositories/history';
import { refreshHearingStatuses } from '@/data/services/hearingService';
import { uploadPendingDocuments } from '@/services/uploads';
import { nowISO } from '@/utils/date';

export interface SyncSummary {
  status: 'success' | 'error' | 'busy';
  pushed: number;
  pulled: number;
  conflicts: number;
  error?: string;
}

export interface SyncState {
  syncing: boolean;
  lastSyncAt: string | null;
  queueDepth: number;
  online: boolean;
  error: string | null;
  mode: 'local' | 'remote';
}

const state: SyncState = {
  syncing: false,
  lastSyncAt: null,
  queueDepth: 0,
  online: true,
  error: null,
  mode: getTransport().mode,
};

const listeners = new Set<(state: SyncState) => void>();

function emit(patch: Partial<SyncState> = {}): void {
  Object.assign(state, patch);
  listeners.forEach((listener) => listener({ ...state }));
}

export function getSyncState(): SyncState {
  return { ...state };
}

export function subscribeSync(listener: (state: SyncState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

interface RemoteAdapter {
  sheet: SheetName;
  idField: string;
  getAll(includeDeleted?: boolean): Promise<(SyncEntity & Record<string, unknown>)[]>;
  getById(id: string): Promise<(SyncEntity & Record<string, unknown>) | null>;
  fromRow(row: RemoteRow): SyncEntity & Record<string, unknown>;
  applyRemoteRow(row: RemoteRow): Promise<unknown>;
  markSynced(id: string, version: number): Promise<void>;
}

const adapters: RemoteAdapter[] = [
  {
    sheet: 'Cases',
    idField: 'caseId',
    getAll: (includeDeleted) =>
      casesRepository.getAll(includeDeleted) as unknown as Promise<
        (SyncEntity & Record<string, unknown>)[]
      >,
    getById: (id) => casesRepository.getById(id) as unknown as Promise<
      (SyncEntity & Record<string, unknown>) | null
    >,
    fromRow: (row) => casesRepository.fromRow(row) as unknown as SyncEntity & Record<string, unknown>,
    applyRemoteRow: (row) => casesRepository.applyRemoteRow(row),
    markSynced: (id, version) => casesRepository.markSynced(id, version),
  },
  {
    sheet: 'Actions',
    idField: 'actionId',
    getAll: (includeDeleted) =>
      actionsRepository.getAll(includeDeleted) as unknown as Promise<
        (SyncEntity & Record<string, unknown>)[]
      >,
    getById: (id) => actionsRepository.getById(id) as unknown as Promise<
      (SyncEntity & Record<string, unknown>) | null
    >,
    fromRow: (row) => actionsRepository.fromRow(row) as unknown as SyncEntity & Record<string, unknown>,
    applyRemoteRow: (row) => actionsRepository.applyRemoteRow(row),
    markSynced: (id, version) => actionsRepository.markSynced(id, version),
  },
  {
    sheet: 'Hearings',
    idField: 'hearingId',
    getAll: (includeDeleted) =>
      hearingsRepository.getAll(includeDeleted) as unknown as Promise<
        (SyncEntity & Record<string, unknown>)[]
      >,
    getById: (id) => hearingsRepository.getById(id) as unknown as Promise<
      (SyncEntity & Record<string, unknown>) | null
    >,
    fromRow: (row) => hearingsRepository.fromRow(row) as unknown as SyncEntity & Record<string, unknown>,
    applyRemoteRow: (row) => hearingsRepository.applyRemoteRow(row),
    markSynced: (id, version) => hearingsRepository.markSynced(id, version),
  },
  {
    sheet: 'Contacts',
    idField: 'contactId',
    getAll: (includeDeleted) =>
      contactsRepository.getAll(includeDeleted) as unknown as Promise<
        (SyncEntity & Record<string, unknown>)[]
      >,
    getById: (id) => contactsRepository.getById(id) as unknown as Promise<
      (SyncEntity & Record<string, unknown>) | null
    >,
    fromRow: (row) => contactsRepository.fromRow(row) as unknown as SyncEntity & Record<string, unknown>,
    applyRemoteRow: (row) => contactsRepository.applyRemoteRow(row),
    markSynced: (id, version) => contactsRepository.markSynced(id, version),
  },
  {
    sheet: 'Documents',
    idField: 'documentId',
    getAll: (includeDeleted) =>
      documentsRepository.getAll(includeDeleted) as unknown as Promise<
        (SyncEntity & Record<string, unknown>)[]
      >,
    getById: (id) => documentsRepository.getById(id) as unknown as Promise<
      (SyncEntity & Record<string, unknown>) | null
    >,
    fromRow: (row) => documentsRepository.fromRow(row) as unknown as SyncEntity & Record<string, unknown>,
    applyRemoteRow: (row) => documentsRepository.applyRemoteRow(row),
    markSynced: (id, version) => documentsRepository.markSynced(id, version),
  },
];

let syncing = false;

export async function refreshQueueDepth(): Promise<void> {
  const depth = await OutboundQueue.depth();
  emit({ queueDepth: depth });
}

export async function backfillLocalRecords(): Promise<number> {
  const transport = getTransport();
  if (transport.mode !== 'remote') return 0;
  const queued = await OutboundQueue.entityKeys();
  let added = 0;

  for (const adapter of adapters) {
    const rows = await adapter.getAll(true);
    for (const row of rows) {
      const id = String(row[adapter.idField] ?? '');
      if (!id || row.syncedAt) continue;
      const key = `${adapter.sheet}:${id}`;
      if (queued.has(key)) continue;
      await OutboundQueue.enqueue(adapter.sheet, 'create', id, row);
      queued.add(key);
      added += 1;
    }
  }

  const history = await historyRepository.getAll();
  for (const entry of history) {
    if (entry.syncedAt) continue;
    const key = `History:${entry.historyId}`;
    if (queued.has(key)) continue;
    await OutboundQueue.enqueue('History', 'create', entry.historyId, entry);
    queued.add(key);
    added += 1;
  }

  if (added) await refreshQueueDepth();
  return added;
}

let remoteBackfillPromise: Promise<void> | null = null;

export async function ensureRemoteBackfill(): Promise<void> {
  if (getTransport().mode !== 'remote') return;
  if (!remoteBackfillPromise) {
    remoteBackfillPromise = backfillLocalRecords()
      .then(() => {
        void uploadPendingDocuments();
      })
      .catch(() => {
        remoteBackfillPromise = null;
      });
  }
  await remoteBackfillPromise;
}

export function resetRemoteBackfill(): void {
  remoteBackfillPromise = null;
}

async function pullSheet(
  adapter: RemoteAdapter,
  since: string | null,
): Promise<{ pulled: number; conflicts: number }> {
  const transport = getTransport();
  const rows = await transport.pull(adapter.sheet, since);
  let conflicts = 0;
  let pulled = 0;
  for (const row of rows) {
    const entityId = String(row[adapter.idField] ?? '');
    if (!entityId) continue;
    const remote = adapter.fromRow(row);
    const local = await adapter.getById(entityId);
    const serverVersion = Number(row.serverVersion ?? 0);
    const localPending = local ? local.localVersion > local.serverVersion : false;
    const serverAdvanced = local ? serverVersion > local.serverVersion : false;

    if (local && localPending && serverAdvanced) {
      conflicts += 1;
      await OutboundQueue.removeByEntity(adapter.sheet, entityId);
      await logHistory({
        caseId: String((row.caseId as string) ?? entityId),
        actionId: String((row.actionId as string) ?? ''),
        eventType: 'conflict_resolved',
        description: `Sync conflict on ${adapter.sheet}: server version kept`,
        oldValue: local,
        newValue: remote,
        isConflict: true,
        metadata: { sheet: adapter.sheet, entityId, strategy: 'last_write_wins' },
      });
      await adapter.applyRemoteRow(row);
      pulled += 1;
      continue;
    }

    if (local && localPending && !serverAdvanced) {
      continue;
    }
    await adapter.applyRemoteRow(row);
    pulled += 1;
  }
  return { pulled, conflicts };
}

async function pullHistory(since: string | null): Promise<number> {
  const transport = getTransport();
  const rows = await transport.pull('History', since);
  let count = 0;
  for (const row of rows) {
    const historyId = String(row.historyId ?? '');
    if (!historyId) continue;
    const existing = await historyRepository.getById(historyId);
    if (existing) continue;
    const entry = historyRowToEntry(row);
    await historyRepository.insert(entry, false);
    count += 1;
  }
  return count;
}

function historyRowToEntry(row: RemoteRow): HistoryEntry {
  return {
    historyId: String(row.historyId ?? ''),
    caseId: String(row.caseId ?? ''),
    actionId: String(row.actionId ?? ''),
    eventType: (row.eventType as HistoryEntry['eventType']) ?? 'updated',
    actorName: String(row.actorName ?? ''),
    actorDeviceId: String(row.actorDeviceId ?? ''),
    oldValue: String(row.oldValue ?? ''),
    newValue: String(row.newValue ?? ''),
    description: String(row.description ?? ''),
    metadata: String(row.metadata ?? ''),
    isConflict: row.isConflict === true || row.isConflict === 1 || row.isConflict === 'TRUE',
    createdAt: String(row.createdAt ?? nowISO()),
    syncedAt: row.syncedAt ? String(row.syncedAt) : nowISO(),
  };
}

async function pushQueue(): Promise<{ pushed: number; failed: number }> {
  const transport = getTransport();
  if (transport.mode === 'local') return { pushed: 0, failed: 0 };
  let pushed = 0;
  let failed = 0;
  let batch = await OutboundQueue.pending(50);
  let guard = 0;
  while (batch.length && guard < 20) {
    guard += 1;
    const bySheet = new Map<SheetName, typeof batch>();
    for (const write of batch) {
      const list = bySheet.get(write.sheet) ?? [];
      list.push(write);
      bySheet.set(write.sheet, list);
    }
    for (const [sheet, writes] of bySheet) {
      try {
        const result = await transport.push(
          sheet,
          writes.map((write) => ({ id: write.id, type: write.type, payload: write.payload })),
        );
        if (result.succeeded.length) {
          await OutboundQueue.markSynced(result.succeeded);
          pushed += result.succeeded.length;
          for (const write of writes) {
            if (result.succeeded.includes(write.id)) {
              const adapter = adapters.find((candidate) => candidate.sheet === sheet);
              if (adapter) {
                const parsed = JSON.parse(write.payload) as Record<string, unknown>;
                const local = await adapter.getById(String(parsed[adapter.idField] ?? ''));
                if (local) {
                  await adapter.markSynced(String(parsed[adapter.idField]), local.localVersion);
                }
              }
            }
          }
          if (sheet === 'History') {
            const historyIds = writes
              .filter((write) => result.succeeded.includes(write.id))
              .map((write) => write.entityId);
            await historyRepository.markSynced(historyIds);
          }
        }
        for (const failure of result.failed) {
          failed += 1;
          await OutboundQueue.markFailed(failure.id, failure.error);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Push failed';
        for (const write of writes) {
          failed += 1;
          await OutboundQueue.markFailed(write.id, message);
        }
      }
    }
    batch = await OutboundQueue.pending(50);
  }
  return { pushed, failed };
}

export async function retryFailedSync(): Promise<SyncSummary> {
  await OutboundQueue.resetRetries();
  return syncNow();
}

export async function syncNow(): Promise<SyncSummary> {
  if (syncing) return { status: 'busy', pushed: 0, pulled: 0, conflicts: 0 };
  syncing = true;
  emit({ syncing: true, error: null, mode: getTransport().mode });
  const summary: SyncSummary = { status: 'success', pushed: 0, pulled: 0, conflicts: 0 };
  try {
    const transport = getTransport();
    const settings = getSettings();
    const since = settings.lastSyncAt;

    if (transport.mode === 'remote') {
      await ensureRemoteBackfill();
      for (const adapter of adapters) {
        try {
          const result = await pullSheet(adapter, since);
          summary.pulled += result.pulled;
          summary.conflicts += result.conflicts;
        } catch (error) {
          summary.error = error instanceof Error ? error.message : 'Pull failed';
        }
      }
      try {
        summary.pulled += await pullHistory(since);
      } catch {
        // History pull is best-effort.
      }
    }

    const push = await pushQueue();
    summary.pushed = push.pushed;
    if (push.failed) summary.status = 'error';

    if (summary.error) summary.status = 'error';
    const stamp = nowISO();
    await updateSettings({ lastSyncAt: stamp });
    await refreshHearingStatuses();
    await refreshQueueDepth();
    emit({
      syncing: false,
      lastSyncAt: stamp,
      error: summary.error ?? null,
      mode: transport.mode,
    });
    return summary;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    summary.status = 'error';
    summary.error = message;
    emit({ syncing: false, error: message });
    return summary;
  } finally {
    syncing = false;
    if (state.syncing) emit({ syncing: false });
  }
}

async function pullSheetConflicts(): Promise<number> {
  return 0;
}

let interval: ReturnType<typeof setInterval> | null = null;
let appStateSubscription: { remove: () => void } | null = null;
let netInfoUnsubscribe: (() => void) | null = null;

export function startSyncManager(): void {
  if (interval) return;
  const settings = getSettings();
  emit({
    lastSyncAt: settings.lastSyncAt,
    mode: getTransport().mode,
  });
  void refreshQueueDepth();
  void ensureRemoteBackfill();

  interval = setInterval(() => {
    void syncNow();
  }, 5 * 60 * 1000);

  appStateSubscription = AppState.addEventListener('change', (nextState) => {
    if (nextState === 'active') void syncNow();
  });

  netInfoUnsubscribe = NetInfo.addEventListener((networkState) => {
    const online = Boolean(networkState.isConnected);
    emit({ online });
    if (online) void syncNow();
  });
}

export function stopSyncManager(): void {
  if (interval) clearInterval(interval);
  interval = null;
  appStateSubscription?.remove();
  appStateSubscription = null;
  netInfoUnsubscribe?.();
  netInfoUnsubscribe = null;
}

export function backendModeLabel(): string {
  return getTransport().mode === 'remote' ? 'Google Sheets' : 'On this device';
}
