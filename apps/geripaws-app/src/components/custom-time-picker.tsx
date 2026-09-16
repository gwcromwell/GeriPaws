import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type Props = {
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
};

// Android has no combined date+time mode, so this chains two native dialogs
// and merges their results; iOS renders both in one inline spinner.
export function CustomTimePicker({ value, onChange, onClose }: Props) {
  return (
    <View style={styles.wrap}>
      <DateTimePicker
        value={value}
        mode="datetime"
        display="spinner"
        maximumDate={new Date()}
        onChange={(_event: DateTimePickerEvent, selected?: Date) => {
          if (selected) onChange(selected);
        }}
      />
      <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8} style={styles.doneButton}>
        <ThemedText type="link" themeColor="tint">
          Done
        </ThemedText>
      </Pressable>
    </View>
  );
}

export function openAndroidTimePicker(value: Date, onChange: (date: Date) => void) {
  DateTimePickerAndroid.open({
    value,
    mode: 'date',
    maximumDate: new Date(),
    onChange: (event, pickedDate) => {
      if (event.type !== 'set' || !pickedDate) return;
      DateTimePickerAndroid.open({
        value: pickedDate,
        mode: 'time',
        onChange: (timeEvent, pickedTime) => {
          if (timeEvent.type !== 'set' || !pickedTime) return;
          const combined = new Date(pickedDate);
          combined.setHours(pickedTime.getHours(), pickedTime.getMinutes(), 0, 0);
          onChange(combined);
        },
      });
    },
  });
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-end', gap: 4 },
  doneButton: { paddingVertical: 4, paddingHorizontal: 8 },
});
