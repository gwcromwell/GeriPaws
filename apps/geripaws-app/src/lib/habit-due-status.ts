import { computeDueTimesForDay } from '@geripaws/shared';
import type { HabitLog, HabitScheduleRow, HabitScheduleType } from '@geripaws/shared';

export type HabitDueStatus = 'none' | 'due' | 'overdue';

/**
 * Schedule-driven due/overdue status for a walk/food/water tile — mirrors the
 * habit-schedule half of send-reminders/index.ts's overdue check (same "any log
 * at or after the due time satisfies it" rule) so the Today screen and the
 * hourly digest never disagree about whether something is overdue.
 *
 * 'none' (no red/green styling at all) when this type has no configured
 * schedule — per-user decision: schedule alerts only ever show once a
 * schedule is actually set, never a guessed fallback cadence.
 */
export function computeHabitDueStatus(
  type: HabitScheduleType,
  schedules: HabitScheduleRow[],
  logsToday: HabitLog[],
  dayStart: Date,
  timeZone: string,
  graceMinutes: number,
  now: Date = new Date()
): HabitDueStatus {
  const scheduleRow = schedules.find((s) => s.type === type);
  if (!scheduleRow) return 'none';

  const dueTimes = computeDueTimesForDay(scheduleRow.schedule, dayStart, timeZone).sort(
    (a, b) => a.getTime() - b.getTime()
  );
  const graceMs = graceMinutes * 60_000;

  for (const dueAt of dueTimes) {
    if (dueAt > now) break; // this and every later slot today haven't arrived yet

    const satisfied = logsToday.some((log) => new Date(log.occurred_at).getTime() >= dueAt.getTime());
    if (satisfied) continue;

    return now.getTime() - dueAt.getTime() > graceMs ? 'overdue' : 'due';
  }

  return 'none';
}
