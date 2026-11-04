import { getBackendCredentials } from '@/data/backendSettings';
import { LocalOnlyTransport } from './LocalOnlyTransport';
import { PawfileServerTransport } from './PawfileServerTransport';
import type { SyncTransport } from './SyncTransport';

const local = new LocalOnlyTransport();
let remote: PawfileServerTransport | null = null;
let remoteKey = '';

export function getTransport(): SyncTransport {
  const credentials = getBackendCredentials();
  if (credentials?.endpoint && credentials?.secret) {
    const key = `${credentials.endpoint}|${credentials.secret}`;
    if (!remote || remoteKey !== key) {
      remote = new PawfileServerTransport({
        baseUrl: credentials.endpoint,
        secret: credentials.secret,
      });
      remoteKey = key;
    }
    return remote;
  }
  return local;
}

export function resetTransport(): void {
  remote = null;
  remoteKey = '';
}
