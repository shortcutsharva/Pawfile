import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, Divider } from '@/components/ui/Layout';
import { AppText } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { SearchBar } from '@/components/ui/SearchBar';
import { ContactRow } from '@/components/domain/ContactRow';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { RadioSegment, SelectField, DateTimeField } from '@/components/ui/FormField';
import { FlagBanner } from '@/components/ui/FlagBanner';
import { EmptyState } from '@/components/ui/States';
import { useCaseDetail, useContacts } from '@/hooks/useDomain';
import { useSettings } from '@/hooks/useAppData';
import { updateAction } from '@/data/services/actionService';
import { recomputeCaseStatuses } from '@/data/services/caseService';
import { RESCUE_CONTACT_TYPES } from '@/data/types';
import type { Contact } from '@/data/types';
import { buildRescueShareMessage, callPhone, copyMessage, openWhatsApp } from '@/services/share';
import { scheduleActionReminder } from '@/services/notifications';
import { formatDateTime, nextFollowUpDefault } from '@/utils/date';
import { colors, radius, spacing } from '@/theme/tokens';

export default function AssignRescueScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; actionId?: string }>();
  const caseId = params.id ?? '';
  const { data, reload } = useCaseDetail(caseId);
  const { data: contacts } = useContacts();
  const settings = useSettings();
  const action =
    data.actions.find((candidate) => candidate.actionId === params.actionId) ??
    data.actions.find((candidate) => candidate.type === 'rescue') ??
    null;
  const caseRecord = data.caseRecord;

  const [mode, setMode] = useState<'Nearby' | 'All contacts'>('Nearby');
  const [search, setSearch] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [shareContact, setShareContact] = useState<Contact | null>(null);
  const [includeAddress, setIncludeAddress] = useState(false);
  const [includeComplainant, setIncludeComplainant] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [response, setResponse] = useState<'Accepted' | 'Declined' | 'No response'>('Accepted');
  const [followUpDate, setFollowUpDate] = useState<string | null>(nextFollowUpDefault());
  const [saving, setSaving] = useState(false);

  const districts = useMemo(() => {
    const values = new Set(
      contacts
        .filter((contact) => RESCUE_CONTACT_TYPES.includes(contact.type))
        .map((contact) => contact.district)
        .filter(Boolean),
    );
    return Array.from(values).sort();
  }, [contacts]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return contacts
      .filter((contact) => RESCUE_CONTACT_TYPES.includes(contact.type))
      .filter((contact) => (filterDistrict ? contact.district === filterDistrict : true))
      .filter((contact) => {
        if (mode === 'All contacts') return true;
        if (!caseRecord) return true;
        return (
          contact.district === caseRecord.district ||
          contact.state === caseRecord.state ||
          !contact.district
        );
      })
      .filter((contact) => {
        if (!query) return true;
        return [contact.name, contact.organization, contact.phone, contact.serviceArea, contact.district]
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => {
        const aNear = a.district === caseRecord?.district ? 0 : 1;
        const bNear = b.district === caseRecord?.district ? 0 : 1;
        return aNear - bNear || a.name.localeCompare(b.name);
      });
  }, [contacts, search, mode, filterDistrict, caseRecord]);

  if (!action) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <AppBar title="Assign rescue" showBack onBack={() => router.back()} />
        <EmptyState
          icon="paw-outline"
          title="No rescue action"
          body="This case does not have a rescue action to assign."
        />
      </SafeAreaView>
    );
  }

  const message = caseRecord
    ? buildRescueShareMessage(caseRecord, action, {
        includeComplainant,
        includeExactAddress: includeAddress,
        actorName: settings.actorName,
      })
    : '';

  const selectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setResponse('Accepted');
    setFollowUpDate(nextFollowUpDefault());
  };

  const saveResponse = async () => {
    if (!selectedContact) return;
    setSaving(true);
    try {
      const accepted = response === 'Accepted';
      const saved = await updateAction(
        action.actionId,
        {
          assignedToId: selectedContact.contactId,
          assignedToName: selectedContact.organization || selectedContact.name,
          rescueStatus: accepted ? 'in_progress' : 'to_attend',
          followUpDate,
          nextAction: accepted ? 'Confirm animal pickup' : 'Reassign rescue team',
        },
        {
          description: `${selectedContact.name} response: ${response}`,
          eventType: 'reassigned',
        },
      );
      await recomputeCaseStatuses(caseId);
      await scheduleActionReminder(saved, caseRecord?.title ?? 'Case');
      setSelectedContact(null);
      await reload();
      Alert.alert(
        response === 'Accepted' ? 'Rescue team accepted' : 'Response recorded',
        response === 'Accepted'
          ? `${selectedContact.name} is now assigned. Follow up on ${formatDateTime(followUpDate)}.`
          : 'The rescue stays in To attend so you can reassign it.',
      );
      if (response !== 'Accepted') router.back();
    } catch (error) {
      Alert.alert('Could not save the response', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AppBar
        title="Assign rescue"
        subtitle={caseRecord ? `Case #${caseRecord.caseId} · ${caseRecord.district}` : undefined}
        showBack
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.modeRow}>
          {(['Nearby', 'All contacts'] as const).map((option) => (
            <Pressable
              key={option}
              onPress={() => setMode(option)}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === option }}
              style={[styles.modeButton, mode === option && styles.modeButtonActive]}
            >
              <AppText variant="label" color={mode === option ? colors.pine700 : colors.ink700}>
                {option}
              </AppText>
            </Pressable>
          ))}
        </View>

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search rescue contact"
        />
        <SelectField
          label="District"
          value={filterDistrict}
          options={['All districts', ...districts]}
          onSelect={(value) => setFilterDistrict(value === 'All districts' ? '' : value)}
        />

        {caseRecord?.locationText ? (
          <FlagBanner
            tone="info"
            text="The exact address is hidden in shared messages unless you include it."
          />
        ) : null}

        <Divider style={styles.divider} />
        {filtered.length ? (
          filtered.map((contact) => (
            <ContactRow
              key={contact.contactId}
              contact={contact}
              onCall={() => void callPhone(contact.phone)}
              onWhatsApp={() => setShareContact(contact)}
              onSelect={() => selectContact(contact)}
            />
          ))
        ) : (
          <EmptyState
            icon="people-outline"
            title="No rescue contacts found"
            body="Try All contacts, or add a rescue organization."
            actionLabel="Add contact"
            onAction={() => router.push('/contacts/new')}
          />
        )}

        <Button
          label="Add new contact"
          icon="add"
          variant="ghost"
          onPress={() => router.push('/contacts/new')}
          style={styles.addContact}
        />
      </ScrollView>

      <BottomSheet
        visible={Boolean(shareContact)}
        onClose={() => setShareContact(null)}
        title="WhatsApp share preview"
        footer={
          <View style={styles.shareActions}>
            <Button
              label="Copy message"
              variant="secondary"
              style={styles.flex}
              onPress={() => {
                void copyMessage(message);
              }}
            />
            <Button
              label="Open WhatsApp"
              icon="logo-whatsapp"
              style={styles.flex}
              onPress={() => {
                if (shareContact) void openWhatsApp(shareContact.phone, message);
                setShareContact(null);
              }}
            />
          </View>
        }
      >
        <View style={styles.preview}>
          <AppText variant="body" style={styles.previewText}>
            {message}
          </AppText>
        </View>
        <Pressable
          onPress={() => setIncludeAddress((value) => !value)}
          style={styles.toggleRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: includeAddress }}
        >
          <View style={[styles.checkbox, includeAddress && styles.checkboxChecked]}>
            {includeAddress ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
          </View>
          <AppText variant="body">Include exact address</AppText>
        </Pressable>
        <Pressable
          onPress={() => setIncludeComplainant((value) => !value)}
          style={styles.toggleRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: includeComplainant }}
        >
          <View style={[styles.checkbox, includeComplainant && styles.checkboxChecked]}>
            {includeComplainant ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
          </View>
          <AppText variant="body">Include complainant name and phone</AppText>
        </Pressable>
        <AppText variant="caption" color={colors.ink500}>
          Complainant contact is hidden in shared messages by default.
        </AppText>
      </BottomSheet>

      <BottomSheet
        visible={Boolean(selectedContact)}
        onClose={() => setSelectedContact(null)}
        title={selectedContact ? `Assign ${selectedContact.name}` : 'Record response'}
        footer={
          <Button
            label="Save response"
            loading={saving}
            onPress={() => void saveResponse()}
            fullWidth
          />
        }
      >
        <RadioSegment
          label="Team response"
          value={response}
          options={['Accepted', 'Declined', 'No response'] as const}
          onChange={setResponse}
        />
        <DateTimeField
          label="Schedule follow-up"
          value={followUpDate}
          onChange={setFollowUpDate}
          helper="A declined or unanswered request returns to To attend."
        />
        <FlagBanner
          tone={response === 'Accepted' ? 'success' : 'attention'}
          text={
            response === 'Accepted'
              ? 'The rescue moves to Rescue in progress.'
              : 'The rescue returns to To attend for reassignment.'
          }
        />
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.base, paddingBottom: spacing.xxl, gap: spacing.sm },
  modeRow: { flexDirection: 'row', gap: spacing.sm },
  modeButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.ink200,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonActive: { backgroundColor: colors.pine100, borderColor: colors.pine100 },
  divider: { marginVertical: spacing.xs },
  addContact: { marginTop: spacing.sm },
  shareActions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  preview: {
    backgroundColor: colors.pine50,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  previewText: { color: colors.ink900 },
  toggleRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.ink300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.pine700, borderColor: colors.pine700 },
});
