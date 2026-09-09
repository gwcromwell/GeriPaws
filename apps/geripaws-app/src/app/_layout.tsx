import { Baloo2_500Medium, Baloo2_600SemiBold, Baloo2_700Bold } from '@expo-google-fonts/baloo-2';
import { Domine_500Medium, Domine_600SemiBold, Domine_700Bold } from '@expo-google-fonts/domine';
import { Karla_400Regular, Karla_500Medium, Karla_700Bold } from '@expo-google-fonts/karla';
import { WorkSans_400Regular, WorkSans_500Medium, WorkSans_600SemiBold } from '@expo-google-fonts/work-sans';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { SetupRequired } from '@/components/setup-required';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { StylePackProvider } from '@/lib/style-pack-context';
import { isConfigured } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, isLoading } = useAuth();
  const [fontsLoaded] = useFonts({
    Domine_500Medium,
    Domine_600SemiBold,
    Domine_700Bold,
    Karla_400Regular,
    Karla_500Medium,
    Karla_700Bold,
    Baloo2_500Medium,
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_600SemiBold,
  });

  useEffect(() => {
    if (!isLoading && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isLoading, fontsLoaded]);

  if (isLoading || !fontsLoaded) {
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
        <StylePackProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </StylePackProvider>
      ) : (
        <SetupRequired />
      )}
    </ThemeProvider>
  );
}
