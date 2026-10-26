import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { AppBar, Divider } from '@/components/ui/Layout';
import { AppText } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import {
  CheckboxRow,
  DateTimeField,
  SelectField,
  TextField,
  ToggleRow,
} from '@/components/ui/FormField';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { FlagBanner } from '@/components/ui/FlagBanner';
import { MediaPicker } from '@/components/domain/MediaPicker';
import { useCaseDetail, useContacts } from '@/hooks/useDomain';
import { updateAction } from '@/data/services/actionService';
import { attachDraftMedia, closeCase, recomputeCaseStatuses } from '@/data/services/caseService';
import { scheduleActionReminder } from '@/services/notifications';
import type { Action, DraftMedia } from '@/data/types';
import { colors, radius, sizes, spacing } from '@/theme/tokens';

const RESCUE_OPTIONS = [
  { label: 'To attend', value: 'to_attend' },
  { label: 'Awaiting confirmation', value: 'awaiting_confirmation' },
  { label: 'Rescue in progress', value: 'in_progress' },
  { label: 'Rescued', value: 'rescued' },
  { label: 'Unsuccessful', value: 'unsuccessful' },
] as const;

const LEGAL_OPTIONS = [
  { label: 'Complaint filed', value: 'complaint_filed' },
  { label: 'Police follow-up', value: 'police_follow_up' },
  { label: 'FIR registered', value: 'fir_registered' },
  { label: 'Hearing scheduled', value: 'hearing_scheduled' },
  { label: 'Concluded', value: 'concluded' },
] as const;

