type Tone = 'pine' | 'ochre' | 'brick' | 'moss' | 'ink';

const TONE_MAP: Record<string, Tone> = {
  open: 'pine',
  closed: 'ink',
  High: 'brick',
  Medium: 'ochre',
  Low: 'ink',
  to_attend: 'ochre',
  follow_up: 'ochre',
  in_progress: 'pine',
  rescued: 'moss',
  unsuccessful: 'brick',
  complaint_filed: 'pine',
  police_follow_up: 'ochre',
  fir_registered: 'pine',
  hearing_scheduled: 'pine',
  concluded: 'moss',
  scheduled: 'pine',
  outcome_pending: 'ochre',
  outcome_recorded: 'moss',
  uploaded: 'moss',
  failed: 'brick',
  device_only: 'ink',
  created: 'pine',
  updated: 'ink',
  conflict_resolved: 'brick',
};

export function Badge({
  value,
  tone,
}: {
  value: string | null | undefined;
  tone?: Tone;
}) {
  const text = value || '—';
  const resolved = tone ?? TONE_MAP[text] ?? 'ink';
  return <span className={`badge badge-${resolved}`}>{text.replace(/_/g, ' ')}</span>;
}
