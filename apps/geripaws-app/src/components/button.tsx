import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface Props {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** The one button implementation for the app — every screen previously
 * hand-rolled its own Pressable + StyleSheet for this (secondaryButton,
 * deleteButton, submitButton, saveButton, or a bare `button` key, ~35
 * independent copies with drifting margins and hardcoded hex colors instead
 * of theme tokens). Centralizing it means a future design change (like the
 * contrast fix or the theme system) touches one file instead of dozens. */
export function Button({ label, onPress, disabled, variant = 'primary', accessibilityLabel, style }: Props) {
  const theme = useTheme();

  const palette = {
    primary: { backgroundColor: theme.tint, borderColor: theme.tint, textColor: 'background' as const },
    secondary: { backgroundColor: 'transparent', borderColor: theme.tint, textColor: 'tint' as const },
    danger: { backgroundColor: theme.error, borderColor: theme.error, textColor: 'background' as const },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.base,
        { backgroundColor: palette.backgroundColor, borderColor: palette.borderColor },
        disabled && styles.disabled,
        style,
      ]}>
      <ThemedText themeColor={palette.textColor} type="smallBold">
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  disabled: { opacity: 0.5 },
});
