import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { env } from '@/config/env';

const ENDPOINT_KEY = 'backend.endpoint';
const SECRET_KEY = 'backend.secret';
const WEB_STORAGE_KEY = '@animal-welfare/backend';

// Keeps the shared secret out of iCloud/keychain backups, so restoring the phone onto a new
// device does not carry the backend credential with it. Ignored on Android, which encrypts
// entries with the device keystore already.
const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export interface BackendCredentials {
  endpoint: string;
  secret: string;
}

export type BackendSource = 'saved' | 'env' | 'none';

let current: BackendCredentials | null = null;
let source: BackendSource = 'none';

function envCredentials(): BackendCredentials | null {
  if (!env.sheetsEndpoint || !env.sheetsSecret) return null;
  return { endpoint: env.sheetsEndpoint, secret: env.sheetsSecret };
}

async function readSaved(): Promise<BackendCredentials | null> {
  try {
    if (Platform.OS === 'web') {
      const stored = await AsyncStorage.getItem(WEB_STORAGE_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored) as Partial<BackendCredentials>;
      return parsed.endpoint && parsed.secret
        ? { endpoint: parsed.endpoint, secret: parsed.secret }
        : null;
    }
    const [endpoint, secret] = await Promise.all([
      SecureStore.getItemAsync(ENDPOINT_KEY),
      SecureStore.getItemAsync(SECRET_KEY),
    ]);
    return endpoint && secret ? { endpoint, secret } : null;
  } catch {
    return null;
  }
}

export async function loadBackendCredentials(): Promise<BackendCredentials | null> {
  const saved = await readSaved();
  if (saved) {
    current = saved;
    source = 'saved';
    return current;
  }
  current = envCredentials();
  source = current ? 'env' : 'none';
  return current;
}

export function getBackendCredentials(): BackendCredentials | null {
  return current;
}

export function getBackendSource(): BackendSource {
  return source;
}

export async function saveBackendCredentials(credentials: BackendCredentials): Promise<void> {
  const normalized = {
    endpoint: credentials.endpoint.trim(),
    secret: credentials.secret.trim(),
  };
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(normalized));
  } else {
    await Promise.all([
      SecureStore.setItemAsync(ENDPOINT_KEY, normalized.endpoint, SECURE_OPTIONS),
      SecureStore.setItemAsync(SECRET_KEY, normalized.secret, SECURE_OPTIONS),
    ]);
  }
  current = normalized;
  source = 'saved';
}

export async function clearBackendCredentials(): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(WEB_STORAGE_KEY);
  } else {
    await Promise.all([
      SecureStore.deleteItemAsync(ENDPOINT_KEY),
      SecureStore.deleteItemAsync(SECRET_KEY),
    ]);
  }
  current = envCredentials();
  source = current ? 'env' : 'none';
}
