import { Stack } from 'expo-router';
import { Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/lib/auth-context';

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
  return (
    <Stack screenOptions={{ headerRight: () => <SignOutButton /> }}>
      <Stack.Screen name="index" options={{ title: 'My Dogs' }} />
      <Stack.Screen name="pets/new" options={{ title: 'Add a Dog', presentation: 'modal' }} />
      <Stack.Screen name="pets/[id]/index" options={{ title: 'Dog Profile' }} />
    </Stack>
  );
}
