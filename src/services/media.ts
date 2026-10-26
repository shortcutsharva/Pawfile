import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '@/config/defaults';
import type { DraftMedia } from '@/data/types';

export interface MediaPickResult {
  media: DraftMedia[];
  errors: string[];
}

function extensionFromName(name: string): string {
  const parts = name.split('.');
  return parts.length > 1 ? `.${parts.pop()}` : '';
}

function mimeFromName(name: string): string {
  const extension = extensionFromName(name).toLowerCase();
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.heic': 'image/heic',
    '.heif': 'image/heif',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.pdf': 'application/pdf',
  };
  return map[extension] ?? 'application/octet-stream';
}

async function toDraft(asset: {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
}): Promise<MediaPickResult> {
  const errors: string[] = [];
  const name = asset.fileName || `media-${Date.now()}`;
  const mimeType = asset.mimeType || mimeFromName(name);
  let size = asset.fileSize ?? 0;
  if (!size) {
    const info = await FileSystem.getInfoAsync(asset.uri);
    size = info.exists && 'size' in info ? info.size ?? 0 : 0;
  }
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    errors.push(`${name}: file type is not supported`);
  }
  if (size > MAX_FILE_SIZE_BYTES) {
    errors.push(`${name}: larger than 25 MB`);
  }
  if (errors.length) return { media: [], errors };
  return {
    media: [
      {
        id: Crypto.randomUUID(),
        uri: asset.uri,
        fileName: name,
        mimeType,
        sizeBytes: size,
      },
    ],
    errors,
  };
}

export async function pickMediaFromLibrary(): Promise<MediaPickResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { media: [], errors: ['Photo access is required to attach media'] };
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    allowsMultipleSelection: true,
    quality: 0.8,
  });
  if (result.canceled) return { media: [], errors: [] };
  const collected: DraftMedia[] = [];
  const errors: string[] = [];
  for (const asset of result.assets) {
    const draft = await toDraft(asset);
    collected.push(...draft.media);
    errors.push(...draft.errors);
  }
  return { media: collected, errors };
}

export async function takePhoto(): Promise<MediaPickResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    return { media: [], errors: ['Camera access is required'] };
  }
  const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
  if (result.canceled) return { media: [], errors: [] };
  return toDraft(result.assets[0]);
}

export async function pickDocuments(): Promise<MediaPickResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ALLOWED_MIME_TYPES,
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return { media: [], errors: [] };
  const collected: DraftMedia[] = [];
  const errors: string[] = [];
  for (const asset of result.assets) {
    const draft = await toDraft({
      uri: asset.uri,
      fileName: asset.name,
      mimeType: asset.mimeType,
      fileSize: asset.size,
    });
    collected.push(...draft.media);
    errors.push(...draft.errors);
  }
  return { media: collected, errors };
}

export async function readFileBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

export async function mediaSizeLabel(sizeBytes: number): Promise<string> {
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
