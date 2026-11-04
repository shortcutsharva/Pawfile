import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Db } from '../db';
import { createFileToken } from '../auth';

export const ALLOWED_MEDIA_CATEGORIES = ['Photos', 'Evidence', 'Documents'] as const;
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/quicktime',
  'application/pdf',
] as const;

const CASE_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
const MAX_FILE_NAME = 120;
const BASE64_PATTERN = /^[A-Za-z0-9+/=\s]*$/;

export interface UploadInput {
  caseId: string;
  category: string;
  fileName: string;
  mimeType: string;
  base64: string;
}

export interface UploadResult {
  fileId: string;
  url: string;
}

export interface MediaFileRow {
  fileId: string;
  caseId: string;
  category: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storedPath: string;
  createdAt: string;
}

function safeFileName(value: string): string {
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[\\/]/g, '_')
    .trim();
  const name = cleaned || `file-${Date.now()}`;
  if (name.length <= MAX_FILE_NAME) return name;
  const extensionIndex = name.lastIndexOf('.');
  const extension = extensionIndex > -1 ? name.slice(extensionIndex, extensionIndex + 10) : '';
  return `${name.slice(0, MAX_FILE_NAME - extension.length)}${extension}`;
}

function safeCategory(value: string): (typeof ALLOWED_MEDIA_CATEGORIES)[number] {
  return (ALLOWED_MEDIA_CATEGORIES as readonly string[]).includes(value)
    ? (value as (typeof ALLOWED_MEDIA_CATEGORIES)[number])
    : 'Documents';
}

export function saveUpload(
  db: Db,
  uploadsDir: string,
  secret: string,
  input: UploadInput,
  maxUploadBytes: number,
): UploadResult {
  if (!CASE_ID_PATTERN.test(input.caseId)) throw new Error('Invalid caseId');
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(input.mimeType)) {
    throw new Error('Unsupported file type');
  }
  if (!input.base64 || !input.base64.trim()) throw new Error('Missing file data');
  if (!BASE64_PATTERN.test(input.base64)) throw new Error('Invalid file data');

  const estimatedBytes = Math.ceil((input.base64.length * 3) / 4);
  if (estimatedBytes > maxUploadBytes) throw new Error('File is too large');

  const buffer = Buffer.from(input.base64, 'base64');
  if (!buffer.length) throw new Error('Missing file data');
  if (buffer.length > maxUploadBytes) throw new Error('File is too large');

  const category = safeCategory(input.category);
  const fileName = safeFileName(input.fileName);
  const fileId = randomUUID();
  const storedPath = `${input.caseId}/${category}/${fileId}-${fileName}`;
  const absolutePath = resolveStoredPath(uploadsDir, storedPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, buffer);

  db.prepare(
    `INSERT INTO media_files (fileId, caseId, category, fileName, mimeType, sizeBytes, storedPath, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    fileId,
    input.caseId,
    category,
    fileName,
    input.mimeType,
    buffer.length,
    storedPath,
    new Date().toISOString(),
  );

  return {
    fileId,
    url: `/api/files/${fileId}?token=${createFileToken(secret, fileId)}`,
  };
}

export function resolveStoredPath(uploadsDir: string, storedPath: string): string {
  const root = path.resolve(uploadsDir);
  const resolved = path.resolve(root, ...storedPath.split('/'));
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error('Invalid file path');
  }
  return resolved;
}

export function getMediaFile(db: Db, fileId: string): MediaFileRow | null {
  const row = db.prepare('SELECT * FROM media_files WHERE fileId = ?').get(fileId) as
    | MediaFileRow
    | undefined;
  return row ?? null;
}
