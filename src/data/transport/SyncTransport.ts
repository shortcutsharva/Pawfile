import type { SheetName } from '@/data/types';

export type RemoteRow = Record<string, unknown>;

export interface PushFailure {
  id: string;
  error: string;
}

export interface PushResult {
  succeeded: string[];
  failed: PushFailure[];
}

export interface RemoteUploadResult {
  fileId: string;
  url: string;
}

export interface SyncTransport {
  readonly mode: 'local' | 'remote';
  health(): Promise<boolean>;
  pull(sheet: SheetName, since: string | null): Promise<RemoteRow[]>;
  push(sheet: SheetName, writes: { id: string; type: string; payload: string }[]): Promise<PushResult>;
  allocateCaseIds(deviceId: string, size: number): Promise<{ start: number; end: number } | null>;
  uploadMedia(input: {
    caseId: string;
    category: string;
    fileName: string;
    mimeType: string;
    base64: string;
  }): Promise<RemoteUploadResult>;
}
