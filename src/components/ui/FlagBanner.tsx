import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';
import { AppText } from './Text';

type Tone = 'critical' | 'attention' | 'info' | 'success';

const tones = {
  critical: { background: colors.brick100, foreground: colors.brick700, icon: 'alert-circle-outline' },
  attention: { background: colors.ochre100, foreground: colors.ochre700, icon: 'alert-circle-outline' },
  info: { background: colors.pine100, foreground: colors.pine700, icon: 'information-circle-outline' },
  success: { background: colors.moss100, foreground: colors.moss700, icon: 'checkmark-circle-outline' },
} as const;

export function FlagBanner({
  tone = 'attention',
  text,
  actionLabel,
  onAction,
  icon,
  style,
}: {
  tone?: Tone;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = tones[tone];
  return (
    <View style={[styles.banner, { backgroundColor: palette.background }, style]}>
      <Ionicons name={icon ?? palette.icon} size={18} color={palette.foreground} />
      <AppText variant="body" color={palette.foreground} style={styles.text}>
        {text}
      </AppText>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <AppText variant="label" color={palette.foreground}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    minHeight: 48,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  text: { flex: 1 },
});
