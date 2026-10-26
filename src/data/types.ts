import type { ActionStatus, HearingStatus, LegalStatus, RescueStatus } from '@/theme/status';

export type SyncFields = {
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
  localVersion: number;
  serverVersion: number;
  isDeleted: boolean;
};

export type SyncEntity = SyncFields;

export type CaseStatus = 'open' | 'closed';

export type Urgency = 'High' | 'Medium' | 'Low';

export type ActionType = 'rescue' | 'legal';

export const CONTACT_TYPES = [
  'NGO',
  'Rescuer',
  'Vet',
  'Shelter',
  'Police',
  'Legal',
  'Volunteer',
] as const;

export type ContactType = (typeof CONTACT_TYPES)[number];

export const RESCUE_CONTACT_TYPES: ContactType[] = ['NGO', 'Rescuer', 'Shelter', 'Volunteer'];

export const COMPLAINT_SOURCES = ['WhatsApp', 'Facebook', 'Phone', 'Walk-in', 'Other'] as const;
export type ComplaintSource = (typeof COMPLAINT_SOURCES)[number];

export const DOCUMENT_CATEGORIES = [
  'Evidence',
  'Photos',
  'FIR copies',
  'Veterinary reports',
  'Court orders',
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const HEARING_RESULTS = [
  'Next hearing scheduled',
  'Adjourned',
  'Case concluded',
  'Other',
] as const;
export type HearingResult = (typeof HEARING_RESULTS)[number];

export type UploadStatus = 'pending' | 'uploading' | 'uploaded' | 'failed' | 'device-only';

export interface Case extends SyncFields {
  caseId: string;
  title: string;
  animalType: string;
  complaintCategory: string;
  description: string;
  state: string;
  district: string;
  locationText: string;
  locationLat: number | null;
  locationLng: number | null;
  complaintSource: string;
  complainantName: string;
  complainantPhone: string;
  status: CaseStatus;
  rescueStatus: RescueStatus;
  legalStatus: LegalStatus;
  urgency: Urgency;
}

export interface Action extends SyncFields {
  actionId: string;
  caseId: string;
  type: ActionType;
  actionStatus: ActionStatus;
  rescueStatus: RescueStatus;
  legalStatus: LegalStatus;
  assignedToId: string;
  assignedToName: string;
  followUpById: string;
  followUpByName: string;
  nextAction: string;
  followUpDate: string | null;
  dueValue: string | null;
  isClosed: boolean;
  closedAt: string | null;
  closedReason: string;
  animalCondition: string;
  outcome: string;
  policeStation: string;
  complaintDate: string | null;
  firNumber: string;
  firDate: string | null;
  investigatingOfficerId: string;
  investigatingOfficerName: string;
  court: string;
  courtCaseNumber: string;
}

export interface Hearing extends SyncFields {
  hearingId: string;
  caseId: string;
  actionId: string;
  date: string;
  time: string;
  court: string;
  purpose: string;
  attendeeId: string;
  attendeeName: string;
  outcome: string;
  result: HearingResult | '';
  nextHearingDate: string | null;
  status: HearingStatus;
  reminder7d: boolean;
  reminder3d: boolean;
  reminder1d: boolean;
}

export interface Contact extends SyncFields {
  contactId: string;
  name: string;
  organization: string;
  phone: string;
  phone2: string;
  email: string;
  type: ContactType;
  state: string;
  district: string;
  serviceArea: string;
  specialization: string;
  isActive: boolean;
  isLocalOnly: boolean;
}

export interface DocumentMeta extends SyncFields {
  documentId: string;
  caseId: string;
  actionId: string;
  category: DocumentCategory;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  localUri: string;
  remoteUrl: string;
  driveFileId: string;
  uploadStatus: UploadStatus;
  uploadError: string;
}

export type HistoryEventType =
  | 'created'
  | 'updated'
  | 'status_change'
  | 'assigned'
  | 'reassigned'
  | 'note_added'
  | 'document_added'
  | 'document_removed'
  | 'hearing_added'
  | 'hearing_outcome'
  | 'case_closed'
  | 'case_reopened'
  | 'conflict_resolved'
  | 'restored';

export interface HistoryEntry {
  historyId: string;
  caseId: string;
  actionId: string;
  eventType: HistoryEventType;
  actorName: string;
  actorDeviceId: string;
  oldValue: string;
  newValue: string;
  description: string;
  metadata: string;
  isConflict: boolean;
  createdAt: string;
  syncedAt: string | null;
}

export interface ConfigEntry {
  key: string;
  value: string;
  description: string;
}

export interface SyncMetadataEntry {
  key: string;
  value: string;
  updatedAt: string;
}

export interface QueuedWrite {
  id: string;
  sheet: SheetName;
  type: 'create' | 'update' | 'delete';
  entityId: string;
  payload: string;
  createdAt: string;
  retries: number;
  lastError: string | null;
}

export interface IdBlock {
  deviceId: string;
  start: number;
  end: number;
  next: number;
  source: 'remote' | 'fallback';
  createdAt: string;
}

export type SheetName =
  | 'Cases'
  | 'Actions'
  | 'Hearings'
  | 'Contacts'
  | 'Documents'
  | 'History'
  | 'SyncMetadata'
  | 'Config';

export type WorklistView = 'cards' | 'detailed';

export interface AppSettings {
  actorName: string;
  deviceId: string;
  worklistView: WorklistView;
  hearingLeads: number[];
  followUpDefaultTime: string;
  maskComplainant: boolean;
  includeExactAddress: boolean;
  demoSeeded: boolean;
  lastBackupAt: string | null;
  weeklyBackupEnabled: boolean;
  lastSyncAt: string | null;
  syncEnabled: boolean;
}

export interface WorklistItem {
  action: Action;
  caseRecord: Case;
  dueState: DueState;
  dueLabel: string;
  overdueDays: number;
  hasNextAction: boolean;
  hearing: Hearing | null;
}

export type DueFilter = 'all' | 'overdue' | 'today' | 'next7' | 'upcoming';
export type DueState = 'overdue' | 'today' | 'upcoming' | 'none';

export interface AlertItem {
  id: string;
  kind: 'overdue' | 'hearing' | 'follow_up' | 'outcome_pending';
  caseId: string;
  actionId: string;
  title: string;
  subtitle: string;
  date: string;
  group: 'overdue' | 'today' | 'later';
}

export interface DraftMedia {
  id: string;
  uri: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface SharePreview {
  message: string;
  phone: string;
  masked: boolean;
  includesAddress: boolean;
}
