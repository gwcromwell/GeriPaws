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
  // iOS and web both render CustomTimePicker inline; Android has no combined
  // date+time inline mode, so it goes straight to the two native dialogs
  // instead (see custom-time-picker.tsx).
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const isPresetSelected = QUICK_TIME_OFFSETS.some(
    (option) => Math.abs(Date.now() - option.minutesAgo * 60000 - value.getTime()) < 30000
  );

  function openCustomPicker() {
    if (Platform.OS === 'android') {
      openAndroidTimePicker(value, onChange);
    } else {
      setShowCustomPicker(true);
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
              onPress={() => {
                setShowCustomPicker(false);
                onChange(new Date(Date.now() - option.minutesAgo * 60000));
              }}
              hitSlop={8}
              style={[styles.chip, { borderColor: isSelected ? theme.tint : theme.border }, isSelected && { backgroundColor: theme.tint }]}>
              <ThemedText type="small" themeColor={isSelected ? 'background' : 'text'}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: !isPresetSelected }}
          onPress={openCustomPicker}
          hitSlop={8}
          style={[
            styles.chip,
            { borderColor: !isPresetSelected ? theme.tint : theme.border },
            !isPresetSelected && { backgroundColor: theme.tint },
          ]}>
          <ThemedText type="small" themeColor={!isPresetSelected ? 'background' : 'text'}>
            Custom
          </ThemedText>
        </Pressable>
      </View>
      {showCustomPicker ? <CustomTimePicker value={value} onChange={onChange} onClose={() => setShowCustomPicker(false)} /> : null}
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
  },
});
