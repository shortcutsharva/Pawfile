import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, sizes, spacing } from '@/theme/tokens';
import type { Contact } from '@/data/types';
import { AppText } from '../ui/Text';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function ContactRow({
  contact,
  onPress,
  onCall,
  onWhatsApp,
  onSelect,
  selectLabel = 'Select',
}: {
  contact: Contact;
  onPress?: () => void;
  onCall?: () => void;
  onWhatsApp?: () => void;
  onSelect?: () => void;
  selectLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${contact.name}, ${contact.type}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.pine50 }]}
    >
      <View style={styles.avatar}>
        <AppText variant="label" color={colors.pine700}>
          {initials(contact.name) || contact.type.slice(0, 2)}
        </AppText>
      </View>
      <View style={styles.content}>
        <AppText variant="bodyLg" weight="500" numberOfLines={1}>
          {contact.name}
        </AppText>
        <AppText variant="body" color={colors.ink500} numberOfLines={1}>
          {contact.type}
          {contact.district ? ` · ${contact.district}` : ''}
          {contact.serviceArea ? ` · ${contact.serviceArea}` : ''}
        </AppText>
        {contact.specialization ? (
          <AppText variant="caption" color={colors.ink500} numberOfLines={1}>
            {contact.specialization}
          </AppText>
        ) : null}
      </View>
      <View style={styles.actions}>
        {onCall ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Call ${contact.name}`}
            onPress={onCall}
            style={styles.iconButton}
            disabled={!contact.phone}
          >
            <Ionicons
              name="call-outline"
              size={20}
              color={contact.phone ? colors.pine700 : colors.ink300}
            />
          </Pressable>
        ) : null}
        {onWhatsApp ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`WhatsApp ${contact.name}`}
            onPress={onWhatsApp}
            style={styles.iconButton}
            disabled={!contact.phone}
          >
            <Ionicons
              name="logo-whatsapp"
              size={20}
              color={contact.phone ? colors.moss600 : colors.ink300}
            />
          </Pressable>
        ) : null}
        {onSelect ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${selectLabel} ${contact.name}`}
            onPress={onSelect}
            style={styles.selectButton}
          >
            <AppText variant="caption" color={colors.pine700}>
              {selectLabel}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: sizes.listRowMinHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.input,
    backgroundColor: colors.pine100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, gap: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconButton: {
    width: 40,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectButton: {
    minHeight: 40,
    minWidth: 58,
    borderRadius: radius.input,
    backgroundColor: colors.pine100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
});
