import { INDIA_DISTRICTS, INDIA_STATES_AND_UTS } from './indiaLocations';

export const ANIMAL_TYPES = ['Dog', 'Cat', 'Cow', 'Cattle', 'Bird', 'Other'] as const;

export const COMPLAINT_CATEGORIES = [
  'Cruelty',
  'Abandonment',
  'Injury',
  'Neglect',
  'Illegal transport',
  'Other',
] as const;

export const URGENCY_LEVELS = ['High', 'Medium', 'Low'] as const;

export const COMPLAINT_SOURCES = ['WhatsApp', 'Facebook', 'Phone', 'Walk-in', 'Other'] as const;

export const CONTACT_TYPE_OPTIONS = [
  'NGO',
  'Rescuer',
  'Vet',
  'Shelter',
  'Police',
  'Legal',
  'Volunteer',
] as const;

export const RESCUE_TYPES = ['NGO', 'Rescuer', 'Shelter', 'Volunteer'] as const;

export const KARNATAKA_DISTRICTS = INDIA_DISTRICTS.Karnataka;

export const STATES = [...INDIA_STATES_AND_UTS, 'Other'] as const;

export function districtsForState(state: string): readonly string[] {
  const districts = INDIA_DISTRICTS[state];
  if (!districts?.length) return [];
  return [...districts, 'Other'];
}

export const DEFAULT_HEARING_LEADS = [7, 3, 1];
export const DEFAULT_FOLLOW_UP_TIME = '09:00';
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/quicktime',
  'application/pdf',
];

export const ACTIVE_STATUSES = ['to_attend', 'follow_up', 'in_progress'] as const;
