import { Ionicons } from '@expo/vector-icons';
import { colors } from './tokens';

export type ActionStatus = 'to_attend' | 'follow_up' | 'in_progress' | 'closed';

export type RescueStatus =
  | 'to_attend'
  | 'awaiting_confirmation'
  | 'in_progress'
  | 'rescued'
  | 'unsuccessful'
  | 'na';

export type LegalStatus =
  | 'complaint_filed'
  | 'police_follow_up'
  | 'fir_registered'
  | 'hearing_scheduled'
  | 'concluded'
  | 'na';

export type HearingStatus = 'scheduled' | 'outcome_pending' | 'outcome_recorded';

export type Tone = 'pine' | 'ochre' | 'brick' | 'moss' | 'ink';

export interface StatusStyle {
  label: string;
  tone: Tone;
  background: string;
  foreground: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const actionStatusStyles: Record<ActionStatus, StatusStyle> = {
  to_attend: {
    label: 'To attend',
    tone: 'ochre',
    background: colors.ochre100,
    foreground: colors.ochre700,
    icon: 'alert-circle-outline',
  },
  follow_up: {
    label: 'Follow-up',
    tone: 'ochre',
    background: colors.ochre100,
    foreground: colors.ochre700,
    icon: 'hourglass-outline',
  },
  in_progress: {
    label: 'In progress',
    tone: 'pine',
    background: colors.pine100,
    foreground: colors.pine700,
    icon: 'sync-outline',
  },
  closed: {
    label: 'Closed',
    tone: 'ink',
    background: colors.ink100,
    foreground: colors.ink500,
    icon: 'checkmark-done-outline',
  },
};

export const rescueStatusStyles: Record<Exclude<RescueStatus, 'na'>, StatusStyle> = {
  to_attend: {
    label: 'To attend',
    tone: 'ochre',
    background: colors.ochre100,
    foreground: colors.ochre700,
    icon: 'alert-circle-outline',
  },
  awaiting_confirmation: {
    label: 'Awaiting confirmation',
    tone: 'ochre',
    background: colors.ochre100,
    foreground: colors.ochre700,
    icon: 'help-circle-outline',
  },
  in_progress: {
    label: 'Rescue in progress',
    tone: 'pine',
    background: colors.pine100,
    foreground: colors.pine700,
    icon: 'pulse-outline',
  },
  rescued: {
    label: 'Rescued',
    tone: 'moss',
    background: colors.moss100,
    foreground: colors.moss700,
    icon: 'shield-checkmark-outline',
  },
  unsuccessful: {
    label: 'Unsuccessful',
    tone: 'brick',
    background: colors.brick100,
    foreground: colors.brick700,
    icon: 'close-circle-outline',
  },
};

export const legalStatusStyles: Record<Exclude<LegalStatus, 'na'>, StatusStyle> = {
  complaint_filed: {
    label: 'Complaint filed',
    tone: 'pine',
    background: colors.pine100,
    foreground: colors.pine700,
    icon: 'document-text-outline',
  },
  police_follow_up: {
    label: 'Police follow-up',
    tone: 'ochre',
    background: colors.ochre100,
    foreground: colors.ochre700,
    icon: 'time-outline',
  },
  fir_registered: {
    label: 'FIR registered',
    tone: 'pine',
    background: colors.pine100,
    foreground: colors.pine700,
    icon: 'document-attach-outline',
  },
  hearing_scheduled: {
    label: 'Hearing scheduled',
    tone: 'pine',
    background: colors.pine100,
    foreground: colors.pine700,
    icon: 'calendar-outline',
  },
  concluded: {
    label: 'Concluded',
    tone: 'moss',
    background: colors.moss100,
    foreground: colors.moss700,
    icon: 'checkmark-done-outline',
  },
};

export const hearingStatusStyles: Record<HearingStatus, StatusStyle> = {
  scheduled: {
    label: 'Hearing scheduled',
    tone: 'pine',
    background: colors.pine100,
    foreground: colors.pine700,
    icon: 'calendar-outline',
  },
  outcome_pending: {
    label: 'Outcome pending',
    tone: 'ochre',
    background: colors.ochre100,
    foreground: colors.ochre700,
    icon: 'time-outline',
  },
  outcome_recorded: {
    label: 'Outcome recorded',
    tone: 'moss',
    background: colors.moss100,
    foreground: colors.moss700,
    icon: 'checkmark-done-outline',
  },
};

export const urgencyStyles = {
  High: { label: 'High', foreground: colors.brick700, icon: 'arrow-up-outline' as const },
  Medium: { label: 'Medium', foreground: colors.ochre700, icon: 'remove-outline' as const },
  Low: { label: 'Low', foreground: colors.ink500, icon: 'arrow-down-outline' as const },
} as const;

export const toneStyles: Record<Tone, { background: string; foreground: string; border: string }> = {
  pine: { background: colors.pine100, foreground: colors.pine700, border: colors.pine700 },
  ochre: { background: colors.ochre100, foreground: colors.ochre700, border: colors.ochre500 },
  brick: { background: colors.brick100, foreground: colors.brick700, border: colors.brick500 },
  moss: { background: colors.moss100, foreground: colors.moss700, border: colors.moss500 },
  ink: { background: colors.ink100, foreground: colors.ink500, border: colors.ink200 },
};
