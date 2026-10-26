import { useCallback, useEffect, useMemo, useState } from 'react';
import { subscribeRepository } from '@/data/repository';
import { OutboundQueue, subscribeQueue } from '@/data/queue/OutboundQueue';
import { subscribeSettings } from '@/data/settings';
import { subscribeConfig } from '@/data/appConfig';
import { getSyncState, subscribeSync, type SyncState } from '@/data/sync/SyncManager';
import { getSettings } from '@/data/settings';
import { getConfig } from '@/data/appConfig';
import type { AppSettings } from '@/data/types';
import type { AppConfig } from '@/data/appConfig';

export interface AsyncState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useAsyncData<T>(loader: () => Promise<T>, initial: T, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const next = await loader();
      setData(next);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load data');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void reload();
    const unsubscribe = subscribeRepository(() => {
      void reload();
    });
    const unsubscribeQueue = subscribeQueue(() => {
      void reload();
    });
    return () => {
      unsubscribe();
      unsubscribeQueue();
    };
  }, [reload]);

  return { data, loading, error, reload };
}

export function useSettings(): AppSettings {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  useEffect(() => subscribeSettings(setSettings), []);
  return settings;
}

export function useAppConfig(): AppConfig {
  const [config, setConfig] = useState<AppConfig>(getConfig());
  useEffect(() => subscribeConfig(setConfig), []);
  return config;
}

export function useSyncStatus(): SyncState {
  const [state, setState] = useState<SyncState>(getSyncState());
  useEffect(() => subscribeSync(setState), []);
  return state;
}

export function usePendingEntityIds(): Set<string> {
  const [ids, setIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    let active = true;
    const refresh = () => {
      void OutboundQueue.entityIds().then((next) => {
        if (active) setIds(next);
      });
    };
    refresh();
    const unsubscribe = subscribeQueue(refresh);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  return ids;
}

export function useActorName(): string {
  const settings = useSettings();
  return settings.actorName || 'Activist';
}

export function useMemoizedFilters<T>(value: T): T {
  return useMemo(() => value, [JSON.stringify(value)]);
}
