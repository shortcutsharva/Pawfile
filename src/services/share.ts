import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import type { Contact } from '@/data/types';
import { formatDateTime } from '@/utils/date';
import {
  buildRescueShareMessage,
  maskName,
  maskPhone,
  sanitizeDialNumber,
  sanitizePhone,
  type ShareOptions,
} from '@/utils/shareMessage';

export { buildRescueShareMessage, maskName, maskPhone, sanitizeDialNumber, sanitizePhone };
export type { ShareOptions };

export async function openWhatsApp(phone: string, message: string): Promise<void> {
  const number = sanitizePhone(phone);
  const url = number
    ? `https://wa.me/${number}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
  await Linking.openURL(url);
}

export async function copyMessage(message: string): Promise<void> {
  await Clipboard.setStringAsync(message);
}

export async function callPhone(phone: string): Promise<void> {
  const number = sanitizeDialNumber(phone);
  if (!number) return;
  await Linking.openURL(`tel:${number}`);
}

export async function openMap(locationText: string, lat?: number | null, lng?: number | null): Promise<void> {
  const query = lat != null && lng != null ? `${lat},${lng}` : locationText;
  if (!query) return;
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  await Linking.openURL(url);
}

export function contactLabel(contact: Pick<Contact, 'name' | 'organization'>): string {
  return contact.organization || contact.name;
}

export function shareTimestamp(): string {
  return formatDateTime(new Date());
}
