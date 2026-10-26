import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar } from '@/components/ui/Layout';
import { AppText } from '@/components/ui/Text';
import { IconButton } from '@/components/ui/Button';
import { SearchBar } from '@/components/ui/SearchBar';
import { ContactRow } from '@/components/domain/ContactRow';
import { EmptyState, SkeletonList } from '@/components/ui/States';
import { useContacts } from '@/hooks/useDomain';
import { CONTACT_TYPES } from '@/data/types';
import { callPhone, openWhatsApp } from '@/services/share';
import { colors, radius, spacing } from '@/theme/tokens';

export default function ContactsScreen() {
  const router = useRouter();
  const { data: contacts, loading } = useContacts();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('All');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return contacts
      .filter((contact) => (type === 'All' ? true : contact.type === type))
      .filter((contact) =>
        query
          ? [contact.name, contact.organization, contact.phone, contact.district, contact.serviceArea]
              .join(' ')
              .toLowerCase()
              .includes(query)
          : true,
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [contacts, search, type]);

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof filtered>();
    filtered.forEach((contact) => {
      const list = groups.get(contact.type) ?? [];
      list.push(contact);
      groups.set(contact.type, list);
    });
    return Array.from(groups.entries());
  }, [filtered]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppBar
        title="Contacts"
        subtitle={`${contacts.length} people and organizations`}
        right={
          <IconButton
            icon="add"
            label="Add contact"
            onPress={() => router.push('/contacts/new')}
            color={colors.pine700}
          />
        }
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search name, organization, or location"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.types}>
          {['All', ...CONTACT_TYPES].map((option) => {
            const selected = option === type;
            return (
              <Pressable
                key={option}
                onPress={() => setType(option)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.typeChip, selected && styles.typeChipActive]}
              >
                <AppText variant="caption" color={selected ? colors.pine700 : colors.ink500}>
                  {option}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? <SkeletonList count={2} /> : null}
        {!loading && !filtered.length ? (
          <EmptyState
            icon="people-outline"
            title={contacts.length ? 'No contacts match' : 'No contacts yet'}
            body={
              contacts.length
                ? 'Try a different search or contact type.'
                : 'Add rescue teams, vets, police contacts, and advocates here.'
            }
            actionLabel="Add contact"
            onAction={() => router.push('/contacts/new')}
          />
        ) : null}

        {!loading
          ? grouped.map(([typeName, list]) => (
              <View key={typeName} style={styles.group}>
                <AppText variant="caption" color={colors.ink500}>
                  {typeName.toUpperCase()}
                </AppText>
                {list.map((contact) => (
                  <ContactRow
                    key={contact.contactId}
                    contact={contact}
                    onPress={() =>
                      router.push({ pathname: '/contacts/[id]', params: { id: contact.contactId } })
                    }
                    onCall={() => void callPhone(contact.phone)}
                    onWhatsApp={() =>
                      void openWhatsApp(contact.phone, `Hello ${contact.name},`)
                    }
                  />
                ))}
              </View>
            ))
          : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.base, paddingBottom: 64, gap: spacing.md },
  types: { gap: spacing.xs },
  typeChip: {
    minHeight: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.ink200,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  typeChipActive: { backgroundColor: colors.pine100, borderColor: colors.pine100 },
  group: { gap: 2 },
});
