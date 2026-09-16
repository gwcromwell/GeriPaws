import { useState, type ChangeEvent } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

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
// the browser's own <input type="datetime-local"> widget. Wrapped in the same
// card look as the rest of the app (ThemedTextInput's border/radius/colors)
// since the bare input reads as un-styled browser chrome otherwise.
export function CustomTimePicker({ value, onChange, onClose }: Props) {
  const theme = useTheme();
  const colorScheme = useColorScheme();
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
        // A real DOM element, not an RN primitive — needs a plain CSS object
        // (matching ThemedTextInput's look), not a StyleSheet.create() ref.
        // colorScheme tells the browser's own calendar/clock icon and popup
        // to render in the app's current light/dark mode instead of always
        // light, which otherwise looks broken against a dark card.
        style={{
          fontSize: 16,
          padding: 12,
          borderRadius: 8,
          border: `1px solid ${theme.backgroundSelected}`,
          backgroundColor: theme.backgroundElement,
          color: theme.text,
          fontFamily: theme.bodyFont,
          colorScheme: colorScheme ?? 'light',
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

export function openAndroidTimePicker(_value: Date, _onChange: (date: Date) => void) {}

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-start', gap: 8 },
  doneButton: { paddingVertical: 4, paddingHorizontal: 8 },
});
