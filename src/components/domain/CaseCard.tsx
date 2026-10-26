import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, sizes, spacing } from '@/theme/tokens';
import type { WorklistItem } from '@/data/types';
import { formatDate, formatTime } from '@/utils/date';
import { AppText } from '../ui/Text';
import { StatusChip, DuePill, UrgencyTag, PendingChip } from '../ui/StatusChip';
import { Divider } from '../ui/Layout';
import { QuickActionBar, type QuickAction } from './QuickActionBar';

export function CaseCard({
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
  const { action, caseRecord, dueState, dueLabel, hasNextAction, hearing } = item;
  return (
    <View style={[styles.card, dueState === 'overdue' && !closed && styles.overdue, closed && styles.closed]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Case #${caseRecord.caseId}, ${caseRecord.title}, ${action.assignedToName}`}
        onPress={onOpen}
      >
        <View style={styles.topRow}>
          <View style={styles.caseIdRow}>
            <AppText variant="caption" color={colors.ink500} style={styles.caseId}>
              #{caseRecord.caseId}
            </AppText>
            {pending ? <PendingChip /> : null}
          </View>
          {closed || action.actionStatus === 'closed' ? (
            <StatusChip kind="action" status="closed" />
          ) : (
            <StatusChip kind="action" status={action.actionStatus} />
          )}
        </View>

        <View style={styles.titleRow}>
          <AppText variant="heading" numberOfLines={1} style={styles.title}>
            {caseRecord.title}
          </AppText>
          <UrgencyTag urgency={caseRecord.urgency} />
        </View>

        <View style={styles.metaLine}>
          <Ionicons name="location-outline" size={16} color={colors.ink500} />
          <AppText variant="body" color={colors.ink500} numberOfLines={1} style={styles.flex}>
            {caseRecord.district}
            {caseRecord.state ? `, ${caseRecord.state}` : ''}
          </AppText>
        </View>

        {hasNextAction ? (
          <View style={styles.nextBlock}>
            <AppText variant="caption" color={colors.ink500}>
              NEXT
            </AppText>
            <AppText variant="bodyLg" numberOfLines={2} style={styles.nextText}>
              {action.nextAction}
            </AppText>
          </View>
        ) : (
          <View style={styles.noNext}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.ochre700} />
            <AppText variant="body" color={colors.ochre700} style={styles.flex}>
              No next action set
            </AppText>
          </View>
        )}

        {hearing && !closed ? (
          <View style={styles.hearingLine}>
            <Ionicons name="calendar-outline" size={16} color={colors.pine700} />
            <AppText variant="body" color={colors.pine700} numberOfLines={1}>
              Hearing {formatDate(hearing.date)}, {formatTime(hearing.time)}
            </AppText>
          </View>
        ) : null}

        <View style={styles.bottomRow}>
          <DuePill state={dueState} label={dueLabel} />
          <View style={styles.assignee}>
            <Ionicons name="person-outline" size={16} color={colors.ink700} />
            <AppText variant="body" color={colors.ink700} numberOfLines={1} style={styles.assigneeText}>
              {action.assignedToName}
            </AppText>
          </View>
        </View>

        {action.followUpByName && action.followUpByName !== action.assignedToName ? (
          <AppText variant="caption" color={colors.ink500}>
            Follow-up: {action.followUpByName}
          </AppText>
        ) : null}
      </Pressable>

      {actions?.length ? (
        <>
          <Divider style={styles.divider} />
          <QuickActionBar actions={actions} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: sizes.cardPadding,
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
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  caseIdRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  caseId: { fontVariant: ['tabular-nums'] },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1 },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flex: { flex: 1 },
  nextBlock: { gap: 2, marginTop: 2 },
  nextText: { fontWeight: '500' },
  noNext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.ochre100,
    borderRadius: radius.input,
    padding: spacing.sm,
  },
  hearingLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  assignee: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  assigneeText: { flexShrink: 1 },
  divider: { marginTop: spacing.sm },
});
