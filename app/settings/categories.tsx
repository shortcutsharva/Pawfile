import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar } from '@/components/ui/Layout';
import { AppText } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/FormField';
import { useAppConfig } from '@/hooks/useAppData';
import { defaultConfig, updateConfig } from '@/data/appConfig';
import { colors, spacing } from '@/theme/tokens';

function toText(values: string[]): string {
  return values.join(', ');
}

function toList(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

export default function CategoriesSettingsScreen() {
  const router = useRouter();
  const config = useAppConfig();
  const [animalTypes, setAnimalTypes] = useState(toText(config.animalTypes));
  const [categories, setCategories] = useState(toText(config.complaintCategories));
  const [urgencies, setUrgencies] = useState(toText(config.urgencyLevels));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const animals = toList(animalTypes);
    const complaints = toList(categories);
    const urgency = toList(urgencies);
    if (!animals.length || !complaints.length || !urgency.length) {
      Alert.alert('Lists cannot be empty', 'Add at least one value to each list.');
      return;
    }
    setSaving(true);
    await updateConfig({
      animalTypes: animals,
      complaintCategories: complaints,
      urgencyLevels: urgency,
    });
    setSaving(false);
    router.back();
  };

  const reset = () => {
    setAnimalTypes(toText(defaultConfig.animalTypes));
    setCategories(toText(defaultConfig.complaintCategories));
    setUrgencies(toText(defaultConfig.urgencyLevels));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AppBar title="Categories" showBack onBack={() => router.back()} />
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppText variant="body" color={colors.ink500}>
            Comma-separated lists. These fill the pickers in New Case and Settings.
          </AppText>
          <TextField
            label="Animal types"
            value={animalTypes}
            onChange={setAnimalTypes}
            multiline
          />
          <TextField
            label="Complaint categories"
            value={categories}
            onChange={setCategories}
            multiline
          />
          <TextField
            label="Urgency levels"
            value={urgencies}
            onChange={setUrgencies}
            multiline
          />
          <Button label="Reset to defaults" variant="ghost" onPress={reset} />
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={styles.bottomBar}>
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
        <Button label="Save" style={styles.primary} loading={saving} onPress={() => void save()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  fill: { flex: 1 },
  content: { padding: spacing.base, gap: spacing.sm, paddingBottom: spacing.xxl },
  bottomBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.ink100,
    backgroundColor: colors.card,
  },
  primary: { flex: 2 },
});
