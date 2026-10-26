import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar } from '@/components/ui/Layout';
import { AppText } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { SearchBar } from '@/components/ui/SearchBar';
import { ContactRow } from '@/components/domain/ContactRow';
import { EmptyState } from '@/components/ui/States';
import { useContacts, useWorklist } from '@/hooks/useDomain';
import { RESCUE_CONTACT_TYPES } from '@/data/types';
import { callPhone, openWhatsApp } from '@/services/share';
import { colors, radius, spacing } from '@/theme/tokens';

export default function RescueDirectoryScreen() {
  const router = useRouter();
  const { data: contacts } = useContacts();
  const { data } = useWorklist();
  const [mode, setMode] = useState<'Nearby' | 'All'>('All');
  const [search, setSearch] = useState('');

  const caseDistricts = useMemo(
    () => new Set(data.rescue.map((item) => item.caseRecord.district).filter(Boolean)),
    [data.rescue],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return contacts
      .filter((contact) => RESCUE_CONTACT_TYPES.includes(contact.type))
      .filter((contact) => (mode === 'Nearby' ? caseDistricts.has(contact.district) : true))
      .filter((contact) =>
        query
          ? [contact.name, contact.organization, contact.district, contact.serviceArea, contact.specialization]
              .join(' ')
              .toLowerCase()
              .includes(query)
          : true,
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [contacts, mode, search, caseDistricts]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppBar
        title="Rescue organizations"
        subtitle="Partners by location"
        showBack
        onBack={() => router.back()}
        right={
          <Pressable onPress={() => router.push('/contacts/new')} accessibilityRole="button" accessibilityLabel="Add rescue organization" hitSlop={8}>
            <Ionicons name="add" size={24} color={colors.pine700} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.modeRow}>
          {(['Nearby', 'All'] as const).map((option) => (
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
        <SearchBar value={search} onChange={setSearch} placeholder="Search rescue contact" />
        {filtered.length ? (
          filtered.map((contact) => (
            <ContactRow
              key={contact.contactId}
              contact={contact}
              onPress={() =>
                router.push({ pathname: '/contacts/[id]', params: { id: contact.contactId } })
              }
              onCall={() => void callPhone(contact.phone)}
              onWhatsApp={() => void openWhatsApp(contact.phone, `Hello ${contact.name},`)}
            />
          ))
        ) : (
          <EmptyState
            icon="paw-outline"
            title="No rescue partners found"
            body="Switch to All, or add a rescue organization."
            actionLabel="Add contact"
            onAction={() => router.push('/contacts/new')}
          />
        )}
        <Button
          label="Add rescue organization"
          icon="add"
          variant="ghost"
          onPress={() => router.push('/contacts/new')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.base, paddingBottom: 64, gap: spacing.sm },
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
});
