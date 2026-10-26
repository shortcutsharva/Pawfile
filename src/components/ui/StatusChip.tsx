import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { colors, radius, sizes, spacing } from '@/theme/tokens';
import {
  actionStatusStyles,
  hearingStatusStyles,
  legalStatusStyles,
  rescueStatusStyles,
  urgencyStyles,
  type ActionStatus,
  type HearingStatus,
  type LegalStatus,
  type RescueStatus,
  type StatusStyle,
} from '@/theme/status';
import { AppText } from './Text';

type ChipProps =
  | { kind: 'action'; status: ActionStatus }
  | { kind: 'rescue'; status: Exclude<RescueStatus, 'na'> }
  | { kind: 'legal'; status: Exclude<LegalStatus, 'na'> }
  | { kind: 'hearing'; status: HearingStatus }
  | { kind: 'custom'; status: StatusStyle };

export function StatusChip(props: ChipProps) {
  const style =
    props.kind === 'action'
      ? actionStatusStyles[props.status]
      : props.kind === 'rescue'
        ? rescueStatusStyles[props.status]
        : props.kind === 'legal'
          ? legalStatusStyles[props.status]
          : props.kind === 'hearing'
            ? hearingStatusStyles[props.status]
            : props.status;
  return (
    <View
      accessibilityLabel={`Status: ${style.label}`}
      style={[styles.chip, { backgroundColor: style.background }]}
    >
      <Ionicons name={style.icon} size={14} color={style.foreground} />
      <AppText variant="caption" color={style.foreground} numberOfLines={1}>
        {style.label}
      </AppText>
    </View>
  );
}

export function PendingChip() {
  return (
    <View accessibilityLabel="Pending sync" style={[styles.chip, styles.pending]}>
      <Ionicons name="cloud-upload-outline" size={14} color={colors.ink700} />
      <AppText variant="caption" color={colors.ink700} numberOfLines={1}>
        Pending
      </AppText>
    </View>
  );
}

export function UrgencyTag({ urgency }: { urgency: keyof typeof urgencyStyles }) {
  const style = urgencyStyles[urgency];
  return (
    <View style={styles.urgency}>
      <Ionicons name={style.icon} size={14} color={style.foreground} />
      <AppText variant="caption" color={style.foreground}>
        {style.label}
      </AppText>
    </View>
  );
}

export function DuePill({
  state,
  label,
  hearing,
}: {
  state: 'overdue' | 'today' | 'upcoming' | 'none';
  label: string;
  hearing?: boolean;
}) {
  const palette = hearing
    ? { background: colors.pine100, foreground: colors.pine700, icon: 'hammer-outline' as const }
    : state === 'overdue'
      ? { background: colors.brick100, foreground: colors.brick700, icon: 'alert-circle-outline' as const }
      : state === 'today'
        ? { background: colors.ochre100, foreground: colors.ochre700, icon: 'time-outline' as const }
        : state === 'upcoming'
          ? { background: colors.ink100, foreground: colors.ink700, icon: 'calendar-outline' as const }
          : { background: colors.ink100, foreground: colors.ink500, icon: 'calendar-outline' as const };
  return (
    <View style={[styles.due, { backgroundColor: palette.background }]}>
      <Ionicons name={palette.icon} size={14} color={palette.foreground} />
      <AppText variant="caption" color={palette.foreground} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: sizes.chipHeight,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    maxWidth: 200,
  },
  urgency: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  pending: { backgroundColor: colors.ink100 },
  due: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 26,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    maxWidth: 220,
  },
});
