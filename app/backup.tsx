import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, Divider } from '@/components/ui/Layout';
import { AppText } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { ToggleRow } from '@/components/ui/FormField';
import { FlagBanner } from '@/components/ui/FlagBanner';
import { useAsyncData, useSettings } from '@/hooks/useAppData';
import { casesRepository } from '@/data/repositories/cases';
import { documentsRepository } from '@/data/repositories/documents';
import { historyRepository } from '@/data/repositories/history';
import {
  applyRestore,
  exportBackup,
  latestAutoBackup,
  pickRestoreFile,
  previewRestore,
  runScheduledBackupIfDue,
  type ExportPayload,
} from '@/services/backup';
import { updateSettings } from '@/data/settings';
import { formatDateTime } from '@/utils/date';
import { colors, radius, spacing } from '@/theme/tokens';

export default function BackupScreen() {
  const router = useRouter();
  const settings = useSettings();
  const [includeComplainant, setIncludeComplainant] = useState(false);
  const [includeMedia, setIncludeMedia] = useState(true);
  const [busy, setBusy] = useState(false);

  const loader = useCallback(async () => {
    const [cases, documents, history] = await Promise.all([
      casesRepository.getAll(),
      documentsRepository.getAll(),
      historyRepository.getAll(),
    ]);
    return { cases: cases.length, documents: documents.length, history: history.length };
  }, []);
  const { data: stats } = useAsyncData(loader, { cases: 0, documents: 0, history: 0 }, []);

  const runExport = async () => {
    setBusy(true);
    try {
      await exportBackup({ includeComplainant, includeMedia });
      Alert.alert('Export ready', 'The share sheet has been opened with your backup file.');
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const confirmRestore = async (payload: ExportPayload) => {
    const preview = await previewRestore(payload);
    Alert.alert('Restore preview', preview.messages.join('\n'), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore',
        onPress: () => {
          void applyRestore(payload)
            .then(() => {
              Alert.alert('Restore complete', 'Missing records were added. Nothing was deleted.');
            })
            .catch((error) => {
              Alert.alert(
                'Restore failed',
                error instanceof Error ? error.message : 'Try again.',
              );
            });
        },
      },
    ]);
  };

  const runRestore = async () => {
    try {
      const payload = await pickRestoreFile();
      if (!payload) return;
      await confirmRestore(payload);
    } catch (error) {
      Alert.alert('Restore failed', error instanceof Error ? error.message : 'Try again.');
    }
  };

  const restoreLatest = async () => {
    try {
      const payload = await latestAutoBackup();
      if (!payload) {
        Alert.alert(
          'No automatic backup',
          'Turn on weekly backup and open the app once to create the first copy.',
        );
        return;
      }
      await confirmRestore(payload);
    } catch (error) {
      Alert.alert('Restore failed', error instanceof Error ? error.message : 'Try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppBar title="Backup / export" showBack onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <AppText variant="heading">Current data</AppText>
          <StatRow label="Cases" value={stats.cases} />
          <StatRow label="Documents" value={stats.documents} />
          <StatRow label="History entries" value={stats.history} />
          <AppText variant="caption" color={colors.ink500}>
            Last backup: {settings.lastBackupAt ? formatDateTime(settings.lastBackupAt) : 'Never'}
          </AppText>
        </View>

        <View style={styles.card}>
          <AppText variant="heading">Export</AppText>
          <AppText variant="body" color={colors.ink500}>
            Case data as JSON. With media on, files are bundled as a ZIP archive.
          </AppText>
          <ToggleRow
            label="Include media"
            description="Adds locally stored photos, videos, and documents"
            value={includeMedia}
            onChange={setIncludeMedia}
          />
          <Divider />
          <ToggleRow
            label="Include complainant details"
            description="Name and phone are excluded by default"
            value={includeComplainant}
            onChange={setIncludeComplainant}
          />
          {includeComplainant ? (
            <FlagBanner
              tone="critical"
              text="This file contains complainant contact details. Share it only with people who need them."
            />
          ) : null}
          <Button
            label={busy ? 'Preparing export…' : 'Export now'}
            icon="download-outline"
            loading={busy}
            onPress={() => void runExport()}
          />
        </View>

        <View style={styles.card}>
          <AppText variant="heading">Automatic backup</AppText>
          <ToggleRow
            label="Schedule weekly backup"
            description="Runs when you open the app after 7 days. Keeps the last 4 JSON backups on this device; media is not included."
            value={settings.weeklyBackupEnabled}
            onChange={(value) => {
              void updateSettings({ weeklyBackupEnabled: value }).then(() => {
                if (value) void runScheduledBackupIfDue();
              });
            }}
          />
          <Button
            label="Restore latest automatic backup"
            variant="secondary"
            icon="time-outline"
            onPress={() => void restoreLatest()}
          />
          <AppText variant="caption" color={colors.ink500}>
            Automatic backups stay in this app's private storage. Restore them here; use Export now
            to share a copy.
          </AppText>
        </View>

        <View style={styles.card}>
          <AppText variant="heading">Restore</AppText>
          <AppText variant="body" color={colors.ink500}>
            Restore adds missing records and shows differences before saving. Nothing is deleted.
          </AppText>
          <Button
            label="Choose backup file"
            icon="folder-open-outline"
            variant="secondary"
            onPress={() => void runRestore()}
          />
          <FlagBanner
            tone="info"
            text="Restore is merge-only. Differences are kept as-is and written to history."
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statRow}>
      <AppText variant="body" color={colors.ink500}>
        {label}
      </AppText>
      <AppText variant="body" style={styles.statValue}>
        {value}
      </AppText>
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
    padding: spacing.base,
    gap: spacing.sm,
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', minHeight: 32, alignItems: 'center' },
  statValue: { fontVariant: ['tabular-nums'] },
});
