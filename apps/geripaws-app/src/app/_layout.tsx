import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { SetupRequired } from '@/components/setup-required';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { isConfigured } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return null;
  }

  return (
    <Stack>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" options={{ title: 'Sign in' }} />
        <Stack.Screen name="sign-up" options={{ title: 'Create account' }} />
      </Stack.Protected>

      <Stack.Screen name="accept-invite" options={{ title: 'Accept invite', presentation: 'modal' }} />
      <Stack.Screen name="shared/[token]" options={{ title: 'GeriPaws' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (!isConfigured) {
      SplashScreen.hideAsync();
    }
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {isConfigured ? (
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      ) : (
        <SetupRequired />
      )}
    </ThemeProvider>
  );
}
