import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { PawAvatarIcon } from '@/components/pack-icons';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  uri?: string | null;
  size?: number;
}

/** Read-only pet avatar — the photo if one's set, otherwise the pack's paw glyph. */
export function PetAvatar({ uri, size = 44 }: Props) {
  const theme = useTheme();
  const circle = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={[circle, styles.image]} contentFit="cover" />;
  }

  return (
    <View style={[circle, styles.placeholder, { backgroundColor: theme.tileBg }]}>
      <PawAvatarIcon color={theme.accentDeep} size={Math.round(size * 0.5)} />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {},
  placeholder: { alignItems: 'center', justifyContent: 'center' },
});
