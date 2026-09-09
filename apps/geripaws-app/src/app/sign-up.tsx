import { signUpSchema } from '@geripaws/shared';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/lib/auth-context';


import { useTheme } from '@/hooks/use-theme';
export default function SignUpScreen() {
  const theme = useTheme();
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const result = signUpSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid input');
      return;
    }

    setError(null);
    setInfo(null);
    setIsSubmitting(true);
    const { error: signUpError } = await signUp(result.data.email, result.data.password);
    setIsSubmitting(false);
    if (signUpError) {
      setError(signUpError);
    } else {
      setInfo('Check your email to confirm your account, then sign in.');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        GeriPaws
      </ThemedText>
      <ThemedText type="subtitle" style={styles.subtitle}>
        Create account
      </ThemedText>

      <ThemedTextInput
        label="Email"
        helperText="We'll send a confirmation link here"
        placeholder="you@example.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        returnKeyType="next"
        value={email}
        onChangeText={setEmail}
      />
      <ThemedTextInput
        label="Password"
        helperText="At least 8 characters"
        placeholder="Choose a password"
        autoComplete="password-new"
        secureTextEntry
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
        value={password}
        onChangeText={setPassword}
      />

      {error ? (
        <ThemedText themeColor="error" style={styles.message}>
          {error}
        </ThemedText>
      ) : null}
      {info ? <ThemedText style={styles.message}>{info}</ThemedText> : null}

      <Pressable style={[styles.button, { backgroundColor: theme.tint }]} onPress={handleSubmit} disabled={isSubmitting}>
        <ThemedText themeColor="background" type="smallBold">
          {isSubmitting ? 'Creating account…' : 'Sign up'}
        </ThemedText>
      </Pressable>

      <Link href="/sign-in" style={styles.link}>
        <ThemedText type="link" themeColor="tint">
          Already have an account? Sign in
        </ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 12 },
  title: { fontSize: 32, marginBottom: 4 },
  subtitle: { fontSize: 20, marginBottom: 16 },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  message: { textAlign: 'center' },
  link: { marginTop: 16, alignSelf: 'center' },
});
