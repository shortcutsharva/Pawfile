import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar } from '@/components/ui/Layout';
import { AppText } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { SelectField, TextField } from '@/components/ui/FormField';
import { contactsRepository } from '@/data/repositories/contacts';
import { useAppConfig, useSettings, useAsyncData } from '@/hooks/useAppData';
import { shortDeviceId } from '@/data/settings';
import { districtsForState, STATES } from '@/config/defaults';
import { normalizeStateName } from '@/config/indiaLocations';
import type { Contact, ContactType } from '@/data/types';
import { nowISO } from '@/utils/date';
import { colors, spacing } from '@/theme/tokens';

export default function ContactFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = params.id;
  const settings = useSettings();
  const config = useAppConfig();
  const loader = useCallback(
    () => (editingId ? contactsRepository.getById(editingId) : Promise.resolve(null)),
    [editingId],
  );
  const { data: existing, loading } = useAsyncData<Contact | null>(loader, null, [editingId]);

  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [phone, setPhone] = useState('');
  const [phone2, setPhone2] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState<ContactType>('NGO');
  const [state, setState] = useState('Karnataka');
  const [district, setDistrict] = useState('');
  const [districtOther, setDistrictOther] = useState(false);
  const [serviceArea, setServiceArea] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing && !initialized) {
      setName(existing.name);
      setOrganization(existing.organization);
      setPhone(existing.phone);
      setPhone2(existing.phone2);
      setEmail(existing.email);
      setType(existing.type);
      const existingState = normalizeStateName(existing.state || 'Karnataka');
      setState(existingState);
      setDistrict(existing.district);
      setDistrictOther(
        Boolean(existing.district) &&
          !districtsForState(existingState).some(
            (option) => option.toLowerCase() === existing.district.toLowerCase(),
          ),
      );
      setServiceArea(existing.serviceArea);
      setSpecialization(existing.specialization);
      setInitialized(true);
    }
  }, [existing, initialized]);

  const districts = useMemo(() => districtsForState(state), [state]);

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Add a name', 'A contact needs a name.');
      return;
    }
    setSaving(true);
    try {
      if (existing) {
        await contactsRepository.update(existing.contactId, {
          name: name.trim(),
          organization: organization.trim(),
          phone: phone.trim(),
          phone2: phone2.trim(),
          email: email.trim(),
          type,
          state,
          district,
          serviceArea: serviceArea.trim(),
          specialization: specialization.trim(),
        });
      } else {
        const all = await contactsRepository.getAll(true);
        const now = nowISO();
        const sequence =
          all.reduce((max, item) => {
            const match = item.contactId.match(/(\d+)$/);
            return Math.max(max, Number(match?.[1] ?? 0));
          }, 0) + 1;
        const contact: Contact = {
          contactId: `CNT-${shortDeviceId(settings.deviceId)}-${sequence}`,
          name: name.trim(),
          organization: organization.trim(),
          phone: phone.trim(),
          phone2: phone2.trim(),
          email: email.trim(),
          type,
          state,
          district,
          serviceArea: serviceArea.trim(),
          specialization: specialization.trim(),
          isActive: true,
          isLocalOnly: false,
          createdAt: now,
          updatedAt: now,
          syncedAt: null,
          localVersion: 1,
          serverVersion: 0,
          isDeleted: false,
        };
        await contactsRepository.insert(contact);
      }
      router.back();
    } catch (error) {
      Alert.alert('Could not save contact', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AppBar
        title={existing ? 'Edit contact' : 'Add contact'}
        showBack
        onBack={() => router.back()}
      />
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {loading ? (
            <AppText variant="body" color={colors.ink500}>
              Loading contact…
            </AppText>
          ) : (
            <>
              <TextField label="Name" required value={name} onChange={setName} placeholder="Contact name" />
              <TextField
                label="Organization"
                value={organization}
                onChange={setOrganization}
                placeholder="NGO, shelter, police station, court"
              />
              <SelectField
                label="Type"
                value={type}
                options={config.contactTypes}
                onSelect={(value) => setType(value as ContactType)}
              />
              <TextField
                label="Phone"
                value={phone}
                onChange={setPhone}
                placeholder="10-digit mobile or landline"
                keyboardType="phone-pad"
              />
              <TextField
                label="Second phone"
                value={phone2}
                onChange={setPhone2}
                placeholder="Optional"
                keyboardType="phone-pad"
              />
              <TextField
                label="Email"
                value={email}
                onChange={setEmail}
                placeholder="Optional"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <SelectField
                label="State"
                value={state}
                options={[...STATES]}
                onSelect={(value) => {
                  setState(value);
                  setDistrict('');
                  setDistrictOther(false);
                }}
              />
              {districts.length ? (
                <SelectField
                  label="District"
                  value={districtOther ? 'Other' : district}
                  options={districts}
                  onSelect={(value) => {
                    if (value === 'Other') {
                      setDistrictOther(true);
                      setDistrict('');
                    } else {
                      setDistrictOther(false);
                      setDistrict(value);
                    }
                  }}
                />
              ) : null}
              {!districts.length || districtOther ? (
                <TextField
                  label={districts.length ? 'District name' : 'District'}
                  value={district}
                  onChange={setDistrict}
                  placeholder={districts.length ? 'Enter district name' : 'District'}
                />
              ) : null}
              <TextField
                label="Service area"
                value={serviceArea}
                onChange={setServiceArea}
                placeholder="e.g. Mysuru, Mandya"
              />
              <TextField
                label="Specialization"
                value={specialization}
                onChange={setSpecialization}
                placeholder="e.g. Dog and cat rescue"
              />
            </>
          )}
        </ScrollView>
        <View style={styles.bottomBar}>
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
          <Button
            label={existing ? 'Save contact' : 'Add contact'}
            style={styles.primary}
            loading={saving}
            disabled={loading}
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
  content: { padding: spacing.base, paddingBottom: spacing.xxl },
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
