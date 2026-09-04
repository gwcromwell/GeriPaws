import type { MedicationSchedule } from "./types";

function applyTimeToDay(dayStart: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(dayStart);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/**
 * Computes the clock times a medication is due within one "day" window,
 * where `dayStart` is the start of that day already adjusted for the pet's
 * day_boundary_hour (i.e. local midnight or whatever hour that pet's day
 * resets on) — this function doesn't know about day boundaries itself.
 */
export function computeDueTimesForDay(schedule: MedicationSchedule, dayStart: Date): Date[] {
  switch (schedule.kind) {
    case "times_per_day":
      return schedule.times.map((time) => applyTimeToDay(dayStart, time));

    case "specific_days": {
      if (!schedule.daysOfWeek.includes(dayStart.getDay())) return [];
      return schedule.times.map((time) => applyTimeToDay(dayStart, time));
    }

    case "interval_hours": {
      const times: Date[] = [];
      const dayEnd = new Date(dayStart.getTime() + 24 * 3_600_000);
      let current = applyTimeToDay(dayStart, schedule.startTime);
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
