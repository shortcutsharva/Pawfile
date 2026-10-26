import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';
import { AppText } from '../ui/Text';

export interface QuickAction {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
}

export function QuickActionBar({ actions }: { actions: QuickAction[] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityLabel="Case actions"
    >
      {actions.map((action) => (
        <Pressable
          key={action.key}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          accessibilityState={{ disabled: action.disabled }}
          disabled={action.disabled}
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.action,
            pressed && styles.pressed,
            action.disabled && styles.disabled,
          ]}
        >
          <Ionicons
            name={action.icon}
            size={20}
            color={action.disabled ? colors.ink300 : colors.pine700}
          />
          <AppText
            variant="caption"
            color={action.disabled ? colors.ink300 : colors.ink700}
            numberOfLines={1}
          >
            {action.label}
          </AppText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.xs, paddingTop: spacing.sm },
  action: {
    minWidth: 56,
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.input,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  pressed: { backgroundColor: colors.pine50 },
  disabled: { opacity: 0.4 },
});
