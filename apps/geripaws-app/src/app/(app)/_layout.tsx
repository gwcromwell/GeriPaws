import { Stack } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus, Platform, Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/lib/auth-context';
import { scheduleDueNotifications } from '@/lib/due-notifications';
import { setupPushNotifications } from '@/lib/push';

function SignOutButton() {
  const { signOut } = useAuth();
  return (
    <Pressable accessibilityRole="button"
      onPress={() => signOut()}
      hitSlop={12}
      style={Platform.OS === 'web' ? { marginRight: 16 } : undefined}>
      <ThemedText type="link" themeColor="tint">
        Sign out
      </ThemedText>
    </Pressable>
  );
}

export default function AppLayout() {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Best-effort — no-ops until an EAS project ID and Apple push
    // credentials exist (see README, Phase 4).
    setupPushNotifications();

    // Recomputes today's "X is due" local notifications on entry, and again
    // every time the app is foregrounded — see due-notifications.ts for why
    // (no reliable background refresh, so this is only as fresh as the last
    // time the app was opened).
    scheduleDueNotifications();
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current !== 'active' && nextState === 'active') {
        scheduleDueNotifications();
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, []);

  return (
    <Stack screenOptions={{ headerRight: () => <SignOutButton /> }}>
      <Stack.Screen name="index" options={{ title: 'My Dogs' }} />
      <Stack.Screen name="account" options={{ title: 'Account' }} />
      <Stack.Screen name="pets/new" options={{ title: 'Add a Dog', presentation: 'modal' }} />
      <Stack.Screen name="pets/[id]/index" options={{ title: 'Today' }} />
      <Stack.Screen name="pets/[id]/edit" options={{ title: 'Edit Profile', presentation: 'modal' }} />
      <Stack.Screen name="pets/[id]/preferences" options={{ title: 'Preferences', presentation: 'modal' }} />
      <Stack.Screen name="pets/[id]/sharing" options={{ title: 'Sharing' }} />
      <Stack.Screen name="pets/[id]/history" options={{ title: 'History' }} />
      <Stack.Screen name="pets/[id]/weight" options={{ title: 'Weight' }} />
      <Stack.Screen name="pets/[id]/log/[type]" options={{ title: 'Log Entry', presentation: 'modal' }} />
      <Stack.Screen name="pets/[id]/ailments/index" options={{ title: 'Ailments & Medications' }} />
      <Stack.Screen name="pets/[id]/vet-summary" options={{ title: 'Vet Visit Summary' }} />
      <Stack.Screen name="pets/[id]/ailments/new" options={{ title: 'Add a Condition', presentation: 'modal' }} />
      <Stack.Screen name="pets/[id]/ailments/[ailmentId]/index" options={{ title: 'Condition' }} />
      <Stack.Screen name="pets/[id]/medications/new" options={{ title: 'Medication', presentation: 'modal' }} />
      <Stack.Screen name="pets/[id]/medications/[medicationId]/index" options={{ title: 'Medication' }} />
      <Stack.Screen name="pets/[id]/qol/index" options={{ title: 'Quality of Life' }} />
      <Stack.Screen name="pets/[id]/qol/settings" options={{ title: 'QOL Settings', presentation: 'modal' }} />
      <Stack.Screen name="pets/[id]/qol/new" options={{ title: 'Check-in', presentation: 'modal' }} />
      <Stack.Screen name="pets/[id]/schedule" options={{ title: 'Walk & Food Schedule', presentation: 'modal' }} />
    </Stack>
  );
}
