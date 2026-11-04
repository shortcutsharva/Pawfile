import assert from 'node:assert/strict';
import test from 'node:test';
import { addDaysToKey, istDateKey } from '../services/dates';
import {
  actionRow,
  caseRow,
  createTestContext,
  getJson,
  hearingRow,
  login,
  postSync,
} from './helpers';

async function seed(context: Awaited<ReturnType<typeof createTestContext>>) {
  await postSync(context, { action: 'push', sheet: 'Cases', rows: [caseRow()] });
  await postSync(context, {
    action: 'push',
    sheet: 'Cases',
    rows: [
      caseRow({
        caseId: '2000',
        title: 'Deleted case',
        isDeleted: true,
        updatedAt: '2026-11-03T00:00:00.000Z',
      }),
    ],
  });
  await postSync(context, {
    action: 'push',
    sheet: 'Actions',
    rows: [
      actionRow({
        dueValue: '2020-01-01T09:00:00.000Z',
        followUpDate: '2020-01-01T09:00:00.000Z',
      }),
    ],
  });
  const hearingDate = addDaysToKey(istDateKey(), 2);
  await postSync(context, {
    action: 'push',
    sheet: 'Hearings',
    rows: [hearingRow({ date: hearingDate })],
  });
  await postSync(context, {
    action: 'push',
    sheet: 'Contacts',
    rows: [
      {
        contactId: 'CNT-1',
        name: 'Rescue Org',
        organization: 'Rescue Org',
        phone: '8888888888',
        phone2: '',
        email: '',
        type: 'NGO',
        state: 'Karnataka',
        district: 'Bengaluru',
        serviceArea: '',
        specialization: '',
        isActive: true,
        isLocalOnly: false,
        createdAt: '2026-11-04T00:00:00.000Z',
        updatedAt: '2026-11-04T00:00:00.000Z',
        syncedAt: null,
        localVersion: 1,
        serverVersion: 0,
        isDeleted: false,
      },
    ],
  });

  const upload = await postSync(context, {
    action: 'uploadMedia',
    caseId: '1043',
    category: 'Photos',
    fileName: 'photo.png',
    mimeType: 'image/png',
    base64: Buffer.from('hello image').toString('base64'),
  });
  const file = upload.json.file as { fileId: string };
  await postSync(context, {
    action: 'push',
    sheet: 'Documents',
    rows: [
      {
        documentId: 'DOC-1',
        caseId: '1043',
        actionId: 'ACT-1043-1',
        category: 'Photos',
        fileName: 'photo.png',
        mimeType: 'image/png',
        sizeBytes: 11,
        localUri: 'file:///private/phone/path.png',
        remoteUrl: '',
        driveFileId: file.fileId,
        uploadStatus: 'uploaded',
        uploadError: '',
        createdAt: '2026-11-04T00:00:00.000Z',
        updatedAt: '2026-11-04T00:00:00.000Z',
        syncedAt: null,
        localVersion: 1,
        serverVersion: 0,
        isDeleted: false,
      },
    ],
  });
  await postSync(context, {
    action: 'push',
    sheet: 'History',
    rows: [
      {
        historyId: 'HST-1',
        caseId: '1043',
        actionId: 'ACT-1043-1',
        eventType: 'created',
        actorName: 'Tester',
        actorDeviceId: 'device-1',
        oldValue: 'x'.repeat(600),
        newValue: '{}',
        description: 'Case created',
        metadata: '{}',
        isConflict: false,
        createdAt: '2026-11-04T00:00:00.000Z',
        syncedAt: null,
      },
    ],
  });
}

test('dashboard login sets a session and protects read APIs', async (t) => {
  const context = await createTestContext();
  t.after(context.close);
  await seed(context);

  const unauthorized = await getJson(context, '/api/dashboard/summary');
  assert.equal(unauthorized.status, 401);

  const wrong = await fetch(`${context.baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: 'wrong-secret' }),
  });
  assert.equal(wrong.status, 401);

  const cookie = await login(context);
  assert.ok(cookie.startsWith('pawfile_session='));
  const session = await getJson(context, '/api/auth/session', cookie);
  assert.deepEqual(session.json, { authenticated: true });

  const summary = await getJson(context, '/api/dashboard/summary', cookie);
  assert.equal(summary.status, 200);
  const totals = summary.json.totals as Record<string, number>;
  assert.equal(totals.cases, 1);
  assert.equal(totals.overdueActions, 1);
  assert.equal(totals.contacts, 1);
  assert.equal((summary.json.recentCases as unknown[]).length, 1);
});

test('dashboard case lists hide soft-deleted records and support search', async (t) => {
  const context = await createTestContext();
  t.after(context.close);
  await seed(context);
  const cookie = await login(context);

  const all = await getJson(context, '/api/dashboard/cases?pageSize=10', cookie);
  const items = all.json.items as Record<string, unknown>[];
  assert.equal(items.length, 1);
  assert.equal(items[0].caseId, '1043');
  assert.equal(items[0].overdueActions, 1);

  const search = await getJson(context, '/api/dashboard/cases?search=Injured', cookie);
  assert.equal((search.json.items as unknown[]).length, 1);

  const missing = await getJson(context, '/api/dashboard/cases?search=nope', cookie);
  assert.equal((missing.json.items as unknown[]).length, 0);

  const deleted = await getJson(context, '/api/dashboard/cases/2000', cookie);
  assert.equal(deleted.status, 404);
});

test('case detail returns documents with minted URLs and no device paths', async (t) => {
  const context = await createTestContext();
  t.after(context.close);
  await seed(context);
  const cookie = await login(context);

  const detail = await getJson(context, '/api/dashboard/cases/1043', cookie);
  assert.equal(detail.status, 200);
  const documents = detail.json.documents as Record<string, unknown>[];
  assert.equal(documents.length, 1);
  assert.equal(documents[0].localUri, undefined);
  assert.ok(String(documents[0].url).startsWith('/api/files/'));

  const history = detail.json.history as Record<string, unknown>[];
  assert.equal(history.length, 1);
  assert.ok(String(history[0].oldValue).length <= 501);
  assert.ok(String(history[0].oldValue).endsWith('…'));

  const documentsList = await getJson(context, '/api/dashboard/documents', cookie);
  assert.equal((documentsList.json.items as unknown[]).length, 1);

  const activity = await getJson(context, '/api/dashboard/activity', cookie);
  assert.equal((activity.json.items as unknown[]).length, 1);
  assert.equal((activity.json.items as Record<string, unknown>[])[0].caseTitle, 'Injured dog');
});

test('dashboard lists contacts and hearings joined with case titles', async (t) => {
  const context = await createTestContext();
  t.after(context.close);
  await seed(context);
  const cookie = await login(context);

  const contacts = await getJson(context, '/api/dashboard/contacts?search=Rescue', cookie);
  assert.equal((contacts.json.items as unknown[]).length, 1);

  const hearings = await getJson(context, '/api/dashboard/hearings', cookie);
  const items = hearings.json.items as Record<string, unknown>[];
  assert.equal(items.length, 1);
  assert.equal(items[0].caseTitle, 'Injured dog');
});

test('login is rate limited after repeated failures', async (t) => {
  const context = await createTestContext();
  t.after(context.close);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(`${context.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'wrong-secret' }),
    });
    assert.equal(response.status, 401);
  }
  const limited = await fetch(`${context.baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: 'wrong-secret' }),
  });
  assert.equal(limited.status, 429);
});
