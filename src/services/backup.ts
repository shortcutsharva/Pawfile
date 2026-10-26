import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { Platform } from 'react-native';
import { actionsRepository } from '@/data/repositories/actions';
import { casesRepository } from '@/data/repositories/cases';
import { contactsRepository } from '@/data/repositories/contacts';
import { documentsRepository } from '@/data/repositories/documents';
import { hearingsRepository } from '@/data/repositories/hearings';
import { historyRepository, logHistory } from '@/data/repositories/history';
import { getSettings, updateSettings } from '@/data/settings';
import type {
  Action,
  Case,
  Contact,
  DocumentMeta,
  Hearing,
  HistoryEntry,
} from '@/data/types';
import { dateKey, nowISO } from '@/utils/date';
import { isBackupDue, MAX_AUTO_BACKUPS, missingIds } from '@/utils/backup';

export interface ExportPayload {
  version: 1;
  exportedAt: string;
  app: string;
  cases: Case[];
  actions: Action[];
  hearings: Hearing[];
  contacts: Contact[];
  documents: DocumentMeta[];
  history: HistoryEntry[];
}

export interface ExportOptions {
  includeComplainant: boolean;
  includeMedia: boolean;
}

// A restore file is chosen by the user and may have come from a chat or email, so it is treated
// as untrusted input: bounded in size, bounded in record count, and valid ids only.
const MAX_RESTORE_FILE_BYTES = 64 * 1024 * 1024;
const MAX_RESTORE_JSON_BYTES = 32 * 1024 * 1024;
const MAX_RESTORE_RECORDS = 20000;
const SAFE_ID = /^[^\u0000-\u001f\u007f/\\]{1,128}$/;

function stripComplainant(caseRecord: Case): Case {
  return { ...caseRecord, complainantName: '', complainantPhone: '' };
}

async function buildPayload(includeComplainant: boolean): Promise<ExportPayload> {
  const [cases, actions, hearings, contacts, documents, history] = await Promise.all([
    casesRepository.getAll(),
    actionsRepository.getAll(),
    hearingsRepository.getAll(),
    contactsRepository.getAll(),
    documentsRepository.getAll(),
    historyRepository.getAll(),
  ]);
  const redactions = cases.flatMap((caseRecord) =>
    [caseRecord.complainantName, caseRecord.complainantPhone].filter(Boolean),
  );
  const redactText = (value: string): string => {
    if (includeComplainant) return value;
    return redactions.reduce(
      (text, secret) => text.split(secret).join('[redacted]'),
      value,
    );
  };
  return {
    version: 1,
    exportedAt: nowISO(),
    app: 'pawfile',
    cases: includeComplainant ? cases : cases.map(stripComplainant),
    actions,
    hearings,
    contacts,
    documents,
    history: includeComplainant
      ? history
      : history.map((entry) => ({
          ...entry,
          oldValue: redactText(entry.oldValue),
          newValue: redactText(entry.newValue),
          metadata: redactText(entry.metadata),
          description: redactText(entry.description),
        })),
  };
}

async function fileEntry(uri: string, name: string): Promise<[string, Uint8Array] | null> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return null;
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return [`media/${name}`, bytes];
  } catch {
    return null;
  }
}

export async function exportBackup(options: ExportOptions): Promise<string | null> {
  const payload = await buildPayload(options.includeComplainant);
  const stamp = dateKey(new Date());
  const directory = FileSystem.cacheDirectory ?? '';
  let uri: string;
  if (options.includeMedia) {
    const entries: Record<string, Uint8Array> = {
      'data.json': strToU8(JSON.stringify(payload, null, 2)),
    };
    for (const document of payload.documents) {
      if (!document.localUri) continue;
      const entry = await fileEntry(
        document.localUri,
        `${document.caseId}/${document.fileName || document.documentId}`,
      );
      if (entry) entries[entry[0]] = entry[1];
    }
    const zip = zipSync(entries);
    uri = `${directory}pawfile-backup-${stamp}.zip`;
    await FileSystem.writeAsStringAsync(uri, base64FromBytes(zip), {
      encoding: FileSystem.EncodingType.Base64,
    });
  } else {
    uri = `${directory}pawfile-backup-${stamp}.json`;
    await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2));
  }
  await updateSettings({ lastBackupAt: nowISO() });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: options.includeMedia ? 'application/zip' : 'application/json',
      dialogTitle: 'Export case data',
    });
  }
  return uri;
}

let autoBackupRunning = false;

