import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  label: string;
  helperText?: string;
  options: Option<T>[];
  values: T[];
  onChange: (values: T[]) => void;
};

/** Same look as ChoiceChips, but any number of chips can be selected at once
 * — for preferences like "which incident categories should notify me" where
 * the choice isn't mutually exclusive. */
export function MultiChoiceChips<T extends string>({ label, helperText, options, values, onChange }: Props<T>) {
  const theme = useTheme();

  function toggle(value: T) {
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  }

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {helperText ? (
        <ThemedText type="small" themeColor="textSecondary">
          {helperText}
        </ThemedText>
      ) : null}
      <View style={styles.row}>
        {options.map((option) => {
          const isSelected = values.includes(option.value);
          return (
            <Pressable
              key={option.value}
              onPress={() => toggle(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              hitSlop={8}
              style={[
                styles.chip,
                isSelected
                  ? { backgroundColor: theme.tint, borderColor: theme.tint }
                  : { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
              ]}>
              <ThemedText type={isSelected ? 'smallBold' : 'small'} themeColor={isSelected ? 'background' : 'text'}>
                {isSelected ? '✓ ' : ''}
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1.5,
  },
});
