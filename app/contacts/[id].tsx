import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, Divider, MetaRow } from '@/components/ui/Layout';
import { AppText } from '@/components/ui/Text';
import { Button, IconButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/States';
import { contactsRepository } from '@/data/repositories/contacts';
import { useAsyncData } from '@/hooks/useAppData';
import { callPhone, openWhatsApp } from '@/services/share';
import { colors, spacing } from '@/theme/tokens';

export default function ContactDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id ?? '';
  const loader = useCallback(() => contactsRepository.getById(id), [id]);
  const { data: contact, loading, reload } = useAsyncData(loader, null, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppBar title="Contact" showBack onBack={() => router.back()} />
      </SafeAreaView>
    );
  }

  if (!contact) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppBar title="Contact" showBack onBack={() => router.back()} />
        <EmptyState icon="person-outline" title="Contact not found" body="It may have been removed." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppBar
        title={contact.name}
        subtitle={contact.type}
        showBack
        onBack={() => router.back()}
        right={
          <IconButton
            icon="create-outline"
            label="Edit contact"
            onPress={() =>
              router.push({ pathname: '/contacts/new', params: { id: contact.contactId } })
            }
          />
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <AppText variant="title" color={colors.pine700}>
              {contact.name.slice(0, 2).toUpperCase()}
            </AppText>
          </View>
          <AppText variant="title" center>
            {contact.name}
          </AppText>
          <AppText variant="body" color={colors.ink500} center>
            {[contact.organization, contact.district, contact.state].filter(Boolean).join(' · ')}
          </AppText>
        </View>

        <View style={styles.actions}>
          <Button
            label="Call"
            icon="call-outline"
            style={styles.flex}
            disabled={!contact.phone}
            onPress={() => void callPhone(contact.phone)}
          />
          <Button
            label="WhatsApp"
            icon="logo-whatsapp"
            variant="secondary"
            style={styles.flex}
            disabled={!contact.phone}
            onPress={() => void openWhatsApp(contact.phone, `Hello ${contact.name},`)}
          />
        </View>

        <Divider style={styles.divider} />
        <MetaRow icon="call-outline" label="Primary phone" value={contact.phone || 'Not provided'} />
        <MetaRow icon="call-outline" label="Secondary phone" value={contact.phone2 || 'Not provided'} />
        <MetaRow icon="mail-outline" label="Email" value={contact.email || 'Not provided'} />
        <MetaRow icon="pricetag-outline" label="Type" value={contact.type} />
        <MetaRow icon="location-outline" label="Location" value={[contact.district, contact.state].filter(Boolean).join(', ') || 'Not provided'} />
        <MetaRow icon="navigate-outline" label="Service area" value={contact.serviceArea || 'Not provided'} />
        <MetaRow icon="medkit-outline" label="Specialization" value={contact.specialization || 'Not provided'} />

        <Button
          label="Delete contact"
          variant="ghost"
          onPress={() =>
            Alert.alert('Delete contact?', `${contact.name} will be removed from this device.`, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                  void contactsRepository.softDelete(contact.contactId).then(() => {
                    void reload();
                    router.back();
                  });
                },
              },
            ])
          }
          style={styles.delete}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.base, paddingBottom: 64 },
  header: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: colors.pine100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  actions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  divider: { marginVertical: spacing.md },
  delete: { marginTop: spacing.lg },
});
