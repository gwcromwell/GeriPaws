import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { CustomTimePicker, openAndroidTimePicker } from '@/components/custom-time-picker';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { QUICK_TIME_OFFSETS } from '@/lib/format';

type Props = {
  value: Date;
  onChange: (date: Date) => void;
};

export function QuickTimeChips({ value, onChange }: Props) {
  const theme = useTheme();
  const [showIosPicker, setShowIosPicker] = useState(false);

  const isPresetSelected = QUICK_TIME_OFFSETS.some(
    (option) => Math.abs(Date.now() - option.minutesAgo * 60000 - value.getTime()) < 30000
  );

  function openCustomPicker() {
    if (Platform.OS === 'android') {
      openAndroidTimePicker(value, onChange);
    } else if (Platform.OS === 'ios') {
      setShowIosPicker(true);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {QUICK_TIME_OFFSETS.map((option) => {
          const isSelected = Math.abs(Date.now() - option.minutesAgo * 60000 - value.getTime()) < 30000;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={option.label}
              onPress={() => onChange(new Date(Date.now() - option.minutesAgo * 60000))}
              hitSlop={8}
              style={[styles.chip, isSelected && styles.chipSelected, isSelected && { backgroundColor: theme.tint, borderColor: theme.tint }]}>
              <ThemedText type="small" themeColor={isSelected ? 'background' : 'text'}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
        {Platform.OS !== 'web' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: !isPresetSelected }}
            onPress={openCustomPicker}
            hitSlop={8}
            style={[
              styles.chip,
              !isPresetSelected && styles.chipSelected,
              !isPresetSelected && { backgroundColor: theme.tint, borderColor: theme.tint },
            ]}>
            <ThemedText type="small" themeColor={!isPresetSelected ? 'background' : 'text'}>
              Custom
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
      {showIosPicker ? <CustomTimePicker value={value} onChange={onChange} onClose={() => setShowIosPicker(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
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
