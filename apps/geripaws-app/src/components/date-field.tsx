import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatAge } from '@/lib/format';

interface DateFieldProps {
  label: string;
  helperText?: string;
  /** ISO "YYYY-MM-DD", or undefined if unknown. */
  value?: string;
  onChange: (value: string | undefined) => void;
  /** Optional content shown below the fields once a full date is entered
   * (e.g. a computed age) — receives the resolved ISO value. */
  footer?: (value: string) => ReactNode;
}

function parse(value?: string): { year: string; month: string; day: string } {
  if (!value) return { year: '', month: '', day: '' };
  const [year, month, day] = value.split('-');
  return { year, month, day };
}

/** Three separate numeric-only segments (MM/DD/YYYY) instead of a single
 * free-typed "YYYY-MM-DD" field — each segment can only ever hold digits, so
 * there's no ambiguous format to get wrong, and no error only caught on
 * submit. Used for birthdate, medication stop dates, and ailment diagnosis
 * dates alike. */
export function DateField({ label, helperText, value, onChange, footer }: DateFieldProps) {
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
      <ThemedText type="smallBold">{label}</ThemedText>
      {helperText ? (
        <ThemedText type="small" themeColor="textSecondary">
          {helperText}
        </ThemedText>
      ) : null}
      <View style={styles.row}>
        <TextInput
          accessibilityLabel={`${label} month`}
          style={[...inputStyle, styles.month]}
          placeholder="MM"
          placeholderTextColor={theme.textSecondary}
          keyboardType="number-pad"
          maxLength={2}
          value={parts.month}
          onChangeText={(month) => update({ ...parts, month: month.replace(/\D/g, '') })}
        />
        <TextInput
          accessibilityLabel={`${label} day`}
          style={[...inputStyle, styles.day]}
          placeholder="DD"
          placeholderTextColor={theme.textSecondary}
          keyboardType="number-pad"
          maxLength={2}
          value={parts.day}
          onChangeText={(day) => update({ ...parts, day: day.replace(/\D/g, '') })}
        />
        <TextInput
          accessibilityLabel={`${label} year`}
          style={[...inputStyle, styles.year]}
          placeholder="YYYY"
          placeholderTextColor={theme.textSecondary}
          keyboardType="number-pad"
          maxLength={4}
          value={parts.year}
          onChangeText={(year) => update({ ...parts, year: year.replace(/\D/g, '') })}
        />
      </View>
      {value && footer ? footer(value) : null}
    </View>
  );
}

interface DateOfBirthFieldProps {
  /** ISO "YYYY-MM-DD", or undefined if unknown. */
  value?: string;
  onChange: (value: string | undefined) => void;
}

export function DateOfBirthField({ value, onChange }: DateOfBirthFieldProps) {
  return (
    <DateField
      label="Birthdate"
      helperText="Optional — used to show age and to time senior-care milestones"
      value={value}
      onChange={onChange}
      footer={(v) => (
        <ThemedText type="small" themeColor="textSecondary">
          {formatAge(v)} old
        </ThemedText>
      )}
    />
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
