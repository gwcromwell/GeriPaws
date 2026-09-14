import type { HabitScheduleType } from '@geripaws/shared';
import { computeDueTimesForDay, getDayStart } from '@geripaws/shared';
import * as Notifications from 'expo-notifications';

import { fetchHabitSchedules } from './habit-schedules';
import { fetchDosesSince, fetchMedications } from './medications';
import { NOTIFICATION_CATEGORY } from './notification-actions';
import { fetchMyPets, fetchMyPreferences } from './pets';
import { supabase } from './supabase';

interface PendingNotification {
  petName: string;
  body: string;
  date: Date;
  /** Lets the notification carry a one-tap action button — see notification-actions.ts. */
  categoryIdentifier: string;
  data: Record<string, string>;
}

async function fetchHabitLogsSince(
  petId: string,
  types: HabitScheduleType[],
  since: Date
): Promise<{ type: string; occurred_at: string }[]> {
  if (types.length === 0) return [];
  const { data, error } = await supabase
    .from('habit_logs')
    .select('type, occurred_at')
    .eq('pet_id', petId)
    .in('type', types)
    .gte('occurred_at', since.toISOString());
  if (error) throw error;
  return data ?? [];
}

/** Whether a walk/food due time was already satisfied by a log that happened
 * between the previous due time (or the start of the day) and this one — a
 * caregiver who walked the dog early shouldn't also get a "walk is due" ping
 * for that same slot. */
function isSlotAlreadyLogged(
  dueAt: Date,
  priorDueAt: Date | null,
  dayStart: Date,
  logs: { occurred_at: string }[]
): boolean {
  const windowStart = (priorDueAt ?? dayStart).getTime();
  return logs.some((log) => {
    const t = new Date(log.occurred_at).getTime();
    return t >= windowStart && t < dueAt.getTime();
  });
}

/**
 * Recomputes and reschedules every "X is due" local notification, for every
 * pet the signed-in user is a member of, respecting that pet's own
 * notify_medication_due/notify_walk_due/notify_food_due preference (personal
 * to this user — see pets/[id]/preferences.tsx). These fire at the *exact*
 * scheduled time on this device, unlike the hourly server-side overdue
 * digest (send-reminders) — see README's push-notifications section.
 *
 * Called on entering the authenticated app and whenever it's foregrounded
 * (see (app)/_layout.tsx) — this app has no reliable background refresh, so
 * "today's due times" are only as fresh as the last time it was opened.
 * Cancels and fully re-schedules every time rather than diffing, since this
 * is the only feature using scheduled (non-push) notifications.
 *
 * Each notification also carries a category/data pair for the one-tap
 * "Mark given" / "Log now" action button on it — see notification-actions.ts.
 */
export async function scheduleDueNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    const pets = await fetchMyPets();
    const now = new Date();
    const pending: PendingNotification[] = [];

    for (const pet of pets) {
      const prefs = await fetchMyPreferences(pet.id, userId);
      if (!prefs) continue;

      const timeZone = pet.timezone || 'UTC';
      const dayStart = getDayStart(now, pet.day_boundary_hour ?? 0, timeZone);

      if (prefs.notify_medication_due) {
        const [medications, dosesToday] = await Promise.all([
          fetchMedications(pet.id),
          fetchDosesSince(pet.id, dayStart),
        ]);

        for (const med of medications) {
          if (med.schedule.kind === 'as_needed') continue;
          if (med.active_until && new Date(med.active_until) < now) continue;

          for (const dueAt of computeDueTimesForDay(med.schedule, dayStart, timeZone)) {
            if (dueAt <= now) continue;
            const given = dosesToday.some(
              (d) => d.medication_id === med.id && new Date(d.scheduled_at).getTime() === dueAt.getTime()
            );
            if (given) continue;
            pending.push({
              petName: pet.name,
              body: `${med.name} is due`,
              date: dueAt,
              categoryIdentifier: NOTIFICATION_CATEGORY.medicationDue,
              data: { petId: pet.id, medicationId: med.id, scheduledAt: dueAt.toISOString() },
            });
          }
        }
      }

      const habitTypes: HabitScheduleType[] = [];
      if (prefs.notify_walk_due) habitTypes.push('walk');
      if (prefs.notify_food_due) habitTypes.push('food');

      if (habitTypes.length > 0) {
        const [schedules, logsSinceDayStart] = await Promise.all([
          fetchHabitSchedules(pet.id),
          fetchHabitLogsSince(pet.id, habitTypes, dayStart),
        ]);

        for (const habitSchedule of schedules) {
          if (!habitTypes.includes(habitSchedule.type)) continue;

          const dueTimes = computeDueTimesForDay(habitSchedule.schedule, dayStart, timeZone).sort(
            (a, b) => a.getTime() - b.getTime()
          );
          const logsForType = logsSinceDayStart.filter((log) => log.type === habitSchedule.type);

          let priorDueAt: Date | null = null;
          for (const dueAt of dueTimes) {
            if (dueAt > now && !isSlotAlreadyLogged(dueAt, priorDueAt, dayStart, logsForType)) {
              pending.push({
                petName: pet.name,
                body: habitSchedule.type === 'walk' ? 'Walk time' : 'Meal time',
                date: dueAt,
                categoryIdentifier:
                  habitSchedule.type === 'walk' ? NOTIFICATION_CATEGORY.walkDue : NOTIFICATION_CATEGORY.foodDue,
                data: { petId: pet.id },
              });
            }
            priorDueAt = dueAt;
          }
        }
      }
    }

    for (const item of pending) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: item.petName,
          body: item.body,
          sound: 'default',
          categoryIdentifier: item.categoryIdentifier,
          data: item.data,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: item.date },
      });
    }
  } catch (err) {
    console.warn('Failed to schedule due notifications:', err);
  }
}
