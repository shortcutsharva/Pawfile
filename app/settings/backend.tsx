import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, Divider } from '@/components/ui/Layout';
import { AppText } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { FlagBanner } from '@/components/ui/FlagBanner';
import { TextField } from '@/components/ui/FormField';
import {
  clearBackendCredentials,
  getBackendCredentials,
  getBackendSource,
  saveBackendCredentials,
  type BackendSource,
} from '@/data/backendSettings';
import { resetTransport } from '@/data/transport';
import { AppsScriptTransport } from '@/data/transport/AppsScriptTransport';
import {
  backfillLocalRecords,
  backendModeLabel,
  resetRemoteBackfill,
  syncNow,
} from '@/data/sync/SyncManager';
import { updateSettings } from '@/data/settings';
import { validateBackendCredentials } from '@/utils/backend';
import { colors, radius, spacing } from '@/theme/tokens';

type Feedback = { tone: 'success' | 'critical' | 'info'; text: string };

export default function BackendSettingsScreen() {
  const router = useRouter();
  const initial = getBackendCredentials();
  const [endpoint, setEndpoint] = useState(initial?.endpoint ?? '');
  const [secret, setSecret] = useState(initial?.secret ?? '');
  const [source, setSource] = useState<BackendSource>(getBackendSource());
  const [errors, setErrors] = useState<{ endpoint?: string; secret?: string }>({});
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);

  const test = async () => {
    const next = validateBackendCredentials(endpoint, secret);
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    setFeedback(null);
    try {
      const transport = new AppsScriptTransport({
        endpoint: endpoint.trim(),
        secret: secret.trim(),
      });
      const ok = await transport.health();
      setFeedback(
        ok
          ? { tone: 'success', text: 'Connection successful. The backend accepted the secret.' }
          : {
              tone: 'critical',
              text: 'Could not reach the backend. Check the URL, secret, and deployment access.',
            },
      );
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    const next = validateBackendCredentials(endpoint, secret);
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    setFeedback(null);
    try {
      await saveBackendCredentials({ endpoint, secret });
      resetTransport();
      resetRemoteBackfill();
      await updateSettings({ lastSyncAt: null });
      const queued = await backfillLocalRecords();
      const result = await syncNow();
      setSource('saved');
      setFeedback(
        result.status === 'error'
          ? {
              tone: 'critical',
              text: `Saved, but the first sync failed: ${result.error ?? 'unknown error'}`,
            }
          : {
              tone: 'success',
              text: `Saved. ${queued} device records queued; pushed ${result.pushed}, pulled ${result.pulled}.`,
            },
      );
    } catch (error) {
      setFeedback({
        tone: 'critical',
        text: error instanceof Error ? error.message : 'Could not save the backend.',
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    Alert.alert(
      'Remove saved backend?',
      'The app returns to local-only mode. Data already on this device is kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setBusy(true);
              setFeedback(null);
              try {
                await clearBackendCredentials();
                resetTransport();
                resetRemoteBackfill();
                await syncNow();
                setSource(getBackendSource());
                const fallback = getBackendCredentials();
                setEndpoint(fallback?.endpoint ?? '');
                setSecret(fallback?.secret ?? '');
                setFeedback({
                  tone: 'info',
                  text: fallback
                    ? 'Saved credentials removed. Using the environment credentials instead.'
                    : 'Saved credentials removed. The app is local-only.',
                });
              } catch (error) {
                setFeedback({
                  tone: 'critical',
                  text:
                    error instanceof Error ? error.message : 'Could not remove the credentials.',
                });
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppBar title="Shared backend" showBack onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <AppText variant="heading">Current backend</AppText>
          <View style={styles.row}>
            <AppText variant="body" color={colors.ink500} style={styles.flex}>
              Mode
            </AppText>
            <AppText variant="body">{backendModeLabel()}</AppText>
          </View>
          <Divider />
          <View style={styles.row}>
            <AppText variant="body" color={colors.ink500} style={styles.flex}>
              Credentials
            </AppText>
            <AppText variant="body">
              {source === 'saved' ? 'Saved on device' : source === 'env' ? 'From .env' : 'None'}
            </AppText>
          </View>
        </View>

        <FlagBanner
          tone="info"
          text="Enter the deployed Apps Script URL and the shared secret. The spreadsheet ID and Drive folder stay in Apps Script properties."
        />

        <View style={styles.card}>
          <TextField
            label="Apps Script URL"
            required
            value={endpoint}
            onChange={setEndpoint}
            placeholder="https://script.google.com/macros/s/…/exec"
            autoCapitalize="none"
            error={errors.endpoint}
            helper="Deploy as a Web App and copy the URL ending in /exec."
          />
          <TextField
            label="Shared secret"
            required
            value={secret}
            onChange={setSecret}
            placeholder="Same value as APP_SHARED_SECRET"
            autoCapitalize="none"
            secureTextEntry
            error={errors.secret}
            helper="Stored securely on this device, never in the spreadsheet."
          />
          <Button
            label={busy ? 'Checking…' : 'Test connection'}
            variant="secondary"
            icon="pulse-outline"
            loading={busy}
            onPress={() => void test()}
          />
          <Button
            label={busy ? 'Saving…' : 'Save and sync'}
            icon="cloud-upload-outline"
            loading={busy}
            onPress={() => void save()}
          />
        </View>

        {feedback ? <FlagBanner tone={feedback.tone} text={feedback.text} /> : null}

        {source === 'saved' ? (
          <Button
            label="Remove saved credentials"
            variant="destructive"
            icon="trash-outline"
            disabled={busy}
            onPress={remove}
          />
        ) : null}

        <AppText variant="caption" color={colors.ink500}>
          Local-only mode keeps every record on this device. Connecting a backend uploads the
          device's unsynced records first, then syncs every five minutes, on reconnect, and when the
          app returns to the foreground.
        </AppText>
      </ScrollView>
    </SafeAreaView>
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
});
