import type { Attachment, AttachmentEntityType } from '@geripaws/shared';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { MediaPicker, type PickedMedia } from '@/components/media-picker';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { deleteAttachment, fetchAttachments, getAttachmentUrls, uploadAttachment } from '@/lib/attachments';
import { prepareImageForUpload } from '@/lib/media';

interface Props {
  petId: string;
  entityType: AttachmentEntityType;
  /** Null while the parent record (a new incident) hasn't been saved yet —
   * there's nothing to attach to until it has an id. */
  entityId: string | null;
  canEdit: boolean;
}

export function AttachmentGrid({ petId, entityType, entityId, canEdit }: Props) {
  const theme = useTheme();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<Attachment | null>(null);

  const load = useCallback(async () => {
    if (!entityId) return;
    try {
      const rows = await fetchAttachments(entityType, entityId);
      setAttachments(rows);
      setUrls(await getAttachmentUrls(rows.map((row) => row.storage_path)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attachments');
    }
  }, [entityType, entityId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handlePick(items: PickedMedia[]) {
    if (!entityId) return;
    setIsUploading(true);
    setError(null);
    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const uri = item.mediaType === 'image' ? await prepareImageForUpload(item.uri, item.width, item.height) : item.uri;
        await uploadAttachment(petId, entityType, entityId, uri, item.mediaType, attachments.length + i);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(attachment: Attachment) {
    try {
      await deleteAttachment(attachment);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  if (!entityId) return null;

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">Photos & video</ThemedText>
      <View style={styles.grid}>
        {attachments.map((attachment) => (
          <View key={attachment.id} style={styles.tileWrap}>
            <Pressable
              onPress={() => setPreviewing(attachment)}
              accessibilityRole="button"
              accessibilityLabel={attachment.media_type === 'video' ? 'Play video' : 'View photo'}
              style={[styles.tile, { backgroundColor: theme.tileBg }]}>
              {attachment.media_type === 'image' && urls[attachment.storage_path] ? (
                <Image source={{ uri: urls[attachment.storage_path] }} style={styles.thumb} contentFit="cover" />
              ) : (
                <ThemedText type="title" style={{ color: theme.accent }}>
                  ▶
                </ThemedText>
              )}
            </Pressable>
            {canEdit ? (
              <Pressable
                onPress={() => handleDelete(attachment)}
                accessibilityRole="button"
                accessibilityLabel="Delete"
                hitSlop={8}
                style={[styles.deleteBadge, { backgroundColor: theme.error }]}>
                <ThemedText type="small" themeColor="background">
                  ×
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        ))}
        {canEdit ? <MediaPicker onPick={handlePick} disabled={isUploading} label={isUploading ? '…' : '+ Add'} /> : null}
      </View>

      {error ? (
        <ThemedText themeColor="error" type="small">
          {error}
        </ThemedText>
      ) : null}

      <Modal visible={previewing !== null} transparent animationType="fade" onRequestClose={() => setPreviewing(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPreviewing(null)}>
          {previewing && urls[previewing.storage_path] ? (
            <AttachmentPreview attachment={previewing} url={urls[previewing.storage_path]} />
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}

function AttachmentPreview({ attachment, url }: { attachment: Attachment; url: string }) {
  if (attachment.media_type === 'video') return <VideoPreview url={url} />;
  return <Image source={{ uri: url }} style={styles.previewMedia} contentFit="contain" />;
}

function VideoPreview({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.play();
  });
  return <VideoView player={player} style={styles.previewMedia} contentFit="contain" />;
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tileWrap: { position: 'relative' },
  tile: { width: 72, height: 72, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
  deleteBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' },
  previewMedia: { width: '92%', height: '70%' },
});
