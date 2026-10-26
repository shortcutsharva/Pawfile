import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';
import { AppText } from './Text';

export function Snackbar({
  visible,
  message,
  actionLabel,
  onAction,
}: {
  visible: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  if (!visible) return null;
  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <AppText variant="body" color={colors.white} style={styles.message}>
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <AppText variant="label" color={colors.pine100}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.base,
    right: spacing.base,
    bottom: spacing.lg,
    minHeight: 52,
    borderRadius: radius.card,
    backgroundColor: colors.ink900,
    paddingHorizontal: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    shadowColor: colors.ink900,
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  message: { flex: 1 },
});
