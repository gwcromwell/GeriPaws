import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { StylePacks, type StylePackId } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useStylePack } from '@/lib/style-pack-context';

const OPTIONS: { id: StylePackId; hint: string }[] = [
  { id: 'evening-walk', hint: 'Warm, quiet, low-contrast rows' },
  { id: 'good-days', hint: 'Bright cards with a QOL focus' },
  { id: 'daylight', hint: 'Plain white background, higher contrast for easier reading' },
];

export function PackSwitcher() {
  const { packId, setPackId } = useStylePack();
  const theme = useTheme();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  return (
    <View style={styles.list}>
      {OPTIONS.map(({ id, hint }) => {
        const pack = StylePacks[id];
        const swatch = pack[scheme];
        const isSelected = id === packId;
        return (
          <Pressable
            key={id}
            onPress={() => setPackId(id)}
            accessibilityRole="button"
            accessibilityLabel={`Use the ${pack.label} theme`}
            accessibilityState={{ selected: isSelected }}
            style={[
              styles.card,
              isSelected
                ? { backgroundColor: theme.tint + '14', borderColor: theme.tint }
                : { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
            ]}>
            <View style={[styles.swatch, { backgroundColor: swatch.background, borderColor: swatch.border }]}>
              <View style={[styles.swatchDot, { backgroundColor: swatch.accent }]} />
            </View>
            <View style={styles.flexOne}>
              <ThemedText type={isSelected ? 'smallBold' : 'small'}>
                {isSelected ? '✓ ' : ''}
                {pack.label}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {hint}
              </ThemedText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  flexOne: { flex: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
});
