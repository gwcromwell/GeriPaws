import * as ImagePicker from 'expo-image-picker';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export interface PickedMedia {
  uri: string;
  mediaType: 'image' | 'video';
  width?: number;
  height?: number;
}

interface Props {
  onPick: (items: PickedMedia[]) => void;
  disabled?: boolean;
  label?: string;
}

const SELECTION_LIMIT = 6;
// Long enough for a full seizure clip — a vet reviewing one needs to see the
// whole episode, not a clip cut short by an arbitrary duration cap. Upload
// size (not duration) is what's actually gated — see lib/attachments.ts.
const VIDEO_MAX_DURATION_SECONDS = 300;

export function MediaPicker({ onPick, disabled, label = '+ Add' }: Props) {
  const theme = useTheme();

  async function handlePress() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: SELECTION_LIMIT,
      videoMaxDuration: VIDEO_MAX_DURATION_SECONDS,
      quality: 0.7,
    });
    if (result.canceled) return;

    const items: PickedMedia[] = result.assets.map((asset) => ({
      uri: asset.uri,
      mediaType: asset.type === 'video' ? 'video' : 'image',
      width: asset.width || undefined,
      height: asset.height || undefined,
    }));
    if (items.length > 0) onPick(items);
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Add a photo or video"
      style={[styles.button, { borderColor: theme.accent }, disabled && styles.disabled]}>
      <ThemedText type="smallBold" style={{ color: theme.accent }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 72,
    height: 72,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
});
