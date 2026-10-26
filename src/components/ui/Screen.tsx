import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, sizes } from '@/theme/tokens';

interface ScreenProps extends ViewProps {
  scroll?: boolean;
  padded?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export function Screen({
  children,
  scroll = false,
  padded = true,
  edges = ['top'],
  style,
  ...rest
}: PropsWithChildren<ScreenProps>) {
  const content = (
    <View style={[padded && styles.padded, styles.fill, style]} {...rest}>
      {children}
    </View>
  );
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, padded && styles.padded]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  fill: { flex: 1 },
  padded: { paddingHorizontal: sizes.screenGutter },
  scrollContent: { paddingBottom: 48, flexGrow: 1 },
});
