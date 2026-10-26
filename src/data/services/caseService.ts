import { casesRepository } from '@/data/repositories/cases';
import { actionsRepository } from '@/data/repositories/actions';
import { documentsRepository } from '@/data/repositories/documents';
import * as FileSystem from 'expo-file-system/legacy';
import { logHistory } from '@/data/repositories/history';
import { allocateCaseId } from '@/data/ids';
import { computeDueValue, refreshActionDerivedFields } from '@/data/services/actionService';
import { buildCaseTitle, createsAction, type RequirementAnswer } from '@/data/caseRules';
import type {
  Action,
  ActionType,
  Case,
  Contact,
  DocumentCategory,
  DocumentMeta,
  DraftMedia,
} from '@/data/types';
import type { LegalStatus, RescueStatus } from '@/theme/status';
import { nowISO, nextFollowUpDefault } from '@/utils/date';

export type { RequirementAnswer };
export { buildCaseTitle, createsAction };

export interface NewCaseInput {
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
  rescueRequired: RequirementAnswer;
  legalRequired: RequirementAnswer;
  urgency: 'High' | 'Medium' | 'Low';
  assignedToId: string;
  assignedToName: string;
  followUpById: string;
  followUpByName: string;
  nextAction: string;
  followUpDate: string | null;
  media?: DraftMedia[];
}

function syncFields(): Pick<
  Case,
  'createdAt' | 'updatedAt' | 'syncedAt' | 'localVersion' | 'serverVersion' | 'isDeleted'
> {
  const now = nowISO();
  return {
    createdAt: now,
    updatedAt: now,
    syncedAt: null,
    localVersion: 1,
    serverVersion: 0,
    isDeleted: false,
  };
}

function emptyActionFields(type: ActionType): Pick<
  Action,
  | 'animalCondition'
  | 'outcome'
  | 'policeStation'
  | 'complaintDate'
  | 'firNumber'
  | 'firDate'
  | 'investigatingOfficerId'
  | 'investigatingOfficerName'
  | 'court'
  | 'courtCaseNumber'
> {
  return {
    animalCondition: '',
    outcome: '',
    policeStation: '',
    complaintDate: null,
    firNumber: '',
    firDate: null,
    investigatingOfficerId: '',
    investigatingOfficerName: '',
    court: '',
    courtCaseNumber: '',
  };
}

export async function createCase(input: NewCaseInput, deviceId: string): Promise<Case> {
  const caseId = await allocateCaseId(deviceId);
  const now = nowISO();
  const rescueStatus: RescueStatus = createsAction(input.rescueRequired) ? 'to_attend' : 'na';
  const legalStatus: LegalStatus = createsAction(input.legalRequired) ? 'complaint_filed' : 'na';

  const caseRecord: Case = {
    caseId,
    title: buildCaseTitle(input.animalType, input.complaintCategory),
    animalType: input.animalType,
    complaintCategory: input.complaintCategory,
    description: input.description,
    state: input.state,
    district: input.district,
    locationText: input.locationText,
    locationLat: input.locationLat,
    locationLng: input.locationLng,
    complaintSource: input.complaintSource,
    complainantName: input.complainantName,
    complainantPhone: input.complainantPhone,
    status: 'open',
    rescueStatus,
    legalStatus,
    urgency: input.urgency,
    ...syncFields(),
  };
  await casesRepository.insert(caseRecord);

  const createdActions: Action[] = [];
  for (const type of ['rescue', 'legal'] as ActionType[]) {
    const required = type === 'rescue' ? input.rescueRequired : input.legalRequired;
    if (!createsAction(required)) continue;
    const action: Action = {
      actionId: `ACT-${caseId}-${type}`,
      caseId,
      type,
      actionStatus: 'to_attend',
      rescueStatus: type === 'rescue' ? 'to_attend' : 'na',
      legalStatus: type === 'legal' ? 'complaint_filed' : 'na',
      assignedToId: input.assignedToId,
      assignedToName: input.assignedToName,
      followUpById: input.followUpById,
      followUpByName: input.followUpByName,
      nextAction: input.nextAction,
      followUpDate: input.followUpDate,
      dueValue: input.followUpDate,
      isClosed: false,
      closedAt: null,
      closedReason: '',
      ...emptyActionFields(type),
      ...syncFields(),
    };
    const refreshed = await refreshActionDerivedFields(action);
    await actionsRepository.insert(refreshed);
    createdActions.push(refreshed);
  }

  if (input.media?.length) {
    await attachDraftMedia(caseId, input.media);
  }

  await logHistory({
    caseId,
    eventType: 'created',
    description: `Case #${caseId} registered`,
    newValue: caseRecord,
    metadata: {
      actions: createdActions.map((action) => action.actionId),
      hasOpenAction: createdActions.length > 0,
    },
  });
  for (const action of createdActions) {
    await logHistory({
      caseId,
      actionId: action.actionId,
      eventType: 'created',
      description: `${action.type === 'rescue' ? 'Rescue' : 'Legal'} action created`,
      newValue: action,
    });
  }
  if (!createdActions.length) {
    await logHistory({
      caseId,
      eventType: 'note_added',
      description: 'Case saved without an open action',
    });
  }

  return caseRecord;
}

