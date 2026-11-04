export interface Totals {
  cases: number;
  openCases: number;
  closedCases: number;
  highUrgency: number;
  openActions: number;
  overdueActions: number;
  hearingsNext7Days: number;
  rescuedThisMonth: number;
  contacts: number;
}

export interface CountItem {
  label: string;
  count: number;
}

export interface MonthItem {
  month: string;
  count: number;
}

export interface NextHearing {
  date: string;
  time: string;
  court: string;
}

export interface CaseListItem {
  caseId: string;
  title: string;
  animalType: string;
  complaintCategory: string;
  state: string;
  district: string;
  urgency: string;
  status: string;
  rescueStatus: string;
  legalStatus: string;
  complainantName: string;
  complainantPhone: string;
  createdAt: string;
  updatedAt: string;
  openActions: number;
  overdueActions: number;
  nextDue: string | null;
  nextHearing: NextHearing | null;
}

export interface HearingItem {
  hearingId: string;
  caseId: string;
  caseTitle: string;
  actionId: string;
  date: string;
  time: string;
  court: string;
  purpose: string;
  attendeeName: string;
  outcome: string;
  result: string;
  nextHearingDate: string | null;
  status: string;
}

export interface ActivityItem {
  historyId: string;
  caseId: string;
  caseTitle: string;
  actionId?: string;
  eventType: string;
  actorName: string;
  description: string;
  oldValue?: string;
  newValue?: string;
  metadata?: string;
  isConflict: boolean;
  createdAt: string;
}

export interface DocumentItem {
  documentId: string;
  caseId: string;
  caseTitle?: string;
  actionId?: string;
  category: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadStatus: string;
  createdAt: string;
  url: string | null;
}

export interface ContactItem {
  contactId: string;
  name: string;
  organization: string;
  phone: string;
  phone2: string;
  email: string;
  type: string;
  state: string;
  district: string;
  serviceArea: string;
  specialization: string;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

export interface CaseDetail {
  case: Record<string, unknown>;
  actions: Record<string, unknown>[];
  hearings: Record<string, unknown>[];
  documents: DocumentItem[];
  history: ActivityItem[];
}

export interface Summary {
  totals: Totals;
  byStatus: CountItem[];
  byCategory: CountItem[];
  byUrgency: CountItem[];
  monthly: MonthItem[];
  recentCases: CaseListItem[];
  upcomingHearings: HearingItem[];
  recentActivity: ActivityItem[];
}

export interface CasePage {
  items: CaseListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ActivityPage {
  items: ActivityItem[];
  total: number;
  page: number;
  pageSize: number;
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: 'same-origin', ...init });
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (response.status === 401) {
    window.dispatchEvent(new Event('pawfile:unauthorized'));
    throw new UnauthorizedError();
  }
  if (!response.ok) {
    throw new Error(typeof json.error === 'string' ? json.error : `Request failed (${response.status})`);
  }
  return json as T;
}

function query(values: Record<string, string | number | undefined | null>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

export function getSession(): Promise<{ authenticated: boolean }> {
  return request('/api/auth/session');
}

export async function login(secret: string): Promise<void> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ secret }),
  });
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(json.error ?? 'Could not sign in.');
}

export function logout(): Promise<{ ok: boolean }> {
  return request('/api/auth/logout', { method: 'POST' });
}

export function getSummary(): Promise<Summary> {
  return request('/api/dashboard/summary');
}

export function getCases(params: {
  search?: string;
  status?: string;
  urgency?: string;
  page?: number;
  pageSize?: number;
}): Promise<CasePage> {
  return request(`/api/dashboard/cases${query(params)}`);
}

export function getCase(caseId: string): Promise<CaseDetail> {
  return request(`/api/dashboard/cases/${encodeURIComponent(caseId)}`);
}

export function getContacts(params: {
  search?: string;
  type?: string;
}): Promise<{ items: ContactItem[] }> {
  return request(`/api/dashboard/contacts${query(params)}`);
}

export function getHearings(params: {
  from?: string;
  to?: string;
}): Promise<{ items: HearingItem[] }> {
  return request(`/api/dashboard/hearings${query(params)}`);
}

export function getDocuments(params: {
  caseId?: string;
  category?: string;
}): Promise<{ items: DocumentItem[] }> {
  return request(`/api/dashboard/documents${query(params)}`);
}

export function getActivity(page: number): Promise<ActivityPage> {
  return request(`/api/dashboard/activity${query({ page, pageSize: 50 })}`);
}
