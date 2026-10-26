import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { colors, radius, sizes, spacing } from '@/theme/tokens';
import { AppText } from './Text';

export function FAB({ label, icon = 'add', onPress }: { label: string; icon?: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={22} color={colors.white} />
      <AppText variant="label" color={colors.white}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.base,
    bottom: spacing.base,
    minHeight: sizes.fabHeight,
    minWidth: sizes.fabMinWidth,
    paddingHorizontal: spacing.base,
    borderRadius: radius.pill,
    backgroundColor: colors.pine700,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    shadowColor: colors.ink900,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  pressed: { backgroundColor: colors.pine500 },
});
