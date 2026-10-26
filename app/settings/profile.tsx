import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar } from '@/components/ui/Layout';
import { AppText } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/FormField';
import { FlagBanner } from '@/components/ui/FlagBanner';
import { useSettings } from '@/hooks/useAppData';
import { updateSettings } from '@/data/settings';
import { colors, spacing } from '@/theme/tokens';

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const settings = useSettings();
  const [name, setName] = useState(settings.actorName);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Add a display name', 'This name appears on assignments and history.');
      return;
    }
    setSaving(true);
    await updateSettings({ actorName: name.trim() });
    setSaving(false);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AppBar title="Profile" showBack onBack={() => router.back()} />
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TextField
            label="Activist display name"
            value={name}
            onChange={setName}
            placeholder="Your name"
            helper="Used for Self assignments, history entries, and WhatsApp shares."
          />
          <FlagBanner
            tone="info"
            text="There are no accounts in V1. This is an attribution label stored on this device."
          />
          <AppText variant="caption" color={colors.ink500} style={styles.device}>
            Device ID: {settings.deviceId}
          </AppText>
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={styles.bottomBar}>
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
        <Button label="Save" style={styles.primary} loading={saving} onPress={() => void save()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  fill: { flex: 1 },
  content: { padding: spacing.base, gap: spacing.md, paddingBottom: spacing.xxl },
  device: { marginTop: spacing.sm },
  bottomBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.ink100,
    backgroundColor: colors.card,
  },
  primary: { flex: 2 },
});
