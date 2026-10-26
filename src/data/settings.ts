import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { DEFAULT_FOLLOW_UP_TIME, DEFAULT_HEARING_LEADS } from '@/config/defaults';
import { env } from '@/config/env';
import type { AppSettings } from '@/data/types';

const STORAGE_KEY = '@animal-welfare/settings';

export const defaultSettings: AppSettings = {
  actorName: env.defaultActorName || 'Activist',
  deviceId: '',
  worklistView: 'cards',
  hearingLeads: DEFAULT_HEARING_LEADS,
  followUpDefaultTime: DEFAULT_FOLLOW_UP_TIME,
  maskComplainant: true,
  includeExactAddress: false,
  demoSeeded: false,
  lastBackupAt: null,
  weeklyBackupEnabled: false,
  lastSyncAt: null,
  syncEnabled: env.hasRemoteBackend,
};

let current: AppSettings = { ...defaultSettings };
let loaded = false;
const listeners = new Set<(settings: AppSettings) => void>();

function notify(): void {
  listeners.forEach((listener) => listener(current));
}

export async function loadSettings(): Promise<AppSettings> {
  if (loaded) return current;
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      current = { ...defaultSettings, ...(JSON.parse(stored) as Partial<AppSettings>) };
    } catch {
      current = { ...defaultSettings };
    }
  }
  if (!current.deviceId) {
    current.deviceId = Crypto.randomUUID();
  }
  loaded = true;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  notify();
  return current;
}

export function getSettings(): AppSettings {
  return current;
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  current = { ...current, ...patch };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  notify();
  return current;
}

export function subscribeSettings(listener: (settings: AppSettings) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function shortDeviceId(deviceId: string): string {
  return deviceId.replace(/-/g, '').slice(0, 6).toUpperCase() || 'DEVICE';
}
