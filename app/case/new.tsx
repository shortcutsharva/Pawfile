import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewInstance,
  type TextInputFocusEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, Divider } from '@/components/ui/Layout';
import { AppText } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { TextField, SelectField, DateTimeField, RadioSegment } from '@/components/ui/FormField';
import { StepWizardHeader } from '@/components/ui/StepWizardHeader';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { FlagBanner } from '@/components/ui/FlagBanner';
import { MediaPicker } from '@/components/domain/MediaPicker';
import { useAppConfig, useSettings } from '@/hooks/useAppData';
import { useContacts } from '@/hooks/useDomain';
import { districtsForState, STATES } from '@/config/defaults';
import { normalizeStateName } from '@/config/indiaLocations';
import { createCase, type NewCaseInput, type RequirementAnswer } from '@/data/services/caseService';
import type { Case, DraftMedia } from '@/data/types';
import { nextFollowUpDefault } from '@/utils/date';
import { colors, radius, sizes, spacing } from '@/theme/tokens';

const STEPS = ['Complaint', 'Location', 'Action'];

interface FormState {
  animalType: string;
  complaintCategory: string;
  description: string;
  state: string;
  district: string;
  locationText: string;
  locationLat: number | null;
  locationLng: number | null;
  complaintSource: string;
  complainantName: string;
  complainantPhone: string;
  rescueRequired: RequirementAnswer;
  legalRequired: RequirementAnswer;
  urgency: 'High' | 'Medium' | 'Low';
  assignedToId: string;
  assignedToName: string;
  followUpById: string;
  followUpByName: string;
  nextAction: string;
  followUpDate: string | null;
}