export async function runScheduledBackupIfDue(): Promise<string | null> {
  if (Platform.OS === 'web' || autoBackupRunning) return null;
  const settings = getSettings();
  if (!isBackupDue(settings.lastBackupAt, new Date(), settings.weeklyBackupEnabled)) {
    return null;
  }
  const root = FileSystem.documentDirectory;
  if (!root) return null;

  autoBackupRunning = true;
  try {
    const payload = await buildPayload(false);
    const directory = `${root}backups/`;
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    const uri = `${directory}auto-${dateKey(new Date())}.json`;
    await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2));
    await updateSettings({ lastBackupAt: nowISO() });
    await pruneAutoBackups(directory);
    return uri;
  } catch {
    return null;
  } finally {
    autoBackupRunning = false;
  }
}

async function pruneAutoBackups(directory: string): Promise<void> {
  try {
    const files = await FileSystem.readDirectoryAsync(directory);
    const backups = files
      .filter((name) => name.startsWith('auto-') && name.endsWith('.json'))
      .sort();
    const stale = backups.slice(0, Math.max(0, backups.length - MAX_AUTO_BACKUPS));
    await Promise.all(
      stale.map((name) =>
        FileSystem.deleteAsync(`${directory}${name}`, { idempotent: true }).catch(() => undefined),
      ),
    );
  } catch {
    // Pruning is best-effort.
  }
}

function base64FromBytes(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

export interface RestorePreview {
  additions: number;
  differences: number;
  messages: string[];
  payload: ExportPayload;
}

export async function pickRestoreFile(): Promise<ExportPayload | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'application/zip'] });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const info = await FileSystem.getInfoAsync(asset.uri);
  if (info.exists && 'size' in info && (info.size ?? 0) > MAX_RESTORE_FILE_BYTES) {
    throw new Error('This backup file is too large to restore.');
  }
  let content: string;
  if (asset.mimeType === 'application/zip' || asset.name.endsWith('.zip')) {
    const base64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    // Only data.json is decompressed, and only when its declared size is sane. Skipping other
    // entries also rules out zip bombs and archive paths that would escape the media folder.
    let oversized = false;
    const files = unzipSync(bytes, {
      filter: (file) => {
        if (file.name !== 'data.json') return false;
        if (file.originalSize > MAX_RESTORE_JSON_BYTES) {
          oversized = true;
          return false;
        }
        return true;
      },
    });
    if (oversized) {
      throw new Error('This backup is too large to restore.');
    }
    if (!files['data.json']) {
      throw new Error('This archive does not contain a data.json file.');
    }
    content = strFromU8(files['data.json']);
  } else {
    content = await FileSystem.readAsStringAsync(asset.uri);
  }
  return parsePayload(content);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readRecords<T>(value: unknown, idField: string, label: string): T[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error(`This backup's ${label} list is not valid.`);
  }
  if (value.length > MAX_RESTORE_RECORDS) {
    throw new Error(`This backup contains too many ${label} records.`);
  }
  return value.map((item) => {
    if (!isRecord(item)) {
      throw new Error(`This backup's ${label} list is not valid.`);
    }
    const id = item[idField];
    if (typeof id !== 'string' || !SAFE_ID.test(id)) {
      throw new Error(`This backup contains an invalid ${idField}.`);
    }
    return item as T;
  });
}

