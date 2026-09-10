import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextInputProps = TextInputProps & {
  label?: string;
  helperText?: string;
  errorText?: string;
};

export function ThemedTextInput({ label, helperText, errorText, style, ...rest }: ThemedTextInputProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {label ? <ThemedText type="smallBold">{label}</ThemedText> : null}
      <TextInput
        accessibilityLabel={label}
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
          style,
        ]}
        placeholderTextColor={theme.textSecondary}
        {...rest}
      />
      {errorText ? (
        <ThemedText type="small" themeColor="error">
          {errorText}
        </ThemedText>
      ) : helperText ? (
        <ThemedText type="small" themeColor="textSecondary">
          {helperText}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
});
