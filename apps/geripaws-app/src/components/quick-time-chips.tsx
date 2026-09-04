import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { QUICK_TIME_OFFSETS } from '@/lib/format';

type Props = {
  value: Date;
  onChange: (date: Date) => void;
};

export function QuickTimeChips({ value, onChange }: Props) {
  return (
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
  );
}

const styles = StyleSheet.create({
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
