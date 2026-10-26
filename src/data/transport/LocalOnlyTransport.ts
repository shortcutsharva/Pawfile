import type { SheetName } from '@/data/types';
import type { PushResult, RemoteRow, SyncTransport } from './SyncTransport';

export class LocalOnlyTransport implements SyncTransport {
  readonly mode = 'local' as const;

  async health(): Promise<boolean> {
    return false;
  }

  async pull(_sheet: SheetName, _since: string | null): Promise<RemoteRow[]> {
    return [];
  }

  async push(
    _sheet: SheetName,
    writes: { id: string; type: string; payload: string }[],
  ): Promise<PushResult> {
    return { succeeded: writes.map((write) => write.id), failed: [] };
  }

  async allocateCaseIds(_deviceId: string, _size: number): Promise<{ start: number; end: number } | null> {
    return null;
  }

  async uploadMedia(): Promise<{ fileId: string; url: string }> {
    throw new Error('Media upload requires the Google backend to be configured.');
  }
}
