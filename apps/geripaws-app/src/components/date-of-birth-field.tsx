import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatAge } from '@/lib/format';

interface Props {
  /** ISO "YYYY-MM-DD", or undefined if unknown. */
  value?: string;
  onChange: (value: string | undefined) => void;
}

function parse(value?: string): { year: string; month: string; day: string } {
  if (!value) return { year: '', month: '', day: '' };
  const [year, month, day] = value.split('-');
  return { year, month, day };
}

export function DateOfBirthField({ value, onChange }: Props) {
  const theme = useTheme();
  const [parts, setParts] = useState(() => parse(value));

  useEffect(() => setParts(parse(value)), [value]);

  function update(next: { year: string; month: string; day: string }) {
    setParts(next);
    const { year, month, day } = next;
    if (year.length === 4 && month.length > 0 && day.length > 0) {
      const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      onChange(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : undefined);
    } else {
      onChange(undefined);
    }
  }

  const inputStyle = [
    styles.input,
    { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
  ];

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">Birthdate</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Optional — used to show age and to time senior-care milestones
      </ThemedText>
      <View style={styles.row}>
        <TextInput
          style={[...inputStyle, styles.month]}
          placeholder="MM"
          placeholderTextColor={theme.textSecondary}
          keyboardType="number-pad"
          maxLength={2}
          value={parts.month}
          onChangeText={(month) => update({ ...parts, month: month.replace(/\D/g, '') })}
        />
        <TextInput
          style={[...inputStyle, styles.day]}
          placeholder="DD"
          placeholderTextColor={theme.textSecondary}
          keyboardType="number-pad"
          maxLength={2}
          value={parts.day}
          onChangeText={(day) => update({ ...parts, day: day.replace(/\D/g, '') })}
        />
        <TextInput
          style={[...inputStyle, styles.year]}
          placeholder="YYYY"
          placeholderTextColor={theme.textSecondary}
          keyboardType="number-pad"
          maxLength={4}
          value={parts.year}
          onChangeText={(year) => update({ ...parts, year: year.replace(/\D/g, '') })}
        />
      </View>
      {value ? (
        <ThemedText type="small" themeColor="textSecondary">
          {formatAge(value)} old
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  row: { flexDirection: 'row', gap: 8, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, textAlign: 'center' },
  month: { width: 64 },
  day: { width: 64 },
  year: { width: 84 },
});
