import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/lib/auth-context';
import { setupPushNotifications } from '@/lib/push';

function SignOutButton() {
  const { signOut } = useAuth();
  return (
    <Pressable onPress={() => signOut()} hitSlop={8}>
      <ThemedText type="link" themeColor="tint">
        Sign out
      </ThemedText>
    </Pressable>
  );
}

export default function AppLayout() {
  useEffect(() => {
    // Best-effort — no-ops until an EAS project ID and Apple push
    // credentials exist (see README, Phase 4).
    setupPushNotifications();
  }, []);

  return (
    <Stack screenOptions={{ headerRight: () => <SignOutButton /> }}>
      <Stack.Screen name="index" options={{ title: 'My Dogs' }} />
      <Stack.Screen name="pets/new" options={{ title: 'Add a Dog', presentation: 'modal' }} />
      <Stack.Screen name="pets/[id]/index" options={{ title: 'Today' }} />
      <Stack.Screen name="pets/[id]/sharing" options={{ title: 'Sharing' }} />
      <Stack.Screen name="pets/[id]/history" options={{ title: 'History' }} />
      <Stack.Screen name="pets/[id]/log/[type]" options={{ title: 'Log Entry', presentation: 'modal' }} />
      <Stack.Screen name="pets/[id]/ailments/index" options={{ title: 'Ailments & Medications' }} />
      <Stack.Screen name="pets/[id]/ailments/new" options={{ title: 'Add a Condition', presentation: 'modal' }} />
      <Stack.Screen name="pets/[id]/ailments/[ailmentId]/index" options={{ title: 'Condition' }} />
      <Stack.Screen name="pets/[id]/medications/new" options={{ title: 'Medication', presentation: 'modal' }} />
      <Stack.Screen name="pets/[id]/medications/[medicationId]/index" options={{ title: 'Medication' }} />
      <Stack.Screen name="pets/[id]/qol/index" options={{ title: 'Quality of Life' }} />
      <Stack.Screen name="pets/[id]/qol/settings" options={{ title: 'QOL Settings', presentation: 'modal' }} />
      <Stack.Screen name="pets/[id]/qol/new" options={{ title: 'Check-in', presentation: 'modal' }} />
    </Stack>
  );
}
