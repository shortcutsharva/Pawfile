import { boolInt, bool, num, str, SqliteRepository } from '@/data/repository';
import type { RepositoryOptions } from '@/data/repository';
import type { DocumentCategory, DocumentMeta, UploadStatus } from '@/data/types';

const options: RepositoryOptions<DocumentMeta> = {
  table: 'documents',
  idField: 'documentId',
  sheet: 'Documents',
  rowToEntity: (row): DocumentMeta => ({
    documentId: str(row.documentId),
    caseId: str(row.caseId),
    actionId: str(row.actionId),
    category: str(row.category, 'Photos') as DocumentCategory,
    fileName: str(row.fileName),
    mimeType: str(row.mimeType),
    sizeBytes: Number(row.sizeBytes ?? 0),
    localUri: str(row.localUri),
    remoteUrl: str(row.remoteUrl),
    driveFileId: str(row.driveFileId),
    uploadStatus: str(row.uploadStatus, 'device-only') as UploadStatus,
    uploadError: str(row.uploadError),
    createdAt: str(row.createdAt),
    updatedAt: str(row.updatedAt),
    syncedAt: row.syncedAt ? str(row.syncedAt) : null,
    localVersion: Number(row.localVersion ?? 1),
    serverVersion: Number(row.serverVersion ?? 0),
    isDeleted: bool(row.isDeleted),
  }),
  entityToRow: (entity): Record<string, unknown> => ({
    documentId: entity.documentId,
    caseId: entity.caseId,
    actionId: entity.actionId,
    category: entity.category,
    fileName: entity.fileName,
    mimeType: entity.mimeType,
    sizeBytes: entity.sizeBytes,
    localUri: entity.localUri,
    remoteUrl: entity.remoteUrl,
    driveFileId: entity.driveFileId,
    uploadStatus: entity.uploadStatus,
    uploadError: entity.uploadError,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    syncedAt: entity.syncedAt,
    localVersion: entity.localVersion,
    serverVersion: entity.serverVersion,
    isDeleted: boolInt(entity.isDeleted),
  }),
};

export const documentsRepository = new SqliteRepository<DocumentMeta>(options);
