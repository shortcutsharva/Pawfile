import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, Divider } from '@/components/ui/Layout';
import { AppText } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { FlagBanner } from '@/components/ui/FlagBanner';
import { useSettings, useSyncStatus } from '@/hooks/useAppData';
import { resetDemoData, seedDemoData } from '@/data/seed';
import { backendModeLabel, retryFailedSync } from '@/data/sync/SyncManager';
import { formatDateTime } from '@/utils/date';
import { colors, radius, spacing } from '@/theme/tokens';

export default function DataSettingsScreen() {
  const router = useRouter();
  const settings = useSettings();
  const sync = useSyncStatus();
  const [busy, setBusy] = useState(false);

  const loadDemo = async () => {
    setBusy(true);
    await seedDemoData(true);
    setBusy(false);
    Alert.alert('Demo data loaded', 'Sample cases and contacts are ready on the worklist.');
  };

  const clearDemo = async () => {
    Alert.alert(
      'Remove demo data?',
      'Sample cases, contacts, hearings, and actions are removed from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void resetDemoData();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppBar title="Data and sync" showBack onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Row icon="cloud-outline" label="Backend" value={backendModeLabel()} />
          <Divider />
          <Row icon="swap-vertical-outline" label="Pending writes" value={String(sync.queueDepth)} />
          <Divider />
          <Row
            icon="time-outline"
            label="Last sync"
            value={settings.lastSyncAt ? formatDateTime(settings.lastSyncAt) : 'Never'}
          />
          <Divider />
          <Row icon="wifi-outline" label="Connection" value={sync.online ? 'Online' : 'Offline'} />
          <Button
            label={sync.syncing ? 'Syncing…' : 'Sync now'}
            icon="refresh-outline"
            variant="secondary"
            onPress={() => void retryFailedSync()}
            style={styles.button}
          />
          {sync.error ? <AppText variant="caption" color={colors.brick700}>{sync.error}</AppText> : null}
        </View>

        {sync.mode === 'local' ? (
          <FlagBanner
            tone="info"
            text="Local-only mode. Open Shared backend to connect the Google Sheets database from inside the app."
          />
        ) : null}

        <Pressable
          onPress={() => router.push('/settings/backend' as never)}
          style={styles.linkRow}
          accessibilityRole="button"
        >
          <Ionicons name="cloud-outline" size={22} color={colors.pine700} />
          <View style={styles.flex}>
            <AppText variant="bodyLg">Shared backend</AppText>
            <AppText variant="caption" color={colors.ink500}>
              Apps Script URL and shared secret, stored on this device
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.ink300} />
        </Pressable>

        <View style={styles.card}>
          <Row icon="albums-outline" label="Demo records" value={settings.demoSeeded ? 'Loaded' : 'Not loaded'} />
          <Button
            label="Load demo data"
            variant="secondary"
            loading={busy}
            onPress={() => void loadDemo()}
            style={styles.button}
          />
          <Button label="Remove demo data" variant="ghost" onPress={clearDemo} />
        </View>

        <Pressable
          onPress={() => router.push('/backup')}
          style={styles.linkRow}
          accessibilityRole="button"
        >
          <Ionicons name="download-outline" size={22} color={colors.pine700} />
          <View style={styles.flex}>
            <AppText variant="bodyLg">Backup / export</AppText>
            <AppText variant="caption" color={colors.ink500}>
              JSON or ZIP, complainant details excluded by default
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.ink300} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color={colors.ink500} />
      <AppText variant="body" color={colors.ink500} style={styles.flex}>
        {label}
      </AppText>
      <AppText variant="body">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.base, paddingBottom: 64, gap: spacing.md },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.ink100,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 36 },
  flex: { flex: 1 },
  button: { marginTop: spacing.xs },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.ink100,
    padding: spacing.base,
  },
});
