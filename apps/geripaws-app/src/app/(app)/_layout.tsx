import { Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useQuickActionRouting } from 'expo-quick-actions/router';
import { useEffect, useRef } from 'react';
import { Alert, AppState, type AppStateStatus } from 'react-native';

import { scheduleDueNotifications } from '@/lib/due-notifications';
import { handleNotificationResponse, registerNotificationCategories } from '@/lib/notification-actions';
import { setupPushNotifications } from '@/lib/push';

export default function AppLayout() {
  const appState = useRef(AppState.currentState);
  const router = useRouter();

  // Home Screen long-press shortcuts ("Log walk" / "Log incident") — see
  // quick-actions.ts. This sub-layout (not the root layout — see that
  // hook's own warning) handles both a cold launch via the shortcut and one
  // tapped while already running.
  useQuickActionRouting();

  useEffect(() => {
    // Best-effort — no-ops until an EAS project ID and Apple push
    // credentials exist (see README, Phase 4).
    setupPushNotifications();
    registerNotificationCategories();

    // Recomputes today's "X is due" local notifications on entry, and again
    // every time the app is foregrounded — see due-notifications.ts for why
    // (no reliable background refresh, so this is only as fresh as the last
    // time the app was opened).
    scheduleDueNotifications();
    const appStateSubscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current !== 'active' && nextState === 'active') {
        scheduleDueNotifications();
      }
      appState.current = nextState;
    });

    // One-tap "Mark given" / "Log now" from a due-reminder notification —
    // see notification-actions.ts. Navigates to the pet afterward as a
    // brief visual confirmation; a plain tap on the notification body (no
    // action button) is left alone, same as before this existed.
    const notificationSubscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      try {
        const petId = await handleNotificationResponse(response);
        if (petId) router.push({ pathname: '/pets/[id]', params: { id: petId } });
      } catch (err) {
        Alert.alert('Could not log that', err instanceof Error ? err.message : 'Something went wrong.');
      }
    });

    return () => {
      appStateSubscription.remove();
      notificationSubscription.remove();
    };
  }, [router]);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'My Dogs' }} />
      <Stack.Screen name="account" options={{ title: 'Account' }} />
      <Stack.Screen name="pets/new" options={{ title: 'Add a Dog', presentation: 'modal' }} />
      <Stack.Screen name="pets/[id]/index" options={{ title: 'Today' }} />
      <Stack.Screen name="pets/[id]/edit" options={{ title: 'Edit Profile', presentation: 'modal' }} />
      <Stack.Screen name="pets/[id]/preferences" options={{ title: 'Preferences', presentation: 'modal' }} />
      <Stack.Screen name="pets/[id]/sharing" options={{ title: 'Caregivers' }} />
      <Stack.Screen name="pets/[id]/history" options={{ title: 'History' }} />
      <Stack.Screen name="pets/[id]/weight" options={{ title: 'Weight' }} />
      <Stack.Screen name="pets/[id]/log/[type]" options={{ title: 'Log Entry', presentation: 'modal' }} />
      <Stack.Screen name="pets/[id]/ailments/index" options={{ title: 'Ailments & Medications' }} />
      <Stack.Screen name="pets/[id]/vet-summary" options={{ title: 'For Your Vet' }} />
      <Stack.Screen name="pets/[id]/ailments/new" options={{ title: 'Add a Condition', presentation: 'modal' }} />
      <Stack.Screen name="pets/[id]/ailments/[ailmentId]/index" options={{ title: 'Condition' }} />
      <Stack.Screen name="pets/[id]/medications/new" options={{ title: 'Medication', presentation: 'modal' }} />
      <Stack.Screen name="pets/[id]/medications/[medicationId]/index" options={{ title: 'Medication' }} />
      <Stack.Screen name="pets/[id]/qol/index" options={{ title: 'Quality of Life' }} />
      <Stack.Screen name="pets/[id]/qol/settings" options={{ title: 'QOL Settings', presentation: 'modal' }} />
      <Stack.Screen name="pets/[id]/qol/new" options={{ title: 'Check-in', presentation: 'modal' }} />
      <Stack.Screen name="pets/[id]/schedule" options={{ title: 'Walk, Food & Water Schedule', presentation: 'modal' }} />
    </Stack>
  );
}
