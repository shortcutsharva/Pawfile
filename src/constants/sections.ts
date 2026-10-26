export const RESCUE_STATUSES = [
  { key: 'to_attend', label: 'To attend' },
  { key: 'awaiting_confirmation', label: 'Awaiting confirmation' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'rescued', label: 'Rescued' },
  { key: 'unsuccessful', label: 'Unsuccessful' },
] as const;

export const LEGAL_STATUSES = [
  { key: 'complaint_filed', label: 'Complaint filed' },
  { key: 'police_follow_up', label: 'Police follow-up' },
  { key: 'fir_registered', label: 'FIR registered' },
  { key: 'hearing_scheduled', label: 'Hearing scheduled' },
  { key: 'concluded', label: 'Concluded' },
] as const;

export const HISTORY_FILTERS = [
  'All',
  'Updates',
  'Assignments',
  'Hearings',
  'Documents',
  'Conflicts',
] as const;
