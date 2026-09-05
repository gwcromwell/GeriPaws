import type { MedicationSchedule } from "./types";
import { getZonedDateParts, getZonedDayOfWeek, zonedTimeToUtc } from "./tz";

/**
 * Places an "HH:MM" wall-clock time onto whatever calendar day `dayStart`
 * (a UTC instant) falls on *in `timeZone`* — not the runtime's own local
 * timezone, which is wrong the moment this runs somewhere other than the
 * pet owner's device (e.g. a server-side reminder job).
 */
function applyTimeToDay(dayStart: Date, time: string, timeZone: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const { year, month, day } = getZonedDateParts(dayStart, timeZone);
  return zonedTimeToUtc(year, month, day, hours, minutes, timeZone);
}

/**
 * Computes the clock times a medication is due within one "day" window, in
 * the pet's own timezone — where `dayStart` is the start of that day already
 * adjusted for the pet's day_boundary_hour (see getDayStart below).
 */
export function computeDueTimesForDay(schedule: MedicationSchedule, dayStart: Date, timeZone: string): Date[] {
  switch (schedule.kind) {
    case "times_per_day":
      return schedule.times.map((time) => applyTimeToDay(dayStart, time, timeZone));

    case "specific_days": {
      if (!schedule.daysOfWeek.includes(getZonedDayOfWeek(dayStart, timeZone))) return [];
      return schedule.times.map((time) => applyTimeToDay(dayStart, time, timeZone));
    }

    case "interval_hours": {
      const times: Date[] = [];
      const dayEnd = new Date(dayStart.getTime() + 24 * 3_600_000);
      let current = applyTimeToDay(dayStart, schedule.startTime, timeZone);
      while (current < dayEnd) {
        if (current >= dayStart) times.push(new Date(current));
        current = new Date(current.getTime() + schedule.intervalHours * 3_600_000);
      }
      return times;
    }

    case "as_needed":
      return [];

    default:
      return [];
  }
}

/**
 * Start of "today" for a pet, in the pet's own timezone, adjusted for its
 * day_boundary_hour (the hour at which its day resets — usually midnight).
 */
export function getDayStart(now: Date, dayBoundaryHour: number, timeZone: string): Date {
  const today = getZonedDateParts(now, timeZone);
  let start = zonedTimeToUtc(today.year, today.month, today.day, dayBoundaryHour, 0, timeZone);
  if (start > now) {
    const yesterday = getZonedDateParts(new Date(now.getTime() - 24 * 3_600_000), timeZone);
    start = zonedTimeToUtc(yesterday.year, yesterday.month, yesterday.day, dayBoundaryHour, 0, timeZone);
  }
  return start;
}

/** Average doses per day this schedule implies, or null for as-needed (PRN) schedules. */
export function computeDosesPerDay(schedule: MedicationSchedule): number | null {
  switch (schedule.kind) {
    case "times_per_day":
      return schedule.times.length;
    case "interval_hours":
      return 24 / schedule.intervalHours;
    case "specific_days":
      return (schedule.times.length * schedule.daysOfWeek.length) / 7;
    case "as_needed":
      return null;
    default:
      return null;
  }
}

export interface RefillInput {
  countOnHand: number;
  unitPerDose: number;
  lowStockThreshold: number;
}

export interface RefillProjection {
  dosesPerDay: number | null;
  daysRemaining: number | null;
  runOutDate: Date | null;
  isLowStock: boolean;
}

export function computeRefillProjection(
  refill: RefillInput,
  schedule: MedicationSchedule,
  now: Date = new Date()
): RefillProjection {
  const dosesPerDay = computeDosesPerDay(schedule);

  if (!dosesPerDay || dosesPerDay <= 0) {
    return { dosesPerDay: null, daysRemaining: null, runOutDate: null, isLowStock: false };
  }

  const dailyBurn = refill.unitPerDose * dosesPerDay;
  const daysRemaining = dailyBurn > 0 ? refill.countOnHand / dailyBurn : null;
  const runOutDate = daysRemaining !== null ? new Date(now.getTime() + daysRemaining * 86_400_000) : null;
  const isLowStock = daysRemaining !== null && daysRemaining <= refill.lowStockThreshold;

  return { dosesPerDay, daysRemaining, runOutDate, isLowStock };
}