export default function NewCaseScreen() {
  const router = useRouter();
  const config = useAppConfig();
  const settings = useSettings();
  const { data: contacts } = useContacts();
  const [step, setStep] = useState(0);
  const [created, setCreated] = useState<Case | null>(null);
  const [saving, setSaving] = useState(false);
  const [showComplainant, setShowComplainant] = useState(false);
  const [districtOther, setDistrictOther] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [media, setMedia] = useState<DraftMedia[]>([]);
  const [form, setForm] = useState<FormState>({
    animalType: 'Dog',
    complaintCategory: 'Cruelty',
    description: '',
    state: 'Karnataka',
    district: '',
    locationText: '',
    locationLat: null,
    locationLng: null,
    complaintSource: 'WhatsApp',
    complainantName: '',
    complainantPhone: '',
    rescueRequired: 'not_sure',
    legalRequired: 'to_assess',
    urgency: 'Medium',
    assignedToId: 'self',
    assignedToName: 'Self',
    followUpById: 'self',
    followUpByName: 'Self',
    nextAction: 'Contact local rescue team',
    followUpDate: nextFollowUpDefault(),
  });

  const districts = useMemo(() => districtsForState(form.state), [form.state]);
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

  const scrollRef = useRef<ScrollViewInstance>(null);
  const focusedInput = useRef<TextInputFocusEvent['target']>(undefined);

  const scrollFocusedInputIntoView = useCallback(() => {
    const target = focusedInput.current;
    if (target != null) {
      scrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(target, 120, true);
    }
  }, []);

  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', scrollFocusedInputIntoView);
    return () => subscription.remove();
  }, [scrollFocusedInputIntoView]);

  const handleInputFocus = (event: TextInputFocusEvent) => {
    focusedInput.current = event.target;
    if (Keyboard.isVisible()) {
      requestAnimationFrame(scrollFocusedInputIntoView);
    }
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: '' }));
  };

  const discard = () => {
    const remove = async () => {
      await Promise.all(
        media.map((item) =>
          FileSystem.deleteAsync(item.uri, { idempotent: true }).catch(() => undefined),
        ),
      );
      router.back();
    };
    Alert.alert('Discard this case?', 'Your entries and selected media will be removed.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => void remove() },
    ]);
  };

  const validateStep = (index: number): boolean => {
    const next: Record<string, string> = {};
    if (index === 0) {
      if (!form.description.trim()) next.description = 'Describe what happened.';
      if (!form.animalType) next.animalType = 'Select an animal type.';
      if (!form.complaintCategory) next.complaintCategory = 'Select a complaint category.';
    }
    if (index === 1) {
      if (!form.state) next.state = 'Select a state.';
      if (!form.district) next.district = 'Select a district.';
    }
    if (index === 2) {
      if (!form.assignedToId) next.assignedToName = 'Choose who is responsible.';
      if (!form.urgency) next.urgency = 'Select an urgency.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const continueStep = () => {
    if (!validateStep(step)) return;
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const useMapPin = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Location permission needed', 'Allow location access to use your current position.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = position.coords;
      const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
      const address = addresses[0];
      const label = [
        address?.name,
        address?.street,
        address?.district ?? address?.subregion,
        address?.city,
      ]
        .filter(Boolean)
        .join(', ');
      set('locationLat', latitude);
      set('locationLng', longitude);
      if (label) set('locationText', label);
      if (address?.region) {
        const normalized = normalizeStateName(address.region);
        if (STATES.includes(normalized as (typeof STATES)[number])) {
          set('state', normalized);
        }
      }
      if (address?.city) {
        const normalized = address.region ? normalizeStateName(address.region) : form.state;
        const options = districtsForState(normalized);
        set('district', address.city);
        setDistrictOther(!options.some((option) => option.toLowerCase() === address.city?.toLowerCase()));
      }
    } catch {
      Alert.alert('Could not get location', 'Enter the address manually instead.');
    }
  };

  const save = async () => {
    if (!validateStep(2)) return;
    setSaving(true);
    try {
      const input: NewCaseInput = {
        ...form,
        media,
      };
      const caseRecord = await createCase(input, settings.deviceId);
      setCreated(caseRecord);
      setStep(STEPS.length);
    } catch (error) {
      Alert.alert(
        'Could not save the case',
        error instanceof Error ? error.message : 'Try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (created) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <AppBar title="Case created" />
        <View style={styles.success}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color={colors.moss600} />
          </View>
          <AppText variant="display" center>
            Case #{created.caseId} created
          </AppText>
          <AppText variant="body" color={colors.ink500} center>
            {created.title} · {created.district}, {created.state}
          </AppText>
          <View style={styles.successSummary}>
            <SummaryLine
              label="Rescue action"
              value={
                form.rescueRequired === 'no'
                  ? 'Not created'
                  : form.rescueRequired === 'yes'
                    ? 'Created'
                    : 'Created (to assess)'
              }
            />
            <SummaryLine
              label="Legal action"
              value={
                form.legalRequired === 'no'
                  ? 'Not created'
                  : form.legalRequired === 'yes'
                    ? 'Created'
                    : 'Created (to assess)'
              }
            />
            <SummaryLine label="Assigned to" value={form.assignedToName} />
            <SummaryLine label="Next action" value={form.nextAction || 'Not set'} />
          </View>
        </View>
        <View style={styles.bottomBar}>
          <Button
            label="View case"
            fullWidth
            onPress={() =>
              router.replace({ pathname: '/case/[id]', params: { id: created.caseId } })
            }
          />
          <Button
            label="Register another"
            variant="ghost"
            fullWidth
            onPress={() => {
              setCreated(null);
              setStep(0);
              setMedia([]);
              setForm((previous) => ({
                ...previous,
                description: '',
                complainantName: '',
                complainantPhone: '',
                nextAction: '',
                followUpDate: nextFollowUpDefault(),
                locationText: '',
                locationLat: null,
                locationLng: null,
              }));
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AppBar
        title="New case"
        showBack
        onBack={() => (step === 0 ? discard() : setStep(step - 1))}
        right={
          <Pressable onPress={discard} accessibilityRole="button" accessibilityLabel="Close new case" hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.ink700} />
          </Pressable>
        }
      />
      <KeyboardAvoidingView style={styles.fill} behavior="padding" keyboardVerticalOffset={8}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <StepWizardHeader steps={STEPS} current={step} />

          {step === 0 ? (
            <View>
              <SelectField
                label="Animal type"
                required
                value={form.animalType}
                options={config.animalTypes}
                onSelect={(value) => set('animalType', value)}
                error={errors.animalType}
              />
              <SelectField
                label="Complaint category"
                required
                value={form.complaintCategory}
                options={config.complaintCategories}
                onSelect={(value) => set('complaintCategory', value)}
                error={errors.complaintCategory}
              />
              <TextField
                label="Description"
                required
                value={form.description}
                onChange={(value) => set('description', value)}
                placeholder="Describe the incident"
                multiline
                onFocus={handleInputFocus}
                error={errors.description}
              />
              <AppText variant="label" color={colors.ink700}>
                Photos and videos
              </AppText>
              <MediaPicker media={media} onChange={setMedia} />
            </View>
          ) : null}

          {step === 1 ? (
            <View>
              <SelectField
                label="State"
                required
                value={form.state}
                options={[...STATES]}
                onSelect={(value) => {
                  set('state', value);
                  set('district', '');
                  setDistrictOther(false);
                }}
                error={errors.state}
              />
              {districts.length ? (
                <SelectField
                  label="District / city"
                  required
                  value={districtOther ? 'Other' : form.district}
                  options={districts}
                  onSelect={(value) => {
                    if (value === 'Other') {
                      setDistrictOther(true);
                      set('district', '');
                    } else {
                      setDistrictOther(false);
                      set('district', value);
                    }
                  }}
                  error={districtOther ? undefined : errors.district}
                />
              ) : null}
              {!districts.length || districtOther ? (
                <TextField
                  label={districts.length ? 'District name' : 'District / city'}
                  required
                  value={form.district}
                  onChange={(value) => set('district', value)}
                  placeholder={districts.length ? 'Enter district name' : 'Enter district or city'}
                  onFocus={handleInputFocus}
                  error={errors.district}
                />
              ) : null}
              <TextField
                label="Location"
                value={form.locationText}
                onChange={(value) => set('locationText', value)}
                placeholder="Address or locality"
                onFocus={handleInputFocus}
                helper="The exact address stays hidden in shared messages by default."
              />
              <Button
                label="Use current location"
                icon="location-outline"
                variant="secondary"
                onPress={() => void useMapPin()}
                style={styles.mapButton}
              />
              <SelectField
                label="Complaint source"
                value={form.complaintSource}
                options={config.complaintSources}
                onSelect={(value) => set('complaintSource', value)}
              />

              {showComplainant ? (
                <View>
                  <Divider style={styles.divider} />
                  <TextField
                    label="Complainant name"
                    value={form.complainantName}
                    onChange={(value) => set('complainantName', value)}
                    placeholder="Optional"
                    onFocus={handleInputFocus}
                    helper="Hidden in shared messages."
                  />
                  <TextField
                    label="Mobile number"
                    value={form.complainantPhone}
                    onChange={(value) => set('complainantPhone', value)}
                    placeholder="Optional"
                    keyboardType="phone-pad"
                    onFocus={handleInputFocus}
                    helper="Hidden in shared messages."
                  />
                </View>
              ) : (
                <Pressable
                  onPress={() => setShowComplainant(true)}
                  accessibilityRole="button"
                  style={styles.addComplainant}
                >
                  <Ionicons name="person-add-outline" size={20} color={colors.pine700} />
                  <AppText variant="label" color={colors.pine700}>
                    Add complainant details
                  </AppText>
                </Pressable>
              )}
            </View>
          ) : null}

          {step === 2 ? (
            <View>
              <RadioSegment
                label="Rescue required?"
                required
                value={form.rescueRequired}
                options={['yes', 'no', 'not_sure'] as const}
                onChange={(value) => set('rescueRequired', value)}
              />
              <AppText variant="caption" color={colors.ink500} style={styles.hint}>
                “Not sure” still creates a rescue action so the case stays on the worklist.
              </AppText>
              <RadioSegment
                label="Legal action required?"
                required
                value={form.legalRequired}
                options={['yes', 'no', 'to_assess'] as const}
                onChange={(value) => set('legalRequired', value)}
              />
              <AppText variant="caption" color={colors.ink500} style={styles.hint}>
                “To assess” creates a legal action in To attend. An FIR is not required.
              </AppText>

              <RadioSegment
                label="Urgency"
                required
                value={form.urgency}
                options={['High', 'Medium', 'Low'] as const}
                onChange={(value) => set('urgency', value)}
              />

              <AppText variant="label" color={colors.ink700} style={styles.fieldLabel}>
                Assigned to
              </AppText>
              <Pressable
                style={styles.assigneeButton}
                accessibilityRole="button"
                accessibilityLabel={`Assigned to ${form.assignedToName}`}
                onPress={() => setAssigneeOpen(true)}
              >
                <AppText variant="bodyLg" style={styles.flex}>
                  {form.assignedToName}
                </AppText>
                <Ionicons name="chevron-down" size={20} color={colors.ink500} />
              </Pressable>

              <TextField
                label="Next action"
                value={form.nextAction}
                onChange={(value) => set('nextAction', value)}
                placeholder="Contact local rescue team"
                onFocus={handleInputFocus}
              />

              <DateTimeField
                label="Follow-up date and time"
                value={form.followUpDate}
                onChange={(value) => set('followUpDate', value)}
                helper="This becomes the due date on the worklist."
              />

              {!form.rescueRequired || !form.legalRequired ? null : null}
              {form.rescueRequired === 'no' && form.legalRequired === 'no' ? (
                <FlagBanner
                  tone="attention"
                  text="No action will be created. The case will appear in All cases only."
                />
              ) : null}
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.bottomBar}>
          {step === 0 ? (
            <Button label="Previous" variant="ghost" onPress={discard} />
          ) : (
            <Button label="Back" variant="ghost" onPress={() => setStep(step - 1)} />
          )}
          <Button
            label={step === STEPS.length - 1 ? 'Save case' : 'Continue'}
            icon="arrow-forward"
            style={styles.primary}
            loading={saving}
            onPress={step === STEPS.length - 1 ? () => void save() : continueStep}
          />
        </View>
      </KeyboardAvoidingView>

      <BottomSheet
        visible={assigneeOpen}
        onClose={() => setAssigneeOpen(false)}
        title="Assigned to"
      >
        {assignees.map((assignee) => (
          <Pressable
            key={assignee.id}
            accessibilityRole="button"
            accessibilityState={{ selected: assignee.id === form.assignedToId }}
            onPress={() => {
              set('assignedToId', assignee.id);
              set('assignedToName', assignee.name);
              set('followUpById', assignee.id);
              set('followUpByName', assignee.name);
              setAssigneeOpen(false);
            }}
            style={[
              styles.assigneeRow,
              assignee.id === form.assignedToId && { backgroundColor: colors.pine100 },
            ]}
          >
            <AppText variant="bodyLg" style={styles.flex}>
              {assignee.name}
            </AppText>
            {assignee.id === form.assignedToId ? (
              <Ionicons name="checkmark" size={20} color={colors.pine700} />
            ) : null}
          </Pressable>
        ))}
      </BottomSheet>
    </SafeAreaView>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryLine}>
      <AppText variant="body" color={colors.ink500}>
        {label}
      </AppText>
      <AppText variant="body">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  fill: { flex: 1 },
  content: { padding: spacing.base, paddingBottom: spacing.xxl },
  mapButton: { marginBottom: spacing.md },
  divider: { marginVertical: spacing.sm },
  addComplainant: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.input,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.ink300,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  hint: { marginTop: -spacing.sm, marginBottom: spacing.md },
  fieldLabel: { marginBottom: spacing.xs, color: colors.ink700 },
  assigneeButton: {
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
  assigneeRow: {
    minHeight: 48,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
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
  flex: { flex: 1 },
  success: { flex: 1, padding: spacing.lg, gap: spacing.md, alignItems: 'center', justifyContent: 'center' },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.moss100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successSummary: {
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.ink100,
    padding: spacing.base,
    gap: spacing.sm,
  },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.base },
});
