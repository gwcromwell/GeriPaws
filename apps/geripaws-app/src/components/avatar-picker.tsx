import * as ImagePicker from 'expo-image-picker';
import { Pressable, StyleSheet, View } from 'react-native';

import { PetAvatar } from '@/components/pet-avatar';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  uri?: string | null;
  onPick: (localUri: string) => void;
  size?: number;
}

export function AvatarPicker({ uri, onPick, size = 88 }: Props) {
  const theme = useTheme();

  async function handlePress() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      onPick(result.assets[0].uri);
    }
  }

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <PetAvatar uri={uri} size={size} />
      <View style={styles.labelWrap}>
        <ThemedText type="link" style={{ color: theme.tint }}>
          {uri ? 'Change photo' : 'Add a photo'}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 6 },
  labelWrap: { marginTop: 2 },
});
