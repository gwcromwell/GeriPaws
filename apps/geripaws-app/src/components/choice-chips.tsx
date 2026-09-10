import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  label: string;
  helperText?: string;
  options: Option<T>[];
  value?: T;
  onChange: (value: T | undefined) => void;
};

export function ChoiceChips<T extends string>({ label, helperText, options, value, onChange }: Props<T>) {
  const theme = useTheme();
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
          const isSelected = value === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(isSelected ? undefined : option.value)}
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
