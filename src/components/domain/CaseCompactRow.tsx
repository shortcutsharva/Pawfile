import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';
import type { WorklistItem } from '@/data/types';
import { formatDate, formatTime } from '@/utils/date';
import { AppText } from '../ui/Text';
import { StatusChip, DuePill, UrgencyTag, PendingChip } from '../ui/StatusChip';
import { QuickActionBar, type QuickAction } from './QuickActionBar';

export function CaseCompactRow({
  item,
  onOpen,
  actions,
  closed = false,
  pending = false,
}: {
  item: WorklistItem;
  onOpen: () => void;
  actions?: QuickAction[];
  closed?: boolean;
  pending?: boolean;
}) {
  const { action, caseRecord, dueState, dueLabel, hearing } = item;
  const status = closed || action.actionStatus === 'closed' ? 'closed' : action.actionStatus;

  return (
    <View style={[styles.card, dueState === 'overdue' && !closed && styles.overdue, closed && styles.closed]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Case #${caseRecord.caseId}, ${caseRecord.title}`}
        onPress={onOpen}
      >
        <View style={styles.titleRow}>
          <AppText variant="caption" color={colors.ink500} style={styles.caseId}>
            #{caseRecord.caseId}
          </AppText>
          <AppText variant="bodyLg" numberOfLines={1} style={styles.flex}>
            {caseRecord.title}
          </AppText>
          <UrgencyTag urgency={caseRecord.urgency} />
        </View>

        <View style={styles.chipsRow}>
          <StatusChip kind="action" status={status} />
          <DuePill state={dueState} label={dueLabel} />
          {pending ? <PendingChip /> : null}
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={colors.ink500} />
          <AppText variant="caption" color={colors.ink500} numberOfLines={1} style={styles.flex}>
            {caseRecord.district}
            {caseRecord.state ? `, ${caseRecord.state}` : ''}
          </AppText>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="person-outline" size={14} color={colors.ink500} />
          <AppText variant="caption" color={colors.ink500} numberOfLines={1} style={styles.flex}>
            {action.assignedToName}
            {action.followUpByName ? ` · Follow-up by ${action.followUpByName}` : ''}
          </AppText>
        </View>

        {caseRecord.complainantPhone ? (
          <View style={styles.metaRow}>
            <Ionicons name="call-outline" size={14} color={colors.ink500} />
            <AppText variant="caption" color={colors.ink500} numberOfLines={1} style={styles.flex}>
              {caseRecord.complainantName
                ? `${caseRecord.complainantName} · ${caseRecord.complainantPhone}`
                : caseRecord.complainantPhone}
            </AppText>
          </View>
        ) : null}

        {action.firNumber ? (
          <View style={styles.metaRow}>
            <Ionicons name="document-text-outline" size={14} color={colors.ink500} />
            <AppText variant="caption" color={colors.ink500} numberOfLines={1} style={styles.flex}>
              FIR {action.firNumber}
              {action.court ? ` · ${action.court}` : ''}
            </AppText>
          </View>
        ) : null}

        {action.nextAction ? (
          <AppText variant="caption" color={colors.ink700} numberOfLines={1} style={styles.next}>
            <AppText variant="caption" color={colors.ink500}>
              NEXT{' '}
            </AppText>
            {action.nextAction}
          </AppText>
        ) : null}

        {hearing ? (
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.pine700} />
            <AppText variant="caption" color={colors.pine700} numberOfLines={1} style={styles.flex}>
              Hearing {formatDate(hearing.date)}, {formatTime(hearing.time)}
            </AppText>
          </View>
        ) : null}
      </Pressable>

      {actions?.length ? <QuickActionBar actions={actions} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.ink100,
    gap: spacing.xs,
    shadowColor: colors.ink900,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  overdue: { borderColor: colors.brick500 },
  closed: { opacity: 0.6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  caseId: { fontVariant: ['tabular-nums'] },
  flex: { flex: 1 },
  chipsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  next: { marginTop: 2 },
});
