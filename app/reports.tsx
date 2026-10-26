import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, SectionHeader } from '@/components/ui/Layout';
import { AppText } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/States';
import { useAsyncData } from '@/hooks/useAppData';
import { getReportSummary } from '@/data/services/reports';
import { colors, radius, spacing } from '@/theme/tokens';

export default function ReportsScreen() {
  const router = useRouter();
  const loader = useCallback(() => getReportSummary(), []);
  const { data } = useAsyncData(loader, {
    openActions: 0,
    overdue: 0,
    hearingsThisWeek: 0,
    rescuedThisMonth: 0,
    byStatus: [],
    recentlyConcluded: [],
    cases: [],
    actions: [],
    hearings: [],
  }, []);
  const maxStatus = Math.max(1, ...data.byStatus.map((status) => status.count));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppBar
        title="Reports"
        subtitle="Case counts, not charts"
        showBack
        onBack={() => router.back()}
        right={
          <Pressable onPress={() => router.push('/backup')} accessibilityRole="button" hitSlop={8}>
            <AppText variant="label" color={colors.pine700}>
              Export
            </AppText>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.tiles}>
          <Tile label="Open actions" value={data.openActions} icon="list-outline" />
          <Tile label="Overdue" value={data.overdue} icon="alert-circle-outline" tone={colors.brick700} />
          <Tile label="Hearings this week" value={data.hearingsThisWeek} icon="calendar-outline" />
          <Tile label="Rescued this month" value={data.rescuedThisMonth} icon="shield-checkmark-outline" tone={colors.moss700} />
        </View>

        <SectionHeader title="By status" />
        <View style={styles.statusList}>
          {data.byStatus.length ? (
            data.byStatus.map((status) => (
              <View key={status.label} style={styles.statusRow}>
                <AppText variant="body" style={styles.statusLabel}>
                  {status.label}
                </AppText>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      { width: `${Math.max(4, (status.count / maxStatus) * 100)}%` },
                    ]}
                  />
                </View>
                <AppText variant="body" style={styles.count}>
                  {status.count}
                </AppText>
              </View>
            ))
          ) : (
            <AppText variant="body" color={colors.ink500}>
              No open actions.
            </AppText>
          )}
        </View>

        <SectionHeader title="Recently concluded" />
        {data.recentlyConcluded.length ? (
          data.recentlyConcluded.map((caseRecord) => (
            <Pressable
              key={caseRecord.caseId}
              onPress={() =>
                router.push({ pathname: '/case/[id]', params: { id: caseRecord.caseId } })
              }
              style={styles.concluded}
              accessibilityRole="button"
            >
              <View style={styles.flex}>
                <AppText variant="bodyLg">
                  #{caseRecord.caseId} {caseRecord.title}
                </AppText>
                <AppText variant="caption" color={colors.ink500}>
                  {caseRecord.district} · closed
                </AppText>
              </View>
              <AppText variant="caption" color={colors.ink500}>
                View
              </AppText>
            </Pressable>
          ))
        ) : (
          <EmptyState
            icon="checkmark-done-outline"
            title="No concluded cases yet"
            body="Closed cases appear here."
          />
        )}

        <Button
          label="Export case data"
          icon="download-outline"
          variant="secondary"
          onPress={() => router.push('/backup')}
          style={styles.export}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Tile({
  label,
  value,
  icon,
  tone = colors.pine700,
}: {
  label: string;
  value: number;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  tone?: string;
}) {
  return (
    <View style={styles.tile}>
      <AppText variant="display" color={tone} style={styles.tileValue}>
        {value}
      </AppText>
      <View style={styles.tileLabelRow}>
        <AppText variant="caption" color={colors.ink500}>
          {label}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.base, paddingBottom: 64 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.ink100,
    padding: spacing.base,
  },
  tileValue: { fontVariant: ['tabular-nums'] },
  tileLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusList: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.ink100,
    padding: spacing.md,
    gap: spacing.sm,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusLabel: { width: 90 },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.ink100, overflow: 'hidden' },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.pine500 },
  count: { width: 28, textAlign: 'right', fontVariant: ['tabular-nums'] },
  concluded: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  flex: { flex: 1 },
  export: { marginTop: spacing.lg },
});
