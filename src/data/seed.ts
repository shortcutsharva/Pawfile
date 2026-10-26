import { actionsRepository } from '@/data/repositories/actions';
import { casesRepository } from '@/data/repositories/cases';
import { contactsRepository } from '@/data/repositories/contacts';
import { hearingsRepository } from '@/data/repositories/hearings';
import { documentsRepository } from '@/data/repositories/documents';
import { historyRepository } from '@/data/repositories/history';
import { getSettings, updateSettings } from '@/data/settings';
import { deriveActionStatus } from '@/data/derive';
import type { Action, Case, Contact, DocumentMeta, Hearing, HistoryEntry } from '@/data/types';
import { addDays } from 'date-fns';
import { combineDateAndTime, nowISO, startOfToday } from '@/utils/date';

function at(daysFromToday: number, hour: number, minute = 0): string {
  const date = addDays(startOfToday(), daysFromToday);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function dateOnly(daysFromToday: number): string {
  return at(daysFromToday, 12).slice(0, 10);
}

function sync(createdAt: string) {
  return {
    createdAt,
    updatedAt: createdAt,
    syncedAt: createdAt,
    localVersion: 1,
    serverVersion: 1,
    isDeleted: false,
  };
}

function makeCase(
  caseId: string,
  title: string,
  animalType: string,
  category: string,
  description: string,
  district: string,
  urgency: Case['urgency'],
  status: Case['status'],
  createdDaysAgo: number,
  extra: Partial<Case> = {},
): Case {
  const createdAt = at(-createdDaysAgo, 10);
  return {
    caseId,
    title,
    animalType,
    complaintCategory: category,
    description,
    state: 'Karnataka',
    district,
    locationText: `${district}, Karnataka`,
    locationLat: null,
    locationLng: null,
    complaintSource: 'WhatsApp',
    complainantName: '',
    complainantPhone: '',
    status,
    rescueStatus: 'na',
    legalStatus: 'na',
    urgency,
    ...sync(createdAt),
    ...extra,
  };
}

function makeAction(
  caseId: string,
  type: 'rescue' | 'legal',
  rescueStatus: Action['rescueStatus'],
  legalStatus: Action['legalStatus'],
  assignedToId: string,
  assignedToName: string,
  followUpById: string,
  followUpByName: string,
  nextAction: string,
  followUpDate: string | null,
  createdAt: string,
  extra: Partial<Action> = {},
): Action {
  return {
    actionId: `ACT-${caseId}-${type}`,
    caseId,
    type,
    actionStatus: deriveActionStatus(type, rescueStatus, legalStatus),
    rescueStatus,
    legalStatus,
    assignedToId,
    assignedToName,
    followUpById,
    followUpByName,
    nextAction,
    followUpDate,
    dueValue: followUpDate,
    isClosed: false,
    closedAt: null,
    closedReason: '',
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
    ...sync(createdAt),
    ...extra,
  };
}

function makeContact(
  contactId: string,
  name: string,
  organization: string,
  phone: string,
  type: Contact['type'],
  district: string,
  specialization: string,
  serviceArea: string,
): Contact {
  const createdAt = at(-120, 10);
  return {
    contactId,
    name,
    organization,
    phone,
    phone2: '',
    email: '',
    type,
    state: 'Karnataka',
    district,
    serviceArea,
    specialization,
    isActive: true,
    isLocalOnly: false,
    ...sync(createdAt),
  };
}

function makeHistory(
  caseId: string,
  actionId: string,
  eventType: HistoryEntry['eventType'],
  description: string,
  createdAt: string,
): HistoryEntry {
  return {
    historyId: `HST-SEED-${caseId}-${createdAt}`,
    caseId,
    actionId,
    eventType,
    actorName: 'Ravi Kumar',
    actorDeviceId: 'seed-device',
    oldValue: '',
    newValue: '',
    description,
    metadata: '',
    isConflict: false,
    createdAt,
    syncedAt: createdAt,
  };
}

export async function seedDemoData(force = false): Promise<boolean> {
  const settings = getSettings();
  if (!force && settings.demoSeeded) return false;
  const existing = await casesRepository.getAll();
  if (existing.length && !force) {
    await updateSettings({ demoSeeded: true });
    return false;
  }

  const contacts: Contact[] = [
    makeContact('CNT-SEED-1', 'Rescue Team A', 'Rescue Team A', '9876543210', 'NGO', 'Mysuru', 'Dog / Cat rescue', 'Mysuru, Mandya'),
    makeContact('CNT-SEED-2', 'Rescue Team B', 'Rescue Team B', '9876543211', 'NGO', 'Mandya', 'All animals', 'Mandya, Mysuru'),
    makeContact('CNT-SEED-3', 'Animal Shelter', 'Animal Shelter Trust', '9876543212', 'Shelter', 'Bengaluru Urban', 'Dogs / Cats', 'Bengaluru'),
    makeContact('CNT-SEED-4', 'Advocate B', 'Advocate B', '9876543213', 'Legal', 'Bengaluru Urban', 'Animal welfare law', 'Bengaluru'),
    makeContact('CNT-SEED-5', 'Veterinary Clinic', 'Veterinary Clinic', '9876543214', 'Vet', 'Mysuru', 'Small animals', 'Mysuru'),
    makeContact('CNT-SEED-6', 'Jayanagar Police Station', 'Jayanagar Police Station', '100', 'Police', 'Bengaluru Urban', 'Police contact', 'Bengaluru'),
    makeContact('CNT-SEED-7', 'Hassan Rescue Volunteers', 'Hassan Rescue Volunteers', '9876543215', 'Volunteer', 'Hassan', 'Cattle, dogs', 'Hassan'),
  ];
  for (const contact of contacts) {
    await contactsRepository.insert(contact, false);
  }

  const cases: Case[] = [
    makeCase(
      '1042',
      'Injured Dog',
      'Dog',
      'Injury',
      'Injured dog found near the bus stand with a wound on its hind leg. Needs urgent rescue and veterinary care.',
      'Mysuru',
      'High',
      'open',
      1,
      {
        complainantName: 'Priya S',
        complainantPhone: '9988776655',
        locationText: 'Near City Bus Stand, Mysuru',
      },
    ),
    makeCase(
      '1040',
      'Cattle cruelty',
      'Cattle',
      'Cruelty',
      'Cattle tied in the sun without water for two days. Neighbours have complained repeatedly.',
      'Hassan',
      'Medium',
      'open',
      2,
      { complaintSource: 'Phone' },
    ),
    makeCase(
      '1035',
      'Animal cruelty',
      'Dog',
      'Cruelty',
      'Dog beaten by shopkeeper. Police complaint filed; FIR registered and chargesheet requested.',
      'Bengaluru Urban',
      'High',
      'open',
      12,
      {
        locationText: 'Jayanagar 4th Block, Bengaluru',
        complainantName: 'Kiran M',
        complainantPhone: '9900112233',
      },
    ),
    makeCase(
      '1032',
      'Dog cruelty',
      'Dog',
      'Cruelty',
      'Complaint filed at Tumakuru police station. Following up on FIR registration.',
      'Tumakuru',
      'Medium',
      'open',
      9,
    ),
    makeCase(
      '1028',
      'Injured Cat',
      'Cat',
      'Injury',
      'Cat with a fractured leg rescued by a volunteer. Awaiting shelter pickup.',
      'Mandya',
      'Medium',
      'open',
      4,
    ),
    makeCase(
      '1024',
      'Abandoned cow',
      'Cow',
      'Abandonment',
      'Cow abandoned on the highway. Police complaint registered, no FIR yet.',
      'Bengaluru Urban',
      'Low',
      'open',
      17,
    ),
    makeCase(
      '1018',
      'Abandoned bird',
      'Bird',
      'Abandonment',
      'Injured kite found near a construction site. Rescued and handed to a shelter.',
      'Mysuru',
      'Low',
      'open',
      24,
    ),
    makeCase(
      '1012',
      'Cow neglect',
      'Cow',
      'Neglect',
      'Cow kept without food and water. Case concluded in court.',
      'Hassan',
      'Medium',
      'closed',
      40,
    ),
  ];
  for (const caseRecord of cases) {
    await casesRepository.insert(caseRecord, false);
  }

  const actions: Action[] = [
    makeAction('1042', 'rescue', 'to_attend', 'na', 'self', 'Self', 'self', 'Self', 'Contact local rescue team', at(0, 16), at(-1, 10)),
    makeAction('1042', 'legal', 'na', 'complaint_filed', 'self', 'Self', 'self', 'Self', 'Visit police station', at(1, 11), at(-1, 10), {
      policeStation: 'Mysuru City Police Station',
      complaintDate: at(-1, 12),
    }),
    makeAction('1040', 'rescue', 'awaiting_confirmation', 'na', 'CNT-SEED-1', 'Rescue Team A', 'self', 'Self', 'Confirm rescue with NGO', at(1, 10), at(-2, 11)),
    makeAction('1035', 'legal', 'na', 'hearing_scheduled', 'CNT-SEED-4', 'Advocate B', 'self', 'Self', 'Attend court', at(3, 11), at(-12, 9), {
      policeStation: 'Jayanagar Police Station',
      complaintDate: at(-10, 10),
      firNumber: '123/2026',
      firDate: at(-8, 10),
      investigatingOfficerName: 'Inspector Rao',
      court: 'Bengaluru Magistrate Court',
      courtCaseNumber: 'CC/445/2026',
    }),
    makeAction('1032', 'legal', 'na', 'police_follow_up', 'CNT-SEED-4', 'Advocate B', 'self', 'Self', 'Contact police for FIR', at(0, 15), at(-9, 12), {
      policeStation: 'Tumakuru Town Police Station',
      complaintDate: at(-7, 11),
      investigatingOfficerName: 'SI Gowda',
    }),
    makeAction('1028', 'rescue', 'in_progress', 'na', 'CNT-SEED-2', 'Rescue Team B', 'self', 'Self', 'Confirm animal pickup', at(2, 9), at(-4, 14), {
      animalCondition: 'Fractured hind leg, stable',
    }),
    makeAction('1024', 'legal', 'na', 'police_follow_up', 'self', 'Self', 'self', 'Self', 'Follow up at station', at(4, 10), at(-17, 10), {
      policeStation: 'Whitefield Police Station',
      complaintDate: at(-15, 10),
    }),
    makeAction('1018', 'rescue', 'rescued', 'na', 'CNT-SEED-3', 'Animal Shelter Trust', 'self', 'Self', 'Rescue completed', null, at(-24, 10), {
      animalCondition: 'Wing injury, treated',
      outcome: 'Rescued and handed to shelter',
      isClosed: true,
      closedAt: at(-20, 10),
      closedReason: 'Rescued',
    }),
    makeAction('1018', 'legal', 'na', 'complaint_filed', 'self', 'Self', 'self', 'Self', 'Await police response', at(-18, 10), at(-24, 10), {
      policeStation: 'Mysuru City Police Station',
      complaintDate: at(-22, 10),
    }),
    makeAction('1012', 'legal', 'na', 'concluded', 'CNT-SEED-4', 'Advocate B', 'self', 'Self', 'Case concluded', null, at(-40, 10), {
      policeStation: 'Hassan Town Police Station',
      complaintDate: at(-38, 10),
      firNumber: '88/2025',
      firDate: at(-35, 10),
      court: 'Hassan Magistrate Court',
      courtCaseNumber: 'CC/210/2025',
      outcome: 'Accused convicted and fined',
      isClosed: true,
      closedAt: at(-10, 10),
      closedReason: 'Concluded',
    }),
  ];
  for (const action of actions) {
    await actionsRepository.insert(action, false);
  }

  for (const caseRecord of cases) {
    const rescueAction = actions.find(
      (action) => action.caseId === caseRecord.caseId && action.type === 'rescue',
    );
    const legalAction = actions.find(
      (action) => action.caseId === caseRecord.caseId && action.type === 'legal',
    );
    if (rescueAction || legalAction) {
      await casesRepository.update(
        caseRecord.caseId,
        {
          rescueStatus: rescueAction?.rescueStatus ?? 'na',
          legalStatus: legalAction?.legalStatus ?? 'na',
        },
        false,
      );
    }
  }

  const hearings: Hearing[] = [
    {
      hearingId: 'HRG-1035-1',
      caseId: '1035',
      actionId: 'ACT-1035-legal',
      date: dateOnly(3),
      time: '11:00',
      court: 'Bengaluru Magistrate Court',
      purpose: 'First hearing and chargesheet review',
      attendeeId: 'self',
      attendeeName: 'Self',
      outcome: '',
      result: '',
      nextHearingDate: null,
      status: 'scheduled',
      reminder7d: true,
      reminder3d: true,
      reminder1d: true,
      ...sync(at(-6, 10)),
    },
    {
      hearingId: 'HRG-1035-2',
      caseId: '1035',
      actionId: 'ACT-1035-legal',
      date: dateOnly(-12),
      time: '10:30',
      court: 'Bengaluru Magistrate Court',
      purpose: 'Complaint filing',
      attendeeId: 'CNT-SEED-4',
      attendeeName: 'Advocate B',
      outcome: 'Complaint accepted; FIR ordered',
      result: 'Next hearing scheduled',
      nextHearingDate: dateOnly(3),
      status: 'outcome_recorded',
      reminder7d: true,
      reminder3d: true,
      reminder1d: true,
      ...sync(at(-14, 10)),
    },
  ];
  for (const hearing of hearings) {
    await hearingsRepository.insert(hearing, false);
  }

  const documents: DocumentMeta[] = [
    {
      documentId: 'DOC-1042-1',
      caseId: '1042',
      actionId: 'ACT-1042-rescue',
      category: 'Photos',
      fileName: 'injured-dog.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 248_000,
      localUri: '',
      remoteUrl: '',
      driveFileId: '',
      uploadStatus: 'device-only',
      uploadError: '',
      ...sync(at(-1, 10)),
    },
  ];
  for (const document of documents) {
    await documentsRepository.insert(document, false);
  }

  const history: HistoryEntry[] = [
    makeHistory('1042', 'ACT-1042-rescue', 'created', 'Case #1042 registered', at(-1, 10)),
    makeHistory('1042', 'ACT-1042-rescue', 'created', 'Rescue action created', at(-1, 10)),
    makeHistory('1042', 'ACT-1042-legal', 'created', 'Legal action created', at(-1, 10)),
    makeHistory('1042', 'ACT-1042-rescue', 'assigned', 'Rescue assigned to Self', at(-1, 11)),
    makeHistory('1040', 'ACT-1040-rescue', 'reassigned', 'Rescue assigned to Rescue Team A', at(-2, 12)),
    makeHistory('1035', 'ACT-1035-legal', 'hearing_added', 'Hearing scheduled for 3 days from now', at(-6, 10)),
    makeHistory('1035', 'ACT-1035-legal', 'status_change', 'FIR registered', at(-8, 10)),
    makeHistory('1032', 'ACT-1032-legal', 'updated', 'Called police station; FIR pending', at(-1, 15)),
    makeHistory('1028', 'ACT-1028-rescue', 'status_change', 'Rescue in progress', at(-3, 14)),
    makeHistory('1012', 'ACT-1012-legal', 'hearing_outcome', 'Case concluded', at(-10, 10)),
  ];
  for (const entry of history) {
    await historyRepository.insert(entry, false);
  }

  await updateSettings({ demoSeeded: true });
  return true;
}

export async function resetDemoData(): Promise<void> {
  const seededCaseIds = new Set([
    '1012',
    '1018',
    '1024',
    '1028',
    '1032',
    '1035',
    '1040',
    '1042',
  ]);
  const cases = (await casesRepository.getAll(true)).filter((caseRecord) =>
    seededCaseIds.has(caseRecord.caseId),
  );
  for (const caseRecord of cases) {
    await casesRepository.softDelete(caseRecord.caseId);
  }
  const actions = (await actionsRepository.getAll(true)).filter((action) =>
    seededCaseIds.has(action.caseId),
  );
  for (const action of actions) {
    await actionsRepository.softDelete(action.actionId);
  }
  const hearings = (await hearingsRepository.getAll(true)).filter((hearing) =>
    seededCaseIds.has(hearing.caseId),
  );
  for (const hearing of hearings) {
    await hearingsRepository.softDelete(hearing.hearingId);
  }
  const documents = (await documentsRepository.getAll(true)).filter((document) =>
    seededCaseIds.has(document.caseId),
  );
  for (const document of documents) {
    await documentsRepository.softDelete(document.documentId);
  }
  const contacts = (await contactsRepository.getAll(true)).filter((contact) =>
    contact.contactId.startsWith('CNT-SEED'),
  );
  for (const contact of contacts) {
    await contactsRepository.softDelete(contact.contactId);
  }
  await updateSettings({ demoSeeded: false });
}

export async function ensureDemoSeed(): Promise<void> {
  const settings = getSettings();
  if (settings.demoSeeded) return;
  await seedDemoData(false);
}

export function demoHearingDate(daysFromToday: number): string {
  return combineDateAndTime(dateOnly(daysFromToday), '11:00');
}
