import { useCallback, useMemo } from 'react';
import { getAlerts, getCaseDetail, getWorklist, getAllCases, type WorklistFilters } from '@/data/services/worklist';
import { contactsRepository } from '@/data/repositories/contacts';
import { useAsyncData } from './useAppData';
import type { AlertItem, Case, Contact } from '@/data/types';
import { defaultFilters } from '@/data/services/worklist';

export function useWorklist(filters: WorklistFilters = defaultFilters) {
  const key = JSON.stringify(filters);
  const loader = useCallback(() => getWorklist(filters), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return useAsyncData(loader, { rescue: [], legal: [], total: 0 }, [key]);
}

export function useCaseDetail(caseId: string) {
  const loader = useCallback(() => getCaseDetail(caseId), [caseId]);
  return useAsyncData(
    loader,
    { caseRecord: null, actions: [], hearings: [], documents: [], history: [] },
    [caseId],
  );
}

export function useAlerts() {
  const loader = useCallback(() => getAlerts(), []);
  return useAsyncData<AlertItem[]>(loader, [], []);
}

export function useContacts() {
  const loader = useCallback(() => contactsRepository.getAll(), []);
  return useAsyncData<Contact[]>(loader, [], []);
}

export function useAllCases(search = '', includeClosed = true) {
  const loader = useCallback(() => getAllCases(search, includeClosed), [search, includeClosed]);
  return useAsyncData<Case[]>(loader, [], [search, includeClosed]);
}

export function useAssigneeOptions() {
  return useMemo(() => [{ id: 'self', name: 'Self' }], []);
}
