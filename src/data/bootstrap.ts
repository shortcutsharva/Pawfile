import { env } from '@/config/env';
import { getDb } from '@/db/client';
import { loadConfig } from '@/data/appConfig';
import { loadBackendCredentials } from '@/data/backendSettings';
import { ensureDemoSeed } from '@/data/seed';
import { loadSettings } from '@/data/settings';
import { refreshHearingStatuses } from '@/data/services/hearingService';
import { refreshQueueDepth, startSyncManager } from '@/data/sync/SyncManager';

let ready: Promise<void> | null = null;

export function bootstrap(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await getDb();
      await loadSettings();
      await loadBackendCredentials();
      await loadConfig();
      await refreshHearingStatuses();
      if (env.demoMode) {
        await ensureDemoSeed();
      }
      await refreshQueueDepth();
      startSyncManager();
    })();
  }
  return ready;
}