/**
 * A case id can also arrive from a synced sheet row or a restored backup, so it is never trusted
 * as a path segment. Without this, an id such as `../../settings` would write media outside the
 * app's own media folder.
 */
function mediaDirectory(caseId: string): string {
  const root = FileSystem.documentDirectory;
  const safeCaseId = caseId.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64);
  if (!root || !safeCaseId) return '';
  return `${root}media/${safeCaseId}/`;
}

export async function attachDraftMedia(caseId: string, media: DraftMedia[]): Promise<void> {
  const existing = await documentsRepository.getAll();
  let sequence = existing.filter((document) => document.caseId === caseId).length;
  let directory = '';
  try {
    directory = mediaDirectory(caseId);
    if (directory) {
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    }
  } catch {
    directory = '';
  }
  for (const item of media) {
    sequence += 1;
    const category: DocumentCategory = item.mimeType.startsWith('image') ? 'Photos' : 'Evidence';
    const now = nowISO();
    let localUri = item.uri;
    if (directory) {
      try {
        const safeName = item.fileName.replace(/[^\w.-]/g, '_');
        const destination = `${directory}${Date.now()}-${safeName}`;
        await FileSystem.copyAsync({ from: item.uri, to: destination });
        localUri = destination;
      } catch {
        localUri = item.uri;
      }
    }
    const document: DocumentMeta = {
      documentId: `DOC-${caseId}-${sequence}`,
      caseId,
      actionId: '',
      category,
      fileName: item.fileName,
      mimeType: item.mimeType,
      sizeBytes: item.sizeBytes,
      localUri,
      remoteUrl: '',
      driveFileId: '',
      uploadStatus: 'device-only',
      uploadError: '',
      createdAt: now,
      updatedAt: now,
      syncedAt: null,
      localVersion: 1,
      serverVersion: 0,
      isDeleted: false,
    };
    await documentsRepository.insert(document);
    await logHistory({
      caseId,
      eventType: 'document_added',
      description: `Document added: ${item.fileName}`,
      newValue: document,
    });
    void import('@/services/uploads')
      .then(({ uploadDocument }) => uploadDocument(document))
      .catch(() => undefined);
  }
}

export async function updateCase(
  caseId: string,
  patch: Partial<Case>,
  description = 'Case details updated',
): Promise<Case> {
  const existing = await casesRepository.getById(caseId);
  if (!existing) throw new Error(`Case ${caseId} not found`);
  const saved = await casesRepository.update(caseId, patch);
  await logHistory({
    caseId,
    eventType: 'updated',
    description,
    oldValue: existing,
    newValue: saved,
  });
  return saved;
}