function parsePayload(content: string): ExportPayload {
  if (content.length > MAX_RESTORE_JSON_BYTES) {
    throw new Error('This backup is too large to restore.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('This file is not a valid Pawfile backup.');
  }
  if (!isRecord(parsed) || parsed.version !== 1) {
    throw new Error('This file is not a valid Pawfile backup.');
  }
  return {
    version: 1,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : nowISO(),
    app: typeof parsed.app === 'string' ? parsed.app : 'pawfile',
    cases: readRecords<Case>(parsed.cases, 'caseId', 'case'),
    actions: readRecords<Action>(parsed.actions, 'actionId', 'action'),
    hearings: readRecords<Hearing>(parsed.hearings, 'hearingId', 'hearing'),
    contacts: readRecords<Contact>(parsed.contacts, 'contactId', 'contact'),
    documents: readRecords<DocumentMeta>(parsed.documents, 'documentId', 'document'),
    history: readRecords<HistoryEntry>(parsed.history, 'historyId', 'history'),
  };
}

export async function latestAutoBackup(): Promise<ExportPayload | null> {
  const root = FileSystem.documentDirectory;
  if (!root) return null;
  const directory = `${root}backups/`;
  try {
    const files = (await FileSystem.readDirectoryAsync(directory))
      .filter((name) => name.startsWith('auto-') && name.endsWith('.json'))
      .sort();
    const newest = files[files.length - 1];
    if (!newest) return null;
    const content = await FileSystem.readAsStringAsync(`${directory}${newest}`);
    return parsePayload(content);
  } catch {
    return null;
  }
}

export async function previewRestore(payload: ExportPayload): Promise<RestorePreview> {
  const existingCases = (await casesRepository.getAll(true)).filter(
    (caseRecord) => !caseRecord.isDeleted,
  );
  const existingIds = new Set(existingCases.map((caseRecord) => caseRecord.caseId));
  const additions = payload.cases.filter((caseRecord) => !existingIds.has(caseRecord.caseId));
  const differences = payload.cases.filter((caseRecord) => {
    if (!existingIds.has(caseRecord.caseId)) return false;
    const local = existingCases.find((candidate) => candidate.caseId === caseRecord.caseId);
    return Boolean(local && local.updatedAt !== caseRecord.updatedAt);
  });
  const existingHistoryIds = await historyRepository.getIds();
  const missingHistory = missingIds(
    (payload.history ?? []).map((entry) => entry.historyId),
    existingHistoryIds,
  );
  const messages: string[] = [];
  messages.push(`${additions.length} records will be added.`);
  messages.push(`${differences.length} records differ from the current copy and will be kept as-is.`);
  messages.push(`${missingHistory.length} history entries will be added.`);
  messages.push('Nothing is deleted by a restore.');
  return { additions: additions.length, differences: differences.length, messages, payload };
}

export async function applyRestore(payload: ExportPayload): Promise<RestorePreview> {
  const preview = await previewRestore(payload);
  const existing = await casesRepository.getAll(true);
  const existingIds = new Set(
    existing.filter((caseRecord) => !caseRecord.isDeleted).map((item) => item.caseId),
  );
  for (const caseRecord of payload.cases) {
    const localCase = existing.find((item) => item.caseId === caseRecord.caseId);
    if (localCase?.isDeleted) {
      await casesRepository.update(caseRecord.caseId, { isDeleted: false });
    } else if (!existingIds.has(caseRecord.caseId)) {
      await casesRepository.insert(caseRecord, true);
    }
    const restored = payload.actions.filter((action) => action.caseId === caseRecord.caseId);
    for (const action of restored) {
      const local = await actionsRepository.getById(action.actionId);
      if (local?.isDeleted) {
        await actionsRepository.update(action.actionId, { isDeleted: false });
      } else if (!local) {
        await actionsRepository.insert(action, true);
      }
    }
    for (const hearing of payload.hearings.filter((item) => item.caseId === caseRecord.caseId)) {
      const local = await hearingsRepository.getById(hearing.hearingId);
      if (local?.isDeleted) {
        await hearingsRepository.update(hearing.hearingId, { isDeleted: false });
      } else if (!local) {
        await hearingsRepository.insert(hearing, true);
      }
    }
    for (const document of payload.documents.filter((item) => item.caseId === caseRecord.caseId)) {
      const local = await documentsRepository.getById(document.documentId);
      if (local?.isDeleted) {
        await documentsRepository.update(document.documentId, { isDeleted: false });
      } else if (!local) {
        await documentsRepository.insert(document, true);
      }
    }
    await logHistory({
      caseId: caseRecord.caseId,
      eventType: 'restored',
      description: `Case #${caseRecord.caseId} restored from backup`,
      newValue: { caseId: caseRecord.caseId },
    });
  }
  for (const contact of payload.contacts) {
    const local = await contactsRepository.getById(contact.contactId);
    if (local?.isDeleted) {
      await contactsRepository.update(contact.contactId, { isDeleted: false });
    } else if (!local) {
      await contactsRepository.insert(contact, true);
    }
  }
  const existingHistoryIds = await historyRepository.getIds();
  const missingHistory = missingIds(
    (payload.history ?? []).map((entry) => entry.historyId),
    existingHistoryIds,
  );
  for (const historyId of missingHistory) {
    const entry = (payload.history ?? []).find((row) => row.historyId === historyId);
    if (!entry) continue;
    await historyRepository.insert(entry, true);
  }
  return preview;
}

export function summaryLine(payload: ExportPayload): string {
  return `${payload.cases.length} cases · ${payload.actions.length} actions · ${payload.hearings.length} hearings`;
}

export function paybackFileName(payload: ExportPayload): string {
  return `pawfile-${dateKey(payload.exportedAt)}.json`;
}
