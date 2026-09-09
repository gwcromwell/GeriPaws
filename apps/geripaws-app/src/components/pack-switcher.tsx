import { Pressable, StyleSheet, View } from 'react-native';

import { StylePacks, type StylePackId } from '@/constants/theme';
import { useStylePack } from '@/lib/style-pack-context';

const OPTIONS: StylePackId[] = ['evening-walk', 'good-days'];

export function PackSwitcher() {
  const { packId, setPackId } = useStylePack();

  return (
    <View style={styles.row}>
      {OPTIONS.map((id) => {
        const pack = StylePacks[id];
        const selected = id === packId;
        return (
          <Pressable
            key={id}
            onPress={() => setPackId(id)}
            accessibilityRole="button"
            accessibilityLabel={`Switch to ${pack.label} style`}
            accessibilityState={{ selected }}
            style={[styles.dot, { backgroundColor: pack.light.accent }, selected && styles.dotSelected]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dotSelected: {
    borderColor: 'rgba(0,0,0,0.35)',
  },
});