export async function addActionToCase(caseId: string, type: ActionType): Promise<Action> {
  const existing = (await actionsRepository.getAll()).find(
    (action) => action.caseId === caseId && action.type === type,
  );
  if (existing) return existing;

  const action: Action = {
    actionId: `ACT-${caseId}-${type}`,
    caseId,
    type,
    actionStatus: 'to_attend',
    rescueStatus: type === 'rescue' ? 'to_attend' : 'na',
    legalStatus: type === 'legal' ? 'complaint_filed' : 'na',
    assignedToId: 'self',
    assignedToName: 'Self',
    followUpById: 'self',
    followUpByName: 'Self',
    nextAction: '',
    followUpDate: nextFollowUpDefault(),
    dueValue: nextFollowUpDefault(),
    isClosed: false,
    closedAt: null,
    closedReason: '',
    ...emptyActionFields(type),
    ...syncFields(),
  };
  const refreshed = await refreshActionDerivedFields(action);
  await actionsRepository.insert(refreshed);
  await recomputeCaseStatuses(caseId);
  await logHistory({
    caseId,
    actionId: refreshed.actionId,
    eventType: 'created',
    description: `${type === 'rescue' ? 'Rescue' : 'Legal'} action added`,
    newValue: refreshed,
  });
  return refreshed;
}

export async function recomputeCaseStatuses(caseId: string): Promise<void> {
  const actions = (await actionsRepository.getAll()).filter((action) => action.caseId === caseId);
  const rescue = actions.find((action) => action.type === 'rescue');
  const legal = actions.find((action) => action.type === 'legal');
  await casesRepository.update(caseId, {
    rescueStatus: rescue?.rescueStatus ?? 'na',
    legalStatus: legal?.legalStatus ?? 'na',
  });
}

export async function closeCase(caseId: string, reason = 'Case closed'): Promise<void> {
  const caseRecord = await casesRepository.getById(caseId);
  if (!caseRecord || caseRecord.status === 'closed') return;
  const actions = (await actionsRepository.getAll()).filter(
    (action) => action.caseId === caseId && !action.isClosed,
  );
  const now = nowISO();
  for (const action of actions) {
    await actionsRepository.update(action.actionId, {
      actionStatus: 'closed',
      isClosed: true,
      closedAt: now,
      closedReason: reason,
    });
    await logHistory({
      caseId,
      actionId: action.actionId,
      eventType: 'status_change',
      description: `Action closed: ${reason}`,
      oldValue: action,
    });
  }
  await casesRepository.update(caseId, { status: 'closed' });
  await logHistory({
    caseId,
    eventType: 'case_closed',
    description: `Case #${caseId} closed`,
    oldValue: caseRecord,
    newValue: { status: 'closed', actions: actions.map((action) => action.actionId) },
  });
}

export async function reopenCase(caseId: string): Promise<void> {
  const caseRecord = await casesRepository.getById(caseId);
  if (!caseRecord || caseRecord.status === 'open') return;
  const actions = (await actionsRepository.getAll()).filter(
    (action) => action.caseId === caseId && action.closedReason === 'Case closed',
  );
  for (const action of actions) {
    const refreshed = await refreshActionDerivedFields({
      ...action,
      isClosed: false,
      closedAt: null,
      closedReason: '',
    });
    await actionsRepository.update(action.actionId, {
      isClosed: false,
      closedAt: null,
      closedReason: '',
      actionStatus: refreshed.actionStatus,
      dueValue: await computeDueValue(refreshed),
    });
  }
  await casesRepository.update(caseId, { status: 'open' });
  await logHistory({
    caseId,
    eventType: 'case_reopened',
    description: `Case #${caseId} reopened`,
    oldValue: caseRecord,
    newValue: { status: 'open' },
  });
}

export function contactToAssignee(contact: Contact): {
  assignedToId: string;
  assignedToName: string;
} {
  return {
    assignedToId: contact.contactId,
    assignedToName: contact.organization || contact.name,
  };
}

export function makeDocumentId(caseId: string, sequence: number): string {
  return `DOC-${caseId}-${sequence}`;
}
