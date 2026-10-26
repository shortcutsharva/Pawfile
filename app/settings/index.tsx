import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, Divider } from '@/components/ui/Layout';
import { AppText } from '@/components/ui/Text';
import { useAppConfig, useSettings, useSyncStatus } from '@/hooks/useAppData';
import { backendModeLabel, retryFailedSync } from '@/data/sync/SyncManager';
import { formatDateTime } from '@/utils/date';
import { APP_NAME, APP_VERSION, DEVELOPER_EMAIL, DEVELOPER_NAME } from '@/config/env';
import { colors, radius, spacing } from '@/theme/tokens';

export default function SettingsScreen() {
  const router = useRouter();
  const settings = useSettings();
  const config = useAppConfig();
  const sync = useSyncStatus();

  const rows: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; href?: string }[] = [
    { icon: 'person-outline', label: 'Profile', value: settings.actorName, href: '/settings/profile' },
    {
      icon: 'notifications-outline',
      label: 'Reminders',
      value: `${settings.hearingLeads.join(' / ')} days · ${settings.followUpDefaultTime}`,
      href: '/settings/reminders',
    },
    {
      icon: 'pricetags-outline',
      label: 'Categories',
      value: `${config.animalTypes.length} animals · ${config.complaintCategories.length} categories`,
      href: '/settings/categories',
    },
    {
      icon: 'cloud-outline',
      label: 'Data and sync',
      value: `${backendModeLabel()} · ${settings.lastSyncAt ? formatDateTime(settings.lastSyncAt) : 'never'}`,
      href: '/settings/data',
    },
    {
      icon: 'download-outline',
      label: 'Backup / export',
      value: `${settings.weeklyBackupEnabled ? 'Weekly · ' : ''}${
        settings.lastBackupAt ? `Last ${formatDateTime(settings.lastBackupAt)}` : 'No backup yet'
      }`,
      href: '/backup',
    },
    { icon: 'text-outline', label: 'Display', value: 'Follows system text size' },
    {
      icon: 'color-palette-outline',
      label: 'Style gallery',
      value: 'Tokens and component states',
      href: '/style-gallery',
    },
    { icon: 'information-circle-outline', label: 'About', value: `${APP_NAME} V${APP_VERSION}` },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppBar title="Settings" showBack onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.group}>
          {rows.map((row, index) => (
            <View key={row.label}>
              <Pressable
                onPress={() => (row.href ? router.push(row.href as never) : undefined)}
                style={styles.row}
                accessibilityRole={row.href ? 'button' : 'text'}
              >
                <View style={styles.icon}>
                  <Ionicons name={row.icon} size={22} color={colors.pine700} />
                </View>
                <View style={styles.flex}>
                  <AppText variant="bodyLg">{row.label}</AppText>
                  <AppText variant="caption" color={colors.ink500} numberOfLines={1}>
                    {row.value}
                  </AppText>
                </View>
                {row.href ? <Ionicons name="chevron-forward" size={18} color={colors.ink300} /> : null}
              </Pressable>
              {index < rows.length - 1 ? <Divider style={styles.divider} /> : null}
            </View>
          ))}
        </View>

        <View style={styles.syncCard}>
          <AppText variant="bodyLg">Sync now</AppText>
          <AppText variant="caption" color={colors.ink500}>
            {sync.mode === 'remote'
              ? 'Connected to the shared Google Sheet.'
              : 'Local-only mode. Open Data and sync → Shared backend to connect the shared database.'}
          </AppText>
          <Pressable
            onPress={() => void retryFailedSync()}
            style={styles.syncButton}
            accessibilityRole="button"
          >
            <Ionicons name="refresh-outline" size={18} color={colors.pine700} />
            <AppText variant="label" color={colors.pine700}>
              {sync.syncing ? 'Syncing…' : `Sync (${sync.queueDepth} pending)`}
            </AppText>
          </Pressable>
        </View>

        <View style={styles.credit}>
          <AppText variant="caption" color={colors.ink500} center>
            Developed by {DEVELOPER_NAME}
          </AppText>
          <Pressable
            onPress={() => void Linking.openURL(`mailto:${DEVELOPER_EMAIL}`)}
            accessibilityRole="link"
            accessibilityLabel={`Email ${DEVELOPER_NAME} at ${DEVELOPER_EMAIL}`}
            hitSlop={8}
          >
            <AppText variant="caption" color={colors.pine700} center>
              {DEVELOPER_EMAIL}
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.base, paddingBottom: 64, gap: spacing.md },
  group: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.ink100,
    paddingHorizontal: spacing.sm,
  },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  icon: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.pine50, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  divider: { marginLeft: 50 },
  syncCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.ink100,
    padding: spacing.base,
    gap: spacing.xs,
  },
  syncButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
  },
  credit: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
});
