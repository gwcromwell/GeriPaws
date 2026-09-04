import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { formatDateTime, QUICK_TIME_OFFSETS } from '@/lib/format';

type Props = {
  value: Date;
  onChange: (date: Date) => void;
};

export function OccurredAtField({ value, onChange }: Props) {
  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">When</ThemedText>
      <ThemedText themeColor="textSecondary" type="small">
        Defaults to now — pick how long ago it actually happened
      </ThemedText>
      <View style={styles.row}>
        {QUICK_TIME_OFFSETS.map((option) => {
          const isSelected = Math.abs(Date.now() - option.minutesAgo * 60000 - value.getTime()) < 30000;
          return (
            <Pressable
              key={option.label}
              onPress={() => onChange(new Date(Date.now() - option.minutesAgo * 60000))}
              style={[styles.chip, isSelected && styles.chipSelected]}>
              <ThemedText type="small" themeColor={isSelected ? 'background' : 'text'}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      <ThemedText themeColor="textSecondary" type="small">
        {formatDateTime(value.toISOString())}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  chipSelected: {
    backgroundColor: '#208AEF',
    borderColor: '#208AEF',
  },
});
