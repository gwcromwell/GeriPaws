// Pure schedule/refill/QOL logic (mirrors packages/shared/src/schedule.ts and
// tz.ts). This must be timezone-aware, not just correct-looking: send-reminders
// runs on Supabase's servers (UTC), while a medication's "08:00" is only
// meaningful relative to the *pet's* timezone. The naive `Date#setHours`
// approach silently interprets clock times as UTC on the server while the
// mobile app (correctly) interprets them in the device's local time — those
// disagree by the pet owner's UTC offset, which either delays or completely
// suppresses reminders depending on the sign of that offset.
//
// This lives in its own file, with zero external imports, specifically so it
// can be unit tested (see index.test.ts) without pulling in the npm
// supabase-js client that index.ts needs — that client throws at import time
// if SUPABASE_URL/SERVICE_ROLE_KEY aren't set, which a test run never has.
// It's still deployed as part of this same function (Supabase bundles a
// function's whole directory), so the "no cross-function imports" rule this
// duplicates packages/shared to satisfy is unaffected.

/** Offset (in minutes) of `timeZone` from UTC at the given instant — positive east of UTC. */
export function getTzOffsetMinutes(timeZone: string, instant: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const part of dtf.formatToParts(instant)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return (asUtc - instant.getTime()) / 60_000;
}

/** The (year, month0, day) that `instant` falls on in `timeZone`. */
export function getZonedDateParts(instant: Date, timeZone: string): { year: number; month: number; day: number } {
  const dtf = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const parts: Record<string, string> = {};
  for (const part of dtf.formatToParts(instant)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  return { year: Number(parts.year), month: Number(parts.month) - 1, day: Number(parts.day) };
}

/** 0 (Sunday) .. 6 (Saturday), for whatever calendar day `instant` falls on in `timeZone`. */
export function getZonedDayOfWeek(instant: Date, timeZone: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(instant);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
}

/**
 * Converts a wall-clock date+time in `timeZone` to the correct UTC instant.
 * Iterates twice to self-correct across DST transitions (the offset at the
 * first guess may differ from the offset that actually applies at that
 * guessed instant).
 */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  let guess = new Date(Date.UTC(year, month, day, hour, minute, 0, 0));
  for (let i = 0; i < 2; i++) {
    const offset = getTzOffsetMinutes(timeZone, guess);
    const corrected = new Date(Date.UTC(year, month, day, hour, minute, 0, 0) - offset * 60_000);
    if (corrected.getTime() === guess.getTime()) break;
    guess = corrected;
  }
  return guess;
}

/**
 * Places an "HH:MM" wall-clock time onto whatever calendar day `dayStart`
 * (a UTC instant) falls on *in `timeZone`* — not the runtime's own local
 * timezone, which is wrong the moment this runs somewhere other than the
 * pet owner's device (e.g. this server-side reminder job).
 */
export function applyTimeToDay(dayStart: Date, time: string, timeZone: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const { year, month, day } = getZonedDateParts(dayStart, timeZone);
  return zonedTimeToUtc(year, month, day, hours, minutes, timeZone);
}

/**
 * Computes the clock times a medication is due within one "day" window, in
 * the pet's own timezone — where `dayStart` is the start of that day already
 * adjusted for the pet's day_boundary_hour (see getDayStart below).
 */
// deno-lint-ignore no-explicit-any
export function computeDueTimesForDay(schedule: any, dayStart: Date, timeZone: string): Date[] {
  switch (schedule.kind) {
    case "times_per_day":
      return schedule.times.map((t: string) => applyTimeToDay(dayStart, t, timeZone));
    case "specific_days":
      if (!schedule.daysOfWeek.includes(getZonedDayOfWeek(dayStart, timeZone))) return [];
      return schedule.times.map((t: string) => applyTimeToDay(dayStart, t, timeZone));
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
    default:
      return [];
  }
}

/** Average doses per day this schedule implies, or null for as-needed (PRN) schedules. */
// deno-lint-ignore no-explicit-any
export function computeDosesPerDay(schedule: any): number | null {
  switch (schedule.kind) {
    case "times_per_day":
      return schedule.times.length;
    case "interval_hours":
      return 24 / schedule.intervalHours;
    case "specific_days":
      return (schedule.times.length * schedule.daysOfWeek.length) / 7;
    default:
      return null;
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

const CADENCE_DAYS: Record<string, number> = { daily: 1, weekly: 7, monthly: 30 };

export function isQolOverdue(lastSurveyDate: string | null, cadence: string, now: Date): boolean {
  if (!lastSurveyDate) return false;
  const last = new Date(lastSurveyDate);
  const dueDate = new Date(last.getTime() + (CADENCE_DAYS[cadence] ?? 7) * 86_400_000);
  const overdueDate = new Date(dueDate.getTime() + 86_400_000);
  return now >= overdueDate;
}
