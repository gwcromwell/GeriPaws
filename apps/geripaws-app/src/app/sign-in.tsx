import { signInSchema } from '@geripaws/shared';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/lib/auth-context';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const result = signInSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid input');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    const { error: signInError } = await signIn(result.data.email, result.data.password);
    setIsSubmitting(false);
    if (signInError) {
      setError(signInError);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        GeriPaws
      </ThemedText>
      <ThemedText type="subtitle" style={styles.subtitle}>
        Sign in
      </ThemedText>

      <ThemedTextInput
        label="Email"
        helperText="The email address you signed up with"
        placeholder="you@example.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <ThemedTextInput
        label="Password"
        placeholder="Your password"
        autoComplete="password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? (
        <ThemedText themeColor="error" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}

      <Pressable style={styles.button} onPress={handleSubmit} disabled={isSubmitting}>
        <ThemedText themeColor="background" type="smallBold">
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </ThemedText>
      </Pressable>

      <Link href="/sign-up" style={styles.link}>
        <ThemedText type="link" themeColor="tint">
          Need an account? Sign up
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
  error: { color: '#d33' },
  link: { marginTop: 16, alignSelf: 'center' },
});
