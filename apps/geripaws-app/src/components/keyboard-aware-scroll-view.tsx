import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Wraps a form so the focused field scrolls above the on-screen keyboard
 * instead of being covered by it — sign-in/sign-up/accept-invite are plain
 * centered forms with no ScrollView today, so on a short device the keyboard
 * can fully obscure the password field with no way to tell whether text is
 * being entered.
 */
export function KeyboardAwareScrollView({
  children,
  contentContainerStyle,
}: {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={contentContainerStyle} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
