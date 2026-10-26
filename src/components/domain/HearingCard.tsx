import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';
import type { Hearing } from '@/data/types';
import { hearingStatusFor } from '@/data/services/hearingService';
import { formatTime, toDate } from '@/utils/date';
import { AppText } from '../ui/Text';
import { StatusChip } from '../ui/StatusChip';

export function HearingCard({
  hearing,
  onPress,
  onRecordOutcome,
}: {
  hearing: Hearing;
  onPress?: () => void;
  onRecordOutcome?: () => void;
}) {
  const status = hearingStatusFor(hearing);
  const date = toDate(hearing.date);
  const day = date ? String(date.getDate()).padStart(2, '0') : '--';
  const month = date ? date.toLocaleString('en-IN', { month: 'short' }) : '';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Hearing on ${hearing.date} at ${hearing.time}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
    >
      <View style={styles.dateBlock}>
        <AppText variant="heading" style={styles.day}>
          {day}
        </AppText>
        <AppText variant="caption" color={colors.ink500}>
          {month}
        </AppText>
      </View>
      <View style={styles.content}>
        <AppText variant="bodyLg" numberOfLines={1}>
          {hearing.court || 'Court not set'}
        </AppText>
        <AppText variant="body" color={colors.ink500} numberOfLines={1}>
          {hearing.purpose || 'Hearing'}
        </AppText>
        <View style={styles.metaRow}>
          <Ionicons name="person-outline" size={14} color={colors.ink500} />
          <AppText variant="body" color={colors.ink500} numberOfLines={1} style={styles.flex}>
            {hearing.attendeeName || 'Self'}
          </AppText>
          <AppText variant="caption" color={colors.ink500}>
            {formatTime(hearing.time)}
          </AppText>
        </View>
        <View style={styles.reminderRow}>
          {hearing.reminder7d ? <ReminderChip label="7d" /> : null}
          {hearing.reminder3d ? <ReminderChip label="3d" /> : null}
          {hearing.reminder1d ? <ReminderChip label="1d" /> : null}
        </View>
      </View>
      <View style={styles.right}>
        <StatusChip kind="hearing" status={status} />
        {status === 'outcome_pending' && onRecordOutcome ? (
          <Pressable onPress={onRecordOutcome} accessibilityRole="button" style={styles.recordButton}>
            <AppText variant="caption" color={colors.pine700}>
              Record outcome
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

function ReminderChip({ label }: { label: string }) {
  return (
    <View style={styles.reminderChip}>
      <AppText variant="caption" color={colors.ink500}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.ink100,
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  dateBlock: {
    width: 46,
    alignItems: 'center',
    backgroundColor: colors.pine50,
    borderRadius: radius.input,
    paddingVertical: spacing.sm,
  },
  day: { fontVariant: ['tabular-nums'] },
  content: { flex: 1, gap: 2 },
  flex: { flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reminderRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  reminderChip: {
    borderWidth: 1,
    borderColor: colors.ink200,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  right: { alignItems: 'flex-end', gap: spacing.xs, maxWidth: 130 },
  recordButton: {
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.input,
    backgroundColor: colors.pine100,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
