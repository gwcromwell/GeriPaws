import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Requests permission and registers this device for push notifications,
 * returning the Expo push token — or null if unavailable (Simulator, denied
 * permission, or no EAS project ID configured yet — this project doesn't
 * have push credentials set up until Phase 4's Apple Developer + EAS
 * accounts exist, see README).
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device, not a simulator.');
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.warn('No EAS project ID configured yet — skipping push registration.');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  return token;
}

export async function savePushToken(token: string): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error('Not signed in');

  const { error } = await supabase.from('push_tokens').upsert(
    {
      user_id: userData.user.id,
      token,
      platform: Platform.OS,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,token' }
  );
  if (error) throw error;
}

/** Convenience: register + save in one call, swallowing errors (best-effort, non-blocking). */
export async function setupPushNotifications(): Promise<void> {
  try {
    const token = await registerForPushNotifications();
    if (token) await savePushToken(token);
  } catch (err) {
    console.warn('Push notification setup failed:', err);
  }
}
