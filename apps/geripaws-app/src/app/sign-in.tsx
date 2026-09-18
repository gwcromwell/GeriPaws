import { signInSchema } from '@geripaws/shared';
import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
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
    <ThemedView style={styles.flex}>
      <KeyboardAwareScrollView contentContainerStyle={styles.container}>
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
          returnKeyType="next"
          value={email}
          onChangeText={setEmail}
        />
        <ThemedTextInput
          label="Password"
          placeholder="Your password"
          autoComplete="password"
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

        <Button label={isSubmitting ? 'Signing in…' : 'Sign in'} onPress={handleSubmit} disabled={isSubmitting} style={styles.button} />

        <Link href="/sign-up" style={styles.link}>
          <ThemedText type="link" themeColor="tint">
            Need an account? Sign up
          </ThemedText>
        </Link>
      </KeyboardAwareScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center', gap: 12 },
  title: { fontSize: 32, marginBottom: 4 },
  subtitle: { fontSize: 20, marginBottom: 16 },
  button: { marginTop: 8 },
  message: { textAlign: 'center' },
  link: { marginTop: 16, alignSelf: 'center' },
});