export default function UpdateCaseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; actionId?: string; focus?: string }>();
  const caseId = params.id ?? '';
  const { data, loading } = useCaseDetail(caseId);
  const { data: contacts } = useContacts();
  const action: Action | undefined =
    data.actions.find((candidate) => candidate.actionId === params.actionId) ??
    data.actions.find((candidate) => !candidate.isClosed) ??
    data.actions[0];

  const [initialized, setInitialized] = useState(false);
  const [actionTaken, setActionTaken] = useState('');
  const [status, setStatus] = useState('');
  const [assignedToId, setAssignedToId] = useState('self');
  const [assignedToName, setAssignedToName] = useState('Self');
  const [followUpById, setFollowUpById] = useState('self');
  const [followUpByName, setFollowUpByName] = useState('Self');
  const [nextAction, setNextAction] = useState('');
  const [followUpDate, setFollowUpDate] = useState<string | null>(null);
  const [animalCondition, setAnimalCondition] = useState('');
  const [outcome, setOutcome] = useState('');
  const [policeStation, setPoliceStation] = useState('');
  const [complaintDate, setComplaintDate] = useState<string | null>(null);
  const [firNumber, setFirNumber] = useState('');
  const [firDate, setFirDate] = useState<string | null>(null);
  const [investigatingOfficerName, setInvestigatingOfficerName] = useState('');
  const [court, setCourt] = useState('');
  const [courtCaseNumber, setCourtCaseNumber] = useState('');
  const [media, setMedia] = useState<DraftMedia[]>([]);
  const [markComplete, setMarkComplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assigneeFor, setAssigneeFor] = useState<'assigned' | 'followUp' | null>(null);
  const [showMore, setShowMore] = useState(params.focus === 'legal' || params.focus === 'outcome');

  const statusOptions = action?.type === 'rescue' ? RESCUE_OPTIONS : LEGAL_OPTIONS;

  useEffect(() => {
    if (!action || initialized) return;
    setStatus(action.type === 'rescue' ? action.rescueStatus : action.legalStatus);
    setAssignedToId(action.assignedToId);
    setAssignedToName(action.assignedToName);
    setFollowUpById(action.followUpById);
    setFollowUpByName(action.followUpByName);
    setNextAction(action.nextAction);
    setFollowUpDate(action.followUpDate);
    setAnimalCondition(action.animalCondition);
    setOutcome(action.outcome);
    setPoliceStation(action.policeStation);
    setComplaintDate(action.complaintDate);
    setFirNumber(action.firNumber);
    setFirDate(action.firDate);
    setInvestigatingOfficerName(action.investigatingOfficerName);
    setCourt(action.court);
    setCourtCaseNumber(action.courtCaseNumber);
    setInitialized(true);
  }, [action, initialized]);

  const assignees = useMemo(
    () => [
      { id: 'self', name: 'Self' },
      ...contacts.map((contact) => ({
        id: contact.contactId,
        name: contact.organization || contact.name,
      })),
    ],
    [contacts],
  );

  if (loading || !action) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <AppBar title="Update case" showBack onBack={() => router.back()} />
        <View style={styles.content}>
          <AppText variant="body" color={colors.ink500}>
            Loading case…
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  const statusLabel =
    statusOptions.find((option) => option.value === status)?.label ?? 'Select status';

  const save = async () => {
    if (!actionTaken.trim()) {
      Alert.alert('Add an action taken', 'Describe what you did before saving.');
      return;
    }
    setSaving(true);
    try {
      const patch: Partial<Action> = {
        assignedToId,
        assignedToName,
        followUpById,
        followUpByName,
        nextAction,
        followUpDate,
        animalCondition,
        outcome,
        policeStation,
        complaintDate,
        firNumber,
        firDate,
        investigatingOfficerName,
        court,
        courtCaseNumber,
      };
      if (action.type === 'rescue') {
        patch.rescueStatus = status as Action['rescueStatus'];
      } else {
        patch.legalStatus = status as Action['legalStatus'];
      }
      const saved = await updateAction(action.actionId, patch, {
        description: actionTaken,
        eventType: 'status_change',
      });
      if (media.length) {
        await attachDraftMedia(caseId, media);
      }
      await recomputeCaseStatuses(caseId);
      await scheduleActionReminder(saved, data.caseRecord?.title ?? 'Case');

      if (markComplete) {
        Alert.alert(
          'Action complete',
          'Keep the case open, or close it now?',
          [
            {
              text: 'Keep open',
              onPress: () => {
                router.back();
              },
            },
            {
              text: 'Close case',
              style: 'destructive',
              onPress: () => {
                void closeCase(caseId).then(() => router.back());
              },
            },
          ],
        );
      } else {
        router.back();
      }
    } catch (error) {
      Alert.alert(
        'Could not save the update',
        error instanceof Error ? error.message : 'Try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AppBar
        title="Update case"
        subtitle={`Case #${caseId} · ${action.type === 'rescue' ? 'Rescue' : 'Legal'}`}
        showBack
        onBack={() => router.back()}
      />
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {data.caseRecord?.status === 'closed' ? (
            <FlagBanner tone="info" text="This case is closed. Reopen it to make changes." />
          ) : null}

          <TextField
            label="Action taken"
            required
            value={actionTaken}
            onChange={setActionTaken}
            placeholder="e.g. Spoke to the rescue team. They will visit tomorrow."
            multiline
          />

          <SelectField
            label="Status"
            required
            value={statusLabel}
            options={statusOptions.map((option) => option.label)}
            onSelect={(label) => {
              const option = statusOptions.find((entry) => entry.label === label);
              if (option) setStatus(option.value);
            }}
          />

          <AppText variant="label" color={colors.ink700}>
            Assigned to
          </AppText>
          <Pressable
            style={styles.picker}
            accessibilityRole="button"
            onPress={() => setAssigneeFor('assigned')}
          >
            <AppText variant="bodyLg" style={styles.flex}>
              {assignedToName}
            </AppText>
            <Ionicons name="chevron-down" size={20} color={colors.ink500} />
          </Pressable>

          <TextField
            label="Next action"
            value={nextAction}
            onChange={setNextAction}
            placeholder="Confirm animal pickup"
          />

          <AppText variant="label" color={colors.ink700}>
            Follow-up by
          </AppText>
          <Pressable
            style={styles.picker}
            accessibilityRole="button"
            onPress={() => setAssigneeFor('followUp')}
          >
            <AppText variant="bodyLg" style={styles.flex}>
              {followUpByName}
            </AppText>
            <Ionicons name="chevron-down" size={20} color={colors.ink500} />
          </Pressable>

          <DateTimeField
            label="Follow-up date and time"
            value={followUpDate}
            onChange={setFollowUpDate}
          />

          <ToggleRow
            label="Show more details"
            description="Animal condition, outcome, and legal information"
            value={showMore}
            onChange={setShowMore}
          />

          {showMore && action.type === 'rescue' ? (
            <>
              <TextField
                label="Animal condition"
                value={animalCondition}
                onChange={setAnimalCondition}
                placeholder="e.g. Fractured leg, stable"
              />
              <TextField
                label="Rescue outcome"
                value={outcome}
                onChange={setOutcome}
                placeholder="e.g. Rescued and treated"
                multiline
              />
            </>
          ) : null}

          {showMore && action.type === 'legal' ? (
            <>
              <TextField
                label="Police station"
                value={policeStation}
                onChange={setPoliceStation}
                placeholder="Station name"
              />
              <DateTimeField
                label="Complaint date"
                value={complaintDate}
                onChange={setComplaintDate}
                mode="date"
              />
              <TextField
                label="FIR number"
                value={firNumber}
                onChange={setFirNumber}
                placeholder="e.g. 123/2026"
              />
              <DateTimeField
                label="FIR date"
                value={firDate}
                onChange={setFirDate}
                mode="date"
              />
              <TextField
                label="Investigating officer"
                value={investigatingOfficerName}
                onChange={setInvestigatingOfficerName}
                placeholder="Officer name"
              />
              <TextField
                label="Court"
                value={court}
                onChange={setCourt}
                placeholder="Court name"
              />
              <TextField
                label="Court case number"
                value={courtCaseNumber}
                onChange={setCourtCaseNumber}
                placeholder="e.g. CC/445/2026"
              />
            </>
          ) : null}

          <AppText variant="label" color={colors.ink700}>
            Attachments
          </AppText>
          <MediaPicker media={media} onChange={setMedia} compact />

          <Divider style={styles.divider} />
          <CheckboxRow
            label="Mark action complete"
            checked={markComplete}
            onChange={setMarkComplete}
          />

          {data.caseRecord?.status !== 'closed' ? (
            <Pressable
              onPress={() =>
                Alert.alert(
                  `Close case #${caseId}?`,
                  'Every open action on this case will be closed.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Close case',
                      style: 'destructive',
                      onPress: () => {
                        void closeCase(caseId).then(() => router.back());
                      },
                    },
                  ],
                )
              }
              accessibilityRole="button"
              style={styles.closeLink}
            >
              <Ionicons name="checkmark-done-outline" size={18} color={colors.brick700} />
              <AppText variant="label" color={colors.brick700}>
                Close case instead
              </AppText>
            </Pressable>
          ) : null}
        </ScrollView>

        <View style={styles.bottomBar}>
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
          <Button
            label="Save update"
            style={styles.primary}
            loading={saving}
            disabled={data.caseRecord?.status === 'closed'}
            onPress={() => void save()}
          />
        </View>
      </KeyboardAvoidingView>

      <BottomSheet
        visible={Boolean(assigneeFor)}
        onClose={() => setAssigneeFor(null)}
        title={assigneeFor === 'followUp' ? 'Follow-up by' : 'Assigned to'}
      >
        {assignees.map((assignee) => (
          <Pressable
            key={assignee.id}
            onPress={() => {
              if (assigneeFor === 'followUp') {
                setFollowUpById(assignee.id);
                setFollowUpByName(assignee.name);
              } else {
                setAssignedToId(assignee.id);
                setAssignedToName(assignee.name);
              }
              setAssigneeFor(null);
            }}
            style={styles.assigneeRow}
            accessibilityRole="button"
          >
            <AppText variant="bodyLg" style={styles.flex}>
              {assignee.name}
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
  content: { padding: spacing.base, paddingBottom: spacing.xxl },
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
    marginTop: spacing.xs,
  },
  divider: { marginVertical: spacing.sm },
  closeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    marginTop: spacing.sm,
  },
  bottomBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.ink100,
    backgroundColor: colors.card,
  },
  primary: { flex: 2 },
  assigneeRow: {
    minHeight: 52,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.input,
  },
});
