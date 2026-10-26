import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';
import { AppText } from './Text';
import { Button } from './Button';

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  body,
  actionLabel,
  onAction,
  tone = colors.ink300,
  style,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.empty, style]}>
      <Ionicons name={icon} size={48} color={tone} />
      <AppText variant="bodyLg" weight="600" center>
        {title}
      </AppText>
      <AppText variant="body" color={colors.ink500} center>
        {body}
      </AppText>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" style={styles.action} />
      ) : null}
    </View>
  );
}

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.error}>
      <Ionicons name="cloud-offline-outline" size={18} color={colors.brick700} />
      <AppText variant="body" color={colors.brick700} style={styles.errorText}>
        {message}
      </AppText>
      {onRetry ? (
        <Button label="Retry" size="sm" variant="ghost" onPress={onRetry} />
      ) : null}
    </View>
  );
}

export function SkeletonBlock({ height = 16, width = '100%' as const, style }: { height?: number; width?: number | `${number}%`; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height, width, backgroundColor: colors.ink100, borderRadius: 6 }, style]} />;
}

export function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonRow}>
        <SkeletonBlock height={14} width="25%" />
        <SkeletonBlock height={22} width="30%" />
      </View>
      <SkeletonBlock height={22} width="60%" style={styles.gap} />
      <SkeletonBlock height={16} width="45%" style={styles.gapSmall} />
      <SkeletonBlock height={40} width="100%" style={styles.gap} />
      <SkeletonBlock height={28} width="55%" style={styles.gap} />
    </View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.skeletonList}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  action: { marginTop: spacing.sm },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brick100,
    borderRadius: radius.card,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  errorText: { flex: 1 },
  skeletonList: { gap: spacing.md, paddingTop: spacing.sm },
  skeletonCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.ink100,
    gap: spacing.sm,
  },
  skeletonRow: { flexDirection: 'row', justifyContent: 'space-between' },
  gap: { marginTop: spacing.xs },
  gapSmall: { marginTop: 0 },
});
