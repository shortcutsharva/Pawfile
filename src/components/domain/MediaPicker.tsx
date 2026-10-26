import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';
import type { DraftMedia } from '@/data/types';
import { pickDocuments, pickMediaFromLibrary, takePhoto } from '@/services/media';
import { AppText } from '../ui/Text';

export function MediaPicker({
  media,
  onChange,
  compact = false,
}: {
  media: DraftMedia[];
  onChange: (media: DraftMedia[]) => void;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  const add = async (picker: () => Promise<{ media: DraftMedia[]; errors: string[] }>) => {
    setBusy(true);
    try {
      const result = await picker();
      if (result.errors.length) {
        Alert.alert('Some files were skipped', result.errors.join('\n'));
      }
      if (result.media.length) {
        onChange([...media, ...result.media]);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttonRow}>
        <PickerButton
          icon="camera-outline"
          label="Camera"
          disabled={busy}
          onPress={() => void add(takePhoto)}
        />
        <PickerButton
          icon="images-outline"
          label="Photos"
          disabled={busy}
          onPress={() => void add(pickMediaFromLibrary)}
        />
        <PickerButton
          icon="document-attach-outline"
          label="Files"
          disabled={busy}
          onPress={() => void add(pickDocuments)}
        />
      </View>

      {media.length ? (
        <View style={styles.grid}>
          {media.map((item) => (
            <View key={item.id} style={[styles.tile, compact && styles.tileCompact]}>
              {item.mimeType.startsWith('image') ? (
                <Image source={{ uri: item.uri }} style={styles.thumb} resizeMode="cover" />
              ) : (
                <Ionicons name="document-text-outline" size={28} color={colors.ink500} />
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item.fileName}`}
                onPress={() => onChange(media.filter((entry) => entry.id !== item.id))}
                style={styles.remove}
              >
                <Ionicons name="close" size={14} color={colors.white} />
              </Pressable>
              <AppText variant="caption" color={colors.ink700} numberOfLines={2} style={styles.name}>
                {item.fileName}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function PickerButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Add ${label.toLowerCase()}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pickerButton,
        pressed && { backgroundColor: colors.pine50 },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Ionicons name={icon} size={22} color={colors.pine700} />
      <AppText variant="caption" color={colors.ink700}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  buttonRow: { flexDirection: 'row', gap: spacing.sm },
  pickerButton: {
    flex: 1,
    minHeight: 64,
    borderRadius: radius.input,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.ink300,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    width: 104,
    minHeight: 104,
    borderRadius: radius.input,
    backgroundColor: colors.ink100,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
  },
  tileCompact: { width: 88, minHeight: 88 },
  thumb: { width: '100%', height: 64, borderRadius: 6 },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.ink900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { marginTop: 2 },
});
