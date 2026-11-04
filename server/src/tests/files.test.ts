import assert from 'node:assert/strict';
import test from 'node:test';
import { createFileToken } from '../auth';
import { createTestContext, postSync } from './helpers';

const PNG_BASE64 = Buffer.from('hello image').toString('base64');

test('upload stores a file and serves it through a signed URL', async (t) => {
  const context = await createTestContext();
  t.after(context.close);

  const uploaded = await postSync(context, {
    action: 'uploadMedia',
    caseId: '1043',
    category: 'Photos',
    fileName: 'photo.png',
    mimeType: 'image/png',
    base64: PNG_BASE64,
  });
  assert.equal(uploaded.json.ok, true);
  const file = uploaded.json.file as { fileId: string; url: string };
  assert.ok(file.fileId);
  assert.ok(file.url.startsWith(`/api/files/${file.fileId}?token=`));

  const response = await fetch(`${context.baseUrl}${file.url}`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(await response.text(), 'hello image');
});

test('file URLs reject bad tokens and query-string secrets', async (t) => {
  const context = await createTestContext();
  t.after(context.close);

  const uploaded = await postSync(context, {
    action: 'uploadMedia',
    caseId: '1043',
    category: 'Evidence',
    fileName: 'evidence.pdf',
    mimeType: 'application/pdf',
    base64: PNG_BASE64,
  });
  const file = uploaded.json.file as { fileId: string; url: string };

  const badToken = await fetch(`${context.baseUrl}/api/files/${file.fileId}?token=bad`);
  assert.equal(badToken.status, 403);

  const secretInstead = await fetch(
    `${context.baseUrl}/api/files/${file.fileId}?secret=${encodeURIComponent(context.config.sharedSecret)}`,
  );
  assert.equal(secretInstead.status, 403);
});

test('media paths cannot escape the uploads directory', async (t) => {
  const context = await createTestContext();
  t.after(context.close);

  context.db
    .prepare(
      `INSERT INTO media_files (fileId, caseId, category, fileName, mimeType, sizeBytes, storedPath, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      'traversal',
      '1043',
      'Photos',
      'passwd',
      'image/png',
      4,
      '../../etc/passwd',
      new Date().toISOString(),
    );

  const token = createFileToken(context.config.sharedSecret, 'traversal');
  const response = await fetch(`${context.baseUrl}/api/files/traversal?token=${token}`);
  assert.equal(response.status, 404);
});

test('upload validation rejects oversized files, bad MIME types, and bad case ids', async (t) => {
  const context = await createTestContext({ maxUploadBytes: 8 });
  t.after(context.close);

  const oversized = await postSync(context, {
    action: 'uploadMedia',
    caseId: '1043',
    category: 'Photos',
    fileName: 'big.png',
    mimeType: 'image/png',
    base64: Buffer.from('more than eight bytes').toString('base64'),
  });
  assert.deepEqual(oversized.json, { ok: false, error: 'File is too large' });

  const badMime = await postSync(context, {
    action: 'uploadMedia',
    caseId: '1043',
    category: 'Photos',
    fileName: 'x.svg',
    mimeType: 'image/svg+xml',
    base64: PNG_BASE64,
  });
  assert.deepEqual(badMime.json, { ok: false, error: 'Unsupported file type' });

  const badCase = await postSync(context, {
    action: 'uploadMedia',
    caseId: '../escape',
    category: 'Photos',
    fileName: 'x.png',
    mimeType: 'image/png',
    base64: PNG_BASE64,
  });
  assert.equal(badCase.json.ok, false);
});

test('upload requires the shared secret', async (t) => {
  const context = await createTestContext();
  t.after(context.close);

  const rejected = await postSync(
    context,
    {
      action: 'uploadMedia',
      caseId: '1043',
      category: 'Photos',
      fileName: 'photo.png',
      mimeType: 'image/png',
      base64: PNG_BASE64,
    },
    'wrong-secret',
  );
  assert.deepEqual(rejected.json, { ok: false, error: 'Unauthorized' });
});
