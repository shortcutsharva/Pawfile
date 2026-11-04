import { run } from '@/db/client';
import { actionsRepository } from '@/data/repositories/actions';
import { casesRepository } from '@/data/repositories/cases';
import { contactsRepository } from '@/data/repositories/contacts';
import { documentsRepository } from '@/data/repositories/documents';
import { hearingsRepository } from '@/data/repositories/hearings';
import { getSettings, updateSettings } from '@/data/settings';

const SEEDED_CASE_IDS = new Set([
  '1012',
  '1018',
  '1024',
  '1028',
  '1032',
  '1035',
  '1040',
  '1042',
]);

export async function removeLegacyDemoData(): Promise<void> {
  if (!getSettings().demoSeeded) return;

  const cases = (await casesRepository.getAll(true)).filter((record) =>
    SEEDED_CASE_IDS.has(record.caseId),
  );
  for (const record of cases) {
    await casesRepository.softDelete(record.caseId);
  }

  const actions = (await actionsRepository.getAll(true)).filter((record) =>
    SEEDED_CASE_IDS.has(record.caseId),
  );
  for (const record of actions) {
    await actionsRepository.softDelete(record.actionId);
  }

  const hearings = (await hearingsRepository.getAll(true)).filter((record) =>
    SEEDED_CASE_IDS.has(record.caseId),
  );
  for (const record of hearings) {
    await hearingsRepository.softDelete(record.hearingId);
  }

  const documents = (await documentsRepository.getAll(true)).filter((record) =>
    SEEDED_CASE_IDS.has(record.caseId),
  );
  for (const record of documents) {
    await documentsRepository.softDelete(record.documentId);
  }

  const contacts = (await contactsRepository.getAll(true)).filter((record) =>
    record.contactId.startsWith('CNT-SEED'),
  );
  for (const record of contacts) {
    await contactsRepository.softDelete(record.contactId);
  }

  await run("DELETE FROM history WHERE historyId LIKE 'HST-SEED-%'");
  await updateSettings({ demoSeeded: false });
}
