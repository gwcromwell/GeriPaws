import * as Notifications from 'expo-notifications';

import { scheduleDueNotifications } from './due-notifications';
import { createHabitLog } from './habits';
import { markDoseGiven } from './medications';

/**
 * One-tap logging straight from a due-reminder notification — see
 * due-notifications.ts, which tags each scheduled "X is due" notification
 * with one of these categories and the data these actions need. Tapping the
 * button writes the log through the exact same functions the manual log
 * form uses; no screen is ever shown for it.
 */
export const NOTIFICATION_CATEGORY = {
  medicationDue: 'geripaws.medication-due',
  walkDue: 'geripaws.walk-due',
  foodDue: 'geripaws.food-due',
} as const;

const ACTION = {
  markGiven: 'mark-given',
  logWalk: 'log-walk',
  logFood: 'log-food',
} as const;

/** Registers the categories above with their action buttons. Safe to call
 * every time the app launches — this just re-declares the same categories. */
export async function registerNotificationCategories(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORY.medicationDue, [
    { identifier: ACTION.markGiven, buttonTitle: 'Mark given', options: { opensAppToForeground: true } },
  ]);
  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORY.walkDue, [
    { identifier: ACTION.logWalk, buttonTitle: 'Log now', options: { opensAppToForeground: true } },
  ]);
  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORY.foodDue, [
    { identifier: ACTION.logFood, buttonTitle: 'Log now', options: { opensAppToForeground: true } },
  ]);
}

/** The pet to navigate to for a brief visual confirmation after a
 * successful action-button log — null if this response wasn't one of our
 * action buttons (e.g. the user tapped the notification body itself). */
export async function handleNotificationResponse(
  response: Notifications.NotificationResponse
): Promise<string | null> {
  const data = response.notification.request.content.data as Record<string, string> | undefined;
  const petId = data?.petId;
  if (!petId) return null;

  switch (response.actionIdentifier) {
    case ACTION.markGiven:
      if (!data?.medicationId || !data?.scheduledAt) return null;
      await markDoseGiven(petId, data.medicationId, new Date(data.scheduledAt));
      break;
    case ACTION.logWalk:
      await createHabitLog({ type: 'walk', petId, occurredAt: new Date().toISOString(), details: {} });
      break;
    case ACTION.logFood:
      await createHabitLog({ type: 'food', petId, occurredAt: new Date().toISOString(), details: {} });
      break;
    default:
      return null;
  }

  // Best-effort — clears out any now-redundant "still due" notification for
  // the same slot rather than waiting for the next foreground to notice.
  scheduleDueNotifications().catch(() => {});
  return petId;
}
