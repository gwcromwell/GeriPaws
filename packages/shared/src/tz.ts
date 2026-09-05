/**
 * Timezone-aware date helpers used by schedule.ts. These exist because the
 * naive approach — `new Date(x); d.setHours(h, m)` — interprets the clock
 * time in whatever timezone the *runtime* happens to be in, which is fine on
 * a device (always the owner's local time) but wrong on a server (always
 * UTC, or whatever the host's system zone is). A medication scheduled for
 * "08:00" must mean 8am in the *pet's* timezone regardless of where the code
 * evaluating it happens to run — a mobile app on the owner's phone, or a
 * cron job on a server in another timezone entirely.
 */

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
