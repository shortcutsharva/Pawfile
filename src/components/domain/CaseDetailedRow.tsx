import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';
import type { WorklistItem } from '@/data/types';
import { formatDate, formatTime } from '@/utils/date';
import { AppText } from '../ui/Text';
import { StatusChip, DuePill, UrgencyTag, PendingChip } from '../ui/StatusChip';
import { Divider } from '../ui/Layout';
import { QuickActionBar, type QuickAction } from './QuickActionBar';

export function CaseDetailedRow({
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
        <View style={styles.topRow}>
          <AppText variant="caption" color={colors.ink500} style={styles.caseId}>
            #{caseRecord.caseId}
          </AppText>
          <View style={styles.topRight}>
            {pending ? <PendingChip /> : null}
            <UrgencyTag urgency={caseRecord.urgency} />
            <StatusChip kind="action" status={status} />
          </View>
        </View>

        <AppText variant="heading" numberOfLines={2} style={styles.title}>
          {caseRecord.title}
        </AppText>

        <View style={styles.locationLine}>
          <Ionicons name="location-outline" size={16} color={colors.ink500} />
          <AppText variant="body" color={colors.ink500} numberOfLines={2} style={styles.flex}>
            {caseRecord.locationText || `${caseRecord.district}${caseRecord.state ? `, ${caseRecord.state}` : ''}`}
          </AppText>
        </View>

        <Divider style={styles.divider} />

        <DetailRow icon="person-outline" label="Assigned to" value={action.assignedToName} />
        <DetailRow icon="person-add-outline" label="Follow-up by" value={action.followUpByName || '—'} />
        {caseRecord.complainantName || caseRecord.complainantPhone ? (
          <DetailRow
            icon={caseRecord.complainantPhone ? 'call-outline' : 'person-outline'}
            label="Complainant"
            value={`${caseRecord.complainantName}${caseRecord.complainantName && caseRecord.complainantPhone ? ' · ' : ''}${caseRecord.complainantPhone}`}
          />
        ) : null}

        <View style={styles.dueRow}>
          <View style={styles.metaLabel}>
            <Ionicons name="time-outline" size={16} color={colors.ink500} />
            <AppText variant="caption" color={colors.ink500}>
              Due
            </AppText>
          </View>
          <DuePill state={dueState} label={dueLabel} />
        </View>

        {hearing ? (
          <DetailRow
            icon="calendar-outline"
            label="Hearing"
            value={`${formatDate(hearing.date)}, ${formatTime(hearing.time)}`}
          />
        ) : null}

        {action.type === 'legal' && action.firNumber ? (
          <DetailRow icon="document-text-outline" label="FIR" value={action.firNumber} />
        ) : null}

        {action.type === 'legal' && action.court ? (
          <DetailRow icon="business-outline" label="Court" value={action.court} />
        ) : null}

        <View style={styles.nextBlock}>
          <AppText variant="caption" color={colors.ink500}>
            NEXT
          </AppText>
          <AppText variant="bodyLg" numberOfLines={2} style={styles.nextText}>
            {action.nextAction || 'No next action set'}
          </AppText>
        </View>
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

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.metaLabel}>
        <Ionicons name={icon} size={16} color={colors.ink500} />
        <AppText variant="caption" color={colors.ink500}>
          {label}
        </AppText>
      </View>
      <AppText variant="body" numberOfLines={1} style={styles.detailValue}>
        {value}
      </AppText>
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
    shadowColor: colors.ink900,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  overdue: { borderColor: colors.brick500 },
  closed: { opacity: 0.6 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  caseId: { fontVariant: ['tabular-nums'] },
  title: { marginTop: spacing.xs },
  locationLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: spacing.xs },
  flex: { flex: 1 },
  divider: { marginVertical: spacing.xs },
  metaLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.base,
    paddingVertical: 3,
  },
  detailValue: { flex: 1, textAlign: 'right' },
  dueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.base,
    paddingVertical: 3,
  },
  nextBlock: { gap: 2, marginTop: spacing.xs },
  nextText: { fontWeight: '500' },
});
