import type { SheetName } from '@/data/types';
import type {
  PushResult,
  RemoteRow,
  RemoteUploadResult,
  SyncTransport,
} from './SyncTransport';

interface AppsScriptTransportConfig {
  endpoint: string;
  secret: string;
}

interface ApiResponse {
  ok?: boolean;
  error?: string;
  rows?: RemoteRow[];
  succeeded?: string[];
  failed?: { id: string; error: string }[];
  block?: { start: number; end: number } | null;
  file?: { fileId: string; url: string };
}

export class AppsScriptTransport implements SyncTransport {
  readonly mode = 'remote' as const;

  constructor(private readonly config: AppsScriptTransportConfig) {}

  private async request(body: Record<string, unknown>): Promise<ApiResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ ...body, secret: this.config.secret }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }
      const json = (await response.json()) as ApiResponse;
      if (json.ok === false) {
        throw new Error(json.error ?? 'Backend request failed');
      }
      return json;
    } finally {
      clearTimeout(timer);
    }
  }

  async health(): Promise<boolean> {
    try {
      await this.request({ action: 'health' });
      return true;
    } catch {
      return false;
    }
  }

  async pull(sheet: SheetName, since: string | null): Promise<RemoteRow[]> {
    const result = await this.request({ action: 'pull', sheet, since });
    return result.rows ?? [];
  }

  async push(
    sheet: SheetName,
    writes: { id: string; type: string; payload: string }[],
  ): Promise<PushResult> {
    if (!writes.length) return { succeeded: [], failed: [] };
    const rows = writes.map((write) => JSON.parse(write.payload) as RemoteRow);
    const idByEntity = new Map<string, string>();
    writes.forEach((write) => {
      const parsed = JSON.parse(write.payload) as Record<string, unknown>;
      const entityId = String(parsed[primaryKeyForSheet(sheet)] ?? '');
      idByEntity.set(entityId, write.id);
    });
    const result = await this.request({ action: 'push', sheet, rows });
    const succeeded = (result.succeeded ?? []).map((entityId) => idByEntity.get(entityId) ?? entityId);
    const failed = (result.failed ?? []).map((failure) => ({
      id: idByEntity.get(failure.id) ?? failure.id,
      error: failure.error,
    }));
    return { succeeded, failed };
  }

  async allocateCaseIds(
    deviceId: string,
    size: number,
  ): Promise<{ start: number; end: number } | null> {
    const result = await this.request({ action: 'allocateBlock', deviceId, size });
    return result.block ?? null;
  }

  async uploadMedia(input: {
    caseId: string;
    category: string;
    fileName: string;
    mimeType: string;
    base64: string;
  }): Promise<RemoteUploadResult> {
    const result = await this.request({ action: 'uploadMedia', ...input });
    if (!result.file) throw new Error(result.error ?? 'Upload failed');
    return result.file;
  }
}

function primaryKeyForSheet(sheet: SheetName): string {
  switch (sheet) {
    case 'Cases':
      return 'caseId';
    case 'Actions':
      return 'actionId';
    case 'Hearings':
      return 'hearingId';
    case 'Contacts':
      return 'contactId';
    case 'Documents':
      return 'documentId';
    case 'History':
      return 'historyId';
    case 'SyncMetadata':
      return 'key';
    case 'Config':
      return 'key';
    default:
      return 'id';
  }
}
