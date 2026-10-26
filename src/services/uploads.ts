import { MAX_FILE_SIZE_BYTES } from '@/config/defaults';
import { documentsRepository } from '@/data/repositories/documents';
import { getTransport } from '@/data/transport';
import type { DocumentMeta } from '@/data/types';
import { readFileBase64 } from '@/services/media';

const inFlight = new Set<string>();

export async function uploadDocument(document: DocumentMeta): Promise<void> {
  const transport = getTransport();
  if (transport.mode !== 'remote' || !document.localUri) return;
  if (inFlight.has(document.documentId)) return;
  inFlight.add(document.documentId);
  try {
    if (document.sizeBytes > MAX_FILE_SIZE_BYTES) {
      await documentsRepository.update(document.documentId, {
        uploadStatus: 'failed',
        uploadError: 'File is larger than the 25 MB limit',
      });
      return;
    }
    await documentsRepository.update(document.documentId, { uploadStatus: 'uploading' }, false);
    const base64 = await readFileBase64(document.localUri);
    const uploaded = await transport.uploadMedia({
      caseId: document.caseId,
      category: document.category,
      fileName: document.fileName,
      mimeType: document.mimeType,
      base64,
    });
    await documentsRepository.update(document.documentId, {
      uploadStatus: 'uploaded',
      remoteUrl: uploaded.url,
      driveFileId: uploaded.fileId,
      uploadError: '',
    });
  } catch (error) {
    await documentsRepository.update(document.documentId, {
      uploadStatus: 'failed',
      uploadError: error instanceof Error ? error.message : 'Upload failed',
    });
  } finally {
    inFlight.delete(document.documentId);
  }
}

export async function uploadPendingDocuments(): Promise<number> {
  if (getTransport().mode !== 'remote') return 0;
  const documents = (await documentsRepository.getAll()).filter(
    (document) =>
      !document.isDeleted && document.localUri && document.uploadStatus !== 'uploaded',
  );
  for (const document of documents) {
    await uploadDocument(document);
  }
  return documents.length;
}

export async function retryUpload(documentId: string): Promise<void> {
  const document = await documentsRepository.getById(documentId);
  if (document) await uploadDocument(document);
}
