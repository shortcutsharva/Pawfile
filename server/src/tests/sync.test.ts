import assert from 'node:assert/strict';
import test from 'node:test';
import {
  caseRow,
  createTestContext,
  hearingRow,
  postSync,
  TEST_SECRET,
} from './helpers';

test('sync health requires the shared secret and always returns HTTP 200', async (t) => {
  const context = await createTestContext();
  t.after(context.close);

  const rejected = await postSync(context, { action: 'health' }, 'wrong-secret');
  assert.equal(rejected.status, 200);
  assert.deepEqual(rejected.json, { ok: false, error: 'Unauthorized' });

  const accepted = await postSync(context, { action: 'health' });
  assert.equal(accepted.status, 200);
  assert.equal(accepted.json.ok, true);
  assert.equal(accepted.json.service, 'pawfile-server');
});

test('sync accepts the legacy text/plain content type', async (t) => {
  const context = await createTestContext();
  t.after(context.close);

  const response = await fetch(`${context.baseUrl}/api/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'health', secret: TEST_SECRET }),
  });
  assert.equal(response.status, 200);
  assert.equal(((await response.json()) as { ok: boolean }).ok, true);
});

test('push coerces booleans and pull returns the stored row', async (t) => {
  const context = await createTestContext();
  t.after(context.close);

  const pushed = await postSync(context, {
    action: 'push',
    sheet: 'Cases',
    rows: [caseRow()],
  });
  assert.equal(pushed.json.ok, true);
  assert.deepEqual(pushed.json.succeeded, ['1043']);
  assert.deepEqual(pushed.json.failed, []);
  assert.deepEqual(pushed.json.versions, [{ id: '1043', serverVersion: 1 }]);

  const pulled = await postSync(context, {
    action: 'pull',
    sheet: 'Cases',
    since: null,
  });
  const rows = pulled.json.rows as Record<string, unknown>[];
  assert.equal(rows.length, 1);
  assert.equal(rows[0].isDeleted, 0);
  assert.equal(rows[0].title, 'Injured dog');
  assert.equal(rows[0].serverVersion, 1);
});

test('serverVersion increases monotonically while client timestamps are preserved', async (t) => {
  const context = await createTestContext();
  t.after(context.close);

  await postSync(context, { action: 'push', sheet: 'Cases', rows: [caseRow()] });
  const second = await postSync(context, {
    action: 'push',
    sheet: 'Cases',
    rows: [
      caseRow({
        title: 'Injured dog updated',
        updatedAt: '2026-11-04T01:00:00.000Z',
        localVersion: 2,
        serverVersion: 0,
      }),
    ],
  });
  assert.deepEqual(second.json.versions, [{ id: '1043', serverVersion: 2 }]);

  const pulled = await postSync(context, { action: 'pull', sheet: 'Cases' });
  const row = (pulled.json.rows as Record<string, unknown>[])[0];
  assert.equal(row.title, 'Injured dog updated');
  assert.equal(row.createdAt, '2026-11-04T00:00:00.000Z');
  assert.equal(row.updatedAt, '2026-11-04T01:00:00.000Z');
  assert.equal(row.serverVersion, 2);
});

test('history is immutable and the non-sync sheets accept their own columns', async (t) => {
  const context = await createTestContext();
  t.after(context.close);

  const history = {
    historyId: 'HST-1',
    caseId: '1043',
    actionId: '',
    eventType: 'created',
    actorName: 'Tester',
    actorDeviceId: 'device-1',
    oldValue: '',
    newValue: '{}',
    description: 'Case created',
    metadata: '',
    isConflict: false,
    createdAt: '2026-11-04T00:00:00.000Z',
    syncedAt: null,
  };
  const first = await postSync(context, { action: 'push', sheet: 'History', rows: [history] });
  assert.deepEqual(first.json.succeeded, ['HST-1']);
  const retry = await postSync(context, {
    action: 'push',
    sheet: 'History',
    rows: [{ ...history, description: 'Changed on retry' }],
  });
  assert.deepEqual(retry.json.succeeded, ['HST-1']);

  const pulled = await postSync(context, { action: 'pull', sheet: 'History' });
  const rows = pulled.json.rows as Record<string, unknown>[];
  assert.equal(rows[0].description, 'Case created');
  assert.equal(typeof rows[0].syncedAt, 'string');

  const metadata = await postSync(context, {
    action: 'push',
    sheet: 'SyncMetadata',
    rows: [{ key: 'test', value: '1', updatedAt: '2026-11-04T00:00:00.000Z' }],
  });
  assert.deepEqual(metadata.json.succeeded, ['test']);

  const config = await postSync(context, {
    action: 'push',
    sheet: 'Config',
    rows: [{ key: 'animalTypes', value: '["Dog"]', description: 'Types' }],
  });
  assert.deepEqual(config.json.succeeded, ['animalTypes']);
});

test('allocateBlock returns non-overlapping blocks and persists the counter', async (t) => {
  const context = await createTestContext();
  t.after(context.close);

  const first = await postSync(context, {
    action: 'allocateBlock',
    deviceId: 'device-1',
    size: 10,
  });
  const second = await postSync(context, {
    action: 'allocateBlock',
    deviceId: 'device-2',
    size: 5,
  });
  assert.deepEqual(first.json.block, { start: 1000, end: 1009 });
  assert.deepEqual(second.json.block, { start: 1010, end: 1014 });
});

test('tombstones round-trip with isDeleted set', async (t) => {
  const context = await createTestContext();
  t.after(context.close);

  await postSync(context, {
    action: 'push',
    sheet: 'Cases',
    rows: [caseRow({ isDeleted: true })],
  });
  const pulled = await postSync(context, { action: 'pull', sheet: 'Cases' });
  assert.equal((pulled.json.rows as Record<string, unknown>[])[0].isDeleted, 1);
});

test('pull applies a two-minute overlap to absorb clock skew', async (t) => {
  const context = await createTestContext();
  t.after(context.close);

  await postSync(context, { action: 'push', sheet: 'Cases', rows: [caseRow()] });
  const nearFuture = await postSync(context, {
    action: 'pull',
    sheet: 'Cases',
    since: new Date(Date.now() + 60_000).toISOString(),
  });
  assert.equal((nearFuture.json.rows as unknown[]).length, 1);

  const farFuture = await postSync(context, {
    action: 'pull',
    sheet: 'Cases',
    since: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });
  assert.equal((farFuture.json.rows as unknown[]).length, 0);
});

test('a second device receives hearings and actions through the same contract', async (t) => {
  const context = await createTestContext();
  t.after(context.close);

  await postSync(context, {
    action: 'push',
    sheet: 'Hearings',
    rows: [hearingRow()],
  });
  const pulled = await postSync(context, { action: 'pull', sheet: 'Hearings' });
  const row = (pulled.json.rows as Record<string, unknown>[])[0];
  assert.equal(row.hearingId, 'HRG-1043-1');
  assert.equal(row.reminder7d, 1);
});

test('unknown sheets and actions return a useful error without a 500', async (t) => {
  const context = await createTestContext();
  t.after(context.close);

  const unknownSheet = await postSync(context, {
    action: 'pull',
    sheet: 'NotASheet',
  });
  assert.equal(unknownSheet.status, 200);
  assert.deepEqual(unknownSheet.json, { ok: false, error: 'Bad request' });

  const unknownAction = await postSync(context, { action: 'dance' });
  assert.equal(unknownAction.status, 200);
  assert.deepEqual(unknownAction.json, { ok: false, error: 'Bad request' });
});
