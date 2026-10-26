import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, Divider } from '@/components/ui/Layout';
import { AppText } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { useSettings, useSyncStatus } from '@/hooks/useAppData';
import { backendModeLabel, retryFailedSync } from '@/data/sync/SyncManager';
import { APP_NAME, APP_VERSION, DEVELOPER_EMAIL, DEVELOPER_NAME, DEVELOPER_PHONE } from '@/config/env';
import { callPhone, sanitizePhone } from '@/services/share';
import { formatDateTime } from '@/utils/date';
import { colors, radius, spacing } from '@/theme/tokens';

const MENU: { icon: keyof typeof Ionicons.glyphMap; label: string; description: string; href: string }[] = [
  { icon: 'folder-outline', label: 'All cases', description: 'Browse every case', href: '/cases' },
  { icon: 'calendar-outline', label: 'Calendar', description: 'Hearings and follow-ups', href: '/calendar' },
  { icon: 'people-outline', label: 'Contacts', description: 'People and organizations', href: '/contacts' },
  { icon: 'paw-outline', label: 'Rescue organizations', description: 'Partners by location', href: '/rescue-directory' },
  { icon: 'notifications-outline', label: 'Alerts inbox', description: 'Overdue and upcoming reminders', href: '/alerts' },
  { icon: 'stats-chart-outline', label: 'Reports', description: 'Case counts and recent closures', href: '/reports' },
  { icon: 'settings-outline', label: 'Settings', description: 'Profile, reminders, categories, data', href: '/settings' },
  { icon: 'download-outline', label: 'Backup / export', description: 'Export data and restore a backup', href: '/backup' },
];

const ABOUT_SECTIONS = [
  {
    title: 'About the App',
    body: 'A dedicated case management app built for animal welfare activists, rescuers, NGOs, and advocates. It brings animal cruelty complaints into one central place, helping teams coordinate rescues, manage legal proceedings, and ensure every case receives the attention it needs.',
  },
  {
    title: 'Rescue & Legal Case Management',
    body: 'Track every stage of a case, from the initial complaint and rescue coordination to police follow-ups, FIRs, court hearings, and final outcomes. Assign responsibilities, manage contacts, organize documents, and receive timely reminders so that critical actions and follow-ups are never overlooked.',
  },
  {
    title: 'Built for Real-World Action',
    body: 'Designed for fieldwork, the app prioritizes urgent tasks, clear accountability, and simple, action-driven workflows. With offline support, automatic activity history, privacy-conscious sharing, and organized calendars and reminders, activists can stay coordinated and keep cases moving—even with limited connectivity.',
  },
];

export default function MoreScreen() {
  const router = useRouter();
  const settings = useSettings();
  const sync = useSyncStatus();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppBar title="More" subtitle={APP_NAME} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable
          onPress={() => router.push('/settings/profile')}
          style={styles.profile}
          accessibilityRole="button"
        >
          <View style={styles.avatar}>
            <AppText variant="title" color={colors.pine700}>
              {settings.actorName.slice(0, 1).toUpperCase()}
            </AppText>
          </View>
          <View style={styles.flex}>
            <AppText variant="bodyLg" weight="500">
              {settings.actorName}
            </AppText>
            <AppText variant="caption" color={colors.ink500}>
              Activist display name · {backendModeLabel()}
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.ink300} />
        </Pressable>

        <View style={styles.syncCard}>
          <View style={styles.syncRow}>
            <Ionicons
              name={sync.online ? 'cloud-done-outline' : 'cloud-offline-outline'}
              size={20}
              color={sync.online ? colors.pine700 : colors.ochre700}
            />
            <AppText variant="body" style={styles.flex}>
              {sync.mode === 'remote' ? 'Google Sheets sync' : 'On this device'} ·{' '}
              {sync.syncing ? 'Syncing…' : `${sync.queueDepth} pending`}
            </AppText>
            <Button label="Sync" size="sm" variant="secondary" onPress={() => void retryFailedSync()} />
          </View>
          <AppText variant="caption" color={colors.ink500}>
            Last sync: {settings.lastSyncAt ? formatDateTime(settings.lastSyncAt) : 'Never'}
          </AppText>
          {sync.error ? (
            <AppText variant="caption" color={colors.brick700}>
              {sync.error}
            </AppText>
          ) : null}
        </View>

        <View style={styles.menu}>
          {MENU.map((item, index) => (
            <View key={item.href}>
              <Pressable
                onPress={() => router.push(item.href as never)}
                style={styles.menuRow}
                accessibilityRole="button"
              >
                <View style={styles.menuIcon}>
                  <Ionicons name={item.icon} size={22} color={colors.pine700} />
                </View>
                <View style={styles.flex}>
                  <AppText variant="bodyLg">{item.label}</AppText>
                  <AppText variant="caption" color={colors.ink500}>
                    {item.description}
                  </AppText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.ink300} />
              </Pressable>
              {index < MENU.length - 1 ? <Divider style={styles.divider} /> : null}
            </View>
          ))}
        </View>

        <View style={styles.about}>
          <View style={styles.aboutHeader}>
            <View style={styles.menuIcon}>
              <Ionicons name="information-circle-outline" size={22} color={colors.pine700} />
            </View>
            <AppText variant="bodyLg" weight="600">
              About
            </AppText>
          </View>

          {ABOUT_SECTIONS.map((section) => (
            <View key={section.title} style={styles.aboutSection}>
              <AppText variant="label">{section.title}</AppText>
              <AppText variant="body" color={colors.ink700}>
                {section.body}
              </AppText>
            </View>
          ))}

          <Divider />

          <View style={styles.aboutSection}>
            <AppText variant="label">Developer</AppText>
            <AppText variant="body" color={colors.ink700}>
              {DEVELOPER_NAME}
            </AppText>
          </View>

          <Pressable
            onPress={() => void Linking.openURL(`mailto:${DEVELOPER_EMAIL}`)}
            style={styles.contactRow}
            accessibilityRole="link"
          >
            <Ionicons name="mail-outline" size={18} color={colors.pine700} />
            <AppText variant="body" color={colors.pine700}>
              {DEVELOPER_EMAIL}
            </AppText>
          </Pressable>

          <Pressable
            onPress={() => void callPhone(sanitizePhone(DEVELOPER_PHONE))}
            style={styles.contactRow}
            accessibilityRole="link"
          >
            <Ionicons name="call-outline" size={18} color={colors.pine700} />
            <AppText variant="body" color={colors.pine700}>
              {DEVELOPER_PHONE}
            </AppText>
          </Pressable>
        </View>

        <AppText variant="caption" color={colors.ink500} center style={styles.version}>
          {APP_NAME} V{APP_VERSION} · works offline
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.base, paddingBottom: 64, gap: spacing.md },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.ink100,
    padding: spacing.base,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.pine100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  syncCard: {
    backgroundColor: colors.pine50,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.xs,
  },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  menu: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.ink100,
    paddingHorizontal: spacing.sm,
  },
  menuRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.pine50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { marginLeft: 50 },
  about: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.ink100,
    padding: spacing.base,
    gap: spacing.md,
  },
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  aboutSection: { gap: spacing.xs },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 32,
  },
  version: { marginTop: spacing.sm },
});
