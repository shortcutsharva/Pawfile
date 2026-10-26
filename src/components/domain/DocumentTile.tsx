import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';
import type { DocumentMeta } from '@/data/types';
import { formatDate } from '@/utils/date';
import { AppText } from '../ui/Text';

export function DocumentTile({
  document,
  onPress,
  onRetry,
  onRemove,
}: {
  document: DocumentMeta;
  onPress?: () => void;
  onRetry?: () => void;
  onRemove?: () => void;
}) {
  const isImage = document.mimeType.startsWith('image') && Boolean(document.remoteUrl || document.localUri);
  const isUploading = document.uploadStatus === 'uploading' || document.uploadStatus === 'pending';
  const isFailed = document.uploadStatus === 'failed';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={document.fileName}
      onPress={onPress}
      style={styles.tile}
    >
      {isImage ? (
        <Image
          source={{ uri: document.remoteUrl || document.localUri }}
          style={styles.thumb}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.iconWrap}>
          <Ionicons
            name={document.mimeType.startsWith('video') ? 'film-outline' : 'document-text-outline'}
            size={32}
            color={colors.ink500}
          />
        </View>
      )}

      {isUploading ? (
        <View style={styles.overlay}>
          <Ionicons name="cloud-upload-outline" size={20} color={colors.white} />
          <AppText variant="caption" color={colors.white}>
            Uploading
          </AppText>
        </View>
      ) : null}

      {isFailed ? (
        <View style={[styles.overlay, { backgroundColor: 'rgba(127,42,23,0.85)' }]}>
          <AppText variant="caption" color={colors.white}>
            Upload failed
          </AppText>
          {onRetry ? (
            <Pressable onPress={onRetry} accessibilityRole="button" style={styles.retry}>
              <AppText variant="caption" color={colors.white}>
                Retry
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.captionRow}>
        <AppText variant="caption" color={colors.ink700} numberOfLines={2} style={styles.name}>
          {document.fileName}
        </AppText>
        {onRemove ? (
          <Pressable
            onPress={onRemove}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${document.fileName}`}
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={16} color={colors.ink500} />
          </Pressable>
        ) : null}
      </View>
      <AppText variant="caption" color={colors.ink500}>
        {formatDate(document.createdAt)}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: '48%',
    borderRadius: radius.input,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.ink100,
    overflow: 'hidden',
    padding: spacing.sm,
    gap: 4,
  },
  thumb: { width: '100%', height: 96, borderRadius: 6, backgroundColor: colors.ink100 },
  iconWrap: {
    height: 96,
    borderRadius: 6,
    backgroundColor: colors.ink100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(28,36,32,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  retry: {
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: 2,
  },
  captionRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { flex: 1 },
});
