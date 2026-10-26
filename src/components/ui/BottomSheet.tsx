import type { PropsWithChildren, ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme/tokens';
import { AppText } from './Text';

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  footer,
  maxHeight = '90%',
}: PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  title?: string;
  footer?: ReactNode;
  maxHeight?: `${number}%`;
}>) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close sheet" />
        <View style={[styles.sheet, { maxHeight }]}>
          <View style={styles.handle} />
          {title ? (
            <View style={styles.header}>
              <AppText variant="heading" style={styles.headerTitle}>
                {title}
              </AppText>
              <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={colors.ink500} />
              </Pressable>
            </View>
          ) : null}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

export function OptionSheet<T extends string>({
  visible,
  title,
  options,
  value,
  onSelect,
  onClose,
  emptyLabel = 'No options',
}: {
  visible: boolean;
  title: string;
  options: readonly T[];
  value?: T | string;
  onSelect: (value: T) => void;
  onClose: () => void;
  emptyLabel?: string;
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      {options.length === 0 ? (
        <AppText variant="body" color={colors.ink500}>
          {emptyLabel}
        </AppText>
      ) : (
        options.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                onSelect(option);
                onClose();
              }}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <AppText variant="bodyLg" color={selected ? colors.pine700 : colors.ink900}>
                {option}
              </AppText>
              {selected ? <Ionicons name="checkmark" size={20} color={colors.pine700} /> : null}
            </Pressable>
          );
        })
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(28, 36, 32, 0.4)' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingBottom: spacing.lg,
    shadowColor: colors.ink900,
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.ink300,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  headerTitle: { flex: 1 },
  content: { paddingHorizontal: spacing.base, paddingBottom: spacing.base, gap: spacing.xs },
  footer: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.ink100,
  },
  option: {
    minHeight: 48,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionSelected: { backgroundColor: colors.pine100 },
});
