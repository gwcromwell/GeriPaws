import { useState, type ChangeEvent } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type Props = {
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
};

/** Formats for <input type="datetime-local">, which takes local time with no
 * timezone offset — using toISOString() here would silently shift the value
 * to UTC. */
function toInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Web has no native date/time dialog — the only cross-browser equivalent is
// the browser's own <input type="datetime-local"> widget, so this renders
// that directly rather than a react-native primitive.
export function CustomTimePicker({ value, onChange, onClose }: Props) {
  const [draft, setDraft] = useState(() => toInputValue(value));

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setDraft(e.target.value);
    const parsed = new Date(e.target.value);
    if (!isNaN(parsed.getTime())) onChange(parsed);
  }

  return (
    <View style={styles.wrap}>
      <input
        type="datetime-local"
        value={draft}
        max={toInputValue(new Date())}
        onChange={handleChange}
        // A real DOM element, not an RN primitive — needs a plain CSS object,
        // not a StyleSheet.create() reference.
        style={{ fontSize: 14, padding: 6, fontFamily: 'inherit' }}
      />
      <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8} style={styles.doneButton}>
        <ThemedText type="link" themeColor="tint">
          Done
        </ThemedText>
      </Pressable>
    </View>
  );
}

export function openAndroidTimePicker(_value: Date, _onChange: (date: Date) => void) {}

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-end', gap: 4 },
  doneButton: { paddingVertical: 4, paddingHorizontal: 8 },
});
