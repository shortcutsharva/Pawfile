import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, Divider, MetaRow } from '@/components/ui/Layout';
import { AppText } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { DateTimeField, SelectField, TextField } from '@/components/ui/FormField';
import { FlagBanner } from '@/components/ui/FlagBanner';
import { EmptyState } from '@/components/ui/States';
import { useCaseDetail } from '@/hooks/useDomain';
import { hearingStatusFor, recordHearingOutcome } from '@/data/services/hearingService';
import { scheduleHearingReminders } from '@/services/notifications';
import type { HearingResult } from '@/data/types';
import { HEARING_RESULTS } from '@/data/types';
import { formatDate } from '@/utils/date';
import { colors, spacing } from '@/theme/tokens';

export default function HearingOutcomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; hearingId: string }>();
  const caseId = params.id ?? '';
  const { data, reload } = useCaseDetail(caseId);
  const hearing = data.hearings.find((candidate) => candidate.hearingId === params.hearingId);
  const [outcome, setOutcome] = useState(hearing?.outcome ?? '');
  const [result, setResult] = useState<HearingResult | ''>(hearing?.result ?? '');
  const [nextHearingDate, setNextHearingDate] = useState<string | null>(
    hearing?.nextHearingDate ? `${hearing.nextHearingDate}T11:00:00.000Z` : null,
  );
  const [saving, setSaving] = useState(false);

  if (!hearing) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <AppBar title="Hearing" showBack onBack={() => router.back()} />
        <EmptyState icon="calendar-outline" title="Hearing not found" body="It may have been removed." />
      </SafeAreaView>
    );
  }

  const alreadyRecorded = Boolean(hearing.outcome);
  const status = hearingStatusFor(hearing);

  const save = async () => {
    if (!outcome.trim()) {
      Alert.alert('Record the outcome', 'Describe what happened at the hearing.');
      return;
    }
    if (!result) {
      Alert.alert('Select a result', 'Choose what the court decided.');
      return;
    }
    if (result === 'Next hearing scheduled' && !nextHearingDate) {
      Alert.alert('Next hearing date', 'Add the next hearing date.');
      return;
    }
    setSaving(true);
    try {
      const saved = await recordHearingOutcome(hearing.hearingId, {
        outcome,
        result,
        nextHearingDate: nextHearingDate ? nextHearingDate.slice(0, 10) : null,
      });
      await scheduleHearingReminders(saved, data.caseRecord?.title ?? 'Case');
      await reload();
      router.back();
    } catch (error) {
      Alert.alert('Could not save outcome', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AppBar
        title="Court hearing"
        subtitle={`Case #${caseId}`}
        showBack
        onBack={() => router.back()}
      />
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Ionicons name="calendar-outline" size={20} color={colors.pine700} />
              <AppText variant="bodyLg" style={styles.flex}>
                {formatDate(hearing.date)} at {hearing.time}
              </AppText>
            </View>
            <MetaRow icon="business-outline" label="Court" value={hearing.court || 'Not set'} />
            <MetaRow icon="document-text-outline" label="Purpose" value={hearing.purpose || 'Hearing'} />
            <MetaRow icon="person-outline" label="To attend" value={hearing.attendeeName} />
            <MetaRow
              icon="time-outline"
              label="Status"
              value={
                status === 'outcome_recorded'
                  ? 'Outcome recorded'
                  : status === 'outcome_pending'
                    ? 'Outcome pending'
                    : 'Scheduled'
              }
            />
          </View>

          {alreadyRecorded ? (
            <FlagBanner tone="success" text="An outcome is already recorded. Saving replaces it." />
          ) : null}

          <TextField
            label="Outcome"
            required
            value={outcome}
            onChange={setOutcome}
            placeholder="What happened at the hearing?"
            multiline
          />
          <SelectField
            label="Result"
            required
            value={result}
            options={[...HEARING_RESULTS]}
            onSelect={(value) => setResult(value as HearingResult)}
          />
          {result === 'Next hearing scheduled' || result === 'Adjourned' ? (
            <DateTimeField
              label="Next hearing date"
              value={nextHearingDate}
              onChange={setNextHearingDate}
              mode="date"
            />
          ) : null}
          {result === 'Case concluded' ? (
            <FlagBanner
              tone="info"
              text="Saving this outcome sets the legal status to Concluded."
            />
          ) : null}
        </ScrollView>

        <Divider />
        <View style={styles.bottomBar}>
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
          <Button
            label="Save outcome"
            style={styles.primary}
            loading={saving}
            onPress={() => void save()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  fill: { flex: 1 },
  content: { padding: spacing.base, paddingBottom: spacing.xl },
  summary: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.ink100,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
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
