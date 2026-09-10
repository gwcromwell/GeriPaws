import { signInSchema } from '@geripaws/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/lib/auth-context';
import { acceptInvite } from '@/lib/pets';


import { useTheme } from '@/hooks/use-theme';
export default function AcceptInviteScreen() {
  const theme = useTheme();
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { session, signIn, signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'accepting' | 'done'>('idle');

  useEffect(() => {
    if (session && token && status === 'idle') {
      setStatus('accepting');
      acceptInvite(token)
        .then((petId) => {
          setStatus('done');
          router.replace({ pathname: '/pets/[id]', params: { id: petId } });
        })
        .catch((err) => {
          setStatus('idle');
          setError(err instanceof Error ? err.message : 'Failed to accept invite');
        });
    }
  }, [session, token, status, router]);

  if (!token) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText themeColor="error">This invite link is missing its token.</ThemedText>
      </ThemedView>
    );
  }

  if (session) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>{error ?? 'Accepting invite…'}</ThemedText>
      </ThemedView>
    );
  }

  async function handleSubmit() {
    const result = signInSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid input');
      return;
    }
    setError(null);
    const action = mode === 'sign-in' ? signIn : signUp;
    const { error: authError } = await action(result.data.email, result.data.password);
    if (authError) setError(authError);
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">
        {mode === 'sign-in' ? 'Sign in to accept this invite' : 'Create an account to accept this invite'}
      </ThemedText>

      <ThemedTextInput
        label="Email"
        helperText="Use the address this invite was sent to"
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
        helperText={mode === 'sign-up' ? 'At least 8 characters' : undefined}
        placeholder={mode === 'sign-up' ? 'Choose a password' : 'Your password'}
        autoComplete={mode === 'sign-up' ? 'password-new' : 'password'}
        secureTextEntry
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
        value={password}
        onChangeText={setPassword}
      />

      {error ? <ThemedText themeColor="error">{error}</ThemedText> : null}

      <Pressable accessibilityRole="button" style={[styles.button, { backgroundColor: theme.tint }]} onPress={handleSubmit}>
        <ThemedText themeColor="background" type="smallBold">
          {mode === 'sign-in' ? 'Sign in' : 'Sign up'}
        </ThemedText>
      </Pressable>

      <Pressable accessibilityRole="button" onPress={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}>
        <ThemedText type="link" themeColor="tint" style={styles.switchMode}>
          {mode === 'sign-in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 12 },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  switchMode: { textAlign: 'center', marginTop: 8 },
});
