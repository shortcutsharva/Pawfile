import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, radius, sizes, spacing } from '@/theme/tokens';

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search case ID, FIR no, location, complainant',
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
}) {
  return (
    <View style={styles.container}>
      <Ionicons name="search-outline" size={20} color={colors.ink500} />
      <TextInput
        accessibilityLabel="Search cases"
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.ink500}
        style={styles.input}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        autoCorrect={false}
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={8}
          onPress={() => onChange('')}
        >
          <Ionicons name="close-circle" size={20} color={colors.ink500} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: sizes.inputHeight,
    borderRadius: radius.input,
    backgroundColor: colors.ink100,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 17,
    color: colors.ink900,
    paddingVertical: 0,
  },
});
