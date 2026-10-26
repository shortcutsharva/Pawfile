import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar } from '@/components/ui/Layout';
import { AppText } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import {
  CheckboxRow,
  DateTimeField,
  SelectField,
  TextField,
} from '@/components/ui/FormField';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { FlagBanner } from '@/components/ui/FlagBanner';
import { useCaseDetail, useContacts } from '@/hooks/useDomain';
import { addHearing } from '@/data/services/hearingService';
import { scheduleHearingReminders } from '@/services/notifications';
import { format } from 'date-fns';
import { dateKey, formatDate, toDate } from '@/utils/date';
import { colors, radius, sizes, spacing } from '@/theme/tokens';

export default function AddHearingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; actionId?: string }>();
  const caseId = params.id ?? '';
  const { data, reload } = useCaseDetail(caseId);
  const { data: contacts } = useContacts();
  const legalAction =
    data.actions.find((action) => action.actionId === params.actionId) ??
    data.actions.find((action) => action.type === 'legal');

  const [date, setDate] = useState<string | null>(new Date().toISOString());
  const [timeValue, setTimeValue] = useState<string | null>(new Date().toISOString());
  const [court, setCourt] = useState(legalAction?.court ?? '');
  const [purpose, setPurpose] = useState('');
  const [attendeeId, setAttendeeId] = useState('self');
  const [attendeeName, setAttendeeName] = useState('Self');
  const [reminder7d, setReminder7d] = useState(true);
  const [reminder3d, setReminder3d] = useState(true);
  const [reminder1d, setReminder1d] = useState(true);
  const [attendeeOpen, setAttendeeOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const attendees = useMemo(
    () => [
      { id: 'self', name: 'Self' },
      ...contacts.map((contact) => ({
        id: contact.contactId,
        name: contact.organization || contact.name,
      })),
    ],
    [contacts],
  );

  const save = async () => {
    if (!legalAction) {
      Alert.alert('No legal action', 'Add a legal action to this case first.');
      return;
    }
    if (!date || !timeValue) {
      Alert.alert('Select a date and time', 'A hearing needs a date and time.');
      return;
    }
    setSaving(true);
    try {
      const hearing = await addHearing({
        caseId,
        actionId: legalAction.actionId,
        date: dateKey(date),
        time: format(toDate(timeValue) ?? new Date(), 'HH:mm'),
        court,
        purpose,
        attendeeId,
        attendeeName,
        reminder7d,
        reminder3d,
        reminder1d,
      });
      await scheduleHearingReminders(hearing, data.caseRecord?.title ?? 'Case');
      await reload();
      router.back();
    } catch (error) {
      Alert.alert('Could not add hearing', error instanceof Error ? error.message : 'Try again.');
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
          <DateTimeField label="Hearing date" required value={date} onChange={setDate} mode="date" />
          <DateTimeField
            label="Time"
            required
            value={timeValue}
            onChange={setTimeValue}
            mode="time"
          />
          <TextField
            label="Court"
            value={court}
            onChange={setCourt}
            placeholder="Enter court name"
          />
          <TextField
            label="Hearing purpose"
            value={purpose}
            onChange={setPurpose}
            placeholder="e.g. First hearing and chargesheet review"
            multiline
          />
          <AppText variant="label" color={colors.ink700}>
            To attend
          </AppText>
          <Pressable
            style={styles.picker}
            accessibilityRole="button"
            accessibilityLabel={`To attend: ${attendeeName}`}
            onPress={() => setAttendeeOpen(true)}
          >
            <AppText variant="bodyLg" style={styles.flex}>
              {attendeeName}
            </AppText>
            <Ionicons name="chevron-down" size={20} color={colors.ink500} />
          </Pressable>

          <AppText variant="label" color={colors.ink700}>
            Remind me
          </AppText>
          <View style={styles.reminderRow}>
            <CheckboxRow label="7 days" checked={reminder7d} onChange={setReminder7d} />
            <CheckboxRow label="3 days" checked={reminder3d} onChange={setReminder3d} />
            <CheckboxRow label="1 day" checked={reminder1d} onChange={setReminder1d} />
          </View>
          <FlagBanner
            tone="info"
            text="Reminders fire on this device only. Other activists see the hearing after sync."
          />
          {date ? (
            <AppText variant="caption" color={colors.ink500}>
              Hearing on {formatDate(date)}
              {timeValue ? ` at ${format(toDate(timeValue) ?? new Date(), 'h:mm aaa')}` : ''}
            </AppText>
          ) : null}
          {legalAction ? null : (
            <FlagBanner tone="attention" text="This case has no legal action yet." />
          )}
        </ScrollView>

        <View style={styles.bottomBar}>
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
          <Button
            label="Save hearing"
            style={styles.primary}
            loading={saving}
            disabled={!legalAction}
            onPress={() => void save()}
          />
        </View>
      </KeyboardAvoidingView>

      <BottomSheet visible={attendeeOpen} onClose={() => setAttendeeOpen(false)} title="To attend">
        {attendees.map((attendee) => (
          <Pressable
            key={attendee.id}
            onPress={() => {
              setAttendeeId(attendee.id);
              setAttendeeName(attendee.name);
              setAttendeeOpen(false);
            }}
            style={styles.attendeeRow}
            accessibilityRole="button"
          >
            <AppText variant="bodyLg" style={styles.flex}>
              {attendee.name}
            </AppText>
            <Ionicons name="chevron-forward" size={18} color={colors.ink300} />
          </Pressable>
        ))}
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  fill: { flex: 1 },
  content: { padding: spacing.base, paddingBottom: spacing.xxl, gap: spacing.xs },
  flex: { flex: 1 },
  picker: {
    minHeight: sizes.inputHeight,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.ink200,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  reminderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  bottomBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.ink100,
    backgroundColor: colors.card,
  },
  primary: { flex: 2 },
  attendeeRow: {
    minHeight: 52,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.input,
  },
});
