import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar } from '@/components/ui/Layout';
import { AppText } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { CheckboxRow, DateTimeField } from '@/components/ui/FormField';
import { FlagBanner } from '@/components/ui/FlagBanner';
import { useSettings } from '@/hooks/useAppData';
import { updateSettings } from '@/data/settings';
import { defaultsToTimeValue, timeValueToHHmm } from '@/utils/time';
import { colors, spacing } from '@/theme/tokens';

export default function ReminderSettingsScreen() {
  const router = useRouter();
  const settings = useSettings();
  const [leads, setLeads] = useState<number[]>(settings.hearingLeads);
  const [followUpTime, setFollowUpTime] = useState<string | null>(defaultsToTimeValue(settings.followUpDefaultTime));
  const [saving, setSaving] = useState(false);

  const toggleLead = (days: number) => {
    setLeads((current) =>
      current.includes(days) ? current.filter((value) => value !== days) : [...current, days].sort((a, b) => b - a),
    );
  };

  const save = async () => {
    setSaving(true);
    await updateSettings({
      hearingLeads: leads,
      followUpDefaultTime: timeValueToHHmm(followUpTime),
    });
    setSaving(false);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AppBar title="Reminders" showBack onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="label" color={colors.ink700}>
          Hearing reminders
        </AppText>
        <View style={styles.leads}>
          <CheckboxRow label="7 days before" checked={leads.includes(7)} onChange={() => toggleLead(7)} />
          <CheckboxRow label="3 days before" checked={leads.includes(3)} onChange={() => toggleLead(3)} />
          <CheckboxRow label="1 day before" checked={leads.includes(1)} onChange={() => toggleLead(1)} />
        </View>
        <AppText variant="caption" color={colors.ink500}>
          A lead time that has already passed is skipped. Hearings still appear on Home and in Alerts.
        </AppText>

        <DateTimeField
          label="Default follow-up time"
          value={followUpTime}
          onChange={setFollowUpTime}
          mode="time"
          helper="Used when a follow-up date is created without a specific time."
        />
        <FlagBanner
          tone="info"
          text="Reminders fire locally on this device. Other activists see shared data after sync."
        />
      </ScrollView>
      <View style={styles.bottomBar}>
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
        <Button label="Save" style={styles.primary} loading={saving} onPress={() => void save()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.base, gap: spacing.sm, paddingBottom: spacing.xxl },
  leads: { gap: spacing.xs },
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
