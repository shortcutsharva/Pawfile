import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ANIMAL_TYPES,
  COMPLAINT_CATEGORIES,
  COMPLAINT_SOURCES,
  CONTACT_TYPE_OPTIONS,
  URGENCY_LEVELS,
} from '@/config/defaults';

const STORAGE_KEY = '@animal-welfare/config';

export interface AppConfig {
  animalTypes: string[];
  complaintCategories: string[];
  urgencyLevels: string[];
  complaintSources: string[];
  contactTypes: string[];
}

export const defaultConfig: AppConfig = {
  animalTypes: [...ANIMAL_TYPES],
  complaintCategories: [...COMPLAINT_CATEGORIES],
  urgencyLevels: [...URGENCY_LEVELS],
  complaintSources: [...COMPLAINT_SOURCES],
  contactTypes: [...CONTACT_TYPE_OPTIONS],
};

let current: AppConfig = { ...defaultConfig };
let loaded = false;
const listeners = new Set<(config: AppConfig) => void>();

function notify(): void {
  listeners.forEach((listener) => listener(current));
}

export async function loadConfig(): Promise<AppConfig> {
  if (loaded) return current;
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      current = { ...defaultConfig, ...(JSON.parse(stored) as Partial<AppConfig>) };
    } catch {
      current = { ...defaultConfig };
    }
  }
  loaded = true;
  notify();
  return current;
}

export function getConfig(): AppConfig {
  return current;
}

export async function updateConfig(patch: Partial<AppConfig>): Promise<AppConfig> {
  current = { ...current, ...patch };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  notify();
  return current;
}

export function subscribeConfig(listener: (config: AppConfig) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
