import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, SectionHeader } from '@/components/ui/Layout';
import { AppText } from '@/components/ui/Text';
import { IconButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/States';
import { useAlerts } from '@/hooks/useDomain';
import { syncNow } from '@/data/sync/SyncManager';
import type { AlertItem } from '@/data/types';
import { colors, radius, spacing } from '@/theme/tokens';

export default function AlertsScreen() {
  const router = useRouter();
  const { data: alerts } = useAlerts();
  const groups: { key: AlertItem['group']; title: string }[] = [
    { key: 'overdue', title: 'Overdue' },
    { key: 'today', title: 'Today' },
    { key: 'later', title: 'Later' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppBar
        title="Alerts"
        subtitle={`${alerts.length} open reminders`}
        showBack
        onBack={() => router.back()}
        right={
          <IconButton icon="refresh-outline" label="Sync now" onPress={() => void syncNow()} />
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        {!alerts.length ? (
          <EmptyState
            icon="notifications-off-outline"
            title="No open reminders"
            body="Overdue actions, follow-ups, and hearings appear here."
          />
        ) : null}
        {groups.map((group) => {
          const items = alerts.filter((alert) => alert.group === group.key);
          if (!items.length) return null;
          return (
            <View key={group.key}>
              <SectionHeader title={group.title} count={items.length} />
              <View style={styles.list}>
                {items.map((alert) => (
                  <Pressable
                    key={alert.id}
                    onPress={() =>
                      router.push({ pathname: '/case/[id]', params: { id: alert.caseId } })
                    }
                    style={styles.row}
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name={
                        alert.kind === 'overdue'
                          ? 'alert-circle-outline'
                          : alert.kind === 'hearing'
                            ? 'calendar-outline'
                            : alert.kind === 'outcome_pending'
                              ? 'time-outline'
                              : 'hourglass-outline'
                      }
                      size={22}
                      color={
                        alert.group === 'overdue'
                          ? colors.brick700
                          : alert.kind === 'hearing'
                            ? colors.pine700
                            : colors.ochre700
                      }
                    />
                    <View style={styles.flex}>
                      <AppText variant="bodyLg" numberOfLines={1}>
                        {alert.title}
                      </AppText>
                      <AppText variant="caption" color={colors.ink500} numberOfLines={1}>
                        {alert.subtitle}
                      </AppText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.ink300} />
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.base, paddingBottom: 64 },
  list: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.ink100,
    paddingHorizontal: spacing.sm,
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  flex: { flex: 1 },
});
