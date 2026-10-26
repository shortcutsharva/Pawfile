import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '@/theme/tokens';
import type { HistoryEntry } from '@/data/types';
import { formatDateTime } from '@/utils/date';
import { AppText } from '../ui/Text';

const eventColors: Record<string, string> = {
  created: colors.pine700,
  updated: colors.pine700,
  status_change: colors.pine700,
  assigned: colors.pine700,
  reassigned: colors.pine700,
  note_added: colors.ochre600,
  document_added: colors.pine700,
  document_removed: colors.brick600,
  hearing_added: colors.pine700,
  hearing_outcome: colors.moss600,
  case_closed: colors.moss600,
  case_reopened: colors.ochre600,
  conflict_resolved: colors.brick600,
  restored: colors.ochre600,
};

export function TimelineEntry({ entry }: { entry: HistoryEntry }) {
  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <View
          style={[
            styles.dot,
            { backgroundColor: eventColors[entry.eventType] ?? colors.ink500 },
          ]}
        />
        <View style={styles.line} />
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <AppText variant="caption" color={colors.ink500} style={styles.time}>
            {formatDateTime(entry.createdAt)}
          </AppText>
          {entry.isConflict ? (
            <View style={styles.conflict}>
              <Ionicons name="git-compare-outline" size={12} color={colors.brick700} />
              <AppText variant="caption" color={colors.brick700}>
                Sync conflict
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText variant="bodyLg">{entry.description}</AppText>
        {entry.actorName ? (
          <AppText variant="caption" color={colors.ink500}>
            By {entry.actorName}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  rail: { width: 12, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  line: { flex: 1, width: 2, backgroundColor: colors.ink200, marginTop: 2 },
  content: { flex: 1, paddingBottom: spacing.lg, gap: 2 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  time: { fontVariant: ['tabular-nums'] },
  conflict: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.brick100,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});
