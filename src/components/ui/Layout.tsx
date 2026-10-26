import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, sizes, spacing } from '@/theme/tokens';
import { AppText } from './Text';
import { IconButton } from './Button';

export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
}: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
}>) {
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function AppBar({
  title,
  subtitle,
  showBack,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <View style={styles.appBar}>
      {showBack ? (
        <IconButton icon="chevron-back" label="Go back" onPress={onBack} color={colors.pine700} />
      ) : null}
      <View style={styles.appBarTitle}>
        <AppText variant="heading" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color={colors.ink500} numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <View style={styles.appBarRight}>{right}</View>
    </View>
  );
}

export function SectionHeader({
  title,
  count,
  right,
}: {
  title: string;
  count?: number;
  right?: ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <AppText variant="heading">{title}</AppText>
        {typeof count === 'number' ? (
          <View style={styles.countPill}>
            <AppText variant="caption" color={colors.ink700}>
              {count}
            </AppText>
          </View>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

export function MetaRow({
  icon,
  label,
  value,
  valueColor = colors.ink900,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.metaRow}>
      <View style={styles.metaLabel}>
        <Ionicons name={icon} size={18} color={colors.ink500} />
        <AppText variant="body" color={colors.ink500}>
          {label}
        </AppText>
      </View>
      <AppText variant="body" color={valueColor} style={styles.metaValue}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: sizes.cardPadding,
    borderWidth: 1,
    borderColor: colors.ink100,
    shadowColor: colors.ink900,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  pressed: { opacity: 0.92 },
  appBar: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  appBarTitle: { flex: 1, paddingHorizontal: spacing.md },
  appBarRight: { flexDirection: 'row', alignItems: 'center', minWidth: sizes.touchTarget },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  countPill: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: colors.ink100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 1, backgroundColor: colors.ink200 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.base,
    paddingVertical: spacing.sm,
  },
  metaLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaValue: { flex: 1, textAlign: 'right' },
});
